// @vitest-environment node
import { describe, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POST } from '../api/recognize';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, '../docs/samples');
const OUT = process.env['GOLDEN_OUT'] ?? '/tmp/golden.json';

const files = fs.readdirSync(dir)
  .filter((f) => f.startsWith('S__') && f.endsWith('.jpg'))
  .sort();

// 這支會真的呼叫 Claude 並花錢，預設不跑。要跑：GOLDEN_RUN=1 npx vitest run scripts/golden.test.ts
const enabled = process.env['GOLDEN_RUN'] === '1';

describe.skipIf(!enabled)('golden set', () => {
  it('跑完全部樣本', async () => {
    const results: Record<string, unknown> = {};
    for (const f of files) {
      const imageBase64 = fs.readFileSync(path.join(dir, f)).toString('base64');
      const res = await POST(new Request('http://localhost/api/recognize', {
        method: 'POST',
        headers: { 'x-elden-token': process.env['ELDEN_ACCESS_TOKEN'] ?? '' },
        body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg' }),
      }));
      results[f] = { status: res.status, body: await res.json() };
      console.log(`✓ ${f} → HTTP ${res.status}`);
    }
    fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
    console.log('寫入', OUT);
  }, 900_000);
});
