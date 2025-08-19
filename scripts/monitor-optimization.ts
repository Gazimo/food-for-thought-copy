import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type { Database } from "../src/types/database";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

class OptimizationMonitor {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
  }

  async checkTilesCoverage() {
    console.log("🔍 Checking tile coverage...");

    // Get all dishes
    const { data: dishes, error } = await this.supabase
      .from("dishes")
      .select("id, name");

    if (error) {
      throw new Error(`Failed to fetch dishes: ${error.message}`);
    }

    let totalDishes = dishes?.length || 0;
    let dishesWithTiles = 0;
    let missingTiles: string[] = [];

    for (const dish of dishes || []) {
      const { data: tiles } = await this.supabase.storage
        .from("dish-tiles")
        .list(`tiles/${dish.id}/`);

      if (tiles && tiles.length >= 12) {
        // 6 regular + 6 blurred
        dishesWithTiles++;
      } else {
        missingTiles.push(`${dish.name} (ID: ${dish.id})`);
      }
    }

    console.log(`📊 Tile Coverage Report:`);
    console.log(`   Total dishes: ${totalDishes}`);
    console.log(`   Dishes with complete tiles: ${dishesWithTiles}`);
    console.log(
      `   Coverage: ${Math.round((dishesWithTiles / totalDishes) * 100)}%`
    );

    if (missingTiles.length > 0) {
      console.log(`\n⚠️  Dishes missing tiles:`);
      missingTiles.forEach((dish) => console.log(`   - ${dish}`));
    }

    return {
      totalDishes,
      dishesWithTiles,
      coverage: (dishesWithTiles / totalDishes) * 100,
      missingTiles,
    };
  }

  async testTilePerformance() {
    console.log("\n🚀 Testing tile performance...");

    // Get today's dish
    const today = new Date().toISOString().split("T")[0];
    const { data: todaysDish } = await this.supabase
      .from("dishes")
      .select("id, name")
      .eq("release_date", today)
      .single();

    if (!todaysDish) {
      console.log("No dish available for today");
      return;
    }

    console.log(
      `Testing with today's dish: ${todaysDish.name} (ID: ${todaysDish.id})`
    );

    // Test regular tile
    const startTime = Date.now();
    const { data: regularTile } = await this.supabase.storage
      .from("dish-tiles")
      .download(`tiles/${todaysDish.id}/regular-0.jpg`);
    const regularTime = Date.now() - startTime;

    // Test blurred tile
    const startTimeBlurred = Date.now();
    const { data: blurredTile } = await this.supabase.storage
      .from("dish-tiles")
      .download(`tiles/${todaysDish.id}/blurred-0.jpg`);
    const blurredTime = Date.now() - startTimeBlurred;

    console.log(`⚡ Performance Results:`);
    console.log(
      `   Regular tile: ${regularTime}ms (${regularTile ? "found" : "missing"})`
    );
    console.log(
      `   Blurred tile: ${blurredTime}ms (${blurredTile ? "found" : "missing"})`
    );

    return {
      regularTime,
      blurredTime,
      regularFound: !!regularTile,
      blurredFound: !!blurredTile,
    };
  }

  async estimateOptimization() {
    console.log("\n💰 Estimating optimization impact...");

    const coverage = await this.checkTilesCoverage();

    // Assumptions based on your usage
    const avgGamesPerDay = 100; // Estimate
    const tilesPerGame = 12; // 6 regular + 6 blurred
    const daysInMonth = 30;

    const totalTileRequests = avgGamesPerDay * tilesPerGame * daysInMonth;
    const optimizedRequests = Math.round(
      totalTileRequests * (coverage.coverage / 100)
    );
    const unoptimizedRequests = totalTileRequests - optimizedRequests;

    console.log(`📈 Monthly Optimization Estimate:`);
    console.log(
      `   Total tile requests: ${totalTileRequests.toLocaleString()}`
    );
    console.log(
      `   Served from pre-generated: ${optimizedRequests.toLocaleString()} (${Math.round(
        coverage.coverage
      )}%)`
    );
    console.log(
      `   Still requiring transformation: ${unoptimizedRequests.toLocaleString()}`
    );
    console.log(
      `   Estimated transformation reduction: ${Math.round(
        (optimizedRequests / totalTileRequests) * 100
      )}%`
    );

    return {
      totalRequests: totalTileRequests,
      optimizedRequests,
      unoptimizedRequests,
      reductionPercentage: (optimizedRequests / totalTileRequests) * 100,
    };
  }
}

async function main() {
  const command = process.argv[2] || "all";

  try {
    const monitor = new OptimizationMonitor();

    switch (command) {
      case "coverage":
        await monitor.checkTilesCoverage();
        break;
      case "performance":
        await monitor.testTilePerformance();
        break;
      case "estimate":
        await monitor.estimateOptimization();
        break;
      case "all":
      default:
        await monitor.checkTilesCoverage();
        await monitor.testTilePerformance();
        await monitor.estimateOptimization();
        break;
    }

    console.log("\n✅ Monitoring complete!");
  } catch (error) {
    console.error("❌ Monitoring failed:", error);
    process.exit(1);
  }
}

main();
