-- In PostgreSQL, ALTER TYPE ... ADD VALUE is supported, but RENAME VALUE is also supported in PG 10+.
-- However, if there are existing rows, renaming is fine.
BEGIN;

ALTER TYPE source_ownership RENAME VALUE 'competitor' TO 'third_party';
ALTER TYPE source_ownership RENAME VALUE 'unclaimed' TO 'official';
COMMIT;

ALTER TYPE source_ownership ADD VALUE 'uncertain';
ALTER TYPE source_ownership ADD VALUE 'irrelevant';

-- And update source_type enum if we have new types. Let's check what source_type enum is.
