-- EcoWell Supabase Schema
-- Generated: 2025-10-19
-- This schema reflects the current production Supabase database structure.
-- Run this in Supabase SQL Editor to recreate the database from scratch.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (careful: this will delete all data)
-- Uncomment the lines below only if you want to recreate from scratch
-- DROP TABLE IF EXISTS public.well_metrics CASCADE;
-- DROP TABLE IF EXISTS public.user_wells CASCADE;
-- DROP TABLE IF EXISTS public.chat_messages CASCADE;
-- DROP TABLE IF EXISTS public.sessions CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;
-- DROP TABLE IF EXISTS public.admin_accounts CASCADE;
-- DROP TYPE IF EXISTS public.well_health_status CASCADE;

-- Create custom enum type for well health status
-- Added 'poor' as an accepted status to tolerate legacy values like 'Poor' or 'poor'
-- Create the enum if it doesn't exist, and add missing values if present in existing DBs.
-- This DO block is idempotent: re-running it will not fail when the type already exists.
DO $$
BEGIN
  -- If the type does not yet exist, create it with the accepted values.
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'well_health_status') THEN
    CREATE TYPE public.well_health_status AS ENUM ('healthy', 'warning', 'critical', 'poor');
  ELSE
    -- If the type exists, ensure the 'poor' label is present. Add it if missing.
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'well_health_status' AND e.enumlabel = 'poor'
    ) THEN
      ALTER TYPE public.well_health_status ADD VALUE 'poor';
    END IF;

    -- Optionally tolerate legacy capitalized values. Add 'Poor' only if absent.
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'well_health_status' AND e.enumlabel = 'Poor'
    ) THEN
      BEGIN
        -- Adding a second label that differs only by case is generally not recommended,
        -- but some data may contain 'Poor' with capital P. This attempts to add it safely.
        ALTER TYPE public.well_health_status ADD VALUE 'Poor';
      EXCEPTION WHEN duplicate_object THEN
        -- ignore if for any reason it was added concurrently
        NULL;
      END;
    END IF;
  END IF;
END
$$;

-- Table: admin_accounts
CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying(255) NOT NULL,
  username character varying(100) NOT NULL,
  password_hash character varying(255) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT admin_accounts_email_key UNIQUE (email),
  CONSTRAINT admin_accounts_username_key UNIQUE (username)
);

-- Table: users
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying(255) NOT NULL,
  username character varying(100) NOT NULL,
  full_name character varying(255),
  phone character varying(20),
  panchayat_name character varying(255),
  location character varying(255),
  password_hash character varying(255) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  email_verified boolean DEFAULT false,
  email_verification_token character varying(255),
  email_verification_sent_at timestamp with time zone,
  password_reset_token text,
  password_reset_expires timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_username_key UNIQUE (username)
);

-- Table: sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  token character varying(255) NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_token_key UNIQUE (token)
);

-- Table: user_wells
CREATE TABLE IF NOT EXISTS public.user_wells (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name character varying(255) NOT NULL,
  panchayat_name character varying(255),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  status character varying(50) DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  village_name character varying(255),
  depth numeric(10,2),
  CONSTRAINT user_wells_pkey PRIMARY KEY (id),
  CONSTRAINT user_wells_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES public.users(id) ON DELETE CASCADE
);

-- Table: well_metrics
CREATE TABLE IF NOT EXISTS public.well_metrics (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  well_id uuid NOT NULL,
  ph numeric(4,2),
  tds integer,
  temperature numeric(5,2),
  water_level numeric(10,2),
  turbidity numeric(10,2),
  ts timestamp with time zone NOT NULL DEFAULT now(),
  well_name character varying(255),
  well_health public.well_health_status,
  CONSTRAINT well_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT well_metrics_well_id_fkey FOREIGN KEY (well_id) 
    REFERENCES public.user_wells(id) ON DELETE CASCADE
);

-- Table: chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  role character varying(20) NOT NULL,
  content text NOT NULL,
  username character varying(100) NOT NULL,
  response text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_role_check CHECK (role IN ('user', 'assistant'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_wells_user_id ON public.user_wells(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wells_panchayat ON public.user_wells(panchayat_name);
CREATE INDEX IF NOT EXISTS idx_well_metrics_well_id ON public.well_metrics(well_id);
CREATE INDEX IF NOT EXISTS idx_well_metrics_ts ON public.well_metrics(ts DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_username ON public.chat_messages(username);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Row Level Security (RLS) - Optional but recommended
-- Enable RLS on tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.well_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

-- Example RLS Policies (customize based on your security requirements)
-- Users can read their own data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Users can view own profile' AND polrelid = 'public.users'::regclass
  ) THEN
    CREATE POLICY "Users can view own profile" ON public.users
      FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Users can update own profile' AND polrelid = 'public.users'::regclass
  ) THEN
    CREATE POLICY "Users can update own profile" ON public.users
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END
$$;

-- Users can manage their own wells
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Users can view own wells' AND polrelid = 'public.user_wells'::regclass
  ) THEN
    CREATE POLICY "Users can view own wells" ON public.user_wells
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Users can insert own wells' AND polrelid = 'public.user_wells'::regclass
  ) THEN
    CREATE POLICY "Users can insert own wells" ON public.user_wells
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Users can update own wells' AND polrelid = 'public.user_wells'::regclass
  ) THEN
    CREATE POLICY "Users can update own wells" ON public.user_wells
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Well metrics readable by well owner
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Users can view metrics for own wells' AND polrelid = 'public.well_metrics'::regclass
  ) THEN
    CREATE POLICY "Users can view metrics for own wells" ON public.well_metrics
      FOR SELECT USING (
        well_id IN (SELECT id FROM public.user_wells WHERE user_id = auth.uid())
      );
  END IF;
END
$$;

-- Allow inserting metrics for wells owned by the authenticated user (or by the service role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Users can insert metrics for own wells' AND polrelid = 'public.well_metrics'::regclass
  ) THEN
    CREATE POLICY "Users can insert metrics for own wells" ON public.well_metrics
      FOR INSERT WITH CHECK (
        auth.jwt()->>'role' = 'service_role'
        OR well_id IN (SELECT id FROM public.user_wells WHERE user_id = auth.uid())
      );
  END IF;
END
$$;

-- Chat messages readable by username match
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Users can view own chat messages' AND polrelid = 'public.chat_messages'::regclass
  ) THEN
    CREATE POLICY "Users can view own chat messages" ON public.chat_messages
      FOR SELECT USING (
        username IN (
          SELECT username FROM public.users WHERE id = auth.uid()
          UNION
          SELECT username FROM public.admin_accounts WHERE id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Admin accounts (service role only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Service role can manage admin accounts' AND polrelid = 'public.admin_accounts'::regclass
  ) THEN
    CREATE POLICY "Service role can manage admin accounts" ON public.admin_accounts
      FOR ALL USING (auth.jwt()->>'role' = 'service_role');
  END IF;
END
$$;

-- Sessions (service role only for security)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Service role can manage sessions' AND polrelid = 'public.sessions'::regclass
  ) THEN
    CREATE POLICY "Service role can manage sessions" ON public.sessions
      FOR ALL USING (auth.jwt()->>'role' = 'service_role');
  END IF;
END
$$;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant service_role full access
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.users IS 'Application users (panchayat members)';
COMMENT ON TABLE public.admin_accounts IS 'Admin users with elevated privileges';
COMMENT ON TABLE public.sessions IS 'User and admin authentication sessions';
COMMENT ON TABLE public.user_wells IS 'Wells registered by users';
COMMENT ON TABLE public.well_metrics IS 'Time-series sensor data for wells';
COMMENT ON TABLE public.chat_messages IS 'AI chatbot conversation history';
COMMENT ON COLUMN public.well_metrics.turbidity IS 'Water turbidity measurement (NTU)';
COMMENT ON COLUMN public.well_metrics.well_health IS 'Calculated health status: healthy, warning, or critical';
COMMENT ON COLUMN public.chat_messages.response IS 'Assistant reply stored with user message';
