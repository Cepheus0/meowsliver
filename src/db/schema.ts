import {
  bigint,
  bigserial,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
]);

export const transactionSourceEnum = pgEnum("transaction_source", [
  "manual",
  "import",
]);

export const importModeEnum = pgEnum("import_mode", ["replace", "append"]);

export const importStatusEnum = pgEnum("import_status", [
  "previewed",
  "completed",
  "failed",
]);

export const importPreviewStatusEnum = pgEnum("import_preview_status", [
  "new",
  "duplicate",
  "conflict",
  "skipped",
]);

export const importRuns = pgTable(
  "import_runs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sourceFilename: text("source_filename").notNull(),
    sourceHash: text("source_hash"),
    mode: importModeEnum("mode").notNull().default("append"),
    status: importStatusEnum("status").notNull().default("previewed"),
    totalRows: integer("total_rows").notNull().default(0),
    newRows: integer("new_rows").notNull().default(0),
    duplicateRows: integer("duplicate_rows").notNull().default(0),
    conflictRows: integer("conflict_rows").notNull().default(0),
    skippedRows: integer("skipped_rows").notNull().default(0),
    notes: text("notes"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    sourceFilenameIdx: index("import_runs_source_filename_idx").on(
      table.sourceFilename
    ),
    sourceHashIdx: index("import_runs_source_hash_idx").on(table.sourceHash),
  })
);

export const transactions = pgTable(
  "transactions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    transactionDate: date("transaction_date", { mode: "string" }).notNull(),
    amountSatang: bigint("amount_satang", { mode: "number" }).notNull(),
    type: transactionTypeEnum("type").notNull(),
    category: text("category").notNull(),
    subcategory: text("subcategory"),
    note: text("note"),
    paymentChannel: text("payment_channel"),
    payFrom: text("pay_from"),
    recipient: text("recipient"),
    tag: text("tag"),
    fingerprint: text("fingerprint").notNull(),
    source: transactionSourceEnum("source").notNull().default("import"),
    importRunId: bigint("import_run_id", { mode: "number" }).references(
      () => importRuns.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    transactionDateIdx: index("transactions_transaction_date_idx").on(
      table.transactionDate
    ),
    typeIdx: index("transactions_type_idx").on(table.type),
    categoryIdx: index("transactions_category_idx").on(table.category),
    fingerprintIdx: index("transactions_fingerprint_idx").on(table.fingerprint),
    importRunIdx: index("transactions_import_run_idx").on(table.importRunId),
  })
);

export const importRunRows = pgTable(
  "import_run_rows",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    importRunId: bigint("import_run_id", { mode: "number" })
      .notNull()
      .references(() => importRuns.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    previewStatus: importPreviewStatusEnum("preview_status")
      .notNull()
      .default("new"),
    fingerprint: text("fingerprint").notNull(),
    duplicateTransactionId: bigint("duplicate_transaction_id", {
      mode: "number",
    }).references(() => transactions.id, { onDelete: "set null" }),
    rawRow: jsonb("raw_row").$type<Record<string, unknown>>().notNull(),
    normalizedRow: jsonb("normalized_row").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    importRunRowUnique: uniqueIndex("import_run_rows_import_run_row_number_uidx").on(
      table.importRunId,
      table.rowNumber
    ),
    previewStatusIdx: index("import_run_rows_preview_status_idx").on(
      table.previewStatus
    ),
    fingerprintIdx: index("import_run_rows_fingerprint_idx").on(
      table.fingerprint
    ),
  })
);

export const importRunsRelations = relations(importRuns, ({ many }) => ({
  transactions: many(transactions),
  rows: many(importRunRows),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  importRun: one(importRuns, {
    fields: [transactions.importRunId],
    references: [importRuns.id],
  }),
  duplicateMatches: many(importRunRows),
}));

export const importRunRowsRelations = relations(importRunRows, ({ one }) => ({
  importRun: one(importRuns, {
    fields: [importRunRows.importRunId],
    references: [importRuns.id],
  }),
  duplicateTransaction: one(transactions, {
    fields: [importRunRows.duplicateTransactionId],
    references: [transactions.id],
  }),
}));
