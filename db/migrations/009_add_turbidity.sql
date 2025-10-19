-- Migration: Add turbidity column to well_metrics
-- Generated: 2025-10-19
-- Run this in Supabase SQL Editor to add the turbidity column to existing well_metrics table

ALTER TABLE public.well_metrics 
ADD COLUMN IF NOT EXISTS turbidity numeric(10,2);

COMMENT ON COLUMN public.well_metrics.turbidity IS 'Water turbidity measurement in NTU (Nephelometric Turbidity Units)';

-- Optional: Create index if you plan to query/filter by turbidity frequently
-- CREATE INDEX IF NOT EXISTS idx_well_metrics_turbidity ON public.well_metrics(turbidity);
