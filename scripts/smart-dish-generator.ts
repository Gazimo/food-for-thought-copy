import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { getCountryCoordsMap } from "../src/utils/countries";
import RecipeDataFetcher from "../src/utils/recipeDataFetcher";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:");
  if (!supabaseUrl) console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceKey) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nPlease check your .env.local file.");
  process.exit(1);
}

class SmartDishGenerator {
  private fetcher: RecipeDataFetcher;
  private supabase: any;

  constructor() {
    this.fetcher = new RecipeDataFetcher();
    this.supabase = createClient(supabaseUrl!, supabaseServiceKey!);
  }

  async generateAndSaveDish(dishName: string): Promise<void> {
    console.log(`🚀 Smart AI generation for: "${dishName}"`);
    console.log("=".repeat(50));

    try {
      // Step 1: Generate complete dish data using AI
      const dishData = await this.fetcher.fetchDishData(dishName);
      if (!dishData) {
        throw new Error("Failed to generate complete dish data using AI");
      }

      console.log(`✅ Complete dish data generated using AI`);

      // Step 2: Calculate next release date
      const releaseDate = await this.getNextReleaseDate();
      (dishData as any).releaseDate = releaseDate;
      console.log(`📅 Release date: ${releaseDate}`);

      // Step 3: Add coordinates based on country
      const coordinates = this.getCountryCoordinates(dishData.country || "");

      // Step 4: Display final data for review
      console.log("\n📊 FINAL DISH DATA:");
      console.log("===================");
      console.log(`Name: ${dishData.name}`);
      console.log(`Country: ${dishData.country}`);
      console.log(
        `Ingredients (${
          dishData.ingredients?.length
        }): ${dishData.ingredients?.join(", ")}`
      );
      console.log(
        `Acceptable Guesses: ${dishData.acceptableGuesses?.join(", ")}`
      );
      console.log(`Protein: ${dishData.proteinPerServing || "N/A"}g`);
      console.log(`Tags: ${dishData.tags?.join(", ")}`);
      console.log(`Release Date: ${(dishData as any).releaseDate}`);
      console.log(`Blurb: ${dishData.blurb}`);

      if (dishData.recipe) {
        console.log(
          `Recipe: ${dishData.recipe.ingredients?.length || 0} ingredients, ${
            dishData.recipe.instructions?.length || 0
          } steps`
        );
      }

      // Step 5: Save to database
      const savedDish = await this.saveDishToDatabase(
        dishData as any,
        coordinates
      );

      // Step 6: Generate tiles immediately using the original image
      if (savedDish && savedDish.id && dishData.imageUrl) {
        console.log("\n🔲 Generating tiles for optimal performance...");
        await this.generateTilesFromOriginalImage(savedDish, dishData.imageUrl);
      }

      console.log(
        "\n🎉 SUCCESS! High-quality dish generated and saved to database!"
      );
      console.log(
        "🎯 Ready for game play immediately - no manual review needed!"
      );
    } catch (error) {
      console.error("💥 Error:", error);
      process.exit(1);
    }
  }

  private async getNextReleaseDate(): Promise<string> {
    try {
      // Get the latest release date from the database
      const { data, error } = await this.supabase
        .from("dishes")
        .select("release_date")
        .order("release_date", { ascending: false })
        .limit(1);

      if (error) {
        console.warn("⚠️ Could not fetch latest release date, using today");
        return new Date().toISOString().split("T")[0];
      }

      if (!data || data.length === 0) {
        console.log("📅 No existing dishes, starting from today");
        return new Date().toISOString().split("T")[0];
      }

      // Add one day to the latest release date
      const latestDate = new Date(data[0].release_date);
      latestDate.setDate(latestDate.getDate() + 1);

      const nextDate = latestDate.toISOString().split("T")[0];
      console.log(`📅 Next available date after latest: ${nextDate}`);

      return nextDate;
    } catch (error) {
      console.warn("⚠️ Error calculating next release date:", error);
      return new Date().toISOString().split("T")[0];
    }
  }

  private getCountryCoordinates(
    country: string
  ): { lat: number; lng: number } | null {
    const countryCoords = getCountryCoordsMap();
    const normalizedCountry = country.toLowerCase().replace(/\s+/g, "");

    // Try exact match first
    if (countryCoords[normalizedCountry]) {
      return countryCoords[normalizedCountry];
    }

    // Try partial matches
    for (const [countryKey, coords] of Object.entries(countryCoords)) {
      if (
        countryKey.includes(normalizedCountry) ||
        normalizedCountry.includes(countryKey)
      ) {
        return coords;
      }
    }

    console.warn(`⚠️ Coordinates not found for: ${country}`);
    return null;
  }

  private async saveDishToDatabase(
    dishData: any,
    coordinates: { lat: number; lng: number } | null
  ): Promise<any> {
    try {
      const dishToInsert = {
        name: dishData.name,
        acceptable_guesses: dishData.acceptableGuesses,
        country: dishData.country,
        image_url: dishData.imageUrl || null,
        ingredients: dishData.ingredients,
        blurb: dishData.blurb,
        protein_per_serving: dishData.proteinPerServing || 0,
        recipe: dishData.recipe,
        tags: dishData.tags || [],
        release_date: dishData.releaseDate,
        coordinates: coordinates
          ? `(${coordinates.lng},${coordinates.lat})`
          : null,
        region: null,
      };

      console.log("\n💾 Saving to database...");

      const { data, error } = await this.supabase
        .from("dishes")
        .insert([dishToInsert])
        .select();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`✅ Dish saved with ID: ${data[0]?.id}`);

      if (coordinates) {
        console.log(
          `🗺️ Coordinates added: ${coordinates.lat}, ${coordinates.lng}`
        );
      }

      return data[0]; // Return the saved dish with ID
    } catch (error) {
      throw new Error(`Failed to save to database: ${error}`);
    }
  }

  /**
   * Generate tiles from original DALL-E image URL (before Supabase upload)
   */
  private async generateTilesFromOriginalImage(
    dish: any,
    originalImageUrl: string
  ): Promise<void> {
    try {
      console.log(
        `🔄 Generating tiles from original image for ${dish.name}...`
      );

      // Fetch the original image from the provided URL
      const imageResponse = await fetch(originalImageUrl);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to fetch original image: ${imageResponse.statusText}`
        );
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      await this.generateTilesFromBuffer(dish, imageBuffer);

      console.log(`✅ Tiles generated successfully for ${dish.name}`);
    } catch (error) {
      console.error(`❌ Failed to generate tiles for ${dish.name}:`, error);
      console.log(
        `   You can generate tiles manually later with: npm run pregenerate-tiles generate`
      );
    }
  }

  /**
   * Generate tiles for a newly created dish (fallback method)
   */
  private async generateTilesForDish(dish: any): Promise<void> {
    try {
      if (!dish.image_url) {
        console.log(`⚠️  No image URL for dish: ${dish.name}`);
        return;
      }

      // Check if this is a Supabase URL (avoid egress costs)
      if (dish.image_url.includes("supabase.co")) {
        console.log(
          `⚠️  Skipping tile generation for Supabase image: ${dish.name}`
        );
        console.log(`   Use: npm run pregenerate-tiles generate`);
        return;
      }

      console.log(`🔄 Generating tiles for ${dish.name}...`);

      // Fetch original image
      const imageResponse = await fetch(dish.image_url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${dish.image_url}`);
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      await this.generateTilesFromBuffer(dish, imageBuffer);

      console.log(`✅ Tiles generated for ${dish.name}`);
    } catch (error) {
      console.error(`❌ Failed to generate tiles for ${dish.name}:`, error);
      console.log(
        `   You can generate tiles manually later with: npm run pregenerate-tiles generate`
      );
    }
  }

  /**
   * Generate tiles from image buffer (shared method)
   */
  private async generateTilesFromBuffer(
    dish: any,
    imageBuffer: Buffer
  ): Promise<void> {
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
      const row = Math.floor(tileIndex / cols);
      const col = tileIndex % cols;

      const tileWidth = Math.floor(resizeWidth / cols);
      const tileHeight = Math.floor(resizeHeight / rows);

      const left = col * tileWidth;
      const top = row * tileHeight;
      const actualWidth = col === cols - 1 ? resizeWidth - left : tileWidth;
      const actualHeight = row === rows - 1 ? resizeHeight - top : tileHeight;

      // Create fresh Sharp instance for each tile
      const baseImage = image.resize(resizeWidth, resizeHeight, {
        fit: "cover",
        position: "center",
      });

      // Generate regular tile (NO BLUR)
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

      // Generate blurred tile (WITH BLUR)
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

      // Upload tiles to Supabase
      await this.uploadTile(dish.id, tileIndex, regularTileBuffer, false);
      await this.uploadTile(dish.id, tileIndex, blurredTileBuffer, true);
    }
  }

  /**
   * Upload a tile to Supabase storage
   */
  private async uploadTile(
    dishId: number,
    tileIndex: number,
    buffer: Buffer,
    isBlurred: boolean
  ): Promise<void> {
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
}

async function main() {
  const dishName = process.argv[2];

  if (!dishName) {
    console.error("❌ Please provide a dish name");
    console.log('Usage: npm run smart-generate "Dish Name"');
    console.log('Example: npm run smart-generate "Chicken Tikka Masala"');
    process.exit(1);
  }

  const generator = new SmartDishGenerator();
  await generator.generateAndSaveDish(dishName);
}

main().catch(console.error);
