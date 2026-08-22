CREATE TYPE "public"."ayanamsa_mode" AS ENUM('lahiri', 'lahiri_true_chitra', 'raman', 'krishnamurti', 'yukteshwar', 'fagan_bradley', 'suryasiddhanta', 'custom');--> statement-breakpoint
CREATE TYPE "public"."chart_style" AS ENUM('north', 'south', 'east', 'western_wheel');--> statement-breakpoint
CREATE TYPE "public"."house_system" AS ENUM('whole_sign', 'equal', 'sripati', 'placidus');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('owner', 'astrologer', 'assistant', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('mean', 'true');--> statement-breakpoint
CREATE TYPE "public"."offset_source" AS ENUM('tzdb', 'manual', 'lmt');--> statement-breakpoint
CREATE TYPE "public"."subject_kind" AS ENUM('person', 'entity', 'event', 'mundane');--> statement-breakpoint
CREATE TYPE "public"."subject_privacy" AS ENUM('private', 'workspace', 'shared');--> statement-breakpoint
CREATE TYPE "public"."subject_relationship" AS ENUM('self', 'partner', 'family', 'friend', 'client', 'public_figure', 'other');--> statement-breakpoint
CREATE TYPE "public"."time_accuracy" AS ENUM('exact', 'min5', 'min30', 'hour2', 'unknown');--> statement-breakpoint
CREATE TABLE "birth_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"label" text DEFAULT 'birth' NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"local_datetime" text NOT NULL,
	"utc_datetime" timestamp with time zone NOT NULL,
	"utc_offset_minutes" integer NOT NULL,
	"offset_source" "offset_source" NOT NULL,
	"offset_ambiguous" boolean DEFAULT false NOT NULL,
	"offset_note" text,
	"time_accuracy" time_accuracy DEFAULT 'exact' NOT NULL,
	"place_id" uuid,
	"place_name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"elevation_m" integer DEFAULT 0 NOT NULL,
	"timezone_id" text NOT NULL,
	"source_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"birth_event_id" uuid NOT NULL,
	"settings_profile_id" uuid,
	"astro_version" text NOT NULL,
	"computed" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"role" "membership_role" DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_user_id_workspace_id_pk" PRIMARY KEY("user_id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"geoname_id" integer,
	"name" text NOT NULL,
	"search_name" text NOT NULL,
	"admin1" text,
	"country_code" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"elevation_m" integer,
	"timezone_id" text NOT NULL,
	"population" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"ayanamsa" "ayanamsa_mode" DEFAULT 'lahiri' NOT NULL,
	"custom_ayanamsa_at_j2000" double precision,
	"node_type" "node_type" DEFAULT 'mean' NOT NULL,
	"house_system" "house_system" DEFAULT 'whole_sign' NOT NULL,
	"chart_style" chart_style DEFAULT 'north' NOT NULL,
	"include_outers" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"kind" "subject_kind" DEFAULT 'person' NOT NULL,
	"display_name" text NOT NULL,
	"given_names" text,
	"family_name" text,
	"pronouns" text,
	"photo_url" text,
	"relationship" "subject_relationship" DEFAULT 'other' NOT NULL,
	"is_client" boolean DEFAULT false NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"notes_summary" text,
	"privacy" "subject_privacy" DEFAULT 'workspace' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"default_settings_profile_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "birth_events" ADD CONSTRAINT "birth_events_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "birth_events" ADD CONSTRAINT "birth_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "birth_events" ADD CONSTRAINT "birth_events_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charts" ADD CONSTRAINT "charts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charts" ADD CONSTRAINT "charts_birth_event_id_birth_events_id_fk" FOREIGN KEY ("birth_event_id") REFERENCES "public"."birth_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charts" ADD CONSTRAINT "charts_settings_profile_id_settings_profiles_id_fk" FOREIGN KEY ("settings_profile_id") REFERENCES "public"."settings_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings_profiles" ADD CONSTRAINT "settings_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "birth_events_subject_idx" ON "birth_events" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "birth_events_workspace_idx" ON "birth_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "charts_birth_event_idx" ON "charts" USING btree ("birth_event_id");--> statement-breakpoint
CREATE INDEX "charts_workspace_idx" ON "charts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "memberships_workspace_idx" ON "memberships" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "places_geoname_idx" ON "places" USING btree ("geoname_id");--> statement-breakpoint
CREATE INDEX "places_search_idx" ON "places" USING btree ("search_name");--> statement-breakpoint
CREATE INDEX "places_population_idx" ON "places" USING btree ("population");--> statement-breakpoint
CREATE INDEX "settings_profiles_workspace_idx" ON "settings_profiles" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "subjects_workspace_idx" ON "subjects" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "subjects_name_idx" ON "subjects" USING btree ("workspace_id","display_name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_slug_idx" ON "workspaces" USING btree ("slug");