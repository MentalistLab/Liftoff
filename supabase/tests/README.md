# RLS-Tests

Prüfen Rechte und Sichtbarkeit direkt in Postgres (ohne Supabase-Projekt).
Laufen gegen eine **leere** Datenbank (vor `seed.sql`).

```bash
psql -d test -f supabase/tests/supabase-stub.sql      # Minimal-Nachbau von auth/storage/Rollen
psql -d test -f supabase/migrations/20261120000001_init.sql
psql -d test -f supabase/tests/rls-test.sql           # endet mit „ALLE RLS-TESTS OK“
```
