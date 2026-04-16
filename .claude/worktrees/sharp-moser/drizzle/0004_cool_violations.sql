CREATE TYPE "public"."account_type" AS ENUM('cash', 'bank_savings', 'bank_fixed', 'credit_card', 'investment', 'crypto', 'other');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"icon" text NOT NULL,
	"color" text NOT NULL,
	"current_balance_satang" bigint DEFAULT 0 NOT NULL,
	"credit_limit_satang" bigint,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "account_id" bigint;--> statement-breakpoint
CREATE INDEX "accounts_archived_sort_idx" ON "accounts" USING btree ("is_archived","sort_order");--> statement-breakpoint
CREATE INDEX "accounts_type_idx" ON "accounts" USING btree ("type");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_account_idx" ON "transactions" USING btree ("account_id");