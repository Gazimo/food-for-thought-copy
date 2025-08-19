import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import sharp from "sharp";
import type { Database } from "../src/types/database";

// Load environment variables from .env.local and .env files
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

class TilePregeneration {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
      console.error("Please check your .env.local file contains:");
      console.error("NEXT_PUBLIC_SUPABASE_URL=your_supabase_url");
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL environment variable is required"
      );
    }

    if (!supabaseServiceKey) {
      console.error(
        "❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable"
      );
      console.error("Please check your .env.local file contains:");
      console.error("SUPABASE_SERVICE_ROLE_KEY=your_service_role_key");
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY environment variable is required"
      );
    }

    console.log("🔧 Connecting to Supabase...");
    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
  }

  async pregenerateTilesForAllDishes() {
    console.log("🚀 Starting tile pre-generation...");

    // Get all dishes from database
    const { data: dishes, error } = await this.supabase
      .from("dishes")
      .select("id, name, image_url");

    if (error) {
      throw new Error(`Failed to fetch dishes: ${error.message}`);
    }

    if (!dishes || dishes.length === 0) {
      console.log("No dishes found to process");
      return;
    }

    console.log(`📊 Found ${dishes.length} dishes to process`);

    for (const dish of dishes) {
      try {
        await this.pregenerateTilesForDish(dish);
        console.log(`✅ Processed dish: ${dish.name}`);
      } catch (error) {
        console.error(`❌ Failed to process dish ${dish.name}:`, error);
      }
    }

    console.log("🎉 Tile pre-generation completed!");
  }

  private async pregenerateTilesForDish(
    dish: any,
    forceRegenerate: boolean = false
  ) {
    if (!dish.image_url) {
      console.log(`⚠️  Skipping ${dish.name} - no image URL`);
      return;
    }

    // Check if tiles already exist (unless force regenerating)
    if (!forceRegenerate) {
      const existingTiles = await this.checkExistingTiles(dish.id);
      if (existingTiles.length === 12) {
        // 6 regular + 6 blurred
        console.log(`⏭️  Skipping ${dish.name} - tiles already exist`);
        return;
      }
    }

    // Check if this is a Supabase URL (avoid egress costs)
    if (dish.image_url.includes("supabase.co")) {
      console.log(
        `⚠️  Skipping Supabase image to avoid egress costs: ${dish.name}`
      );
      return;
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

    // Generate all 6 tiles
    const cols = 3;
    const rows = 2;

    for (let tileIndex = 0; tileIndex < 6; tileIndex++) {
      console.log(`🔲 Processing tile ${tileIndex}...`);

      const row = Math.floor(tileIndex / cols);
      const col = tileIndex % cols;

      const tileWidth = Math.floor(resizeWidth / cols);
      const tileHeight = Math.floor(resizeHeight / rows);

      const left = col * tileWidth;
      const top = row * tileHeight;
      const actualWidth = col === cols - 1 ? resizeWidth - left : tileWidth;
      const actualHeight = row === rows - 1 ? resizeHeight - top : tileHeight;

      // Create fresh Sharp instance for each tile to avoid state issues
      const baseImage = image.resize(resizeWidth, resizeHeight, {
        fit: "cover",
        position: "center",
      });

      // Generate regular tile (NO BLUR)
      const regularTileBuffer = await baseImage
        .clone() // Clone to avoid state pollution
        .extract({
          left,
          top,
          width: actualWidth,
          height: actualHeight,
        })
        .jpeg({ quality: 95, progressive: false })
        .toBuffer();

      // Generate blurred tile (WITH BLUR) - use fresh clone
      const blurredTileBuffer = await baseImage
        .clone() // Fresh clone for blur processing
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

      console.log(
        `📊 Tile ${tileIndex} sizes: regular=${regularTileBuffer.length} bytes, blurred=${blurredTileBuffer.length} bytes`
      );

      // Upload tiles to Supabase
      await this.uploadTile(dish.id, tileIndex, regularTileBuffer, false);
      await this.uploadTile(dish.id, tileIndex, blurredTileBuffer, true);

      console.log(`✅ Uploaded tile ${tileIndex}`);
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

  private async checkExistingTiles(dishId: number): Promise<string[]> {
    const { data, error } = await this.supabase.storage
      .from("dish-tiles")
      .list(`tiles/${dishId}/`);

    if (error) {
      return [];
    }

    return data?.map((file) => file.name) || [];
  }

  async createTilesBucket() {
    console.log("🪣 Creating dish-tiles bucket...");

    const { error } = await this.supabase.storage.createBucket("dish-tiles", {
      public: true,
      allowedMimeTypes: ["image/jpeg"],
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
    });

    if (error && !error.message.includes("already exists")) {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }

    console.log("✅ Bucket ready");
  }

  async forceRegenerateTiles() {
    console.log("🔄 Force regenerating all tiles...");

    // Get all dishes from database
    const { data: dishes, error } = await this.supabase
      .from("dishes")
      .select("id, name, image_url");

    if (error) {
      throw new Error(`Failed to fetch dishes: ${error.message}`);
    }

    if (!dishes || dishes.length === 0) {
      console.log("No dishes found to process");
      return;
    }

    console.log(`📊 Found ${dishes.length} dishes to process`);

    for (const dish of dishes) {
      try {
        // Delete existing tiles first
        await this.deleteExistingTiles(dish.id);

        // Force regenerate tiles
        await this.pregenerateTilesForDish(dish, true);
        console.log(`✅ Regenerated tiles for dish: ${dish.name}`);
      } catch (error) {
        console.error(
          `❌ Failed to regenerate tiles for dish ${dish.name}:`,
          error
        );
      }
    }

    console.log("🎉 Tile regeneration completed!");
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
          `Warning: Could not delete existing tiles for dish ${dishId}:`,
          error.message
        );
      } else {
        console.log(
          `🗑️  Deleted ${filesToDelete.length} existing tiles for dish ${dishId}`
        );
      }
    }
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  const service = new TilePregeneration();

  switch (command) {
    case "create-bucket":
      await service.createTilesBucket();
      break;
    case "generate":
      await service.pregenerateTilesForAllDishes();
      break;
    case "full":
      await service.createTilesBucket();
      await service.pregenerateTilesForAllDishes();
      break;
    case "force-regenerate":
      await service.forceRegenerateTiles();
      break;
    default:
      console.log("Usage:");
      console.log("  npm run pregenerate-tiles create-bucket");
      console.log("  npm run pregenerate-tiles generate");
      console.log("  npm run pregenerate-tiles full");
      console.log("  npm run pregenerate-tiles force-regenerate");
  }
}

main().catch(console.error);
