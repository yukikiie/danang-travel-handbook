import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = vm.createContext({ URL });
vm.runInContext(fs.readFileSync(new URL('./src/stay-repair.js', import.meta.url), 'utf8'), sandbox);
const repair = stays => JSON.parse(JSON.stringify(sandbox.DaNangStayRepair.repairContinuations(stays)));
const stay = overrides => ({ role: '', name: '', address: '', phone: '', note: '', url: '', ...overrides });
const maps = 'https://www.google.com/maps/search/?api=1&query=Sala%20Danang%20Beach%20Hotel';
const base = stay({ role: '11月6〜9日 · 3泊', name: 'Sala Danang Beach Hotel', address: '36-38 Lam Hoanh Street', phone: '+84 236 3658 555', note: 'サラ ダナン ビーチ ホテル。' });
const checkin = 'チェックイン：11/6 14:00以降';
const checkout = 'チェックアウト：11/9 12:00まで（現地時間）。14:00までのレイトチェックアウトはリクエストのみ・未確約です。';
let count = 0;
function test(name, run) { run(); count++; console.log('PASS ' + name); }

test('repairs the screenshot shape and the displaced map URL in name', () => {
  const result = repair([base, stay({ role: checkin }), stay({ role: checkout, name: maps })]);
  assert.deepEqual(result, [{ ...base, note: [base.note, checkin, checkout].join('\n'), url: maps }]);
});
test('recovers a separate role-only map URL after a recognized continuation', () => {
  assert.deepEqual(repair([base, stay({ role: checkin }), stay({ role: checkout }), stay({ role: maps })]), [{ ...base, note: [base.note, checkin, checkout].join('\n'), url: maps }]);
});
test('preserves custom hotel fields and an existing custom URL', () => {
  const custom = { ...base, role: '母と泊まるホテル', address: 'Custom address | exact', phone: '+84 111 222', note: 'Personal note\n二行目 | keep this', url: 'https://example.com/custom-map' };
  const result = repair([custom, stay({ role: checkin, name: maps })]);
  assert.deepEqual(result, [{ ...custom, note: custom.note + '\n' + checkin }]);
});
test('keeps a legitimate second hotel and its neighboring rows untouched', () => {
  const second = stay({ role: checkout, name: 'Another real hotel', address: 'Hoi An' });
  const unknown = stay({ role: checkin });
  assert.deepEqual(repair([base, stay({ role: checkin }), second, unknown]), [{ ...base, note: base.note + '\n' + checkin }, second, unknown]);
});
test('does not remove an unknown nameless row or skip over it', () => {
  const unknown = stay({ role: '朝食についてホテルへ連絡' });
  const rows = [base, unknown, stay({ role: checkin })];
  assert.deepEqual(repair(rows), rows);
});
test('does not restore deleted hotels', () => assert.deepEqual(repair([]), []));
test('leaves a healthy multiline hotel with pipes and newlines unchanged', () => {
  const healthy = { ...base, address: 'Address line 1\nAddress line 2 | unit', note: base.note + '\n' + checkin + '\n' + checkout + '\nメモ | 区切りではない', url: maps };
  assert.deepEqual(repair([healthy]), [healthy]);
});
test('does not mutate its input and is idempotent', () => {
  const input = [Object.freeze({ ...base }), Object.freeze(stay({ role: checkin })), Object.freeze(stay({ role: checkout, name: maps }))];
  const before = JSON.stringify(input);
  Object.freeze(input);
  const result = repair(input);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(repair(result), result);
});
test('appends each continuation note once', () => {
  const result = repair([{ ...base, note: base.note + '\n' + checkin }, stay({ role: checkin }), stay({ role: checkin })]);
  assert.equal(result[0].note, base.note + '\n' + checkin);
});
test('does not merge arbitrary URLs or map rows without a known continuation', () => {
  for (const rows of [[base, stay({ role: maps })], [base, stay({ role: checkout, name: 'https://example.com/maps' })], [base, stay({ role: checkin, address: 'A real address' })]]) assert.deepEqual(repair(rows), rows);
});
console.log(`${count} hotel repair tests passed.`);
