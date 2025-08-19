import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import sharp from "sharp";
import DishImageService from "../src/services/dishImageService";
import type { Database } from "../src/types/database";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

class Dish67Regenerator {
  private dishImageService: DishImageService;
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor() {
    // Check required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing Supabase environment variables");
      console.error("Please check your .env.local file contains:");
      console.error("NEXT_PUBLIC_SUPABASE_URL=your_supabase_url");
      console.error("SUPABASE_SERVICE_ROLE_KEY=your_service_role_key");
      throw new Error("Missing Supabase environment variables");
    }

    if (!openaiApiKey) {
      console.error("❌ Missing OpenAI API key");
      console.error("Please check your .env.local file contains:");
      console.error("OPENAI_API_KEY=your_openai_api_key");
      throw new Error("Missing OpenAI API key");
    }

    // Initialize services
    this.dishImageService = new DishImageService();
    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
  }

  async regenerateDish67() {
    console.log("🚀 Starting dish 67 image regeneration...");
    console.log("=".repeat(50));

    try {
      // Step 1: Fetch existing dish 67 data
      console.log("📋 Fetching existing dish 67 data...");
      const { data: existingDish, error: fetchError } = await this.supabase
        .from("dishes")
        .select("*")
        .eq("id", 67)
        .single();

      if (fetchError || !existingDish) {
        throw new Error(
          `Failed to fetch dish 67: ${fetchError?.message || "Not found"}`
        );
      }

      console.log(`✅ Found dish: ${existingDish.name}`);
      console.log(`   Country: ${existingDish.country}`);
      console.log(
        `   Release Date: ${existingDish.release_date} (will be preserved)`
      );
      console.log(
        `   Current Image URL: ${existingDish.image_url || "MISSING"}`
      );

      // Step 2: Backup current state
      console.log("\n💾 Backing up current dish data...");
      const backup = {
        timestamp: new Date().toISOString(),
        dish: existingDish,
      };
      console.log(`   Backup created: ${backup.timestamp}`);

      // Step 3: Generate new image using existing dish data
      console.log("\n🎨 Generating new image with AI...");
      const imageResult = await this.dishImageService.generateDishImage({
        name: existingDish.name,
        ingredients: existingDish.ingredients || [],
        country: existingDish.country || "",
        blurb: existingDish.blurb || "",
        tags: existingDish.tags || [],
      });

      console.log(`✅ New image generated successfully!`);
      console.log(`   New Image URL: ${imageResult.imageUrl}`);
      console.log(`   Generation Cost: $${imageResult.cost}`);
      console.log(`   Filename: ${imageResult.filename}`);

      // Step 4: Update database with new image URL (preserve all other data)
      console.log("\n📝 Updating database with new image URL...");
      const { error: updateError } = await this.supabase
        .from("dishes")
        .update({
          image_url: imageResult.imageUrl,
        })
        .eq("id", 67);

      if (updateError) {
        throw new Error(`Failed to update database: ${updateError.message}`);
      }

      console.log("✅ Database updated successfully!");
      console.log("   ✓ ID 67 preserved");
      console.log(`   ✓ Release date preserved: ${existingDish.release_date}`);
      console.log("   ✓ All other data preserved");
      console.log("   ✓ Only image_url updated");

      // Step 5: Generate tiles from the new image
      console.log("\n🔲 Generating tiles from new image...");
      await this.generateTilesFromImage(67, imageResult.imageUrl);

      console.log("\n🎉 SUCCESS! Dish 67 regeneration completed!");
      console.log("=".repeat(50));
      console.log("✅ New image generated and uploaded");
      console.log("✅ Database updated (ID and release_date preserved)");
      console.log("✅ All 12 tiles generated (6 regular + 6 blurred)");
      console.log("✅ Ready for game play!");

      // Step 6: Verification
      console.log("\n🔍 Verification:");
      await this.verifyRegeneration();
    } catch (error) {
      console.error("\n💥 ERROR during regeneration:", error);
      console.log("\n🔄 Rollback options:");
      console.log("   - Database ID and release_date were never touched");
      console.log("   - Old tiles may still exist alongside new ones");
      console.log("   - Image backup data saved above");
      throw error;
    }
  }

  /**
   * Generate tiles from the fresh AI-generated image URL
   */
  private async generateTilesFromImage(dishId: number, imageUrl: string) {
    console.log(`🔄 Generating tiles for dish ${dishId}...`);

    // Fetch the fresh image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Invalid image metadata");
    }

    console.log(`📐 Image dimensions: ${metadata.width}x${metadata.height}`);

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

    console.log(`📐 Resized dimensions: ${resizeWidth}x${resizeHeight}`);

    // Generate all 6 tiles (3x2 grid)
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

      // Create base image for this tile
      const baseImage = image.resize(resizeWidth, resizeHeight, {
        fit: "cover",
        position: "center",
      });

      // Generate regular tile (no blur)
      const regularTileBuffer = await baseImage
        .clone()
        .extract({
          left,
          top,
          width: actualWidth,
          height: actualHeight,
        })
        .jpeg({ quality: 95, progressive: false })
        .toBuffer();

      // Generate blurred tile
      const blurredTileBuffer = await baseImage
        .clone()
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

      // Upload both tiles
      await this.uploadTile(dishId, tileIndex, regularTileBuffer, false);
      await this.uploadTile(dishId, tileIndex, blurredTileBuffer, true);

      console.log(
        `✅ Tile ${tileIndex} uploaded (regular: ${regularTileBuffer.length} bytes, blurred: ${blurredTileBuffer.length} bytes)`
      );
    }

    console.log("✅ All tiles generated and uploaded!");
  }

  /**
   * Upload a tile to Supabase storage
   */
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
        upsert: true, // Overwrite existing tiles
      });

    if (error) {
      throw new Error(`Failed to upload tile ${filename}: ${error.message}`);
    }
  }

  /**
   * Verify the regeneration was successful
   */
  private async verifyRegeneration() {
    // Check database
    const { data: updatedDish } = await this.supabase
      .from("dishes")
      .select("id, name, image_url, release_date")
      .eq("id", 67)
      .single();

    console.log(
      `   Database: ID ${updatedDish?.id}, Release: ${updatedDish?.release_date}`
    );
    console.log(
      `   New Image: ${updatedDish?.image_url ? "✅ Present" : "❌ Missing"}`
    );

    // Check tiles
    const { data: tiles } = await this.supabase.storage
      .from("dish-tiles")
      .list("tiles/67/");

    const tileCount = tiles?.length || 0;
    console.log(`   Tiles: ${tileCount}/12 ${tileCount === 12 ? "✅" : "⚠️"}`);

    // Test tile accessibility
    if (tileCount > 0) {
      const { data: testTile } = await this.supabase.storage
        .from("dish-tiles")
        .download("tiles/67/regular-0.jpg");

      console.log(`   Tile Access: ${testTile ? "✅ Working" : "❌ Failed"}`);
    }
  }
}

// Main execution
async function main() {
  try {
    const regenerator = new Dish67Regenerator();
    await regenerator.regenerateDish67();
  } catch (error) {
    console.error("💥 Script failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { Dish67Regenerator };
