import OpenAI from "openai";

function createOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey });
}

export async function proposeDishCandidates(options: {
  existingNormalized: string[]; // normalized names/guesses
  maxSuggestions?: number;
}): Promise<Array<{ name: string; country: string }>> {
  const { existingNormalized, maxSuggestions = 3 } = options;

  const instruction = `You propose dish candidates for a food guessing game.
Constraints:
- Only propose dishes that are NOT in the provided existing list (normalized tokens, no spaces/punctuation).
- Return ${maxSuggestions} diverse, globally distributed dishes.
- Each item must include a clean dish name (no country words in the name) and a Title Case country of origin.
- Output ONLY a compact JSON array of {"name":"...","country":"..."} objects. No extra text.`;

  const existingList = existingNormalized.slice(0, 400).join(",");

  const messages = [
    {
      role: "user" as const,
      content: `${instruction}\n\nEXISTING_NORMALIZED_LIST=${existingList}`,
    },
  ];

  const openai = createOpenAI();
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    max_tokens: 400,
    messages,
  });

  const content = resp.choices[0]?.message?.content?.trim() || "[]";
  let json = content;
  if (json.startsWith("```")) {
    json = json.replace(/^```[a-zA-Z]*\n?/, "").replace(/```\s*$/, "");
  }

  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x) => x && x.name && x.country)
        .slice(0, maxSuggestions);
    }
  } catch {}

  return [];
}
