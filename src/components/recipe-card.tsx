import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Heart, Clock, UtensilsCrossed } from "lucide-react";

function isValidUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try { new URL(url); return true; } catch { return false; }
}

type Props = {
  recipe: {
    id: string;
    title: string;
    photoUrl: string | null;
    cuisine: string | null;
    dishType: string | null;
    complexity: string | null;
    isFavorite: boolean;
    totalTimeMinutes: number | null;
  };
};

export default function RecipeCard({ recipe }: Props) {
  return (
    <Link href={`/recipes/${recipe.id}`} className="group block rounded-xl overflow-hidden border border-border bg-card hover:border-primary transition-colors">
      <div className="relative aspect-square bg-muted">
        {recipe.photoUrl && isValidUrl(recipe.photoUrl) ? (
          <Image
            src={recipe.photoUrl}
            alt={recipe.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, 208px"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-neutral-800">
            <UtensilsCrossed size={40} className="text-neutral-600" />
          </div>
        )}
        {recipe.isFavorite && (
          <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
            <Heart size={14} className="fill-red-400 text-red-400" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-sm leading-tight line-clamp-2">{recipe.title}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {recipe.cuisine && (
            <Badge variant="secondary" className="text-xs">{recipe.cuisine}</Badge>
          )}
          {recipe.totalTimeMinutes && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={11} />
              {recipe.totalTimeMinutes}m
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
