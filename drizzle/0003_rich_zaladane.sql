ALTER TABLE "cook_log" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "shopping_lists" ADD COLUMN "user_id" text;