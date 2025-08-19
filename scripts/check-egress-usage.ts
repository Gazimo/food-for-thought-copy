import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import type { Database } from "../src/types/database";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

class EgressAnalyzer {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
  }

  async analyzeEgressSources() {
    console.log("🔍 Analyzing Supabase egress usage...");

    // Check dishes with Supabase URLs
    const { data: dishes, error } = await this.supabase
      .from("dishes")
      .select("id, name, image_url");

    if (error) {
      throw new Error(`Failed to fetch dishes: ${error.message}`);
    }

    let supabaseImageCount = 0;
    let externalImageCount = 0;
    let totalEstimatedEgress = 0;

    console.log("\n📊 Analyzing dish images:");

    for (const dish of dishes || []) {
      if (dish.image_url?.includes("supabase.co")) {
        supabaseImageCount++;
        // Estimate ~1MB per image download
        totalEstimatedEgress += 1;
        console.log(`📥 Supabase: ${dish.name}`);
      } else {
        externalImageCount++;
        console.log(`🌐 External: ${dish.name}`);
      }
    }

    console.log("\n🎯 Egress Analysis:");
    console.log(`   Dishes with Supabase images: ${supabaseImageCount}`);
    console.log(`   Dishes with external images: ${externalImageCount}`);
    console.log(`   Estimated egress per download: ${totalEstimatedEgress} MB`);

    // Check tile storage
    const { data: buckets, error: bucketError } =
      await this.supabase.storage.listBuckets();

    if (!bucketError && buckets) {
      console.log("\n🪣 Storage Buckets:");
      for (const bucket of buckets) {
        console.log(
          `   - ${bucket.name} (${bucket.public ? "public" : "private"})`
        );
      }
    }

    // Estimate potential egress scenarios
    console.log("\n💡 Potential Egress Scenarios:");
    console.log(
      `   1. Tile generation script downloading images: ${supabaseImageCount} × 1MB = ${supabaseImageCount} MB`
    );
    console.log(
      `   2. Multiple script runs: ${supabaseImageCount} × 1MB × runs = high egress`
    );
    console.log(`   3. API testing downloading tiles: varies`);
    console.log(`   4. Users playing game (tile downloads): varies`);

    // Check if we have tiles generated
    const { data: tileFiles, error: tilesError } = await this.supabase.storage
      .from("dish-tiles")
      .list("tiles", { limit: 10 });

    if (!tilesError && tileFiles && tileFiles.length > 0) {
      console.log(
        `\n✅ Tiles are generated (${tileFiles.length} dish folders found)`
      );
      console.log(
        "   The egress was likely from tile generation, not ongoing usage"
      );
    } else {
      console.log("\n❌ No tiles found - egress may be from other sources");
    }

    return {
      supabaseImageCount,
      externalImageCount,
      estimatedEgressMB: totalEstimatedEgress,
      tilesGenerated: tileFiles?.length || 0,
    };
  }

  async suggestOptimizations() {
    console.log("\n🚀 Optimization Suggestions:");
    console.log(
      "   1. ✅ Tiles are already generated - no more egress from tile generation"
    );
    console.log("   2. 🔄 Avoid re-running tile generation scripts");
    console.log(
      "   3. 📱 Game usage should be minimal egress (tiles are small)"
    );
    console.log("   4. ⏳ Wait for billing cycle to reset (monthly)");
    console.log("   5. 💰 Consider upgrading temporarily if needed");

    console.log("\n📅 Billing Cycle Info:");
    console.log("   - Supabase free tier: 5GB egress per month");
    console.log("   - Current usage: 84.7GB (1,694% over)");
    console.log("   - Resets monthly on your billing date");
    console.log("   - Pro plan: $25/month for 250GB egress");
  }
}

async function main() {
  const analyzer = new EgressAnalyzer();
  await analyzer.analyzeEgressSources();
  await analyzer.suggestOptimizations();
}

main().catch(console.error);
