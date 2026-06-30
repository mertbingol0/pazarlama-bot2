CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp(0) DEFAULT now(),
	CONSTRAINT "teams_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_teams_code" ON "teams" USING btree ("code");