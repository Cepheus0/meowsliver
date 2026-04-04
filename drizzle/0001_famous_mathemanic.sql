DROP INDEX "transactions_fingerprint_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_fingerprint_uidx" ON "transactions" USING btree ("fingerprint");