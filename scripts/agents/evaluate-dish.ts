import OpenAI from "openai";

function createOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey });
}

export interface DishDraft {
  name: string;
  country: string;
  ingredients: string[];
  blurb: string;
  proteinPerServing: number;
  recipe: { ingredients: string[]; instructions: string[] };
  tags: string[];
}

export async function evaluateDishQuality(draft: DishDraft): Promise<{
  accept: boolean;
  reasons: string[];
}> {
  // Cheap, focused rubric; ensure blurb excludes country; 6 ingredients; plausible protein; clarity of recipe
  const instructions = `You are a strict dish quality evaluator for a food guessing game.
Return JSON only: {"accept": true|false, "reasons": ["..."]}
Criteria (all must pass):
1) country is Title Case and valid-sounding
2) blurb does NOT mention the country or nationality words
3) ingredients: exactly 6, plausible and non-redundant
4) proteinPerServing between 10 and 60 (inclusive)
5) recipe has >= 6 ingredients and >= 6 steps, clear and specific
6) tags: 3-6 items, relevant
Respond concisely.`;

  const content = JSON.stringify(draft);

  const openai = createOpenAI();
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 200,
    messages: [
      { role: "user", content: instructions },
      { role: "user", content },
    ],
  });

  let txt = resp.choices[0]?.message?.content?.trim() || "";
  if (txt.startsWith("```")) {
    txt = txt.replace(/^```[a-zA-Z]*\n?/, "").replace(/```\s*$/, "");
  }

  try {
    const parsed = JSON.parse(txt);
    return {
      accept: Boolean(parsed.accept),
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
    };
  } catch {
    return { accept: false, reasons: ["invalid evaluator response"] };
  }
}
