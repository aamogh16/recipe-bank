# RecipeBank

A personal recipe collection app — import from any URL, search by vibe, and cook with confidence.

## Features

- **Import from URL** — paste any recipe link and Gemini extracts ingredients, steps, and metadata automatically
- **Semantic search** — search by vibe ("romantic dinner"), ingredient, cuisine, or flavor profile
- **Recipe editing** — inline edit mode for ingredients, steps, and metadata with change history
- **Serving scaler** — adjust servings and quantities scale automatically
- **Cook log** — track when you've cooked each recipe with a visual timeline
- **Shopping list** — add ingredients from any recipe, combine duplicates, sort and filter
- **Spice hub** — all ingredients across every recipe, sorted by popularity or newest
- **Favorites** — mark recipes and surface them on the home page

## Stack

- [Next.js](https://nextjs.org) (App Router)
- [Neon](https://neon.tech) — serverless Postgres with pgvector
- [Drizzle ORM](https://orm.drizzle.team)
- [Gemini](https://ai.google.dev) — recipe extraction and semantic embeddings
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- Deployed on [Vercel](https://vercel.com)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) database
- A [Gemini API key](https://ai.google.dev)

### Setup

```bash
git clone https://github.com/aamogh16/recipe-bank.git
cd recipe-bank
npm install
```

Create a `.env.local` file:

```env
DATABASE_URL=your_neon_connection_string
GEMINI_API_KEY=your_gemini_api_key
```

Run the database migrations:

```bash
npm run db:generate
npm run db:migrate
```

Start the dev server:

```bash
npm run dev
```

## Contributing

PRs are welcome. Please open a pull request against `main` — direct pushes to `main` are not allowed.

---

Made with love by Amogh · v1.0.0
