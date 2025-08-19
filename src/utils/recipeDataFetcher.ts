import AIService from "../services/aiService";
import DishImageService from "../services/dishImageService";
import { Dish } from "../types/dishes";

interface GeneratedDishData extends Partial<Dish> {
  dataSource: "ai-generated";
  generatedAt: string;
  reviewStatus: "draft" | "reviewed" | "published";
  imageGeneration?: {
    source: string;
    cost: number;
    prompt: string;
    filename: string;
  };
}

class RecipeDataFetcher {
  private aiService: AIService;
  private imageService: DishImageService;

  constructor() {
    this.aiService = new AIService();
    this.imageService = new DishImageService();
  }

  async fetchDishData(dishName: string): Promise<GeneratedDishData | null> {
    console.log(`🚀 Generating complete dish data for: ${dishName}`);

    try {
      // Step 1: Generate complete dish data using AI
      const aiDishData = await this.aiService.generateCompleteDish(dishName);
      if (!aiDishData) {
        console.error(`❌ Failed to generate AI data for: ${dishName}`);
        return null;
      }

      // Step 2: Generate dish image
      console.log(`🎨 Generating image for: ${dishName}`);
      const imageResult = await this.imageService.generateDishImage({
        name: aiDishData.name,
        ingredients: aiDishData.ingredients,
        country: aiDishData.country,
        blurb: aiDishData.blurb,
        tags: aiDishData.tags,
      });

      // Convert AI data to our dish format
      const dishData: GeneratedDishData = {
        name: aiDishData.name,
        ingredients: aiDishData.ingredients,
        acceptableGuesses: aiDishData.acceptableGuesses,
        country: aiDishData.country,
        blurb: aiDishData.blurb,
        imageUrl: imageResult.imageUrl, // Set the generated image URL
        proteinPerServing: aiDishData.proteinPerServing,
        recipe: aiDishData.recipe,
        tags: aiDishData.tags,

        // Metadata
        dataSource: "ai-generated",
        generatedAt: new Date().toISOString(),
        reviewStatus: "draft",
        imageGeneration: {
          source: imageResult.source,
          cost: imageResult.cost,
          prompt: imageResult.prompt,
          filename: imageResult.filename,
        },
      };

      console.log(
        `✅ Generated complete dish data with image for: ${dishName}`
      );
      console.log(`💰 Image generation cost: $${imageResult.cost}`);
      this.logGeneratedData(dishData);

      return dishData;
    } catch (error) {
      console.error(`💥 Error generating dish data for ${dishName}:`, error);
      return null;
    }
  }

  /**
   * Generate dish data with multiple image options
   */
  async fetchDishDataWithImageOptions(
    dishName: string,
    imageCount: number = 2
  ): Promise<GeneratedDishData | null> {
    console.log(
      `🚀 Generating dish data with ${imageCount} image options for: ${dishName}`
    );

    try {
      // Step 1: Generate complete dish data using AI
      const aiDishData = await this.aiService.generateCompleteDish(dishName);
      if (!aiDishData) {
        console.error(`❌ Failed to generate AI data for: ${dishName}`);
        return null;
      }

      // Step 2: Generate multiple image variations
      console.log(
        `🎨 Generating ${imageCount} image variations for: ${dishName}`
      );
      const imageResults = await this.imageService.generateImageVariations(
        {
          name: aiDishData.name,
          ingredients: aiDishData.ingredients,
          country: aiDishData.country,
          blurb: aiDishData.blurb,
          tags: aiDishData.tags,
        },
        imageCount
      );

      if (imageResults.length === 0) {
        throw new Error("Failed to generate any images");
      }

      // Use the first image as the default
      const primaryImage = imageResults[0];
      const totalCost = imageResults.reduce(
        (sum, result) => sum + result.cost,
        0
      );

      const dishData: GeneratedDishData = {
        name: aiDishData.name,
        ingredients: aiDishData.ingredients,
        acceptableGuesses: aiDishData.acceptableGuesses,
        country: aiDishData.country,
        blurb: aiDishData.blurb,
        imageUrl: primaryImage.imageUrl,
        proteinPerServing: aiDishData.proteinPerServing,
        recipe: aiDishData.recipe,
        tags: aiDishData.tags,

        // Metadata
        dataSource: "ai-generated",
        generatedAt: new Date().toISOString(),
        reviewStatus: "draft",
        imageGeneration: {
          source: primaryImage.source,
          cost: totalCost,
          prompt: primaryImage.prompt,
          filename: primaryImage.filename,
        },
      };

      console.log(
        `✅ Generated dish data with ${imageResults.length} image options`
      );
      console.log(`💰 Total image generation cost: $${totalCost}`);
      console.log(
        `🖼️  Image options:`,
        imageResults.map((r) => r.filename)
      );

      this.logGeneratedData(dishData);

      return dishData;
    } catch (error) {
      console.error(
        `💥 Error generating dish data with image options for ${dishName}:`,
        error
      );
      return null;
    }
  }

  private logGeneratedData(data: GeneratedDishData): void {
    console.log("\n📊 GENERATED DISH SUMMARY:");
    console.log("==========================");
    console.log(`Name: ${data.name}`);
    console.log(`Country: ${data.country}`);
    console.log(`Image: ${data.imageUrl}`);
    console.log(`Ingredients: ${data.ingredients?.join(", ")}`);
    console.log(`Tags: ${data.tags?.join(", ")}`);
    console.log(`Protein: ${data.proteinPerServing}g`);
    if (data.imageGeneration) {
      console.log(`Image Cost: $${data.imageGeneration.cost}`);
      console.log(`Image File: ${data.imageGeneration.filename}`);
    }
    console.log("==========================\n");
  }
}

export default RecipeDataFetcher;
