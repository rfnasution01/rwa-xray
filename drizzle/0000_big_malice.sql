CREATE TABLE "cmc_cache_entries" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL,
	"payload" jsonb NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"stale_until" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rwa_assets" (
	"rwa_id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"slug" text NOT NULL,
	"asset_type" text NOT NULL,
	"rwa_rank" integer,
	"source_updated_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rwa_quotes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rwa_quotes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"rwa_id" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"average_tokenized_price" numeric,
	"tokenized_market_cap" numeric,
	"tokenized_volume_24h" numeric,
	"source_updated_at" timestamp with time zone,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rwa_quotes" ADD CONSTRAINT "rwa_quotes_rwa_id_rwa_assets_rwa_id_fk" FOREIGN KEY ("rwa_id") REFERENCES "public"."rwa_assets"("rwa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cmc_cache_entries_expires_at_idx" ON "cmc_cache_entries" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "cmc_cache_entries_stale_until_idx" ON "cmc_cache_entries" USING btree ("stale_until");