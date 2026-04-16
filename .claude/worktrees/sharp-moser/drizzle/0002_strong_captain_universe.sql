CREATE TYPE "public"."savings_goal_category" AS ENUM('wedding', 'retirement', 'home_down_payment', 'education', 'emergency_fund', 'travel', 'custom');--> statement-breakpoint
CREATE TYPE "public"."savings_goal_entry_type" AS ENUM('contribution', 'growth', 'withdrawal', 'adjustment');--> statement-breakpoint
CREATE TABLE "savings_goal_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"savings_goal_id" bigint NOT NULL,
	"entry_date" date NOT NULL,
	"entry_type" "savings_goal_entry_type" NOT NULL,
	"amount_satang" bigint NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_goals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" "savings_goal_category" DEFAULT 'custom' NOT NULL,
	"icon" text NOT NULL,
	"color" text NOT NULL,
	"target_amount_satang" bigint NOT NULL,
	"target_date" date,
	"strategy_label" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "savings_goal_entries" ADD CONSTRAINT "savings_goal_entries_savings_goal_id_savings_goals_id_fk" FOREIGN KEY ("savings_goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "savings_goal_entries_goal_entry_date_idx" ON "savings_goal_entries" USING btree ("savings_goal_id","entry_date");--> statement-breakpoint
CREATE INDEX "savings_goal_entries_entry_type_idx" ON "savings_goal_entries" USING btree ("entry_type");--> statement-breakpoint
CREATE INDEX "savings_goals_category_idx" ON "savings_goals" USING btree ("category");--> statement-breakpoint
CREATE INDEX "savings_goals_target_date_idx" ON "savings_goals" USING btree ("target_date");