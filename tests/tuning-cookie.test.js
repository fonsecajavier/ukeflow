/**
 * Tests for the high-G / low-G tuning switch and its cookie persistence.
 * Plain node, no framework:  node tests/tuning-cookie.test.js
 *
 * These run the real voicings.js / audio.js / state.js inside a vm context with
 * a fake cookie jar, rather than importing them, because the thing most likely
 * to break is a BROWSER-ONLY detail: `const UKULELE_TUNING` at a script's top
 * level lives in the global lexical scope, not on window, so setUkuleleTuning()
 * reaches it by bare identifier lookup across a file boundary. require() would
 * not exercise that path at all, and the failure mode it guards against - a
 * voicing found for low-G but played back at high-G frequencies - is silent.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let passed = 0, failed = 0;
let lastWrite = '';
const check = (label, cond, detail) => {
    if (cond) { passed++; console.log('  ok   ' + label); }
    else { failed++; console.log('  FAIL ' + label + (detail ? ' - ' + detail : '')); }
};

function makeBrowser({ cookieJar = '', breakCookies = false } = {}) {
    const sandbox = { console, Math, JSON, Object, Array, String, Number, RegExp, Error, Date, decodeURIComponent, encodeURIComponent, setTimeout, clearTimeout };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.document = {};
    if (breakCookies) {
        Object.defineProperty(sandbox.document, 'cookie', {
            get() { throw new Error('cookies blocked'); },
            set() { throw new Error('cookies blocked'); },
        });
    } else {
        let jar = cookieJar;
        Object.defineProperty(sandbox.document, 'cookie', {
            get: () => jar,
            set: (v) => {
                lastWrite = v;
                const [pair] = v.split(';');
                const [k] = pair.split('=');
                const others = jar.split('; ').filter(c => c && c.split('=')[0] !== k);
                jar = [...others, pair].join('; ');
            },
        });
    }
    // AudioContext stub so audio.js parses/loads without a real context
    sandbox.AudioContext = function () {};
    sandbox.navigator = {};
    vm.createContext(sandbox);
    // The REAL page order from index.html: state.js is parsed BEFORE audio.js.
    // That matters - setUkuleleTuning() probes UKULELE_TUNING with typeof, and a
    // `const` that has been hoisted but not yet initialised is in the temporal
    // dead zone, where typeof THROWS rather than returning 'undefined'.
    for (const f of ['chords.js', 'voicings.js', 'state.js', 'audio.js']) {
        // state.js references chords.js/analysis.js helpers only inside functions we don't call
        vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
    }
    // Read values the way the browser does: `const` at a script's top level goes
    // into the global LEXICAL scope, not onto window, so sandbox.UKULELE_TUNING
    // is undefined even though page code resolves the bare identifier fine.
    sandbox.__eval = (expr) => vm.runInContext(expr, sandbox);
    return sandbox;
}

console.log('\nLoading before audio.js exists');
// practice.html and index.html both call applyStoredTuning() from their init, by
// which point every script has run. But the guard must hold even if it is ever
// called earlier, or the app dies on load with a ReferenceError.
{
    const early = { console, Math, JSON, Object, Array, String, Number, RegExp, Error, Date,
                    decodeURIComponent, encodeURIComponent };
    early.window = early; early.globalThis = early; early.document = { cookie: '' };
    vm.createContext(early);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'voicings.js'), 'utf8'), early);
    let err = null;
    try { vm.runInContext("setUkuleleTuning('low-g')", early); } catch (e) { err = e; }
    check('setUkuleleTuning survives audio.js not being loaded', err === null, err && err.message);
    check('and still switches the MIDI tuning', vm.runInContext('UKULELE_MIDI[0]', early) === 55);
}

console.log('\nCookie round-trip');
let b = makeBrowser();
check('defaults to high-G with no cookie', b.__eval('applyStoredTuning()') === 'high-g');
check('choosing low-G applies it', b.__eval("setAndStoreTuning('low-g')") === 'low-g');
check('cookie was written', /ukeflow_tuning=low-g/.test(b.document.cookie), b.document.cookie);
check('cookie is scoped path=/ so practice.html sees it',
    lastWrite.includes('path=/') && lastWrite.includes('SameSite=Lax') && /max-age=31536000/.test(lastWrite),
    lastWrite);
check('audio tuning followed to G3 (196 Hz)', Math.abs(b.__eval('UKULELE_TUNING[0]') - 196.0) < 0.01,
    String(b.__eval('UKULELE_TUNING[0]')));
check('MIDI tuning followed', b.__eval('UKULELE_MIDI[0]') === 55);

console.log('\nPersistence across a reload');
const jar = b.document.cookie;
let b2 = makeBrowser({ cookieJar: jar });
check('fresh page starts high-G before applying', b2.__eval('UKULELE_MIDI[0]') === 67);
check('stored low-G is restored on load', b2.__eval('applyStoredTuning()') === 'low-g');
check('MIDI restored', b2.__eval('UKULELE_MIDI[0]') === 55);
check('audio restored', Math.abs(b2.__eval('UKULELE_TUNING[0]') - 196.0) < 0.01);

console.log('\nSwitching back');
check('back to high-G', b2.__eval("setAndStoreTuning('high-g')") === 'high-g');
check('audio back to G4 (392 Hz)', Math.abs(b2.__eval('UKULELE_TUNING[0]') - 392.0) < 0.01);
let b3 = makeBrowser({ cookieJar: b2.document.cookie });
check('high-G persists too', b3.__eval('applyStoredTuning()') === 'high-g');

console.log('\nDefensive reads');
let b4 = makeBrowser({ cookieJar: 'ukeflow_tuning=garbage' });
check('garbage cookie falls back to high-G', b4.__eval('applyStoredTuning()') === 'high-g');
check('garbage leaves tuning untouched', b4.__eval('UKULELE_MIDI[0]') === 67);

let b5 = makeBrowser({ cookieJar: 'other=1; ukeflow_tuning=low-g; more=2' });
check('reads its cookie among others', b5.__eval('applyStoredTuning()') === 'low-g');

let b6 = makeBrowser({ cookieJar: 'not_ukeflow_tuning=low-g' });
check('does not match a similarly-named cookie', b6.__eval('applyStoredTuning()') === 'high-g');

let b7 = makeBrowser({ breakCookies: true });
check('a blocked cookie jar does not throw on read', b7.__eval('applyStoredTuning()') === 'high-g');
let threw = false;
try { b7.__eval("setAndStoreTuning('low-g')"); } catch (e) { threw = true; }
check('a blocked cookie jar does not throw on write', !threw);
check('and the setting still applies for this page view', b7.__eval('UKULELE_MIDI[0]') === 55);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
