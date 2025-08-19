import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import OpenAI from "openai";
import { Database } from "../src/types/database";

// Load environment variables
dotenv.config();

type DishRow = Database["public"]["Tables"]["dishes"]["Row"];

class BlurbFixer {
  private supabase;
  private openai: OpenAI | null = null;

  constructor() {
    // Check for required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL environment variable is required"
      );
    }

    if (!supabaseServiceKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY environment variable is required"
      );
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Only initialize OpenAI if we have the API key and need to generate new blurbs
    if (openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: openaiApiKey,
      });
    }
  }

  /**
   * Generate a new blurb without country information
   */
  async generateFixedBlurb(dish: DishRow): Promise<string | null> {
    if (!this.openai) {
      throw new Error(
        "OpenAI API key is required for generating new blurbs. Please set OPENAI_API_KEY in your environment."
      );
    }

    try {
      const prompt = `You are a culinary expert fixing dish descriptions for a guessing game. Generate a new appetizing description for "${
        dish.name
      }" that describes the dish without revealing its country of origin.

Current dish details:
- Name: ${dish.name}
- Ingredients: ${dish.ingredients.join(", ")}
- Tags: ${dish.tags.join(", ")}
- Current blurb: ${dish.blurb}

Requirements:
1. Write 1-2 sentences that make the dish sound delicious
2. Focus ONLY on flavors, textures, cooking methods, and ingredients
3. NEVER mention country, region, nationality, or geographical location
4. Don't use words like "traditional", "authentic", "classic" that might hint at origin
5. Avoid cultural references like "Italian", "Asian", "Mediterranean", "European", etc.

Examples of good blurbs:
- "A rich and creamy curry made with tender chicken in a mildly spiced tomato sauce, enriched with butter and cream."
- "Stir-fried rice noodles with a perfect balance of sweet, sour, and savory flavors, typically combined with eggs, tofu, bean sprouts, and crushed peanuts."
- "Delicate pasta parcels filled with seasoned meat and cheese, served in a savory broth."

Return ONLY the new blurb text, no other content.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const newBlurb = response.choices[0]?.message?.content?.trim();
      if (!newBlurb) {
        throw new Error("Empty response from OpenAI");
      }

      return newBlurb;
    } catch (error) {
      console.error(`Failed to generate new blurb for ${dish.name}:`, error);
      return null;
    }
  }

  /**
   * Check if a blurb contains country/geographical information
   */
  containsGeographicalInfo(blurb: string, country: string): boolean {
    const lowerBlurb = blurb.toLowerCase();
    const lowerCountry = country.toLowerCase();

    // Check for explicit country name
    if (lowerBlurb.includes(lowerCountry)) {
      return true;
    }

    // Check for common geographical/cultural descriptors
    const geographicalTerms = [
      "italian",
      "chinese",
      "japanese",
      "indian",
      "mexican",
      "french",
      "thai",
      "greek",
      "spanish",
      "korean",
      "vietnamese",
      "lebanese",
      "moroccan",
      "turkish",
      "german",
      "american",
      "british",
      "russian",
      "brazilian",
      "argentinian",
      "peruvian",
      "mediterranean",
      "asian",
      "european",
      "middle eastern",
      "latin american",
      "traditional",
      "authentic",
      "classic",
      "originated",
      "native",
      "regional",
    ];

    return geographicalTerms.some((term) => lowerBlurb.includes(term));
  }

  /**
   * Fix all dishes with problematic blurbs
   */
  async fixAllBlurbs(): Promise<void> {
    try {
      console.log("🔍 Fetching all dishes from database...");

      const { data: dishes, error } = await this.supabase
        .from("dishes")
        .select("*")
        .order("id");

      if (error) {
        throw error;
      }

      if (!dishes || dishes.length === 0) {
        console.log("No dishes found in database.");
        return;
      }

      console.log(
        `Found ${dishes.length} dishes. Checking for geographical information in blurbs...`
      );

      const problematicDishes = dishes.filter((dish) =>
        this.containsGeographicalInfo(dish.blurb, dish.country)
      );

      if (problematicDishes.length === 0) {
        console.log(
          "✅ No dishes found with geographical information in blurbs!"
        );
        return;
      }

      console.log(
        `🚨 Found ${problematicDishes.length} dishes with geographical information in blurbs:`
      );
      problematicDishes.forEach((dish) => {
        console.log(`  - ${dish.name}: "${dish.blurb}"`);
      });

      console.log("\n🤖 Generating new blurbs...");

      for (const dish of problematicDishes) {
        console.log(`\nProcessing: ${dish.name}`);
        console.log(`Current blurb: "${dish.blurb}"`);

        const newBlurb = await this.generateFixedBlurb(dish);

        if (!newBlurb) {
          console.log(`❌ Failed to generate new blurb for ${dish.name}`);
          continue;
        }

        console.log(`New blurb: "${newBlurb}"`);

        // Update the dish in the database
        const { error: updateError } = await this.supabase
          .from("dishes")
          .update({ blurb: newBlurb })
          .eq("id", dish.id);

        if (updateError) {
          console.error(`❌ Failed to update ${dish.name}:`, updateError);
        } else {
          console.log(`✅ Updated ${dish.name}`);
        }

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log("\n🎉 Finished fixing dish blurbs!");
    } catch (error) {
      console.error("💥 Error fixing blurbs:", error);
    }
  }

  /**
   * Preview what would be changed without actually updating
   */
  async previewChanges(): Promise<void> {
    try {
      console.log("🔍 Previewing changes (no actual updates)...");

      const { data: dishes, error } = await this.supabase
        .from("dishes")
        .select("*")
        .order("id");

      if (error) {
        throw error;
      }

      if (!dishes || dishes.length === 0) {
        console.log("No dishes found in database.");
        return;
      }

      const problematicDishes = dishes.filter((dish) =>
        this.containsGeographicalInfo(dish.blurb, dish.country)
      );

      if (problematicDishes.length === 0) {
        console.log(
          "✅ No dishes found with geographical information in blurbs!"
        );
        return;
      }

      console.log(
        `🚨 Found ${problematicDishes.length} dishes that would be updated:`
      );
      problematicDishes.forEach((dish) => {
        console.log(`\n📍 ${dish.name} (${dish.country})`);
        console.log(`   Current: "${dish.blurb}"`);
      });
    } catch (error) {
      console.error("💥 Error previewing changes:", error);
    }
  }
}

// Main execution
async function main() {
  try {
    const fixer = new BlurbFixer();

    const args = process.argv.slice(2);
    const command = args[0];

    if (command === "preview") {
      await fixer.previewChanges();
    } else if (command === "fix") {
      await fixer.fixAllBlurbs();
    } else {
      console.log("Usage:");
      console.log(
        "  npm run fix-blurbs preview  - Preview what would be changed"
      );
      console.log("  npm run fix-blurbs fix      - Actually fix the blurbs");
      console.log("");
      console.log("Environment variables required:");
      console.log("  NEXT_PUBLIC_SUPABASE_URL     - Your Supabase project URL");
      console.log(
        "  SUPABASE_SERVICE_ROLE_KEY    - Your Supabase service role key"
      );
      console.log(
        "  OPENAI_API_KEY               - Your OpenAI API key (only needed for 'fix' command)"
      );
    }
  } catch (error) {
    console.error("💥 Failed to initialize:", error);
    process.exit(1);
  }
}

main().catch(console.error);
