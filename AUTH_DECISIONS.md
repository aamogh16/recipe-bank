# Auth Implementation Decisions

Running log of non-obvious decisions made during the multi-user auth implementation.

---

## Auth Provider: Clerk

**Decision:** Use Clerk (`@clerk/nextjs`) instead of hand-rolling auth or using NextAuth.

**Why:** Clerk handles session management, token rotation, CSRF protection, OAuth, and rate-limiting out of the box. NextAuth requires a database adapter and still leaves security details to you. Hand-rolling is a security liability. For a 2-person personal app, Clerk's free tier is more than enough.

**Tradeoff:** External service dependency. If Clerk goes down, auth goes down. Mitigated by the fact that it's a personal app, not production SaaS.

---

## No Separate `users` Table

**Decision:** Store Clerk's userId string (e.g., `user_2abc123`) directly as a `text` column on rows that need ownership. No `users` table in our DB.

**Why:** A `users` table would just be a mirror of Clerk's data (email, name, avatar) that we'd have to keep in sync via webhooks. We don't need to query user data in SQL, so the join gains us nothing. Clerk's dashboard is the canonical user store.

**Tradeoff:** Can't do SQL joins on user data (e.g., "show admin view of all users' recipes"). Fine for this use case.

---

## Which Tables Get `userId`

- **`recipes`** — yes, recipes are per-user
- **`cookLog`** — yes, cook history is personal
- **`shoppingLists`** — yes, shopping lists are personal
- **`recipeNotes`** — no, accessed only through recipe (recipe ownership covers it)
- **`recipeEdits`** — no, same reason — only recipe owner can edit
- **`shoppingListItems`** — no, scoped through shoppingList.userId

---

## Nullable `userId` in Migration

**Decision:** Added `userId text` without `.notNull()` constraint.

**Why:** Adding a NOT NULL column to existing tables requires either a DEFAULT value (we don't know user IDs at migration time) or a backfill. Making it nullable lets the migration run cleanly against tables that have existing rows.

**Consequence:** Existing rows have `userId = NULL` and will be invisible to all users (every query filters `WHERE user_id = $userId`). **You need to either TRUNCATE your existing data or run a backfill after setting up Clerk and knowing your userId.** Recommended: `TRUNCATE recipes CASCADE;` in Neon after Clerk is configured.

**Future:** Once the app is stable and populated with user data, consider adding a NOT NULL constraint with a database migration that first backfills any remaining NULLs.

---

## Recipe Ownership Check on All Mutations

**Decision:** GET/PUT/DELETE on `/api/recipes/[id]` all verify `recipe.userId === authedUserId`, returning 404 (not 403) if mismatch.

**Why:** 404 avoids leaking that the resource exists at all. Both "not found" and "belongs to someone else" map to the same user-facing outcome.

**Tradeoff:** Slightly misleading error code, but it's standard practice.

---

## Shopping List Singleton Pattern Extended to Per-User

**Decision:** `getOrCreateList(userId)` finds or creates one default shopping list per user.

**Why:** The original "singleton list" design assumed one global list. Extending it per-user is the minimal change: just filter by userId. Each user gets exactly one list, created on demand.

**Tradeoff:** Users can't have multiple named lists. This is a known limitation and can be added later.

---

## Shopping Item Ownership Verified via List Join

**Decision:** PATCH/DELETE on `/api/shopping/items/[id]` fetches the item with its list and checks `list.userId === authedUserId`.

**Why:** Items don't have their own userId column. Ownership is established through the list. This means one extra DB query per mutation, but it's correct.

---

## Semantic Search SQL Gets a WHERE Clause

**Decision:** Raw SQL in `/api/recipes/search` gets `AND user_id = ${userId}` added.

**Why:** The route uses `db.execute(sql\`...\`)` instead of the Drizzle query builder (needed for vector ops). Had to add the filter manually in the SQL string rather than composing with Drizzle's `.where()`.

**Note:** userId is passed as a parameterized value (`${userId}` inside Drizzle's `sql` tag), so it's safe from injection.

---

## Sign-In/Sign-Up: Embedded Clerk Components

**Decision:** Use `<SignIn />` and `<SignUp />` on our own pages (`/sign-in`, `/sign-up`) instead of redirecting to Clerk's hosted pages.

**Why:** Better UX — users stay on the same domain. The embedded components are fully customizable and work identically to hosted.

**Tradeoff:** More setup (creating those pages), but minimal code.

---

## Dark Mode Appearance for Clerk Components

**Decision:** Pass `appearance.variables` to `<ClerkProvider>` to match the app's dark theme without installing `@clerk/themes`.

**Why:** The app forces dark mode with `<html className="dark">`. Clerk's default components respect `prefers-color-scheme`, not Tailwind's dark class, so without customization they'd show up light. Passing color variables directly avoids an extra package.

---

## Middleware Protects All Routes; APIs Also Check Independently

**Decision:** The Clerk middleware protects all non-public routes. Every API route also independently calls `auth()` and returns 401 if unauthenticated.

**Why:** Defense in depth. If middleware is misconfigured or a route is added without being in the matcher, the API handler still won't serve data. This is especially important since Next.js sometimes bypasses middleware for certain direct API calls.

---

## `cookLog.userId` Instead of Inheriting from Recipe

**Decision:** Added `userId` directly to `cookLog` rows rather than looking it up through the recipe relation.

**Why:** Makes the cook log query simple and fast — no join needed. Also future-proofs for a world where users can share recipes (cook someone else's recipe and have it in your personal log).

---

## Next.js 16: `middleware.ts` → `proxy.ts`

**Decision:** The Clerk middleware lives in `src/proxy.ts`, not `src/middleware.ts`.

**Why:** Next.js 16 renamed the file convention from `middleware` to `proxy`. Using the old name causes a "Cannot find the middleware module" runtime error in dev (Turbopack). The structure and API are identical — just the filename changed.

---

## Clerk v7 API Change: `afterSignOutUrl` Moved to `ClerkProvider`

**Decision:** `afterSignOutUrl="/sign-in"` is set on `<ClerkProvider>` in layout, not on `<UserButton>`.

**Why:** Clerk v7 (the installed version) removed `afterSignOutUrl` from `<UserButton>`. The sign-out redirect is now configured globally on the provider.

---

## Environment Variables Required

After setting up a Clerk application at clerk.com, add these to `.env.local` and Vercel:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```
