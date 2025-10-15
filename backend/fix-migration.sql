-- Fix failed migration by marking it as completed
-- This migration tried to change user role enum but failed partway through

-- Mark the failed migration as rolled back
UPDATE _prisma_migrations
SET
  finished_at = NOW(),
  applied_steps_count = 0,
  logs = 'Migration rolled back manually - enum change not needed on production'
WHERE migration_name = '20250207090000_update_user_role_enum'
  AND finished_at IS NULL;

-- Then mark it as completed so it won't try to run again
UPDATE _prisma_migrations
SET
  finished_at = NOW(),
  applied_steps_count = 1,
  logs = 'Migration skipped - schema already has F1-F6 roles in production'
WHERE migration_name = '20250207090000_update_user_role_enum';
