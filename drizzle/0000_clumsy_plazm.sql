CREATE TYPE "public"."import_mode" AS ENUM('replace', 'append');--> statement-breakpoint
CREATE TYPE "public"."import_preview_status" AS ENUM('new', 'duplicate', 'conflict', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('previewed', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."transaction_source" AS ENUM('manual', 'import');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense', 'transfer');--> statement-breakpoint
CREATE TABLE "import_run_rows" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"import_run_id" bigint NOT NULL,
	"row_number" integer NOT NULL,
	"preview_status" "import_preview_status" DEFAULT 'new' NOT NULL,
	"fingerprint" text NOT NULL,
	"duplicate_transaction_id" bigint,
	"raw_row" jsonb NOT NULL,
	"normalized_row" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_filename" text NOT NULL,
	"source_hash" text,
	"mode" "import_mode" DEFAULT 'append' NOT NULL,
	"status" "import_status" DEFAULT 'previewed' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"new_rows" integer DEFAULT 0 NOT NULL,
	"duplicate_rows" integer DEFAULT 0 NOT NULL,
	"conflict_rows" integer DEFAULT 0 NOT NULL,
	"skipped_rows" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"transaction_date" date NOT NULL,
	"amount_satang" bigint NOT NULL,
	"type" "transaction_type" NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"note" text,
	"payment_channel" text,
	"pay_from" text,
	"recipient" text,
	"tag" text,
	"fingerprint" text NOT NULL,
	"source" "transaction_source" DEFAULT 'import' NOT NULL,
	"import_run_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_run_rows" ADD CONSTRAINT "import_run_rows_import_run_id_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_run_rows" ADD CONSTRAINT "import_run_rows_duplicate_transaction_id_transactions_id_fk" FOREIGN KEY ("duplicate_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_run_id_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "import_run_rows_import_run_row_number_uidx" ON "import_run_rows" USING btree ("import_run_id","row_number");--> statement-breakpoint
CREATE INDEX "import_run_rows_preview_status_idx" ON "import_run_rows" USING btree ("preview_status");--> statement-breakpoint
CREATE INDEX "import_run_rows_fingerprint_idx" ON "import_run_rows" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "import_runs_source_filename_idx" ON "import_runs" USING btree ("source_filename");--> statement-breakpoint
CREATE INDEX "import_runs_source_hash_idx" ON "import_runs" USING btree ("source_hash");--> statement-breakpoint
CREATE INDEX "transactions_transaction_date_idx" ON "transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_type_idx" ON "transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "transactions_category_idx" ON "transactions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "transactions_fingerprint_idx" ON "transactions" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "transactions_import_run_idx" ON "transactions" USING btree ("import_run_id");