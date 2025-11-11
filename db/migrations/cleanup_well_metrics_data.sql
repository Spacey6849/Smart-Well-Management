-- =====================================================
-- Data Cleanup Script for well_metrics
-- Date: 2025-11-10
-- =====================================================
-- Run this AFTER the migration if you have out-of-range data
-- This will fix existing data to comply with the new constraints

-- =====================================================
-- STEP 1: Inspect problematic data
-- =====================================================

-- Check water_level range
SELECT 
  'water_level' as field,
  MIN(water_level) as min_value,
  MAX(water_level) as max_value,
  COUNT(*) FILTER (WHERE water_level < -500 OR water_level > 500) as out_of_range_count
FROM public.well_metrics
WHERE water_level IS NOT NULL;

-- Check pH range
SELECT 
  'pH' as field,
  MIN(ph) as min_value,
  MAX(ph) as max_value,
  COUNT(*) FILTER (WHERE ph < 0 OR ph > 14) as out_of_range_count
FROM public.well_metrics
WHERE ph IS NOT NULL;

-- Check TDS range
SELECT 
  'TDS' as field,
  MIN(tds) as min_value,
  MAX(tds) as max_value,
  COUNT(*) FILTER (WHERE tds < 0 OR tds > 10000) as out_of_range_count
FROM public.well_metrics
WHERE tds IS NOT NULL;

-- Check temperature range
SELECT 
  'temperature' as field,
  MIN(temperature) as min_value,
  MAX(temperature) as max_value,
  COUNT(*) FILTER (WHERE temperature < -10 OR temperature > 50) as out_of_range_count
FROM public.well_metrics
WHERE temperature IS NOT NULL;

-- =====================================================
-- STEP 2: View specific problematic records
-- =====================================================

-- Show records with out-of-range water_level
SELECT id, well_id, well_name, water_level, ts
FROM public.well_metrics
WHERE water_level IS NOT NULL AND (water_level < -500 OR water_level > 500)
ORDER BY ts DESC
LIMIT 20;

-- Show records with out-of-range pH
SELECT id, well_id, well_name, ph, ts
FROM public.well_metrics
WHERE ph IS NOT NULL AND (ph < 0 OR ph > 14)
ORDER BY ts DESC
LIMIT 20;

-- =====================================================
-- STEP 3: Fix the data (CHOOSE YOUR APPROACH)
-- =====================================================

-- OPTION A: Cap values at valid range boundaries
-- This keeps the records but adjusts extreme values

-- Fix water_level (cap between -500 and 500)
UPDATE public.well_metrics
SET water_level = CASE
  WHEN water_level < -500 THEN -500
  WHEN water_level > 500 THEN 500
  ELSE water_level
END
WHERE water_level IS NOT NULL AND (water_level < -500 OR water_level > 500);

-- Fix pH (cap between 0 and 14)
UPDATE public.well_metrics
SET ph = CASE
  WHEN ph < 0 THEN 0
  WHEN ph > 14 THEN 14
  ELSE ph
END
WHERE ph IS NOT NULL AND (ph < 0 OR ph > 14);

-- Fix TDS (cap between 0 and 10000)
UPDATE public.well_metrics
SET tds = CASE
  WHEN tds < 0 THEN 0
  WHEN tds > 10000 THEN 10000
  ELSE tds
END
WHERE tds IS NOT NULL AND (tds < 0 OR tds > 10000);

-- Fix temperature (cap between -10 and 50)
UPDATE public.well_metrics
SET temperature = CASE
  WHEN temperature < -10 THEN -10
  WHEN temperature > 50 THEN 50
  ELSE temperature
END
WHERE temperature IS NOT NULL AND (temperature < -10 OR temperature > 50);

-- Fix turbidity (cap between 0 and 1000)
UPDATE public.well_metrics
SET turbidity = CASE
  WHEN turbidity < 0 THEN 0
  WHEN turbidity > 1000 THEN 1000
  ELSE turbidity
END
WHERE turbidity IS NOT NULL AND (turbidity < 0 OR turbidity > 1000);

/*
-- OPTION B: Set out-of-range values to NULL
-- This marks problematic data as unknown

UPDATE public.well_metrics
SET water_level = NULL
WHERE water_level IS NOT NULL AND (water_level < -500 OR water_level > 500);

UPDATE public.well_metrics
SET ph = NULL
WHERE ph IS NOT NULL AND (ph < 0 OR ph > 14);

UPDATE public.well_metrics
SET tds = NULL
WHERE tds IS NOT NULL AND (tds < 0 OR tds > 10000);

UPDATE public.well_metrics
SET temperature = NULL
WHERE temperature IS NOT NULL AND (temperature < -10 OR temperature > 50);
*/

/*
-- OPTION C: Delete records with out-of-range values
-- Use with caution - this permanently removes data

DELETE FROM public.well_metrics
WHERE 
  (water_level IS NOT NULL AND (water_level < -500 OR water_level > 500))
  OR (ph IS NOT NULL AND (ph < 0 OR ph > 14))
  OR (tds IS NOT NULL AND (tds < 0 OR tds > 10000))
  OR (temperature IS NOT NULL AND (temperature < -10 OR temperature > 50));
*/

-- =====================================================
-- STEP 4: Validate constraints
-- =====================================================
-- After cleaning data, validate all constraints

ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_ph_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_tds_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_temperature_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_water_level_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_turbidity_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_conductivity_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_dissolved_oxygen_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_hardness_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_chloride_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_fluoride_check;
ALTER TABLE public.well_metrics VALIDATE CONSTRAINT well_metrics_nitrate_check;

-- =====================================================
-- STEP 5: Verify cleanup
-- =====================================================

-- Check for any remaining constraint violations
SELECT 
  COUNT(*) FILTER (WHERE ph IS NOT NULL AND (ph < 0 OR ph > 14)) as invalid_ph,
  COUNT(*) FILTER (WHERE tds IS NOT NULL AND (tds < 0 OR tds > 10000)) as invalid_tds,
  COUNT(*) FILTER (WHERE temperature IS NOT NULL AND (temperature < -10 OR temperature > 50)) as invalid_temp,
  COUNT(*) FILTER (WHERE water_level IS NOT NULL AND (water_level < -500 OR water_level > 500)) as invalid_water_level,
  COUNT(*) FILTER (WHERE turbidity IS NOT NULL AND (turbidity < 0 OR turbidity > 1000)) as invalid_turbidity
FROM public.well_metrics;

-- Should return all zeros if cleanup was successful

-- =====================================================
-- Summary
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Data cleanup completed!';
  RAISE NOTICE 'All constraints should now be valid';
  RAISE NOTICE '==============================================';
END $$;
