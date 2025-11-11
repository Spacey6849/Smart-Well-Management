-- Migration: Add missing well_health_status enum values
-- Date: 2025-11-11
-- Description: Ensure 'poor' and 'Poor' values exist in the well_health_status enum to accept legacy inputs

DO $$
BEGIN
  -- Only proceed if type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'well_health_status') THEN
    -- Add lowercase 'poor' if missing
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'well_health_status' AND e.enumlabel = 'poor'
    ) THEN
      BEGIN
        -- Use EXECUTE to avoid issues in some PG versions
        EXECUTE 'ALTER TYPE public.well_health_status ADD VALUE ''poor''';
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not add enum value ''poor'': %', SQLERRM;
      END;
    END IF;

    -- Add capitalized 'Poor' if missing (tolerate clients that send capitalized value)
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'well_health_status' AND e.enumlabel = 'Poor'
    ) THEN
      BEGIN
        EXECUTE 'ALTER TYPE public.well_health_status ADD VALUE ''Poor''';
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not add enum value ''Poor'': %', SQLERRM;
      END;
    END IF;
  ELSE
    RAISE NOTICE 'Type public.well_health_status does not exist; skipping enum migration.';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Migration add_well_health_enum_values completed.';
END $$;
