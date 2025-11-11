-- =====================================================
-- Simple Migration: Add Enhanced Metrics Columns
-- Date: 2025-11-10
-- Description: Safely adds new columns to existing well_metrics table
-- =====================================================

-- Add new columns one by one (safe to run multiple times)
ALTER TABLE public.well_metrics 
  ADD COLUMN IF NOT EXISTS conductivity numeric(10,2),
  ADD COLUMN IF NOT EXISTS dissolved_oxygen numeric(10,2),
  ADD COLUMN IF NOT EXISTS hardness numeric(10,2),
  ADD COLUMN IF NOT EXISTS chloride numeric(10,2),
  ADD COLUMN IF NOT EXISTS fluoride numeric(10,2),
  ADD COLUMN IF NOT EXISTS nitrate numeric(10,2),
  ADD COLUMN IF NOT EXISTS sulfate numeric(10,2),
  ADD COLUMN IF NOT EXISTS iron numeric(10,2),
  ADD COLUMN IF NOT EXISTS manganese numeric(10,2),
  ADD COLUMN IF NOT EXISTS arsenic numeric(10,3),
  ADD COLUMN IF NOT EXISTS lead numeric(10,3),
  ADD COLUMN IF NOT EXISTS source character varying(50) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_well_metrics_well_id_ts 
  ON public.well_metrics(well_id, ts DESC);

CREATE INDEX IF NOT EXISTS idx_well_metrics_health 
  ON public.well_metrics(well_health) 
  WHERE well_health IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_well_metrics_source 
  ON public.well_metrics(source)
  WHERE source IS NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN public.well_metrics.conductivity IS 'Electrical conductivity (µS/cm)';
COMMENT ON COLUMN public.well_metrics.dissolved_oxygen IS 'Dissolved oxygen (mg/L)';
COMMENT ON COLUMN public.well_metrics.hardness IS 'Water hardness as CaCO3 (mg/L)';
COMMENT ON COLUMN public.well_metrics.chloride IS 'Chloride concentration (mg/L)';
COMMENT ON COLUMN public.well_metrics.fluoride IS 'Fluoride concentration (mg/L)';
COMMENT ON COLUMN public.well_metrics.nitrate IS 'Nitrate concentration (mg/L)';
COMMENT ON COLUMN public.well_metrics.sulfate IS 'Sulfate concentration (mg/L)';
COMMENT ON COLUMN public.well_metrics.iron IS 'Iron concentration (mg/L)';
COMMENT ON COLUMN public.well_metrics.manganese IS 'Manganese concentration (mg/L)';
COMMENT ON COLUMN public.well_metrics.arsenic IS 'Arsenic concentration (mg/L)';
COMMENT ON COLUMN public.well_metrics.lead IS 'Lead concentration (mg/L)';
COMMENT ON COLUMN public.well_metrics.source IS 'Data source: manual, sensor, api, bulk_import';
COMMENT ON COLUMN public.well_metrics.notes IS 'Additional observations or notes';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ Enhanced metrics columns added successfully!';
  RAISE NOTICE '✓ Indexes created for better performance';
  RAISE NOTICE '✓ Ready to use new API endpoints';
END $$;
