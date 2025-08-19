import {
  Bean,
  Beef,
  ChefHat,
  Drumstick,
  Egg,
  Fish,
  Milk,
  Nut,
  Sprout,
} from "lucide-react";
import { IngredientDbItem } from "../types/ingredients";

export const INCLUDED_CATEGORIES = new Set([
  "meat_poultry",
  "seafood",
  "dairy_eggs",
  "legumes",
  "legumes_dry",
  "nuts_seeds",
  "plant_processed",
  "processed_meat",
  "meat",
  "spices_condiments",
  "grains",
  "vegetables",
  "fruits",
  "fats_oils",
  "baked_goods",
]);

const COMMON_WORDS = new Set(["water", "salt", "pepper", "sugar"]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getIngredientIcon(
  item: IngredientDbItem
): React.ComponentType<{ className?: string }> {
  const name = item.name.toLowerCase();
  const isBrothOrStock =
    name.includes("broth") ||
    name.includes("stock") ||
    name.includes("bouillon") ||
    name.includes("consommé") ||
    name.includes("soup base");

  if (name.includes("cheese") && !name.includes("cottage")) return ChefHat;
  if (
    name.includes("cottage") ||
    name.includes("ricotta") ||
    name.includes("cream cheese")
  )
    return Milk;
  if (
    name.includes("milk") ||
    name.includes("yogurt") ||
    name.includes("kefir")
  )
    return Milk;
  if (name.includes("egg") && !isBrothOrStock) return Egg;
  if (
    (name.includes("chicken") ||
      name.includes("turkey") ||
      name.includes("duck")) &&
    !isBrothOrStock
  )
    return Drumstick;
  if (
    (name.includes("beef") ||
      name.includes("pork") ||
      name.includes("lamb") ||
      name.includes("bacon") ||
      name.includes("ham")) &&
    !isBrothOrStock
  )
    return Beef;
  if (
    (name.includes("fish") ||
      name.includes("salmon") ||
      name.includes("tuna") ||
      name.includes("cod") ||
      name.includes("shrimp") ||
      name.includes("crab") ||
      name.includes("lobster")) &&
    !isBrothOrStock
  )
    return Fish;
  if (
    name.includes("bean") ||
    name.includes("lentil") ||
    name.includes("chickpea") ||
    name.includes("pea")
  )
    return Bean;
  if (
    name.includes("nut") ||
    name.includes("almond") ||
    name.includes("cashew") ||
    name.includes("peanut") ||
    name.includes("seed")
  )
    return Nut;
  if (
    name.includes("tofu") ||
    name.includes("tempeh") ||
    name.includes("seitan")
  )
    return Sprout;

  if (item.category === "meat_poultry") return Drumstick;
  if (item.category === "seafood") return Fish;
  if (item.category === "dairy_eggs") return Milk;
  if (item.category === "legumes" || item.category === "legumes_dry")
    return Bean;
  if (item.category === "nuts_seeds") return Nut;
  if (item.category === "plant_processed") return Sprout;
  if (item.category === "processed_meat") return Beef;

  return Egg;
}

export function findBestProteinMatch(
  ingredient: string,
  db: IngredientDbItem[]
): IngredientDbItem | null {
  const normalizedIngredient = normalize(ingredient);
  if (!normalizedIngredient) return null;

  let exactMatch: IngredientDbItem | null = null;
  let bestPartialMatch: IngredientDbItem | null = null;
  let bestCategoryMatch: IngredientDbItem | null = null;
  let bestPartialMatchScore = -1;
  let highestPartialProtein = -1;
  let highestCategoryProtein = -1;

  for (const item of db) {
    if (!INCLUDED_CATEGORIES.has(item.category)) continue;

    const normalizedDbName = normalize(item.name);
    const dbNameWords = normalizedDbName.split(" ");

    if (normalizedDbName === normalizedIngredient) {
      if (
        !exactMatch ||
        item.protein_g_per_100g > exactMatch.protein_g_per_100g
      ) {
        exactMatch = item;
      }
      continue;
    }

    const simplifiedIngredient = normalizedIngredient
      .replace(/\b(cheese|meat|fish|sauce|oil)\b/g, "")
      .trim();
    if (simplifiedIngredient && normalizedDbName === simplifiedIngredient) {
      if (
        !exactMatch ||
        item.protein_g_per_100g > exactMatch.protein_g_per_100g
      ) {
        exactMatch = item;
      }
      continue;
    }

    if (normalizedIngredient === "cheese" && item.category === "dairy_eggs") {
      const cheeseTypes = [
        "cheddar",
        "mozzarella",
        "parmesan",
        "feta",
        "gouda",
        "brie",
        "swiss",
        "blue",
        "cottage",
        "cream",
        "ricotta",
        "halloumi",
        "provolone",
        "manchego",
        "gruyere",
        "emmental",
      ];
      const isCheeseType = cheeseTypes.some(
        (cheeseType) =>
          normalizedDbName.includes(cheeseType) ||
          normalizedDbName.includes("cheese")
      );

      if (isCheeseType && item.protein_g_per_100g > highestCategoryProtein) {
        highestCategoryProtein = item.protein_g_per_100g;
        bestCategoryMatch = item;
      }
      continue;
    }

    const ingredientWords = normalizedIngredient.split(" ");
    let isValidMatch = false;

    const uncommonIngredientWords = ingredientWords.filter(
      (w) => !COMMON_WORDS.has(w)
    );
    if (uncommonIngredientWords.length === 0) continue;

    let matchCount = 0;
    let lastMatchIndex = -1;
    let inOrder = true;

    for (const ingredientWord of uncommonIngredientWords) {
      let foundMatch = false;
      for (let i = 0; i < dbNameWords.length; i++) {
        const dbWord = dbNameWords[i];
        if (dbWord === ingredientWord || dbWord.startsWith(ingredientWord)) {
          if (i > lastMatchIndex) {
            matchCount++;
            lastMatchIndex = i;
            foundMatch = true;
            break;
          } else {
            inOrder = false;
          }
        }
      }
      if (!foundMatch) {
        matchCount = 0;
        break;
      }
    }

    isValidMatch = matchCount === uncommonIngredientWords.length;

    if (isValidMatch) {
      const score =
        uncommonIngredientWords.length / dbNameWords.length + (inOrder ? 1 : 0);
      if (score > bestPartialMatchScore) {
        bestPartialMatchScore = score;
        bestPartialMatch = item;
        highestPartialProtein = item.protein_g_per_100g;
      } else if (score === bestPartialMatchScore) {
        if (item.protein_g_per_100g > highestPartialProtein) {
          bestPartialMatch = item;
          highestPartialProtein = item.protein_g_per_100g;
        }
      }
    }
  }

  return exactMatch || bestPartialMatch || bestCategoryMatch;
}
