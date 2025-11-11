-- Migration: Enhanced well_metrics table
-- Date: 2025-11-10
-- Description: Updates well_metrics table with better structure and constraints

-- Add any missing columns (safe to run if they already exist)
DO $$ 
BEGIN
  -- Add turbidity if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_metrics' AND column_name = 'turbidity'
  ) THEN
    ALTER TABLE public.well_metrics ADD COLUMN turbidity numeric(10,2);
  END IF;

  -- Add conductivity for water quality analysis
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_metrics' AND column_name = 'conductivity'
  ) THEN
    ALTER TABLE public.well_metrics ADD COLUMN conductivity numeric(10,2);
  END IF;

  -- Add dissolved oxygen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_metrics' AND column_name = 'dissolved_oxygen'
  ) THEN
    ALTER TABLE public.well_metrics ADD COLUMN dissolved_oxygen numeric(10,2);
  END IF;

  -- Add hardness
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_metrics' AND column_name = 'hardness'
  ) THEN
    ALTER TABLE public.well_metrics ADD COLUMN hardness numeric(10,2);
  END IF;

  -- Add chloride
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_metrics' AND column_name = 'chloride'
  ) THEN
    ALTER TABLE public.well_metrics ADD COLUMN chloride numeric(10,2);
  END IF;

  -- Add fluoride
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_metrics' AND column_name = 'fluoride'
  ) THEN
    ALTER TABLE public.well_metrics ADD COLUMN fluoride numeric(10,2);
  END IF;

  -- Add nitrate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_metrics' AND column_name = 'nitrate'
  ) THEN
    ALTER TABLE public.well_metrics ADD COLUMN nitrate numeric(10,2);
  END IF;

  -- Add source (manual, sensor, api, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_metrics' AND column_name = 'source'
  ) THEN
    ALTER TABLE public.well_metrics ADD COLUMN source character varying(50) DEFAULT 'manual';
  END IF;

  -- Add notes field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_metrics' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.well_metrics ADD COLUMN notes text;
  END IF;

END $$;

-- First, check and log any data that would violate constraints
DO $$
DECLARE
  v_count integer;
BEGIN
  -- Check for out-of-range pH values
  SELECT COUNT(*) INTO v_count FROM public.well_metrics 
  WHERE ph IS NOT NULL AND (ph < 0 OR ph > 14);
  IF v_count > 0 THEN
    RAISE NOTICE 'Found % rows with pH outside 0-14 range', v_count;
  END IF;

  -- Check for out-of-range TDS values
  SELECT COUNT(*) INTO v_count FROM public.well_metrics 
  WHERE tds IS NOT NULL AND (tds < 0 OR tds > 10000);
  IF v_count > 0 THEN
    RAISE NOTICE 'Found % rows with TDS outside 0-10000 range', v_count;
  END IF;

  -- Check for out-of-range temperature values
  SELECT COUNT(*) INTO v_count FROM public.well_metrics 
  WHERE temperature IS NOT NULL AND (temperature < -10 OR temperature > 50);
  IF v_count > 0 THEN
    RAISE NOTICE 'Found % rows with temperature outside -10 to 50°C range', v_count;
  END IF;

  -- Check for out-of-range water_level values
  SELECT COUNT(*) INTO v_count FROM public.well_metrics 
  WHERE water_level IS NOT NULL AND (water_level < -500 OR water_level > 500);
  IF v_count > 0 THEN
    RAISE NOTICE 'Found % rows with water_level outside -500 to 500m range', v_count;
    -- Show the actual problematic values
    RAISE NOTICE 'Problematic water_level values: min=%, max=%', 
      (SELECT MIN(water_level) FROM public.well_metrics WHERE water_level IS NOT NULL),
      (SELECT MAX(water_level) FROM public.well_metrics WHERE water_level IS NOT NULL);
  END IF;
END $$;

-- Update constraints for realistic values (NOT VALID to skip existing data validation)
-- These will only apply to NEW or UPDATED rows
-- pH: 0-14 range
ALTER TABLE public.well_metrics DROP CONSTRAINT IF EXISTS well_metrics_ph_check;
ALTER TABLE public.well_metrics ADD CONSTRAINT well_metrics_ph_check 
  CHECK (ph IS NULL OR (ph >= 0 AND ph <= 14)) NOT VALID;

-- TDS: 0-10000 ppm (typical range)
ALTER TABLE public.well_metrics DROP CONSTRAINT IF EXISTS well_metrics_tds_check;
ALTER TABLE public.well_metrics ADD CONSTRAINT well_metrics_tds_check 
  CHECK (tds IS NULL OR (tds >= 0 AND tds <= 10000)) NOT VALID;

-- Temperature: -10 to 50 Celsius (reasonable for groundwater)
ALTER TABLE public.well_metrics DROP CONSTRAINT IF EXISTS well_metrics_temperature_check;
ALTER TABLE public.well_metrics ADD CONSTRAINT well_metrics_temperature_check 
  CHECK (temperature IS NULL OR (temperature >= -10 AND temperature <= 50)) NOT VALID;

-- Water level: -500 to 500 meters (depth can be negative for above ground)
ALTER TABLE public.well_metrics DROP CONSTRAINT IF EXISTS well_metrics_water_level_check;
ALTER TABLE public.well_metrics ADD CONSTRAINT well_metrics_water_level_check 
  CHECK (water_level IS NULL OR (water_level >= -500 AND water_level <= 500)) NOT VALID;

-- Turbidity: 0-1000 NTU (Nephelometric Turbidity Units)
ALTER TABLE public.well_metrics DROP CONSTRAINT IF EXISTS well_metrics_turbidity_check;
ALTER TABLE public.well_metrics ADD CONSTRAINT well_metrics_turbidity_check 
  CHECK (turbidity IS NULL OR (turbidity >= 0 AND turbidity <= 1000)) NOT VALID;

-- Conductivity: 0-5000 µS/cm
ALTER TABLE public.well_metrics DROP CONSTRAINT IF EXISTS well_metrics_conductivity_check;
ALTER TABLE public.well_metrics ADD CONSTRAINT well_metrics_conductivity_check 
  CHECK (conductivity IS NULL OR (conductivity >= 0 AND conductivity <= 5000)) NOT VALID;

-- Dissolved Oxygen: 0-20 mg/L
ALTER TABLE public.well_metrics DROP CONSTRAINT IF EXISTS well_metrics_dissolved_oxygen_check;
ALTER TABLE public.well_metrics ADD CONSTRAINT well_metrics_dissolved_oxygen_check 
  CHECK (dissolved_oxygen IS NULL OR (dissolved_oxygen >= 0 AND dissolved_oxygen <= 20)) NOT VALID;

-- Hardness: 0-1000 mg/L
ALTER TABLE public.well_metrics DROP CONSTRAINT IF EXISTS well_metrics_hardness_check;
ALTER TABLE public.well_metrics ADD CONSTRAINT well_metrics_hardness_check 
  CHECK (hardness IS NULL OR (hardness >= 0 AND hardness <= 1000)) NOT VALID;

-- Chloride: 0-1000 mg/L
ALTER TABLE public.well_metrics DROP CONSTRAINT IF EXISTS well_metrics_chloride_check;
ALTER TABLE public.well_metrics ADD CONSTRAINT well_metrics_chloride_check 
  CHECK (chloride IS NULL OR (chloride >= 0 AND chloride <= 1000)) NOT VALID;

-- Fluoride: 0-10 mg/L
ALTER TABLE public.well_metrics DROP CONSTRAINT IF EXISTS well_metrics_fluoride_check;
ALTER TABLE public.well_metrics ADD CONSTRAINT well_metrics_fluoride_check 
  CHECK (fluoride IS NULL OR (fluoride >= 0 AND fluoride <= 10)) NOT VALID;

-- Nitrate: 0-500 mg/L
ALTER TABLE public.well_metrics DROP CONSTRAINT IF EXISTS well_metrics_nitrate_check;
ALTER TABLE public.well_metrics ADD CONSTRAINT well_metrics_nitrate_check 
  CHECK (nitrate IS NULL OR (nitrate >= 0 AND nitrate <= 500)) NOT VALID;

-- Optional: Validate constraints for future data (this will enforce them going forward)
-- Uncomment these lines if you want to clean up existing data first
-- ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_ph_check;
-- ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_tds_check;
-- ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_temperature_check;
-- ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_water_level_check;
-- ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_turbidity_check;

-- Create composite index for efficient queries
DROP INDEX IF EXISTS idx_well_metrics_well_id_ts;
CREATE INDEX idx_well_metrics_well_id_ts ON public.well_metrics(well_id, ts DESC);

-- Create index for health status queries
DROP INDEX IF EXISTS idx_well_metrics_health;
CREATE INDEX idx_well_metrics_health ON public.well_metrics(well_health) WHERE well_health IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.well_metrics.conductivity IS 'Electrical conductivity in µS/cm (microsiemens per centimeter)';
COMMENT ON COLUMN public.well_metrics.dissolved_oxygen IS 'Dissolved oxygen in mg/L';
COMMENT ON COLUMN public.well_metrics.hardness IS 'Water hardness in mg/L as CaCO3';
COMMENT ON COLUMN public.well_metrics.chloride IS 'Chloride concentration in mg/L';
COMMENT ON COLUMN public.well_metrics.fluoride IS 'Fluoride concentration in mg/L';
COMMENT ON COLUMN public.well_metrics.nitrate IS 'Nitrate concentration in mg/L';
COMMENT ON COLUMN public.well_metrics.source IS 'Data source: manual, sensor, api, calculated';
COMMENT ON COLUMN public.well_metrics.notes IS 'Additional observations or notes';

-- =====================================================
-- OPTIONAL: Data Cleanup Section
-- =====================================================
-- Uncomment the sections below if you want to fix existing out-of-range data

/*
-- Fix out-of-range water_level values (cap at valid range)
UPDATE public.well_metrics
SET water_level = CASE
  WHEN water_level < -500 THEN -500
  WHEN water_level > 500 THEN 500
  ELSE water_level
END
WHERE water_level IS NOT NULL AND (water_level < -500 OR water_level > 500);

-- Fix out-of-range pH values
UPDATE public.well_metrics
SET ph = CASE
  WHEN ph < 0 THEN 0
  WHEN ph > 14 THEN 14
  ELSE ph
END
WHERE ph IS NOT NULL AND (ph < 0 OR ph > 14);

-- Fix out-of-range TDS values
UPDATE public.well_metrics
SET tds = CASE
  WHEN tds < 0 THEN 0
  WHEN tds > 10000 THEN 10000
  ELSE tds
END
WHERE tds IS NOT NULL AND (tds < 0 OR tds > 10000);

-- Fix out-of-range temperature values
UPDATE public.well_metrics
SET temperature = CASE
  WHEN temperature < -10 THEN -10
  WHEN temperature > 50 THEN 50
  ELSE temperature
END
WHERE temperature IS NOT NULL AND (temperature < -10 OR temperature > 50);

-- After cleaning data, validate the constraints
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_ph_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_tds_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_temperature_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_water_level_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_turbidity_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_conductivity_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_dissolved_oxygen_check;
*/

-- =====================================================
-- Migration Complete
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'New columns added to well_metrics table';
  RAISE NOTICE 'Constraints added (NOT VALID - will apply to new data only)';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Review any out-of-range values reported above';
  RAISE NOTICE '2. Uncomment data cleanup section if needed';
  RAISE NOTICE '3. Validate constraints after cleaning data';
  RAISE NOTICE '==============================================';
END $$;
