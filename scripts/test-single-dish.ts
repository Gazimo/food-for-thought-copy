import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import sharp from "sharp";
import type { Database } from "../src/types/database";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

class SingleDishTester {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
  }

  async testTodaysDish() {
    console.log("🔍 Testing today's dish tiles...");

    // Get today's dish
    const today = new Date().toISOString().split("T")[0];
    const { data: dish, error } = await this.supabase
      .from("dishes")
      .select("id, name, image_url")
      .eq("release_date", today)
      .single();

    if (error || !dish) {
      console.error("Could not find today's dish:", error);
      return;
    }

    console.log(`📊 Testing dish: ${dish.name} (ID: ${dish.id})`);

    // Delete existing tiles
    await this.deleteExistingTiles(dish.id);

    // Regenerate tiles
    await this.generateTilesForDish(dish);

    // Test the generated tiles
    await this.testGeneratedTiles(dish.id);
  }

  private async deleteExistingTiles(dishId: number) {
    const { data: existingFiles } = await this.supabase.storage
      .from("dish-tiles")
      .list(`tiles/${dishId}/`);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(
        (file) => `tiles/${dishId}/${file.name}`
      );

      const { error } = await this.supabase.storage
        .from("dish-tiles")
        .remove(filesToDelete);

      if (error) {
        console.warn(
          `Warning: Could not delete existing tiles:`,
          error.message
        );
      } else {
        console.log(`🗑️  Deleted ${filesToDelete.length} existing tiles`);
      }
    }
  }

  private async generateTilesForDish(dish: any) {
    console.log(`🔄 Generating tiles for ${dish.name}...`);

    if (!dish.image_url) {
      throw new Error("No image URL");
    }

    // Fetch original image
    const imageResponse = await fetch(dish.image_url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${dish.image_url}`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Invalid image metadata");
    }

    console.log(`📐 Original image: ${metadata.width}x${metadata.height}`);

    // Calculate resize dimensions (3:2 aspect ratio)
    const targetAspectRatio = 3 / 2;
    const currentAspectRatio = metadata.width / metadata.height;

    let resizeWidth: number;
    let resizeHeight: number;

    if (currentAspectRatio > targetAspectRatio) {
      resizeHeight = metadata.height;
      resizeWidth = Math.round(resizeHeight * targetAspectRatio);
    } else {
      resizeWidth = metadata.width;
      resizeHeight = Math.round(resizeWidth / targetAspectRatio);
    }

    console.log(`📐 Resized image: ${resizeWidth}x${resizeHeight}`);

    // Resize image
    const resizedImage = image.resize(resizeWidth, resizeHeight, {
      fit: "cover",
      position: "center",
    });

    // Generate tiles
    const cols = 3;
    const rows = 2;

    for (let tileIndex = 0; tileIndex < 6; tileIndex++) {
      const row = Math.floor(tileIndex / cols);
      const col = tileIndex % cols;

      const tileWidth = Math.floor(resizeWidth / cols);
      const tileHeight = Math.floor(resizeHeight / rows);

      const left = col * tileWidth;
      const top = row * tileHeight;
      const actualWidth = col === cols - 1 ? resizeWidth - left : tileWidth;
      const actualHeight = row === rows - 1 ? resizeHeight - top : tileHeight;

      console.log(
        `🔲 Generating tile ${tileIndex}: ${actualWidth}x${actualHeight} at (${left}, ${top})`
      );

      // Generate REGULAR tile (NO BLUR)
      const regularTileBuffer = await resizedImage
        .extract({
          left,
          top,
          width: actualWidth,
          height: actualHeight,
        })
        .jpeg({ quality: 95, progressive: false })
        .toBuffer();

      // Generate BLURRED tile (WITH BLUR)
      const blurredTileBuffer = await resizedImage
        .extract({
          left,
          top,
          width: actualWidth,
          height: actualHeight,
        })
        .blur(40)
        .modulate({
          brightness: 0.8,
          saturation: 0.6,
        })
        .jpeg({ quality: 40 })
        .toBuffer();

      // Upload tiles to Supabase
      await this.uploadTile(dish.id, tileIndex, regularTileBuffer, false);
      await this.uploadTile(dish.id, tileIndex, blurredTileBuffer, true);

      console.log(
        `✅ Uploaded tile ${tileIndex} (regular: ${regularTileBuffer.length} bytes, blurred: ${blurredTileBuffer.length} bytes)`
      );
    }
  }

  private async uploadTile(
    dishId: number,
    tileIndex: number,
    buffer: Buffer,
    isBlurred: boolean
  ) {
    const prefix = isBlurred ? "blurred" : "regular";
    const filename = `tiles/${dishId}/${prefix}-${tileIndex}.jpg`;

    const { error } = await this.supabase.storage
      .from("dish-tiles")
      .upload(filename, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload tile: ${error.message}`);
    }
  }

  private async testGeneratedTiles(dishId: number) {
    console.log(`🧪 Testing generated tiles for dish ${dishId}...`);

    // Test regular tile
    const { data: regularTile, error: regularError } =
      await this.supabase.storage
        .from("dish-tiles")
        .download(`tiles/${dishId}/regular-0.jpg`);

    // Test blurred tile
    const { data: blurredTile, error: blurredError } =
      await this.supabase.storage
        .from("dish-tiles")
        .download(`tiles/${dishId}/blurred-0.jpg`);

    console.log(`📊 Test Results:`);
    console.log(
      `   Regular tile: ${regularTile ? "found" : "missing"} (${
        regularError ? regularError.message : "ok"
      })`
    );
    console.log(
      `   Blurred tile: ${blurredTile ? "found" : "missing"} (${
        blurredError ? blurredError.message : "ok"
      })`
    );

    if (regularTile && blurredTile) {
      const regularBuffer = Buffer.from(await regularTile.arrayBuffer());
      const blurredBuffer = Buffer.from(await blurredTile.arrayBuffer());

      console.log(`   Regular tile size: ${regularBuffer.length} bytes`);
      console.log(`   Blurred tile size: ${blurredBuffer.length} bytes`);

      // The blurred tile should be smaller due to lower quality
      if (blurredBuffer.length < regularBuffer.length) {
        console.log(`✅ Tiles generated correctly (blurred is smaller)`);
      } else {
        console.log(`⚠️  Unexpected: blurred tile is not smaller than regular`);
      }
    }
  }
}

async function main() {
  try {
    const tester = new SingleDishTester();
    await tester.testTodaysDish();
    console.log("✅ Test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

main();
