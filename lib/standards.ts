// Gleiche Logik wie in den Edge Functions – eine Quelle, keine Abweichungen.
// catalog.ts registriert dabei den erweiterten Übungskatalog (exerciseBySlug kennt dann alle Übungen).
export * from '../supabase/functions/_shared/core/standards.ts';
export * from '../supabase/functions/_shared/core/catalog.ts';
