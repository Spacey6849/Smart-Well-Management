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
CREATE TYPE public.well_health_status AS ENUM ('healthy', 'warning', 'critical');

-- Table: admin_accounts
CREATE TABLE public.admin_accounts (
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
CREATE TABLE public.users (
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
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  token character varying(255) NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_token_key UNIQUE (token)
);

-- Table: user_wells
CREATE TABLE public.user_wells (
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
CREATE TABLE public.well_metrics (
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
CREATE TABLE public.chat_messages (
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
CREATE INDEX idx_sessions_token ON public.sessions(token);
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at);
CREATE INDEX idx_user_wells_user_id ON public.user_wells(user_id);
CREATE INDEX idx_user_wells_panchayat ON public.user_wells(panchayat_name);
CREATE INDEX idx_well_metrics_well_id ON public.well_metrics(well_id);
CREATE INDEX idx_well_metrics_ts ON public.well_metrics(ts DESC);
CREATE INDEX idx_chat_messages_username ON public.chat_messages(username);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

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
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Users can manage their own wells
CREATE POLICY "Users can view own wells" ON public.user_wells
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wells" ON public.user_wells
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wells" ON public.user_wells
  FOR UPDATE USING (auth.uid() = user_id);

-- Well metrics readable by well owner
CREATE POLICY "Users can view metrics for own wells" ON public.well_metrics
  FOR SELECT USING (
    well_id IN (SELECT id FROM public.user_wells WHERE user_id = auth.uid())
  );

-- Chat messages readable by username match
CREATE POLICY "Users can view own chat messages" ON public.chat_messages
  FOR SELECT USING (
    username IN (
      SELECT username FROM public.users WHERE id = auth.uid()
      UNION
      SELECT username FROM public.admin_accounts WHERE id = auth.uid()
    )
  );

-- Admin accounts (service role only)
CREATE POLICY "Service role can manage admin accounts" ON public.admin_accounts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Sessions (service role only for security)
CREATE POLICY "Service role can manage sessions" ON public.sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

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
