CREATE TYPE "public"."import_review_action" AS ENUM('import_as_new', 'keep_existing', 'skip');--> statement-breakpoint
ALTER TABLE "import_run_rows" ADD COLUMN "review_action" "import_review_action";