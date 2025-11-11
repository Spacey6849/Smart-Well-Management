-- Migration: Create or update well_metrics table and related objects
-- Created: 2025-11-11
-- This migration is idempotent: it can be re-run safely.

-- 1) Ensure base table exists (with core columns)
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
  CONSTRAINT well_metrics_pkey PRIMARY KEY (id)
);

-- 2) Add commonly-used analytical columns if missing (non-destructive)
ALTER TABLE public.well_metrics
  ADD COLUMN IF NOT EXISTS conductivity numeric(10,2),
  ADD COLUMN IF NOT EXISTS dissolved_oxygen numeric(8,2),
  ADD COLUMN IF NOT EXISTS hardness numeric(10,2),
  ADD COLUMN IF NOT EXISTS chloride numeric(10,2),
  ADD COLUMN IF NOT EXISTS fluoride numeric(10,2),
  ADD COLUMN IF NOT EXISTS nitrate numeric(10,2),
  ADD COLUMN IF NOT EXISTS sulfate numeric(10,2),
  ADD COLUMN IF NOT EXISTS iron numeric(10,2),
  ADD COLUMN IF NOT EXISTS manganese numeric(10,2),
  ADD COLUMN IF NOT EXISTS arsenic numeric(10,2),
  ADD COLUMN IF NOT EXISTS lead numeric(10,2);

-- 3) Ensure foreign key constraint to user_wells exists (create only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'well_metrics_well_id_fkey' AND conrelid = 'public.well_metrics'::regclass
  ) THEN
    ALTER TABLE public.well_metrics
      ADD CONSTRAINT well_metrics_well_id_fkey FOREIGN KEY (well_id)
        REFERENCES public.user_wells(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_well_metrics_well_id ON public.well_metrics(well_id);
CREATE INDEX IF NOT EXISTS idx_well_metrics_ts ON public.well_metrics(ts DESC);

-- 5) Enable RLS on well_metrics (idempotent check)
DO $$
BEGIN
  IF (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.well_metrics'::regclass) IS DISTINCT FROM TRUE THEN
    EXECUTE 'ALTER TABLE public.well_metrics ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;

-- 6) Policies: view and insert (idempotent)
DO $$
BEGIN
  -- VIEW policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Users can view metrics for own wells' AND polrelid = 'public.well_metrics'::regclass
  ) THEN
    CREATE POLICY "Users can view metrics for own wells" ON public.well_metrics
      FOR SELECT USING (
        well_id IN (SELECT id FROM public.user_wells WHERE user_id = auth.uid())
      );
  END IF;

  -- INSERT policy (allow service_role or owner)
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

-- 7) Comments
COMMENT ON TABLE public.well_metrics IS 'Time-series sensor data for wells';
COMMENT ON COLUMN public.well_metrics.turbidity IS 'Water turbidity measurement (NTU)';
COMMENT ON COLUMN public.well_metrics.well_health IS 'Calculated health status: healthy, warning, critical, or poor';

-- End of migration
