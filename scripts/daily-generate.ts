import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import AIService from "../src/services/aiService";
import DishImageService from "../src/services/dishImageService";
import { getCountryCoordsMap } from "../src/utils/countries";
// Deterministic evaluator: simple structural rules to avoid noisy LLM rejections
import { proposeDishCandidates } from "./agents/propose-dish";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:");
  if (!supabaseUrl) console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceKey) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const DAILY_COST_CAP_USD = parseFloat(process.env.DAILY_COST_CAP_USD || "0.25");
const TARGET_BUFFER_DAYS = parseInt(process.env.TARGET_BUFFER_DAYS || "14", 10);

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function titleCase(s: string) {
  return (s || "")
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function loadExistingDishes(supabase: any) {
  const { data, error } = await supabase
    .from("dishes")
    .select("id,name,acceptable_guesses,country,release_date,image_url")
    .order("release_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

type Candidate = {
  name: string;
  country?: string;
  source: "arg" | "backlog" | "ai";
};

async function buildCandidateQueue(existing: any[]): Promise<Candidate[]> {
  const queue: Candidate[] = [];
  const argName = process.argv.slice(2).join(" ");
  if (argName) queue.push({ name: argName, source: "arg" });

  const backlogPath = path.resolve(__dirname, "../src/data/dish_backlog.json");
  let backlog: Array<{ name: string; country?: string }> = [];
  if (fs.existsSync(backlogPath)) {
    backlog = JSON.parse(fs.readFileSync(backlogPath, "utf-8"));
  }
  // Take up to first 5 backlog items to try this run
  for (const item of backlog.slice(0, 5)) {
    queue.push({ name: item.name, country: item.country, source: "backlog" });
  }

  // Always fetch AI proposals (cheap) and append
  const normalizedExisting = new Set<string>();
  for (const d of existing) {
    normalizedExisting.add(normalize(d.name));
    const guesses: string[] = d.acceptable_guesses || [];
    for (const g of guesses) normalizedExisting.add(normalize(g));
  }
  const proposals = await proposeDishCandidates({
    existingNormalized: Array.from(normalizedExisting),
    maxSuggestions: 3,
  });
  for (const p of proposals) {
    queue.push({ name: p.name, country: p.country, source: "ai" });
  }

  // De-duplicate by normalized name
  const seen = new Set<string>();
  const deduped: Candidate[] = [];
  for (const c of queue) {
    const key = normalize(c.name);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
  }
  return deduped;
}

function removeFromBacklog(consumedName: string) {
  const backlogPath = path.resolve(__dirname, "../src/data/dish_backlog.json");
  if (!fs.existsSync(backlogPath)) return;
  const backlog = JSON.parse(fs.readFileSync(backlogPath, "utf-8")) as Array<{
    name: string;
    country?: string;
  }>;
  const remaining = backlog.filter(
    (x) => normalize(x.name) !== normalize(consumedName)
  );
  fs.writeFileSync(backlogPath, JSON.stringify(remaining, null, 2));
}

function isDuplicate(candidate: string, existing: any[]): boolean {
  const cand = normalize(candidate);
  for (const dish of existing) {
    if (normalize(dish.name) === cand) return true;
    const guesses: string[] = dish.acceptable_guesses || [];
    if (guesses.some((g) => normalize(g) === cand)) return true;
  }
  return false;
}

function countryValid(country?: string): boolean {
  if (!country) return true; // optional on backlog
  const coords = getCountryCoordsMap();
  const key = (country || "").toLowerCase().replace(/\s+/g, "");
  return Boolean(coords[key]);
}

async function getNextReleaseDate(supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from("dishes")
    .select("release_date")
    .order("release_date", { ascending: false })
    .limit(1);
  const base =
    error || !data || data.length === 0
      ? new Date()
      : new Date(String(data[0].release_date));
  base.setDate(base.getDate() + 1);
  return base.toISOString().split("T")[0];
}

async function countBufferDays(supabase: any): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("dishes")
    .select("release_date")
    .gte("release_date", today)
    .order("release_date", { ascending: true });
  if (error || !data) return 0;
  // days scheduled from today inclusive
  const last = data[data.length - 1]?.release_date as any;
  if (!last) return 0;
  const diff = Math.ceil(
    (new Date(String(last)).getTime() - new Date(today).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return Math.max(diff, 0);
}

async function main() {
  const supabase: any = createClient(supabaseUrl!, supabaseServiceKey!);
  const existing = await loadExistingDishes(supabase);

  const bufferDays = await countBufferDays(supabase);
  console.log(
    `📅 Current scheduled buffer: ${bufferDays} days (target ${TARGET_BUFFER_DAYS})`
  );
  if (bufferDays >= TARGET_BUFFER_DAYS) {
    console.log("✅ Buffer sufficient. Skipping generation.");
    return;
  }

  let spent = 0;
  const maxSpend = DAILY_COST_CAP_USD;

  const candidates = await buildCandidateQueue(existing);
  if (candidates.length === 0) {
    console.log("⚠️ No candidate found (args/backlog/AI). Skipping.");
    return;
  }

  const ai = new AIService();
  const imageService = new DishImageService();
  let generated: any = null;
  let usedCandidate: Candidate | null = null;

  const toTitleCase = (s: string) =>
    (s || "")
      .toLowerCase()
      .split(/\s+/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");

  const stripCountryFromBlurb = (blurb: string, country: string) => {
    let b = blurb || "";
    const words = (country || "")
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean);
    for (const w of words) {
      b = b.replace(new RegExp(`\\b${w}\\b`, "gi"), " ");
    }
    if (country) b = b.replace(new RegExp(`\\b${country}\\b`, "gi"), " ");
    return b.replace(/\s{2,}/g, " ").trim();
  };

  const deterministicEvaluate = (draft: {
    name: string;
    country: string;
    ingredients: string[];
    blurb: string;
    proteinPerServing: number;
    recipe: { ingredients: string[]; instructions: string[] };
    tags: string[];
  }): { accept: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    const countryOk = /^[A-Z][a-z]*(\s[A-Z][a-z]*)*$/.test(draft.country);
    if (!countryOk) reasons.push("country not Title Case");
    const blurbHasCountry = new RegExp(`\\b${draft.country}\\b`, "i").test(
      draft.blurb || ""
    );
    if (blurbHasCountry) reasons.push("blurb contains country");
    if (!draft.ingredients || draft.ingredients.length !== 6)
      reasons.push("ingredients must be exactly 6");
    if (!draft.recipe || (draft.recipe.ingredients || []).length < 6)
      reasons.push("recipe.ingredients must be >= 6");
    if (!draft.recipe || (draft.recipe.instructions || []).length < 6)
      reasons.push("instructions must be >= 6 steps");
    if (!draft.tags || draft.tags.length < 3 || draft.tags.length > 6)
      reasons.push("tags must be 3-6 items");
    const accept = reasons.length === 0;
    return { accept, reasons };
  };

  for (const cand of candidates) {
    console.log(`🔎 Trying candidate: ${cand.name} (${cand.source})`);
    if (isDuplicate(cand.name, existing)) {
      console.log(`⚠️ Duplicate found, skipping: ${cand.name}`);
      if (cand.source === "backlog") removeFromBacklog(cand.name);
      continue;
    }
    if (cand.country && !countryValid(cand.country)) {
      console.log(`⚠️ Unrecognized country hint: ${cand.country} (continuing)`);
    }

    const textOnly = await ai.generateCompleteDish(cand.name);
    if (!textOnly) {
      console.log("❌ Text generation failed, trying next candidate.");
      if (cand.source === "backlog") removeFromBacklog(cand.name);
      continue;
    }

    // Sanitize before evaluation
    const countryTitle = toTitleCase(textOnly.country || "");
    const sanitizedBlurb = stripCountryFromBlurb(
      textOnly.blurb || "",
      countryTitle
    );
    const sanitizedTopIngredients = (textOnly.ingredients || []).slice(0, 6);

    const evalResult = deterministicEvaluate({
      name: textOnly.name,
      country: countryTitle,
      ingredients: sanitizedTopIngredients,
      blurb: sanitizedBlurb,
      proteinPerServing: textOnly.proteinPerServing,
      recipe: textOnly.recipe,
      tags: textOnly.tags,
    });
    if (!evalResult.accept) {
      console.log("❌ Evaluator rejected:", evalResult.reasons.join("; "));
      if (cand.source === "backlog") removeFromBacklog(cand.name);
      continue;
    }

    const imageResult = await imageService.generateDishImage({
      name: textOnly.name,
      ingredients: sanitizedTopIngredients,
      country: countryTitle,
      blurb: sanitizedBlurb,
      tags: textOnly.tags,
    });

    generated = {
      ...textOnly,
      country: countryTitle,
      ingredients: sanitizedTopIngredients,
      blurb: sanitizedBlurb,
      imageUrl: imageResult.imageUrl,
      imageGeneration: {
        source: imageResult.source,
        cost: imageResult.cost,
        prompt: imageResult.prompt,
        filename: imageResult.filename,
      },
    };
    usedCandidate = cand;
    break;
  }

  if (!generated) {
    console.log("🚫 No acceptable candidate found this run. Skipping save.");
    return;
  }

  // Double-check duplicates with the actual generated name
  if (isDuplicate(generated.name || "", existing)) {
    console.log(
      `❌ Evaluator rejected: generated name duplicates existing dish/guess: ${generated.name}`
    );
    return;
  }

  // Evaluator: enforce constraints before saving
  const countryTitle = titleCase(generated.country || "");
  const blurb = generated.blurb || "";
  const containsCountry =
    countryTitle && new RegExp(`\\b${countryTitle}\\b`, "i").test(blurb);
  const containsCountryWord = countryTitle
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .some((w) => new RegExp(`\\b${w}\\b`, "i").test(blurb));

  if (containsCountry || containsCountryWord) {
    console.log(
      "❌ Evaluator rejected: blurb contains country name/adjective."
    );
    return;
  }

  if (!generated.ingredients || generated.ingredients.length !== 6) {
    console.log("❌ Evaluator rejected: ingredients must be exactly 6.");
    return;
  }

  // Country capitalization fix
  (generated as any).country = countryTitle;

  // Cost accounting: image is the main cost (~$0.04)
  if (generated.imageGeneration?.cost) {
    spent += generated.imageGeneration.cost;
  } else {
    spent += 0.04;
  }

  if (spent > maxSpend) {
    console.log(
      `⚠️ Budget exceeded (spent ~$${spent.toFixed(
        2
      )} > cap $${maxSpend.toFixed(2)}). Skipping save.`
    );
    return;
  }

  // Compute release date and save using SmartDishGenerator save logic
  const nextRelease = await (async () => {
    try {
      return await getNextReleaseDate(supabase);
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  })();

  (generated as any).releaseDate = nextRelease;

  // Compute coordinates based on country (same logic as SmartDishGenerator)
  const coordsMap = getCountryCoordsMap();
  const normCountry = (generated.country || "")
    .toLowerCase()
    .replace(/\s+/g, "");
  let coords: { lat: number; lng: number } | null =
    (coordsMap as any)[normCountry] || null;
  if (!coords) {
    for (const [countryKey, value] of Object.entries(coordsMap)) {
      if (
        countryKey.includes(normCountry) ||
        normCountry.includes(countryKey)
      ) {
        coords = value as any;
        break;
      }
    }
  }
  const coordinatesString = coords ? `(${coords.lng},${coords.lat})` : null;

  // Manually perform DB insert (same as SmartDishGenerator.saveDishToDatabase)
  const dishToInsert = {
    name: generated.name,
    acceptable_guesses: generated.acceptableGuesses,
    country: generated.country,
    image_url: generated.imageUrl || null,
    ingredients: generated.ingredients,
    blurb: generated.blurb,
    protein_per_serving: generated.proteinPerServing || 0,
    recipe: generated.recipe,
    tags: generated.tags || [],
    release_date: (generated as any).releaseDate,
    coordinates: coordinatesString,
    region: null,
  };

  console.log("\n💾 Saving to database...");
  const { data, error } = await supabase
    .from("dishes")
    .insert([dishToInsert])
    .select();
  if (error) {
    console.error("❌ Database error:", error.message);
    return;
  }
  const savedDish = data?.[0];
  console.log(`✅ Dish saved with ID: ${savedDish?.id}`);

  // Generate tiles using original saved image (if available)
  if (savedDish && savedDish.id && generated.imageUrl) {
    console.log("\n🔲 Generating tiles for optimal performance...");
    // Reuse SmartDishGenerator tile method via local helper (copy minimal logic)
    const { default: Sharp } = await import("sharp");

    try {
      const imageResponse = await fetch(generated.imageUrl);
      if (!imageResponse.ok)
        throw new Error(`Failed to fetch image: ${generated.imageUrl}`);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      const image = (Sharp as any)(imageBuffer);
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height)
        throw new Error("Invalid image metadata");

      const targetAspectRatio = 3 / 2;
      const currentAspectRatio = metadata.width / metadata.height;
      let resizeWidth: number;
      let resizeHeight: number;
      if (currentAspectRatio > targetAspectRatio) {
        resizeHeight = metadata.height;
        resizeWidth = Math.round(resizeHeight * targetAspectRatio);
      } else {
        resizeWidth = metadata.width;
        resizeHeight = Math.round(resizeWidth / targetAspectRatio);
      }

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
        const regularTileBuffer = await baseImage
          .clone()
          .extract({ left, top, width: actualWidth, height: actualHeight })
          .jpeg({ quality: 92, progressive: false })
          .toBuffer();

        const blurredTileBuffer = await baseImage
          .clone()
          .extract({ left, top, width: actualWidth, height: actualHeight })
          .blur(40)
          .modulate({ brightness: 0.8, saturation: 0.6 })
          .jpeg({ quality: 40 })
          .toBuffer();

        const prefix = (isBlurred: boolean) =>
          isBlurred ? "blurred" : "regular";
        const filenameRegular = `tiles/${savedDish.id}/${prefix(
          false
        )}-${tileIndex}.jpg`;
        const filenameBlurred = `tiles/${savedDish.id}/${prefix(
          true
        )}-${tileIndex}.jpg`;

        const { error: upErr1 } = await supabase.storage
          .from("dish-tiles")
          .upload(filenameRegular, regularTileBuffer, {
            contentType: "image/jpeg",
            upsert: true,
          });
        if (upErr1) throw new Error(upErr1.message);

        const { error: upErr2 } = await supabase.storage
          .from("dish-tiles")
          .upload(filenameBlurred, blurredTileBuffer, {
            contentType: "image/jpeg",
            upsert: true,
          });
        if (upErr2) throw new Error(upErr2.message);
      }

      console.log(`✅ Tiles generated successfully for ${generated.name}`);
    } catch (e) {
      console.error("❌ Failed to generate tiles:", e);
    }
  }

  // Remove from backlog after success
  if (usedCandidate && usedCandidate.source === "backlog") {
    removeFromBacklog(usedCandidate.name);
  }

  console.log("\n🎉 Daily generation completed successfully.");
}

main().catch((e) => {
  console.error("💥 Error in daily generator:", e);
  process.exit(1);
});
