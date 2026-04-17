ALTER TABLE "savings_goals" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "savings_goals_archived_idx" ON "savings_goals" USING btree ("is_archived");