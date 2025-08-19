import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { Database } from "../src/types/database";
import { Dish, enrichDishesWithCoords } from "../src/types/dishes";
import { getCountryCoordsMap } from "../src/utils/countries";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function migrateDishes() {
  try {
    console.log("🚀 Starting migration...");

    const filePath = path.join(
      process.cwd(),
      "src/examples/sample_dishes.json"
    );
    const fileContents = await fs.promises.readFile(filePath, "utf8");
    const dishes: Dish[] = JSON.parse(fileContents);

    console.log(`📊 Found ${dishes.length} dishes to migrate`);

    const countryCoords = getCountryCoordsMap();
    const enrichedDishes = enrichDishesWithCoords(dishes, countryCoords);

    const dishesToInsert = enrichedDishes.map((dish) => ({
      name: dish.name,
      acceptable_guesses: dish.acceptableGuesses,
      country: dish.country,
      image_url: dish.imageUrl,
      ingredients: dish.ingredients,
      blurb: dish.blurb,
      protein_per_serving: dish.proteinPerServing || 0,
      recipe: dish.recipe,
      tags: dish.tags || [],
      release_date: dish.releaseDate || new Date().toISOString().split("T")[0],
      coordinates: dish.coordinates
        ? `(${dish.coordinates.lng},${dish.coordinates.lat})`
        : null,
      region: dish.region || null,
    }));

    console.log("📤 Inserting dishes into database...");

    const batchSize = 50;
    for (let i = 0; i < dishesToInsert.length; i += batchSize) {
      const batch = dishesToInsert.slice(i, i + batchSize);

      const { data, error } = await supabase.from("dishes").insert(batch);

      if (error) {
        console.error(
          `❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`,
          error
        );
        throw error;
      }

      console.log(
        `✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          dishesToInsert.length / batchSize
        )}`
      );
    }

    console.log("🎉 Migration completed successfully!");
    console.log(`📊 Total dishes migrated: ${dishesToInsert.length}`);
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

migrateDishes();