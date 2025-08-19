import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { Database } from "../src/types/database";

// Initialize environment variables
dotenv.config({ path: ".env.local" });

// Configuration
const SOURCE_DIR = path.join(process.cwd(), "public", "images", "dishes");
const NEW_BUCKET_NAME = "dish-images-v2";
const START_ID = 45;

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase URL or service key is not defined.");
}
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function restoreImageUrls() {
  console.log("🚀 Starting recovery process...");

  // 1. Ensure the new bucket exists
  console.log(`Checking for bucket: ${NEW_BUCKET_NAME}`);
  const { data: buckets, error: bucketError } =
    await supabase.storage.listBuckets();
  if (bucketError)
    throw new Error(`Could not list buckets: ${bucketError.message}`);

  if (!buckets.find((b) => b.name === NEW_BUCKET_NAME)) {
    console.log(`Creating new bucket: ${NEW_BUCKET_NAME}...`);
    const { error: createError } = await supabase.storage.createBucket(
      NEW_BUCKET_NAME,
      {
        public: true,
      }
    );
    if (createError)
      throw new Error(`Could not create bucket: ${createError.message}`);
    console.log("✅ Bucket created successfully.");
  } else {
    console.log("✅ Bucket already exists.");
  }

  // 2. Read local image files
  const files = await fs.readdir(SOURCE_DIR);
  console.log(`Found ${files.length} local image files.`);

  // 3. Process each file
  for (const filename of files) {
    const dishId = parseInt(path.parse(filename).name, 10);

    if (isNaN(dishId) || dishId < START_ID) {
      continue; // Skip if not a valid ID or less than START_ID
    }

    console.log(`\n--- Processing Dish ID: ${dishId} ---`);

    try {
      // 4. Read file buffer
      const filePath = path.join(SOURCE_DIR, filename);
      const fileBuffer = await fs.readFile(filePath);

      // 5. Upload to new Supabase bucket
      console.log(`  Uploading ${filename} to bucket ${NEW_BUCKET_NAME}...`);
      const { error: uploadError } = await supabase.storage
        .from(NEW_BUCKET_NAME)
        .upload(filename, fileBuffer, {
          cacheControl: "3600",
          upsert: true, // Overwrite if it exists
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 6. Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(NEW_BUCKET_NAME).getPublicUrl(filename);

      console.log(`  Public URL: ${publicUrl}`);

      // 7. Update database record
      console.log(`  Updating database for dish ${dishId}...`);
      const { error: dbError } = await supabase
        .from("dishes")
        .update({ image_url: publicUrl })
        .eq("id", dishId);

      if (dbError) {
        throw new Error(`Database update failed: ${dbError.message}`);
      }

      console.log(`✅ Successfully processed and updated dish ${dishId}.`);
    } catch (error) {
      console.error(`❌ Failed to process dish ${dishId}:`, error);
    }
  }

  console.log("\n🎉 Recovery script finished.");
}

restoreImageUrls().catch(console.error);
