"use client";

import { useState } from "react";
import RecipeModeSelector, { type RecipeMode } from "./recipe-mode-selector";
import RecipeEditForm from "./recipe-edit-form";
import RecipeEditsSection from "./recipe-edits-section";
import RecipeListMode from "./recipe-list-mode";
import RecipeShoppingMode from "./recipe-shopping-mode";
import type { Recipe, Ingredient } from "@/db/schema";

type Edit = { id: string; field: string; oldValue: unknown; newValue: unknown; createdAt: Date };

interface Props {
  recipe: Recipe & { notes: { id: string; content: string; createdAt: Date }[] };
  edits: Edit[];
}

export default function RecipeModeContainer({ recipe, edits }: Props) {
  const [mode, setMode] = useState<RecipeMode>("viewing");
  const ingredients = recipe.ingredients as Ingredient[];

  return (
    <div className="space-y-8">
      {/* Mode selector row */}
      <div className="flex items-center justify-end">
        <RecipeModeSelector mode={mode} onChange={setMode} />
      </div>

      {/* Content */}
      {(mode === "viewing" || mode === "recipe") && (
        <>
          <RecipeEditForm recipe={recipe} forceEdit={mode === "recipe"} />
          {edits.length > 0 && mode === "viewing" && (
            <RecipeEditsSection edits={edits} />
          )}
        </>
      )}

      {mode === "list" && (
        <RecipeListMode
          recipeId={recipe.id}
          ingredients={ingredients}
        />
      )}

      {mode === "shopping" && (
        <RecipeShoppingMode
          recipeId={recipe.id}
          ingredients={ingredients}
          onGoToList={() => setMode("list")}
        />
      )}
    </div>
  );
}
