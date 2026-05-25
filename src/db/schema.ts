import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  vector,
  pgEnum,
} from "drizzle-orm/pg-core";
// userId columns store Clerk user IDs (e.g. "user_2abc123") — no separate users table needed
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const sourceTypeEnum = pgEnum("source_type", ["manual", "url", "tiktok"]);
export const complexityEnum = pgEnum("complexity", ["easy", "medium", "hard"]);

// ─── Recipes ──────────────────────────────────────────────────────────────────

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"),
  title: text("title").notNull(),
  sourceUrl: text("source_url"),
  sourceType: sourceTypeEnum("source_type").notNull().default("manual"),
  photoUrl: text("photo_url"),
  isFavorite: boolean("is_favorite").notNull().default(false),

  ingredients: jsonb("ingredients")
    .notNull()
    .$type<Ingredient[]>()
    .default([]),

  steps: jsonb("steps")
    .notNull()
    .$type<Step[]>()
    .default([]),

  originalServings: integer("original_servings"),
  currentServings: integer("current_servings"),

  cuisine: text("cuisine"),
  dishType: text("dish_type"),
  complexity: complexityEnum("complexity"),
  prepTimeMinutes: integer("prep_time_minutes"),
  totalTimeMinutes: integer("total_time_minutes"),
  flavorProfiles: jsonb("flavor_profiles").$type<string[]>().default([]),
  description: text("description"),

  // gemini-embedding-001 outputs 3072 dims
  embedding: vector("embedding", { dimensions: 3072 }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Recipe Notes ─────────────────────────────────────────────────────────────

export const recipeNotes = pgTable("recipe_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Cook Log ─────────────────────────────────────────────────────────────────

export const cookLog = pgTable("cook_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  cookedAt: timestamp("cooked_at").notNull().defaultNow(),
  notes: text("notes"),
});

// ─── Shopping Lists ───────────────────────────────────────────────────────────

export const shoppingLists = pgTable("shopping_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"),
  name: text("name").notNull().default("My Shopping List"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const shoppingListItems = pgTable("shopping_list_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  shoppingListId: uuid("shopping_list_id")
    .notNull()
    .references(() => shoppingLists.id, { onDelete: "cascade" }),
  // null = manually added item, not from a recipe
  recipeId: uuid("recipe_id").references(() => recipes.id, {
    onDelete: "set null",
  }),
  ingredientName: text("ingredient_name").notNull(),
  quantity: numeric("quantity"),
  unit: text("unit"),
  isChecked: boolean("is_checked").notNull().default(false),
  // For shopping mode price tracking
  storeQuantity: numeric("store_quantity"),
  storeUnit: text("store_unit"),
  storePrice: numeric("store_price"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Recipe Edits (change history) ───────────────────────────────────────────

export const recipeEdits = pgTable("recipe_edits", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  field: text("field").notNull(), // e.g. "ingredients", "steps", "servings"
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const recipesRelations = relations(recipes, ({ many }) => ({
  notes: many(recipeNotes),
  cookLog: many(cookLog),
  edits: many(recipeEdits),
  shoppingListItems: many(shoppingListItems),
}));

export const recipeNotesRelations = relations(recipeNotes, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeNotes.recipeId], references: [recipes.id] }),
}));

export const cookLogRelations = relations(cookLog, ({ one }) => ({
  recipe: one(recipes, { fields: [cookLog.recipeId], references: [recipes.id] }),
}));

export const recipeEditsRelations = relations(recipeEdits, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeEdits.recipeId], references: [recipes.id] }),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ many }) => ({
  items: many(shoppingListItems),
}));

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
  shoppingList: one(shoppingLists, {
    fields: [shoppingListItems.shoppingListId],
    references: [shoppingLists.id],
  }),
  recipe: one(recipes, {
    fields: [shoppingListItems.recipeId],
    references: [recipes.id],
  }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type Ingredient = {
  group: string;
  name: string;
  quantity: string;
  unit: string;
};

export type Step = {
  order: number;
  text: string;
};

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type RecipeNote = typeof recipeNotes.$inferSelect;
export type CookLogEntry = typeof cookLog.$inferSelect;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
