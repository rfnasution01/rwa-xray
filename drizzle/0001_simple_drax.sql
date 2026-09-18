CREATE TABLE "analysis_snapshots" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_snapshots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"rwa_id" integer NOT NULL,
	"methodology_version" text NOT NULL,
	"configuration_hash" text NOT NULL,
	"input_snapshot_ids" text[] NOT NULL,
	"metrics_json" jsonb NOT NULL,
	"score" numeric,
	"confidence" numeric NOT NULL,
	"calculated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_activity" (
	"rwa_id" integer PRIMARY KEY NOT NULL,
	"view_count" integer DEFAULT 1 NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issuers" (
	"issuer_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rwa_market_pairs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rwa_market_pairs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"rwa_id" integer NOT NULL,
	"market_id" integer NOT NULL,
	"exchange_id" integer NOT NULL,
	"exchange_name" text NOT NULL,
	"market_pair" text NOT NULL,
	"category" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"price" numeric,
	"volume_24h" numeric,
	"source_updated_at" timestamp with time zone,
	"observed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rwa_tokens" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rwa_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"rwa_id" integer NOT NULL,
	"crypto_id" integer NOT NULL,
	"issuer_id" text,
	"issuer_name" text,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"price" numeric,
	"market_cap" numeric,
	"volume_24h" numeric,
	"observed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rwa_assets" ADD COLUMN "has_tokens" boolean;--> statement-breakpoint
ALTER TABLE "rwa_assets" ADD COLUMN "first_historical_data" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rwa_assets" ADD COLUMN "last_historical_data" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rwa_assets" ADD COLUMN "metadata_json" jsonb;--> statement-breakpoint
ALTER TABLE "analysis_snapshots" ADD CONSTRAINT "analysis_snapshots_rwa_id_rwa_assets_rwa_id_fk" FOREIGN KEY ("rwa_id") REFERENCES "public"."rwa_assets"("rwa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_activity" ADD CONSTRAINT "asset_activity_rwa_id_rwa_assets_rwa_id_fk" FOREIGN KEY ("rwa_id") REFERENCES "public"."rwa_assets"("rwa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rwa_market_pairs" ADD CONSTRAINT "rwa_market_pairs_rwa_id_rwa_assets_rwa_id_fk" FOREIGN KEY ("rwa_id") REFERENCES "public"."rwa_assets"("rwa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rwa_tokens" ADD CONSTRAINT "rwa_tokens_rwa_id_rwa_assets_rwa_id_fk" FOREIGN KEY ("rwa_id") REFERENCES "public"."rwa_assets"("rwa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_snapshots_asset_calculated_uidx" ON "analysis_snapshots" USING btree ("rwa_id","calculated_at");--> statement-breakpoint
CREATE INDEX "analysis_snapshots_rwa_calculated_idx" ON "analysis_snapshots" USING btree ("rwa_id","calculated_at");--> statement-breakpoint
CREATE INDEX "asset_activity_last_viewed_idx" ON "asset_activity" USING btree ("last_viewed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rwa_pairs_asset_market_observed_uidx" ON "rwa_market_pairs" USING btree ("rwa_id","market_id","observed_at");--> statement-breakpoint
CREATE INDEX "rwa_pairs_rwa_observed_idx" ON "rwa_market_pairs" USING btree ("rwa_id","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rwa_tokens_asset_crypto_observed_uidx" ON "rwa_tokens" USING btree ("rwa_id","crypto_id","observed_at");--> statement-breakpoint
CREATE INDEX "rwa_tokens_rwa_observed_idx" ON "rwa_tokens" USING btree ("rwa_id","observed_at");--> statement-breakpoint
CREATE INDEX "rwa_assets_asset_type_rank_idx" ON "rwa_assets" USING btree ("asset_type","rwa_rank");--> statement-breakpoint
CREATE UNIQUE INDEX "rwa_quotes_rwa_observed_uidx" ON "rwa_quotes" USING btree ("rwa_id","observed_at");--> statement-breakpoint
CREATE INDEX "rwa_quotes_rwa_observed_idx" ON "rwa_quotes" USING btree ("rwa_id","observed_at");