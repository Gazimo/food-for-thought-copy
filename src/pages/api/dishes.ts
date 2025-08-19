import { Dish, enrichDishesWithCoords } from "@/types/dishes";
import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";
import PostHogClient from "../../lib/posthog";
import { getCountryCoordsMap } from "../../utils/countries";
import { getDailySalt, obfuscateData } from "../../utils/encryption";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Calculate expiry time for the cache. The data is for the whole day,
  // so we can cache it until the next day.
  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );
  const secondsUntilTomorrow = Math.floor(
    (tomorrow.getTime() - now.getTime()) / 1000
  );

  // Set aggressive caching headers for the CDN.
  // s-maxage tells the CDN how long to cache.
  // stale-while-revalidate tells it to serve stale content while fetching a new version.
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${secondsUntilTomorrow}, stale-while-revalidate=60`
  );
  // Add a security header back.
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    return res.status(500).json({ error: "Database configuration error" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get today's date and fetch today's dish from Supabase
    const today = new Date().toISOString().split("T")[0];

    const { data: dishes, error } = await supabase
      .from("dishes")
      .select("*")
      .eq("release_date", today)
      .limit(1);

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({ error: "Failed to fetch dish data" });
    }

    if (!dishes || dishes.length === 0) {
      return res.status(404).json({ error: "No dish available for today" });
    }

    const todaysDish = dishes[0];

    // Convert Supabase dish format to our Dish interface
    const dish: Dish = {
      name: todaysDish.name,
      acceptableGuesses: todaysDish.acceptable_guesses || [],
      country: todaysDish.country,
      imageUrl: todaysDish.image_url, // This now has the randomized filename!
      ingredients: todaysDish.ingredients || [],
      blurb: todaysDish.blurb || "",
      proteinPerServing: todaysDish.protein_per_serving,
      recipe: {
        ingredients: todaysDish.recipe?.ingredients || [],
        instructions: todaysDish.recipe?.instructions || [],
      },
      tags: todaysDish.tags || [],
      region: todaysDish.region,
      releaseDate: todaysDish.release_date,
      coordinates: todaysDish.coordinates
        ? {
            lat: todaysDish.coordinates.lat || todaysDish.latitude,
            lng: todaysDish.coordinates.lng || todaysDish.longitude,
          }
        : undefined,
    };

    // Enrich the dish with coordinates if not already present
    const countryCoords = getCountryCoordsMap();
    const enrichedDishes = enrichDishesWithCoords([dish], countryCoords);
    const enrichedDish = enrichedDishes[0];

    // Get today's salt
    const salt = getDailySalt();

    // Process only today's dish
    const sensitiveData = {
      name: enrichedDish.name,
      country: enrichedDish.country,
      acceptableGuesses: enrichedDish.acceptableGuesses,
      proteinPerServing: enrichedDish.proteinPerServing,
      // Also hide ingredients and recipe as they can give hints
      ingredients: enrichedDish.ingredients,
      recipe: enrichedDish.recipe,
      blurb: enrichedDish.blurb,
      // Hide imageUrl and releaseDate as they can give away the answer
      imageUrl: enrichedDish.imageUrl,
      releaseDate: enrichedDish.releaseDate,
      // Hide coordinates as they're a dead giveaway for the country
      coordinates: enrichedDish.coordinates,
    };

    // Create obfuscated version of sensitive data
    const obfuscatedAnswers = obfuscateData(sensitiveData, salt);

    // Return only today's dish with sensitive fields removed and obfuscated data added
    const safeDish = {
      // Keep only non-sensitive visual data
      id: todaysDish.id, // Add database ID for tile APIs
      tags: enrichedDish.tags,
      region: enrichedDish.region,

      // Add obfuscated sensitive data
      _encrypted: obfuscatedAnswers,
      _salt: salt,

      // Add random dummy field to prevent pattern analysis
      _checksum: Math.random().toString(36).substring(7),
    };

    const posthog = PostHogClient();
    try {
      await posthog.capture({
        distinctId: req.headers.cookie || "anonymous",
        event: "api_dishes_retrieved",
        properties: {
          method: req.method,
          endpoint: req.url,
          count: 1, // Always 1 dish now
        },
      });
    } catch (error) {
      console.error("PostHog capture error:", error);
    }

    // Add additional security headers to prevent inspection
    res.setHeader("X-Robots-Tag", "noindex, nofollow, nosnippet, noarchive");
    res.setHeader("Referrer-Policy", "no-referrer");

    // Return as an array with a single dish for consistency
    res.status(200).json([safeDish]);
  } catch (error) {
    console.error("❌ API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
