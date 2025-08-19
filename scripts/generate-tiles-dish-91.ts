import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import sharp from "sharp";
import type { Database } from "../src/types/database";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateTilesForDish91() {
  console.log("🔲 Generating tiles for dish 91...");

  // Get dish 91
  const { data: dish, error } = await supabase
    .from("dishes")
    .select("id, name, image_url")
    .eq("id", 91)
    .single();

  if (error || !dish) {
    console.error("Could not find dish 91:", error);
    return;
  }

  console.log(`Dish: ${dish.name}`);
  console.log(`Image URL: ${dish.image_url}`);

  // Download image from Supabase (one-time egress cost)
  const response = await fetch(dish.image_url);
  if (!response.ok) {
    throw new Error("Failed to fetch image");
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  console.log(`Image size: ${metadata.width}x${metadata.height}`);

  // Calculate resize dimensions (3:2 aspect ratio)
  const targetAspectRatio = 3 / 2;
  const currentAspectRatio = metadata.width! / metadata.height!;

  let resizeWidth: number;
  let resizeHeight: number;

  if (currentAspectRatio > targetAspectRatio) {
    resizeHeight = metadata.height!;
    resizeWidth = Math.round(resizeHeight * targetAspectRatio);
  } else {
    resizeWidth = metadata.width!;
    resizeHeight = Math.round(resizeWidth / targetAspectRatio);
  }

  console.log(`Resized dimensions: ${resizeWidth}x${resizeHeight}`);

  // Generate all 6 tiles
  const cols = 3;
  const rows = 2;

  for (let tileIndex = 0; tileIndex < 6; tileIndex++) {
    const row = Math.floor(tileIndex / cols);
    const col = tileIndex % cols;

    const tileWidth = Math.floor(resizeWidth / cols);
    const tileHeight = Math.floor(resizeHeight / rows);

    const left = col * tileWidth;
    const top = row * tileHeight;
    const actualWidth = col === cols - 1 ? resizeWidth - left : tileWidth;
    const actualHeight = row === rows - 1 ? resizeHeight - top : tileHeight;

    const baseImage = image.resize(resizeWidth, resizeHeight, {
      fit: "cover",
      position: "center",
    });

    // Generate regular tile
    const regularTileBuffer = await baseImage
      .clone()
      .extract({ left, top, width: actualWidth, height: actualHeight })
      .jpeg({ quality: 95, progressive: false })
      .toBuffer();

    // Generate blurred tile
    const blurredTileBuffer = await baseImage
      .clone()
      .extract({ left, top, width: actualWidth, height: actualHeight })
      .blur(40)
      .modulate({ brightness: 0.8, saturation: 0.6 })
      .jpeg({ quality: 40 })
      .toBuffer();

    // Upload tiles
    const regularFilename = `tiles/91/regular-${tileIndex}.jpg`;
    const blurredFilename = `tiles/91/blurred-${tileIndex}.jpg`;

    const { error: regularError } = await supabase.storage
      .from("dish-tiles")
      .upload(regularFilename, regularTileBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    const { error: blurredError } = await supabase.storage
      .from("dish-tiles")
      .upload(blurredFilename, blurredTileBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (regularError || blurredError) {
      console.error(
        `Error uploading tile ${tileIndex}:`,
        regularError || blurredError
      );
    } else {
      console.log(
        `✅ Generated tile ${tileIndex} - regular: ${regularTileBuffer.length} bytes, blurred: ${blurredTileBuffer.length} bytes`
      );
    }
  }

  console.log("🎉 All tiles generated for dish 91!");

  // Verify tiles were created
  const { data: tiles } = await supabase.storage
    .from("dish-tiles")
    .list("tiles/91/");

  console.log(`📊 Verification: ${tiles?.length || 0} tiles found in storage`);
}

generateTilesForDish91().catch(console.error);
