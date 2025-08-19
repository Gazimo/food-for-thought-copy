import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

class StorageCalculator {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
  }

  async calculateTileStorage() {
    console.log("🔍 Calculating tile storage usage...");

    // Get all files in the dish-tiles bucket
    const { data: files, error } = await this.supabase.storage
      .from("dish-tiles")
      .list("tiles", {
        limit: 1000,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    if (!files || files.length === 0) {
      console.log("📊 No tiles found in storage");
      return;
    }

    // Get all subdirectories (dish folders)
    const dishFolders = files.filter(
      (file) => file.name && !file.name.includes(".")
    );

    let totalSize = 0;
    let totalFiles = 0;
    let dishCount = 0;

    console.log(`📁 Found ${dishFolders.length} dish folders`);

    for (const folder of dishFolders) {
      const { data: tileFiles, error: tileError } = await this.supabase.storage
        .from("dish-tiles")
        .list(`tiles/${folder.name}`);

      if (tileError) {
        console.warn(
          `⚠️  Error listing tiles for dish ${folder.name}:`,
          tileError
        );
        continue;
      }

      if (!tileFiles || tileFiles.length === 0) {
        continue;
      }

      let dishSize = 0;
      let dishFiles = 0;

      for (const file of tileFiles) {
        if (file.metadata?.size) {
          dishSize += file.metadata.size;
          dishFiles++;
        }
      }

      totalSize += dishSize;
      totalFiles += dishFiles;
      dishCount++;

      console.log(
        `📊 Dish ${folder.name}: ${dishFiles} files, ${this.formatBytes(
          dishSize
        )}`
      );
    }

    console.log("\n🎯 Storage Summary:");
    console.log(`   Total dishes: ${dishCount}`);
    console.log(`   Total files: ${totalFiles}`);
    console.log(`   Total storage: ${this.formatBytes(totalSize)}`);
    console.log(
      `   Average per dish: ${this.formatBytes(totalSize / dishCount)}`
    );
    console.log(
      `   Average per file: ${this.formatBytes(totalSize / totalFiles)}`
    );

    // Calculate storage costs (rough estimates)
    const storageCostPerGB = 0.021; // Supabase storage cost per GB/month
    const storageGB = totalSize / (1024 * 1024 * 1024);
    const monthlyCost = storageGB * storageCostPerGB;

    console.log("\n💰 Cost Estimate:");
    console.log(`   Storage: ${storageGB.toFixed(3)} GB`);
    console.log(`   Monthly cost: $${monthlyCost.toFixed(3)}`);

    // Compare to Supabase free tier (1GB)
    const freeStorageGB = 1;
    if (storageGB > freeStorageGB) {
      console.log(
        `   ⚠️  Over free tier by: ${(storageGB - freeStorageGB).toFixed(3)} GB`
      );
    } else {
      console.log(
        `   ✅ Within free tier (${(freeStorageGB - storageGB).toFixed(
          3
        )} GB remaining)`
      );
    }

    return {
      totalSize,
      totalFiles,
      dishCount,
      storageGB,
      monthlyCost,
      withinFreeTier: storageGB <= freeStorageGB,
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

async function main() {
  const calculator = new StorageCalculator();
  await calculator.calculateTileStorage();
}

main().catch(console.error);
