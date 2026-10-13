// El Excel generado debe ser un ZIP válido que Excel/LibreOffice/Numbers puedan abrir.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildWorkbook } from '../web/js/xlsx.js';

test('xlsx: ZIP íntegro con las hojas y los datos escapados', async () => {
  const blob = buildWorkbook([
    { name: 'Todos los participantes', headers: ['Código', 'Contacto'], rows: [['V-ABCDE', '+34612345678'], ['V-FGHJK', 'maría&co@example.com'], ['V-X', '=1+1 <b>']] },
    { name: 'Aptos para marketing', headers: ['Código'], rows: [] },
  ]);
  const file = join(mkdtempSync(join(tmpdir(), 'rv-')), 'test.xlsx');
  writeFileSync(file, Buffer.from(await blob.arrayBuffer()));
  const listing = execFileSync('unzip', ['-t', file]).toString();
  assert.match(listing, /No errors detected/);
  assert.match(listing, /xl\/worksheets\/sheet2\.xml/);
  const sheet = execFileSync('unzip', ['-p', file, 'xl/worksheets/sheet1.xml']).toString();
  assert.ok(sheet.includes('+34612345678') && sheet.includes('maría&amp;co@example.com') && sheet.includes('=1+1 &lt;b&gt;'));
  assert.ok(!sheet.includes('<f>'), 'ninguna celda es fórmula');
});
