### Daily Dish Generator–Evaluator Plan

- **Objective**: Automatically add one high‑quality dish per day while minimizing OpenAI and Supabase costs and avoiding duplicates.

- **Pipeline**

  - **Proposer (Generator)**: Choose candidate dish names, preferring a curated backlog; only use LLM to propose names when backlog is low.
  - **Evaluator (Critic)**: Validate structure and quality with rules and a low‑cost model; enforce: country capitalized; blurb must not include the country name.
  - **Publisher**: Persist to Supabase with the next `release_date`, generate tiles, and log costs.

- **Cost controls**

  - Use curated backlog first (no cost). If needed, use a cheaper model to propose names covering under‑represented countries.
  - Generate exactly one `1024x1024` standard DALL·E image per accepted dish.
  - Pre-generate and cache tiles; consider slightly lower JPEG quality for regular tiles to reduce storage/egress.
  - Enforce daily/monthly caps via environment variables (skip when exceeded).

- **Duplication & data quality**

  - Before generating: fetch existing `name` and `acceptable_guesses`; reject near-duplicates (normalized comparisons).
  - Structural checks: exactly 6 ingredients, realistic protein, valid country, tags present.
  - Content checks: country must be Title Case; country must not appear in `blurb`.

- **Scheduling**

  - Daily job (GitHub Actions cron). Secrets required: `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
  - Maintain an N‑day buffer; generate only if the buffer is below target.

- **Implementation (Phase 1)**

  - `scripts/daily-generate.ts`: implements Generator–Evaluator–Publisher using existing `AIService` and `DishImageService`.
  - `src/data/dish_backlog.json`: curated candidate names.
  - Update `AIService` prompt + add sanitizer: Title Case country; remove country from blurb.
  - Add npm script: `daily-generate`.

- **Phase 2 (optional)**

  - Add LLM name proposer when backlog low; Slack/email alerts; budget caps; adjust tile JPEG quality.

- **Runbook**
  - Local: `npm run daily-generate "Dish Name"` (optional name to override backlog).
  - CI: GitHub Action runs daily; generates at most one dish if buffer < target.
