/**
 * Tests for the per-song transpose memory in localStorage.
 * Plain node, no framework:  node tests/transpose-storage.test.js
 *
 * Runs the real state.js in a vm context with a fake localStorage, the same way
 * tuning-cookie.test.js fakes the cookie jar, so the helpers are exercised as
 * globals exactly as the page sees them.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let passed = 0, failed = 0;
const check = (label, cond, detail) => {
    if (cond) { passed++; console.log('  ok   ' + label); }
    else { failed++; console.log('  FAIL ' + label + (detail ? ' - ' + detail : '')); }
};

function makeBrowser({ initial = {}, blocked = false } = {}) {
    const store = { ...initial };
    const sandbox = { console, JSON, Object, Array, Number, String, RegExp, Error, decodeURIComponent, encodeURIComponent };
    sandbox.window = sandbox;
    sandbox.document = { cookie: '' };
    sandbox.localStorage = blocked
        ? { getItem() { throw new Error('storage blocked'); }, setItem() { throw new Error('storage blocked'); } }
        : {
            getItem: k => (k in store ? store[k] : null),
            setItem: (k, v) => { store[k] = String(v); },
        };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'state.js'), 'utf8'), sandbox, { filename: 'state.js' });
    return { sandbox, store };
}

console.log('\nRound trip');
{
    const { sandbox, store } = makeBrowser();
    check('an unknown song is untransposed', sandbox.getStoredTranspose('mucho-mas-alla') === 0);
    sandbox.storeTranspose('mucho-mas-alla', 1);
    sandbox.storeTranspose('libre-soy', -3);
    check('a stored transpose comes back', sandbox.getStoredTranspose('mucho-mas-alla') === 1);
    check('each song keeps its own value', sandbox.getStoredTranspose('libre-soy') === -3);
    sandbox.storeTranspose('mucho-mas-alla', 0);
    const map = JSON.parse(store.ukeflow_transpose);
    check('choosing Original deletes the entry instead of storing 0',
        !('mucho-mas-alla' in map) && map['libre-soy'] === -3, store.ukeflow_transpose);
}

console.log('\nBad data degrades to Original');
{
    const corrupt = makeBrowser({ initial: { ukeflow_transpose: '{not json' } });
    check('unparseable JSON reads as 0', corrupt.sandbox.getStoredTranspose('x') === 0);
    corrupt.sandbox.storeTranspose('x', 2);
    check('and is overwritten cleanly on the next save', corrupt.sandbox.getStoredTranspose('x') === 2);

    const odd = makeBrowser({ initial: { ukeflow_transpose: JSON.stringify({ a: 9, b: '2', c: 1.5, d: -5, e: 6 }) } });
    check('out-of-range value reads as 0', odd.sandbox.getStoredTranspose('a') === 0);
    check('string value reads as 0', odd.sandbox.getStoredTranspose('b') === 0);
    check('fractional value reads as 0', odd.sandbox.getStoredTranspose('c') === 0);
    check('the -5 and +6 ends of the range are kept',
        odd.sandbox.getStoredTranspose('d') === -5 && odd.sandbox.getStoredTranspose('e') === 6);

    const arr = makeBrowser({ initial: { ukeflow_transpose: '[1,2]' } });
    check('a non-object map reads as 0', arr.sandbox.getStoredTranspose('0') === 0);
}

console.log('\nBlocked storage never throws');
{
    const { sandbox } = makeBrowser({ blocked: true });
    let threw = false;
    try {
        sandbox.storeTranspose('x', 2);
        check('reads as 0 when storage is blocked', sandbox.getStoredTranspose('x') === 0);
    } catch (e) { threw = true; }
    check('no exception escapes', !threw);
}

console.log('\nEvery transpose control saves');
{
    // Source check: each user-facing control must route through setTranspose(),
    // which is the only place that calls storeTranspose(). A control that sets
    // state.transpose itself would work on screen and silently not be remembered.
    const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const body = name => {
        const start = app.indexOf(`function ${name}(`);
        return start < 0 ? '' : app.slice(start, app.indexOf('\n}\n', start));
    };
    check('setTranspose() stores the value', /storeTranspose\(/.test(body('setTranspose')));
    for (const fn of ['handleTranspose', 'handleEasyKeyClick']) {
        check(`${fn}() goes through setTranspose()`, /setTranspose\(/.test(body(fn)));
    }
    check('the key modal button goes through setTranspose()',
        /transposeBtn\.addEventListener\('click',[\s\S]{0,120}setTranspose\(normalizedTranspose\)/.test(app));
    const writes = (app.match(/state\.transpose = /g) || []).length;
    check('state.transpose is only assigned on load/home and in setTranspose()', writes === 4,
        `found ${writes} assignments`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
