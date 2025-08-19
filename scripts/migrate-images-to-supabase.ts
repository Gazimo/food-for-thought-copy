#!/usr/bin/env ts-node

import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { Database } from "../src/types/database";

class ImageMigrationService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        "Missing Supabase credentials. Please check your environment variables."
      );
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Migrate all images from local storage to Supabase
   */
  async migrateAllImages() {
    try {
      console.log("🚀 Starting image migration to Supabase...");

      const dishesDir = path.join(process.cwd(), "public", "images", "dishes");

      // Check if directory exists
      try {
        await fs.access(dishesDir);
      } catch {
        console.log("❌ No dishes directory found. Nothing to migrate.");
        return;
      }

      // Get all image files
      const files = await fs.readdir(dishesDir);
      const imageFiles = files.filter(
        (file) =>
          file.endsWith(".png") ||
          file.endsWith(".jpg") ||
          file.endsWith(".jpeg")
      );

      console.log(`📊 Found ${imageFiles.length} images to migrate`);

      let successCount = 0;
      let errorCount = 0;

      // Migrate each image
      for (const filename of imageFiles) {
        try {
          await this.migrateImage(filename, dishesDir);
          successCount++;
          console.log(
            `✅ Migrated: ${filename} (${successCount}/${imageFiles.length})`
          );
        } catch (error) {
          errorCount++;
          console.error(`❌ Failed to migrate ${filename}:`, error);
        }
      }

      console.log("\n🎉 Migration completed!");
      console.log(`✅ Successfully migrated: ${successCount} images`);
      console.log(`❌ Failed to migrate: ${errorCount} images`);

      if (successCount > 0) {
        console.log("\n📝 Next steps:");
        console.log(
          "1. Update your database records to use the new Supabase URLs"
        );
        console.log("2. Test your application to ensure images load correctly");
        console.log(
          "3. Once confirmed, you can safely delete the local images"
        );
      }
    } catch (error) {
      console.error("💥 Migration failed:", error);
      process.exit(1);
    }
  }

  /**
   * Migrate a single image to Supabase storage
   */
  private async migrateImage(filename: string, sourceDir: string) {
    const filePath = path.join(sourceDir, filename);

    // Read the local file
    const fileBuffer = await fs.readFile(filePath);

    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";

    // Upload to Supabase
    const { data, error } = await this.supabase.storage
      .from("dish-images")
      .upload(filename, fileBuffer, {
        contentType,
        upsert: true, // Overwrite if exists
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Update database records to use Supabase URLs
   */
  async updateDatabaseUrls() {
    try {
      console.log("🔄 Updating database URLs to use Supabase...");

      // Get all dishes with local image URLs
      const { data: dishes, error: fetchError } = await this.supabase
        .from("dishes")
        .select("id, image_url")
        .like("image_url", "/images/dishes/%");

      if (fetchError) {
        throw new Error(`Failed to fetch dishes: ${fetchError.message}`);
      }

      if (!dishes || dishes.length === 0) {
        console.log("✅ No dishes found with local image URLs. All good!");
        return;
      }

      console.log(`📊 Found ${dishes.length} dishes to update`);

      // Update each dish
      for (const dish of dishes) {
        try {
          // Extract filename from local URL
          const filename = (dish.image_url as string).split("/").pop();

          if (!filename) {
            console.error(
              `❌ Could not extract filename from: ${dish.image_url}`
            );
            continue;
          }

          // Get Supabase public URL
          const {
            data: { publicUrl },
          } = this.supabase.storage.from("dish-images").getPublicUrl(filename);

          // Update database record
          const { error: updateError } = await this.supabase
            .from("dishes")
            .update({ image_url: publicUrl })
            .eq("id", dish.id as number);

          if (updateError) {
            console.error(`❌ Failed to update dish ${dish.id}:`, updateError);
          } else {
            console.log(`✅ Updated dish ${dish.id as number}: ${filename}`);
          }
        } catch (error) {
          console.error(
            `❌ Error processing dish ${dish.id as number}:`,
            error
          );
        }
      }

      console.log("🎉 Database URL update completed!");
    } catch (error) {
      console.error("💥 Database update failed:", error);
      throw error;
    }
  }

  /**
   * Verify that all images are accessible in Supabase
   */
  async verifyMigration() {
    try {
      console.log("🔍 Verifying migration...");

      const { data: files, error } = await this.supabase.storage
        .from("dish-images")
        .list();

      if (error) {
        throw new Error(`Failed to list Supabase files: ${error.message}`);
      }

      console.log(`✅ Found ${files?.length || 0} files in Supabase storage`);

      // Test a few random URLs
      if (files && files.length > 0) {
        const randomFile = files[Math.floor(Math.random() * files.length)];
        const {
          data: { publicUrl },
        } = this.supabase.storage
          .from("dish-images")
          .getPublicUrl(randomFile.name);

        console.log(`🔗 Sample URL: ${publicUrl}`);

        // Test if URL is accessible
        try {
          const response = await fetch(publicUrl);
          if (response.ok) {
            console.log("✅ Sample URL is accessible");
          } else {
            console.log("⚠️  Sample URL returned status:", response.status);
          }
        } catch (fetchError) {
          console.log("⚠️  Could not test sample URL:", fetchError);
        }
      }
    } catch (error) {
      console.error("💥 Verification failed:", error);
    }
  }
}

// Main execution
async function main() {
  try {
    const migrationService = new ImageMigrationService();

    const command = process.argv[2];

    switch (command) {
      case "migrate":
        await migrationService.migrateAllImages();
        break;
      case "update-db":
        await migrationService.updateDatabaseUrls();
        break;
      case "verify":
        await migrationService.verifyMigration();
        break;
      case "full":
        console.log("🚀 Running full migration process...");
        await migrationService.migrateAllImages();
        await migrationService.updateDatabaseUrls();
        await migrationService.verifyMigration();
        break;
      default:
        console.log("📖 Usage:");
        console.log(
          "  npm run ts-node scripts/migrate-images-to-supabase.ts migrate     # Migrate images only"
        );
        console.log(
          "  npm run ts-node scripts/migrate-images-to-supabase.ts update-db  # Update database URLs"
        );
        console.log(
          "  npm run ts-node scripts/migrate-images-to-supabase.ts verify     # Verify migration"
        );
        console.log(
          "  npm run ts-node scripts/migrate-images-to-supabase.ts full       # Run complete process"
        );
        break;
    }
  } catch (error) {
    console.error("💥 Script failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default ImageMigrationService;
