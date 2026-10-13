import { existsSync, readFileSync } from 'node:fs';

/** No evaluation/interpolation: semicolons in PostgreSQL strings remain literal. */
export function loadLocalEnvironment(path = '.env.local') {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) throw new Error('Invalid environment file line.');
    const key = line.slice(0, separator).trim();
    if (!key.startsWith('KORA_')) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);
    process.env[key] ||= value;
  }
}
