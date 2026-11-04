import fs from 'node:fs';
export const schema=fs.readFileSync(new URL('./ihc-schema.sql',import.meta.url),'utf8');
