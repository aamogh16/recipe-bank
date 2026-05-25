# Recipe Search Feature — Decisions & Tradeoffs

## What was built

A native recipe search tab on the "Add Recipe" page. User types a recipe name, sees the top 5 Google results inline, clicks one, and Gemini imports it automatically — no copy-pasting URLs.

---

## Search API: Serper.dev

**Decision:** Use Serper.dev instead of Google Custom Search API.

**Why:**
- Google Custom Search requires setting up a Custom Search Engine (CSE) in Google Cloud Console, restricting to specific domains unless you pay for it, and has a 100 free queries/day limit before charging $5/1000.
- Serper.dev returns full Google organic results with one API key and no CSE setup. Free tier: 2,500 queries/month.

**Tradeoff:** Serper.dev is a third-party proxy over Google — if it goes down, search goes down. For a personal app at this scale, that's an acceptable dependency.

**Cost:** At normal usage (you + one friend, maybe 5–10 searches/day), 2,500 free queries/month is ~3–4 months of headroom before needing to pay.

**Env var required:** `SERPER_API_KEY` — add to `.env.local` and Vercel.

---

## Auto-import on result click (vs. pre-fill URL tab)

**Decision:** Clicking a result immediately triggers Gemini extraction. No intermediate step.

**Why:** Fewer taps, and the user picked the result intentionally. Showing a spinner on the clicked card gives clear feedback.

**Tradeoff:** No chance to preview or reject before Gemini starts. If the user misclicked, they'd have to wait for the import to finish and then delete the recipe. Acceptable for a personal app.

---

## Query suffix: always append "recipe"

**Decision:** `"chicken alfredo"` → `"chicken alfredo recipe"` before hitting Serper.

**Why:** Without the suffix, results can include restaurant listings, Wikipedia articles, and meal-kit ads. The suffix strongly biases toward actual recipe blog pages that Gemini can extract.

**Tradeoff:** User can't search for general cooking technique articles this way. Not a meaningful restriction for the "add a recipe" flow.

---

## Tab order: Search is the default

**Decision:** Tab order is Search → Import URL → Enter Manually. Search is shown by default.

**Why:** It's the most frictionless path for most use cases. Import URL still exists for when you already have a link.

---

## Debounce: 500ms

**Decision:** Search fires 500ms after the user stops typing.

**Why:** Balances responsiveness against API calls. At 500ms, a fast typist triggers ~1 search per word rather than one per keystroke. Serper charges per query, so minimizing unnecessary calls matters.

---

## Result count: 5

**Decision:** Show top 5 organic results.

**Why:** Enough options to pick from without overwhelming the UI. Mobile screen space is limited. Serper returns up to 10; 5 is the sweet spot.

---

## No favicon images

**Decision:** Show the domain name as text (e.g., "allrecipes.com") rather than trying to load favicon images.

**Why:** Favicon URLs are unreliable — many sites block hotlinking, return 404s, or require CORS. Serper doesn't consistently return favicon URLs either. Domain text is reliable and readable.

---

## API key stays server-side

**Decision:** The Serper API call is made from a Next.js Route Handler (`/api/search/recipes`), never from the browser.

**Why:** Exposing `SERPER_API_KEY` in client-side code would allow anyone to make queries billed to the account. Route Handler keeps it in the server environment only.

---

## No result filtering/ranking override

**Decision:** Trust Google's ranking. No attempt to filter by known recipe sites.

**Why:** Google already surfaces allrecipes.com, seriouseats.com, etc. for recipe queries. An allowlist would need constant maintenance and would block valid lesser-known recipe blogs. Gemini's extraction handles whatever URL it receives gracefully.

---

## Fallback if search fails

If the Serper API is unavailable or returns an error, the UI shows an error message below the search box. The "Import from URL" tab remains fully functional as a fallback.

---

## Setup required

1. Sign up at [serper.dev](https://serper.dev) → get API key
2. Add to `.env.local`:
   ```
   SERPER_API_KEY=your_key_here
   ```
3. Add `SERPER_API_KEY` to Vercel environment variables
