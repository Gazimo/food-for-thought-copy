import { Dish } from "@/types/dishes";
import Fuse from "fuse.js";
import { deobfuscateData } from "./encryption";

// Type for the sensitive data that gets encrypted/decrypted
interface SensitiveData {
  name: string;
  country: string;
  acceptableGuesses: string[];
  proteinPerServing?: number;
  ingredients: string[];
  recipe: {
    ingredients: string[];
    instructions: string[];
  };
  blurb: string;
  imageUrl: string;
  releaseDate?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateDirection(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  // Convert degrees to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1Rad = toRad(lat1);
  const lon1Rad = toRad(lon1);
  const lat2Rad = toRad(lat2);
  const lon2Rad = toRad(lon2);

  const y = Math.sin(lon2Rad - lon1Rad) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lon2Rad - lon1Rad);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  const direction = (bearing + 360) % 360;
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(direction / 45) % 8];
}

export function normalizeString(str: string) {
  return str.trim().toLowerCase();
}

export function isDishGuessCorrect(
  guess: string,
  dish: { name: string; acceptableGuesses?: string[] }
) {
  const normalizedGuess = normalizeString(guess);
  const possibleAnswers = [
    normalizeString(dish.name),
    ...(dish.acceptableGuesses?.map(normalizeString) || []),
  ];
  return possibleAnswers.includes(normalizedGuess);
}

export async function loadCountryCoords() {
  const response = await fetch("/data/countries.json");
  const data = await response.json();
  return data;
}

export function capitalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function loadDishes(): Promise<Dish[]> {
  const res = await fetch("/api/dishes");
  if (!res.ok) {
    throw new Error("Failed to load dishes");
  }

  const obfuscatedDishes = await res.json();

  if (!obfuscatedDishes || obfuscatedDishes.length === 0) {
    return [];
  }

  // Server now returns only today's dish, so just use the first one
  const todayObfuscatedDish = obfuscatedDishes[0];

  // Deobfuscate the sensitive data
  const sensitiveData = deobfuscateData<SensitiveData>(
    todayObfuscatedDish._encrypted,
    todayObfuscatedDish._salt
  );

  if (!sensitiveData) {
    return [];
  }

  // Reconstruct the complete dish object
  const completeDish: Dish = {
    ...todayObfuscatedDish,
    id: todayObfuscatedDish.id, // Include database ID for tile APIs
    name: sensitiveData.name,
    country: sensitiveData.country,
    acceptableGuesses: sensitiveData.acceptableGuesses,
    proteinPerServing: sensitiveData.proteinPerServing,
    ingredients: sensitiveData.ingredients,
    recipe: sensitiveData.recipe,
    blurb: sensitiveData.blurb,
    // Extract imageUrl and releaseDate from sensitive data
    imageUrl: sensitiveData.imageUrl,
    releaseDate: sensitiveData.releaseDate,
    // Extract coordinates from sensitive data
    coordinates: sensitiveData.coordinates,
  };

  // Clean up the encrypted fields
  delete (
    completeDish as Dish & {
      _encrypted?: string;
      _salt?: string;
      _checksum?: string;
    }
  )._encrypted;
  delete (
    completeDish as Dish & {
      _encrypted?: string;
      _salt?: string;
      _checksum?: string;
    }
  )._salt;
  delete (
    completeDish as Dish & {
      _encrypted?: string;
      _salt?: string;
      _checksum?: string;
    }
  )._checksum;

  return [completeDish];
}

export function getClosestGuess(
  input: string,
  options: string[]
): string | null {
  const normalizedInput = input.toLowerCase().trim();

  if (options.some((option) => option.toLowerCase() === normalizedInput)) {
    return options.find((option) => option.toLowerCase() === normalizedInput)!;
  }

  if (normalizedInput.length <= 3) {
    return null;
  }

  const fuse = new Fuse(options, {
    threshold: 0.4,
    includeScore: true,
    ignoreLocation: false,
    distance: 10,
  });

  const results = fuse.search(normalizedInput);

  if (results.length === 0) {
    return null;
  }

  const bestMatch = results[0];
  const target = bestMatch.item.toLowerCase();
  const score = bestMatch.score || 0;

  const similarityRatio = normalizedInput.length / target.length;

  let acceptableScoreThreshold: number;
  if (similarityRatio >= 0.8) {
    acceptableScoreThreshold = 0.4;
  } else if (similarityRatio >= 0.7) {
    acceptableScoreThreshold = 0.3;
  } else if (similarityRatio >= 0.5) {
    acceptableScoreThreshold = 0.2;
  } else {
    acceptableScoreThreshold = 0.1;
  }

  const isMeaningfulSubstring =
    target.includes(normalizedInput) &&
    normalizedInput.length / target.length > 0.3;

  const isReverseSubstring =
    normalizedInput.includes(target) &&
    target.length / normalizedInput.length > 0.3;

  if (
    score <= acceptableScoreThreshold ||
    isMeaningfulSubstring ||
    isReverseSubstring ||
    score <= 0.15
  ) {
    return bestMatch.item;
  }

  return null;
}
