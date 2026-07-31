import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const apiUrl = process.env.API_URL || 'https://worker-job.onrender.com/api';
const content = `export const environment = {\n  production: true,\n  apiUrl: '${apiUrl}',\n};\n`;
const file = join(root, '..', 'src', 'environments', 'environment.prod.ts');
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, content);
console.log(`[set-env] API_URL=${apiUrl}`);
