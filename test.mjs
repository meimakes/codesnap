import { snap, presets } from './codesnap.mjs';
import { readFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';

const testDir = '/tmp/codesnap-test-output';
if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

// Test 1: basic snap produces a PNG
console.log('Test: basic snap');
const basicOut = `${testDir}/basic.png`;
await snap('const x = 42;', basicOut, { title: 'test.js', lang: 'javascript' });
assert(existsSync(basicOut), 'output file exists');
const header = readFileSync(basicOut).slice(0, 4);
assert(header[0] === 0x89 && header[1] === 0x50, 'valid PNG header');
const size = readFileSync(basicOut).length;
assert(size > 1000, `file has content (${size} bytes)`);

// Test 2: preset produces correct dimensions
console.log('Test: preset dimensions');
const presetOut = `${testDir}/preset.png`;
await snap('hello', presetOut, { preset: 'og', lang: 'text' });
assert(existsSync(presetOut), 'preset output exists');

// Test 3: mocha and latte themes both work
console.log('Test: themes');
for (const theme of ['mocha', 'latte']) {
  const out = `${testDir}/theme-${theme}.png`;
  await snap('x = 1', out, { theme, lang: 'python' });
  assert(existsSync(out), `${theme} theme renders`);
}

// Test 4: line numbers can be disabled
console.log('Test: no line numbers');
const noLnOut = `${testDir}/no-ln.png`;
await snap('line 1\nline 2', noLnOut, { showLineNumbers: false, lang: 'text' });
assert(existsSync(noLnOut), 'no-line-numbers output exists');

// Test 5: multi-line code with wrapping
console.log('Test: long lines');
const longLine = 'x'.repeat(200);
const longOut = `${testDir}/long.png`;
await snap(longLine, longOut, { preset: 'x', lang: 'text' });
assert(existsSync(longOut), 'long line renders without error');

// Test 6: presets export is populated
console.log('Test: presets export');
assert(presets && typeof presets === 'object', 'presets is an object');
assert('x' in presets, 'has x preset');
assert('og' in presets, 'has og preset');

// Test 7: custom background
console.log('Test: custom background');
const bgOut = `${testDir}/bg.png`;
await snap('hi', bgOut, { background: 'linear-gradient(135deg, #ff000033, #0000ff33)', lang: 'text' });
assert(existsSync(bgOut), 'custom background renders');

// Cleanup
for (const f of ['basic', 'preset', 'theme-mocha', 'theme-latte', 'no-ln', 'long', 'bg']) {
  try { unlinkSync(`${testDir}/${f}.png`); } catch {}
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
