ALTER TABLE "guild_settings" ADD COLUMN IF NOT EXISTS "is_emergency_stopped" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "guild_settings" ADD COLUMN IF NOT EXISTS "emergency_stopped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guild_settings" ADD COLUMN IF NOT EXISTS "emergency_stopped_by_actor_id" text;--> statement-breakpoint
ALTER TABLE "guild_settings" ADD COLUMN IF NOT EXISTS "emergency_stop_reason" text;
