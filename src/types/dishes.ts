export interface Dish {
  id?: number; // Add database ID for tile APIs
  name: string;
  ingredients: string[];
  acceptableGuesses: string[];
  country: string;
  blurb: string;
  imageUrl: string;
  proteinPerServing?: number;
  recipe: {
    ingredients: string[];
    instructions: string[];
  };
  tags?: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
  region?: string;
  releaseDate?: string;
}

// Utility to enrich dishes with coordinates from a country map
export function enrichDishesWithCoords(
  dishes: Dish[],
  countryCoords: Record<string, { lat: number; lng: number }>
): Dish[] {
  return dishes.map((dish) => {
    const coords = countryCoords[dish.country.toLowerCase()];
    return coords ? { ...dish, coordinates: coords } : dish;
  });
}
