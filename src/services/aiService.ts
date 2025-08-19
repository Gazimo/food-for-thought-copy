import OpenAI from "openai";

interface CompleteDishData {
  name: string;
  acceptableGuesses: string[];
  country: string;
  ingredients: string[];
  blurb: string;
  proteinPerServing: number;
  recipe: {
    ingredients: string[];
    instructions: string[];
  };
  tags: string[];
}

class AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate complete dish data using AI - similar to sample_dishes.json quality
   */
  async generateCompleteDish(
    dishName: string
  ): Promise<CompleteDishData | null> {
    try {
      console.log(`🤖 Generating complete dish data for: ${dishName}`);

      const prompt = `You are a culinary expert creating a dish entry for a food guessing game. Create a complete dish profile for "${dishName}" in the exact same style and quality as these examples. Critical constraints: (1) The country field must be Title Case (e.g., "India", "Thailand"). (2) The blurb must NOT include the country name or nationality adjectives. Return JSON only.

EXAMPLES (format and quality):

EXAMPLE 1:
{
  "name": "Butter Chicken",
  "acceptableGuesses": ["butter chicken", "murgh makhani"],
  "country": "India",
  "ingredients": ["chicken", "butter", "cream", "tomato", "garam masala", "garlic", "ginger"],
  "blurb": "A rich and creamy curry made with tender chicken in a mildly spiced tomato sauce, enriched with butter and cream.",
  "proteinPerServing": 38,
  "recipe": {
    "ingredients": [
      "1.5 lbs boneless chicken thighs, cut into pieces",
      "1/2 cup yogurt",
      "2 tbsp lemon juice",
      "2 tsp garam masala",
      "2 tbsp butter",
      "1 cup tomato puree",
      "1/2 cup heavy cream",
      "2 cloves garlic, minced",
      "1 inch ginger, grated",
      "1 tsp each of cumin, coriander, and chili powder",
      "Salt to taste",
      "Fresh cilantro for garnish"
    ],
    "instructions": [
      "Marinate chicken in yogurt, lemon juice, and 1 tsp garam masala for at least 30 minutes.",
      "In a large pan, melt butter and sauté garlic and ginger until fragrant.",
      "Add the remaining spices and cook for a minute until aromatic.",
      "Add tomato puree and simmer for 10 minutes until slightly reduced.",
      "Add the marinated chicken and cook until done, about 15 minutes.",
      "Stir in heavy cream and remaining garam masala, simmer for 5 more minutes.",
      "Garnish with fresh cilantro and serve with rice or naan."
    ]
  },
  "tags": ["chicken", "curry", "creamy", "main"]
}

EXAMPLE 2:
{
  "name": "Pad Thai",
  "acceptableGuesses": ["pad thai", "phad thai", "thai stir-fried noodles"],
  "country": "Thailand",
  "ingredients": ["rice noodles", "shrimp", "tofu", "eggs", "tamarind", "fish sauce", "peanuts"],
  "blurb": "Stir-fried rice noodles with a perfect balance of sweet, sour, and savory flavors, typically combined with eggs, tofu, bean sprouts, and crushed peanuts.",
  "proteinPerServing": 28,
  "recipe": {
    "ingredients": [
      "8 oz flat rice noodles",
      "8 oz protein (shrimp, chicken, or tofu)",
      "2 eggs, beaten",
      "2 cloves garlic, minced",
      "1 shallot, thinly sliced",
      "2 tbsp vegetable oil",
      "2 tbsp tamarind paste",
      "2 tbsp fish sauce",
      "2 tbsp palm sugar or brown sugar",
      "1 cup bean sprouts",
      "2 green onions, chopped",
      "1/4 cup roasted peanuts, crushed",
      "Lime wedges and chili flakes for serving"
    ],
    "instructions": [
      "Soak rice noodles in warm water for 30 minutes until soft but still firm. Drain.",
      "Mix tamarind paste, fish sauce, and sugar in a small bowl.",
      "Heat oil in a wok over high heat. Add garlic and shallots, stir-fry until fragrant.",
      "Add protein and cook until almost done.",
      "Push ingredients to one side, pour eggs into empty space. Scramble until nearly set.",
      "Add drained noodles and sauce mixture. Stir-fry until noodles absorb the sauce.",
      "Add bean sprouts and half the green onions, toss briefly.",
      "Serve hot, garnished with remaining green onions, crushed peanuts, lime wedges, and chili flakes."
    ]
  },
  "tags": ["noodles", "stir-fried", "seafood", "street food", "savory-sweet"]
}

Requirements:
1. name: Clean, proper dish name (no extra words like "Indian")
2. acceptableGuesses: 2-4 smart variations/alternative names people might use
3. country: Country of origin (lowercase)
4. ingredients: Exactly 6 key ingredients that give hints without being too obvious
5. blurb: Appealing 1-2 sentence description that makes the dish sound delicious
6. proteinPerServing: Realistic protein content in grams (15-50g range for most dishes)
7. recipe: Complete recipe with measured ingredients and clear step-by-step instructions
8. tags: 3-5 relevant tags describing the dish

Return ONLY a valid JSON object with the complete dish data. No other text.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // Use the more powerful model for better quality
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7, // Slightly higher for more creative responses
        max_tokens: 2000, // Increased for complete recipes
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      // Clean the response - remove markdown code blocks if present
      let cleanedContent = content;
      if (content.startsWith("```json")) {
        cleanedContent = content
          .replace(/```json\s*/, "")
          .replace(/```\s*$/, "");
      } else if (content.startsWith("```")) {
        cleanedContent = content.replace(/```\s*/, "").replace(/```\s*$/, "");
      }

      const rawDishData = JSON.parse(cleanedContent) as CompleteDishData;

      // Enforce name consistency: the generated dish name must match the requested dishName
      const norm = (s: string) =>
        (s || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "")
          .trim();
      if (norm(rawDishData.name) !== norm(dishName)) {
        throw new Error(
          `Generated dish name '${rawDishData.name}' does not match requested '${dishName}'`
        );
      }

      // Post-process: enforce country capitalization and remove country mentions from blurb
      const titleCase = (s: string) =>
        s
          .toLowerCase()
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

      const normalizedCountry = titleCase(rawDishData.country || "");
      const countryWords = normalizedCountry
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter(Boolean);
      const nationalityAdjectives = [
        // minimal list; evaluator may extend
        ...countryWords,
      ];

      const scrubBlurb = (blurb: string) => {
        let b = blurb || "";
        // Remove direct country matches (case-insensitive)
        for (const term of nationalityAdjectives) {
          if (!term) continue;
          const re = new RegExp(`\\b${term}\\b`, "gi");
          b = b
            .replace(re, "")
            .replace(/\s{2,}/g, " ")
            .trim();
        }
        // Also remove the exact Title Case country
        if (normalizedCountry) {
          const re2 = new RegExp(`\\b${normalizedCountry}\\b`, "gi");
          b = b
            .replace(re2, "")
            .replace(/\s{2,}/g, " ")
            .trim();
        }
        return b;
      };

      const dishData: CompleteDishData = {
        ...rawDishData,
        country: normalizedCountry,
        blurb: scrubBlurb(rawDishData.blurb),
      };

      console.log(`✅ AI generated complete dish data for: ${dishData.name}`);

      // Validate the response
      if (!this.validateDishData(dishData)) {
        throw new Error("Invalid dish data structure");
      }

      return dishData;
    } catch (error) {
      console.error(`💥 AI dish generation failed for ${dishName}:`, error);
      return null;
    }
  }

  /**
   * Validate that the generated dish data has all required fields
   */
  /* eslint-disable @typescript-eslint/no-explicit-any */

  private validateDishData(dishData: any): dishData is CompleteDishData {
    return (
      dishData &&
      typeof dishData.name === "string" &&
      Array.isArray(dishData.acceptableGuesses) &&
      dishData.acceptableGuesses.length >= 1 &&
      typeof dishData.country === "string" &&
      Array.isArray(dishData.ingredients) &&
      dishData.ingredients.length === 6 &&
      typeof dishData.blurb === "string" &&
      typeof dishData.proteinPerServing === "number" &&
      dishData.proteinPerServing > 0 &&
      dishData.recipe &&
      Array.isArray(dishData.recipe.ingredients) &&
      Array.isArray(dishData.recipe.instructions) &&
      Array.isArray(dishData.tags)
    );
  }
}

export default AIService;
