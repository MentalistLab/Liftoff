// Bündelt eine Edge Function inkl. benötigtem _shared-Code zu EINER Datei (für Deployments ohne CLI,
// z. B. über die Supabase-API/MCP). Mit der Supabase-CLI ist das nicht nötig: `supabase functions deploy <name>`.
// Aufruf: node scripts/bundle-function.mjs <name>  → dist/functions/<name>/index.ts
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const name = process.argv[2];
if (!name) { console.error('Name fehlt: node scripts/bundle-function.mjs <name>'); process.exit(1); }
mkdirSync(`dist/functions/${name}`, { recursive: true });
execFileSync('npx', ['-y', 'esbuild@0.25.0', `supabase/functions/${name}/index.ts`, '--bundle', '--format=esm', '--platform=neutral',
  '--external:npm:*', '--legal-comments=none', `--outfile=dist/functions/${name}/index.ts`], { stdio: 'inherit' });
