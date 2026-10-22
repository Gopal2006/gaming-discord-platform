CREATE TABLE "external_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text DEFAULT 'discord' NOT NULL,
	"provider_subject_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_modules" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"module_key" text NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"config_json" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_settings" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"log_channel_id" text,
	"mod_log_channel_id" text,
	"welcome_channel_id" text,
	"welcome_message_template" text,
	"leave_channel_id" text,
	"leave_message_template" text,
	"schema_version" text DEFAULT '1.0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"owner_id" text NOT NULL,
	"bot_installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bot_removed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"realm" text NOT NULL,
	"guild_id" text,
	"actor_id" text NOT NULL,
	"actor_type" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"outcome" text NOT NULL,
	"reason" text,
	"correlation_id" text NOT NULL,
	"details_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"realm" text NOT NULL,
	"guild_id" text,
	"principal_type" text NOT NULL,
	"principal_id" text NOT NULL,
	"capability" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"effect" text DEFAULT 'allow' NOT NULL,
	"expires_at" timestamp with time zone,
	"granted_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text,
	"severity" text NOT NULL,
	"state" text DEFAULT 'detected' NOT NULL,
	"summary" text NOT NULL,
	"owner_id" text,
	"details_json" jsonb,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"job_name" text NOT NULL,
	"job_key" text NOT NULL,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"error_class" text,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text,
	"event_type" text NOT NULL,
	"event_version" integer DEFAULT 1 NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"action_type" text NOT NULL,
	"target_id" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "giveaways" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text,
	"prize" text NOT NULL,
	"winner_count" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"case_number" integer NOT NULL,
	"target_user_id" text NOT NULL,
	"moderator_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'applied' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"poll_id" text NOT NULL,
	"user_id" text NOT NULL,
	"option_index" integer NOT NULL,
	"voted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text,
	"question" text NOT NULL,
	"options_json" jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"closes_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"ticket_number" integer NOT NULL,
	"requester_id" text NOT NULL,
	"assigned_user_id" text,
	"channel_id" text,
	"category" text DEFAULT 'general' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"closed_at" timestamp with time zone,
	"retention_deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"is_platform_default" boolean DEFAULT false NOT NULL,
	"default_schema_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_definitions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "guild_game_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"game_definition_id" text,
	"name" text NOT NULL,
	"schema_version" text DEFAULT '1.0' NOT NULL,
	"profile_config_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"stage_index" integer DEFAULT 0 NOT NULL,
	"round_index" integer DEFAULT 0 NOT NULL,
	"match_index" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"participant_a_id" text,
	"participant_b_id" text,
	"score_a" integer DEFAULT 0 NOT NULL,
	"score_b" integer DEFAULT 0 NOT NULL,
	"winner_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"entrant_id" text NOT NULL,
	"entrant_type" text DEFAULT 'user' NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"answers_json" jsonb,
	"form_version" text DEFAULT '1.0' NOT NULL,
	"checked_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"name" text NOT NULL,
	"captain_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"game_profile_id" text NOT NULL,
	"title" text NOT NULL,
	"format" text DEFAULT 'single_elimination' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"max_entrants" integer DEFAULT 16 NOT NULL,
	"check_in_duration_minutes" integer DEFAULT 30 NOT NULL,
	"starts_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_modules" ADD CONSTRAINT "guild_modules_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_settings" ADD CONSTRAINT "guild_settings_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_grants" ADD CONSTRAINT "permission_grants_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_actions" ADD CONSTRAINT "scheduled_actions_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaways" ADD CONSTRAINT "giveaways_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_game_profiles" ADD CONSTRAINT "guild_game_profiles_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_game_profiles" ADD CONSTRAINT "guild_game_profiles_game_definition_id_game_definitions_id_fk" FOREIGN KEY ("game_definition_id") REFERENCES "public"."game_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_game_profile_id_guild_game_profiles_id_fk" FOREIGN KEY ("game_profile_id") REFERENCES "public"."guild_game_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_subject_unique" ON "external_identities" USING btree ("provider","provider_subject_id");--> statement-breakpoint
CREATE INDEX "idx_external_identities_user_id" ON "external_identities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_guild_modules_guild_module_unique" ON "guild_modules" USING btree ("guild_id","module_key");--> statement-breakpoint
CREATE INDEX "idx_guild_modules_guild_id" ON "guild_modules" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "idx_guilds_owner_id" ON "guilds" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires_at" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_audit_events_guild_id" ON "audit_events" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "idx_audit_events_actor_id" ON "audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_events_action" ON "audit_events" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_events_created_at" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_permission_grants_guild_id" ON "permission_grants" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "idx_permission_grants_principal" ON "permission_grants" USING btree ("principal_type","principal_id");--> statement-breakpoint
CREATE INDEX "idx_permission_grants_capability" ON "permission_grants" USING btree ("capability");--> statement-breakpoint
CREATE INDEX "idx_security_incidents_guild_id" ON "security_incidents" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "idx_security_incidents_state" ON "security_incidents" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_job_executions_job_name" ON "job_executions" USING btree ("job_name");--> statement-breakpoint
CREATE INDEX "idx_job_executions_status" ON "job_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_outbox_events_status_available" ON "outbox_events" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "idx_outbox_events_guild_id" ON "outbox_events" USING btree ("guild_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_scheduled_actions_idempotency" ON "scheduled_actions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_scheduled_actions_status_scheduled_for" ON "scheduled_actions" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_scheduled_actions_guild_id" ON "scheduled_actions" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "idx_giveaways_guild_status" ON "giveaways" USING btree ("guild_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mod_cases_guild_number" ON "moderation_cases" USING btree ("guild_id","case_number");--> statement-breakpoint
CREATE INDEX "idx_mod_cases_guild_target" ON "moderation_cases" USING btree ("guild_id","target_user_id");--> statement-breakpoint
CREATE INDEX "idx_mod_cases_guild_status" ON "moderation_cases" USING btree ("guild_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_poll_user_unique_vote" ON "poll_votes" USING btree ("poll_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_polls_guild_status" ON "polls" USING btree ("guild_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tickets_guild_number" ON "tickets" USING btree ("guild_id","ticket_number");--> statement-breakpoint
CREATE INDEX "idx_tickets_guild_status" ON "tickets" USING btree ("guild_id","status");--> statement-breakpoint
CREATE INDEX "idx_tickets_guild_requester" ON "tickets" USING btree ("guild_id","requester_id");--> statement-breakpoint
CREATE INDEX "idx_game_profiles_guild_id" ON "guild_game_profiles" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "idx_matches_tournament_round" ON "matches" USING btree ("tournament_id","round_index");--> statement-breakpoint
CREATE INDEX "idx_matches_guild_id" ON "matches" USING btree ("guild_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_registrations_tournament_entrant" ON "registrations" USING btree ("tournament_id","entrant_id");--> statement-breakpoint
CREATE INDEX "idx_registrations_tournament_status" ON "registrations" USING btree ("tournament_id","status");--> statement-breakpoint
CREATE INDEX "idx_registrations_guild_id" ON "registrations" USING btree ("guild_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_teams_guild_name" ON "teams" USING btree ("guild_id","name");--> statement-breakpoint
CREATE INDEX "idx_tournaments_guild_status" ON "tournaments" USING btree ("guild_id","status");