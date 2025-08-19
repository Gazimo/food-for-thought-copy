import { createClient } from "@supabase/supabase-js";
import type { NextApiRequest, NextApiResponse } from "next";
import sharp from "sharp";
import type { Database } from "../../types/database";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { dishId, tileIndex } = req.query;

  if (!dishId || !tileIndex) {
    return res.status(400).json({ error: "Missing dishId or tileIndex" });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Try to fetch pre-generated tile first
    const tileFilename = `tiles/${dishId}/regular-${tileIndex}.jpg`;
    const { data: tileData, error: tileError } = await supabase.storage
      .from("dish-tiles")
      .download(tileFilename);

    if (!tileError && tileData) {
      console.log(`✅ Serving pre-generated tile: ${tileFilename}`);

      // Convert blob to buffer
      const tileBuffer = Buffer.from(await tileData.arrayBuffer());

      // Set aggressive caching headers for pre-generated tiles
      res.setHeader("Cache-Control", "public, max-age=2592000, immutable"); // 30 days
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");

      return res.send(tileBuffer);
    }

    // Fallback to on-demand generation if pre-generated tile not found
    console.log(
      `⚠️ Pre-generated tile not found: ${tileFilename}, generating on-demand`
    );

    // Get dish data from database to find image URL
    const { data: dish, error: fetchError } = await supabase
      .from("dishes")
      .select("image_url")
      .eq("id", parseInt(dishId as string))
      .single();

    if (fetchError || !dish) {
      console.error(`Dish not found for dishId: ${dishId}`, fetchError);
      return res.status(404).json({ error: "Dish not found" });
    }

    if (!dish.image_url) {
      console.error(`No image URL for dishId: ${dishId}`);
      return res.status(404).json({ error: "No image available" });
    }

    // Fetch image from Supabase Storage
    const imageResponse = await fetch(dish.image_url);
    if (!imageResponse.ok) {
      console.error(`Failed to fetch image: ${dish.image_url}`);
      return res.status(404).json({ error: "Image not accessible" });
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Get original image
    const image = sharp(imageBuffer);

    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return res.status(500).json({ error: "Invalid image metadata" });
    }

    // Grid configuration - MUST match client exactly
    const cols = 3;
    const rows = 2;
    const tileNum = parseInt(tileIndex as string);

    if (tileNum < 0 || tileNum >= cols * rows) {
      return res.status(400).json({ error: "Invalid tile index" });
    }

    // First, resize the image to match the 3:2 aspect ratio that the client uses
    // Client calculates: height = (width / 3) * 2, so width:height = 3:2
    const targetAspectRatio = 3 / 2;

    let resizeWidth: number;
    let resizeHeight: number;

    const currentAspectRatio = metadata.width / metadata.height;

    if (currentAspectRatio > targetAspectRatio) {
      // Image is wider than 3:2, fit by height
      resizeHeight = metadata.height;
      resizeWidth = Math.round(resizeHeight * targetAspectRatio);
    } else {
      // Image is taller than 3:2, fit by width
      resizeWidth = metadata.width;
      resizeHeight = Math.round(resizeWidth / targetAspectRatio);
    }

    // Resize image to exact 3:2 aspect ratio
    const resizedImage = image.resize(resizeWidth, resizeHeight, {
      fit: "cover",
      position: "center",
    });

    // Now extract tiles from the resized image
    const row = Math.floor(tileNum / cols);
    const col = tileNum % cols;

    // Calculate tile dimensions
    const tileWidth = Math.floor(resizeWidth / cols);
    const tileHeight = Math.floor(resizeHeight / rows);

    // Calculate position
    const left = col * tileWidth;
    const top = row * tileHeight;

    // For edge tiles, extend to boundary
    const actualWidth = col === cols - 1 ? resizeWidth - left : tileWidth;
    const actualHeight = row === rows - 1 ? resizeHeight - top : tileHeight;

    // Extract the tile
    const tileBuffer = await resizedImage
      .extract({
        left: left,
        top: top,
        width: actualWidth,
        height: actualHeight,
      })
      .jpeg({
        quality: 95,
        progressive: false,
      })
      .toBuffer();

    // Set headers for on-demand generated tiles (shorter cache)
    res.setHeader("Cache-Control", "public, max-age=86400"); // 24 hours
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");

    return res.send(tileBuffer);
  } catch (error) {
    console.error("Error processing tile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
