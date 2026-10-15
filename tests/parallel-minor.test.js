/**
 * Tests for "Make it minor": the parallel-minor chord transform in chords.js
 * and the song-level helpers / storage in state.js.
 * Plain node, no framework:  node tests/parallel-minor.test.js
 *
 * The state.js half runs chords.js + state.js in a vm context with a fake
 * localStorage, the way transpose-storage.test.js does, so the helpers are
 * exercised as the globals the page sees.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const {
    describeParallelMinor, toParallelMinor, parallelMinorKey,
    SCALE_DEGREES_MAJOR, SCALE_DEGREES_MINOR, getScaleDegree, canonicalRoot,
} = require(path.join(ROOT, 'chords.js'));

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
    if (cond) { pass++; console.log(`  ok   ${name}`); }
    else { fail++; console.log(`  FAIL ${name}${detail ? ' -- ' + detail : ''}`); }
}
function section(t) { console.log(`\n${t}`); }
const eq = (got, want) => [got === want, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`];
const minor = (chord, key) => toParallelMinor(chord, key);

// ------------------------------------------------------------ the degree table
section('C major -> C minor, degree by degree (harmonic minor V)');
const table = [
    ['C', 'Cm'], ['Dm', 'Ddim'], ['Em', 'Eb'], ['F', 'Fm'], ['G', 'G'], ['Am', 'Ab'], ['Bdim', 'Bb'],
];
table.forEach(([from, to]) => check(`${from} -> ${to}`, ...eq(minor(from, 'C'), to)));
check('V is reported as kept for the dominant', ...eq(describeParallelMinor('G', 'C').kept, 'dominant'));
check('V7 stays V7', ...eq(minor('G7', 'C'), 'G7'));

section('Sevenths and extensions carry their degree');
[
    ['Cmaj7', 'Cm7'], ['C7', 'Cm7'], ['C6', 'Cm6'], ['Cadd9', 'Cmadd9'], ['C9', 'Cm9'],
    ['Dm7', 'Dm7b5'], ['Em7', 'Ebmaj7'], ['Fmaj7', 'Fm7'], ['Am7', 'Abmaj7'], ['Am6', 'Ab6'],
    ['Bm7b5', 'Bb7'], ['Bdim7', 'Bb7'],
].forEach(([from, to]) => check(`${from} -> ${to}`, ...eq(minor(from, 'C'), to)));

section('Every moved triad in a common key has a chord diagram');
{
    const { CHORDS, resolveChord } = require(path.join(ROOT, 'chords.js'));
    const common = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'F#', 'Gb', 'Bb', 'Eb', 'Ab', 'C#', 'Db'];
    const noDiagram = [];
    common.forEach(key => SCALE_DEGREES_MAJOR[key].forEach(chord => {
        const out = minor(chord, key);
        if (!resolveChord(out)) noDiagram.push(`${chord} in ${key} -> ${out}`);
    }));
    check(`${common.length} common keys x 7 triads all resolve in CHORDS`, noDiagram.length === 0, noDiagram.join('; '));
}

section('Every moved chord is diatonic to the parallel minor');
// The roman numeral in the minor key must be the same degree it had in major
// (V stays V), for every common major key and every diatonic triad.
const ROMAN = ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'VII'];
let allDiatonic = true;
Object.keys(SCALE_DEGREES_MAJOR).forEach(key => {
    const minorKey = parallelMinorKey(key);
    SCALE_DEGREES_MAJOR[key].forEach((chord, i) => {
        const got = getScaleDegree(minor(chord, key), minorKey);
        if (got !== ROMAN[i]) {
            allDiatonic = false;
            console.log(`       ${chord} in ${key} -> ${minor(chord, key)} reads as ${got} in ${minorKey}, want ${ROMAN[i]}`);
        }
    });
});
check(`${Object.keys(SCALE_DEGREES_MAJOR).length} keys x 7 degrees all land on the matching minor degree`, allDiatonic);

section('Spelling comes from the minor key, not from transposeChord()');
check('C major lowers to flats (Eb, not D#)', ...eq(minor('Em', 'C'), 'Eb'));
check('D major: F#m -> F', ...eq(minor('F#m', 'D'), 'F'));
check('A major: C#m -> C', ...eq(minor('C#m', 'A'), 'C'));
check('E major: G#m -> G', ...eq(minor('G#m', 'E'), 'G'));
check('F major: Edim -> Eb', ...eq(minor('Edim', 'F'), 'Eb'));
check('a flat-key tonic keeps its own spelling', ...eq(minor('Gb', 'Db'), 'Gbm'));
check('white-key enharmonics become the playable note: Cm in Eb -> B (not Cb)', ...eq(minor('Cm', 'Eb'), 'B'));
check('Fm in Ab -> E (not Fb)', ...eq(minor('Fm', 'Ab'), 'E'));
check('Cm in Ab -> B (not Cb)', ...eq(minor('Cm', 'Ab'), 'B'));
// G is the 3rd degree of Eb, so it drops too - and Gb is indeed the 5th of B
check('and in the bass: Cm/G in Eb -> B/Gb', ...eq(minor('Cm/G', 'Eb'), 'B/Gb'));
check('an unmoved root written as Cb (IV of Gb) also becomes playable: Cb -> Bm', ...eq(minor('Cb', 'Gb'), 'Bm'));
check('Bb stays Bb (a real black key)', ...eq(minor('Gm', 'Eb'), 'Gb'));
check('spelling-agnostic input: A#m in Bb (= Bbm? no: vii is Adim; A#m is foreign)',
    ...eq(describeParallelMinor('A#m', 'Bb').kept, 'foreign'));
check('spelling-agnostic input: ii of Db written as D#m is still recognised (and keeps its spelling, as its root does not move)',
    ...eq(minor('D#m', 'Db'), 'D#dim'));

section('Non-diatonic chords are left as written and flagged');
[['E7', 'C'], ['D', 'C'], ['Bb', 'C'], ['Caug', 'C'], ['Cm', 'C'], ['A7', 'C'], ['Fm', 'C']].forEach(([c, k]) => {
    const r = describeParallelMinor(c, k);
    check(`${c} in ${k} unchanged, foreign`, r.chord === c && r.kept === 'foreign', JSON.stringify(r));
});

section('Chords without a third follow the root but keep the suffix');
check('Csus4 stays Csus4', ...eq(minor('Csus4', 'C'), 'Csus4'));
check('a sus on iii moves its root: Esus4 -> Ebsus4', ...eq(minor('Esus4', 'C'), 'Ebsus4'));
check('power chord on vi: A5 -> Ab5', ...eq(minor('A5', 'C'), 'Ab5'));
check('sus on V is still the dominant', ...eq(describeParallelMinor('Gsus4', 'C').kept, 'dominant'));
check('tonic sus is not flagged as kept', ...eq(describeParallelMinor('Csus4', 'C').kept, null));

section('Slash chords');
check('bass follows the degrees: Em/B -> Eb/Bb', ...eq(minor('Em/B', 'C'), 'Eb/Bb'));
check('bass on the 3rd lowers: C/E -> Cm/Eb', ...eq(minor('C/E', 'C'), 'Cm/Eb'));
check('bass on the 5th stays: C/G -> Cm/G', ...eq(minor('C/G', 'C'), 'Cm/G'));
check('V with leading tone in the bass is untouched: G/B', ...eq(minor('G/B', 'C'), 'G/B'));
check('D/F# in C is foreign, bass included', ...eq(minor('D/F#', 'C'), 'D/F#'));
check('D major: D/F# -> Dm/F', ...eq(minor('D/F#', 'D'), 'Dm/F'));
check('G major: Am/G -> Adim/G', ...eq(minor('Am/G', 'G'), 'Adim/G'));

section('parallelMinorKey');
check('C -> Cm', ...eq(parallelMinorKey('C'), 'Cm'));
check('F# -> F#m', ...eq(parallelMinorKey('F#'), 'F#m'));
check('Db folds onto C#m (the table it has)', ...eq(parallelMinorKey('Db'), 'C#m'));
check('Gb folds onto F#m', ...eq(parallelMinorKey('Gb'), 'F#m'));
check('Cb folds onto Bm', ...eq(parallelMinorKey('Cb'), 'Bm'));
check('a minor key is returned unchanged', ...eq(parallelMinorKey('Am'), 'Am'));
Object.keys(SCALE_DEGREES_MAJOR).forEach(k => {
    const m = parallelMinorKey(k);
    check(`${k} -> ${m} has a degree table and the same tonic`,
        Boolean(SCALE_DEGREES_MINOR[m]) && canonicalRoot(m.slice(0, -1)) === canonicalRoot(k));
});

section('Edge input');
check('a minor key leaves chords alone', ...eq(minor('C', 'Am'), 'C'));
check('unknown key leaves chords alone', ...eq(minor('C', 'H'), 'C'));
check('non-chord text passes through', ...eq(minor('N.C.', 'C'), 'N.C.'));
check('non-string passes through', ...eq(describeParallelMinor(null, 'C').chord, null));

// ------------------------------------------------------------ state.js half
function makeBrowser({ initial = {}, blocked = false } = {}) {
    const store = { ...initial };
    const sandbox = { console, JSON, Object, Array, Number, String, RegExp, Error, Boolean, Math, decodeURIComponent, encodeURIComponent };
    sandbox.window = sandbox;
    sandbox.document = { cookie: '' };
    sandbox.localStorage = blocked
        ? { getItem() { throw new Error('storage blocked'); }, setItem() { throw new Error('storage blocked'); } }
        : {
            getItem: k => (k in store ? store[k] : null),
            setItem: (k, v) => { store[k] = String(v); },
        };
    sandbox.getRelativeKey = (k) => k; // analysis.js is not loaded; relative toggle is off in these tests
    vm.createContext(sandbox);
    for (const f of ['chords.js', 'state.js']) {
        vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
    }
    // `state` is a top-level const, so it lives in the context's script scope
    // rather than on the global object; evaluate it out.
    sandbox.state = vm.runInContext('state', sandbox);
    return { sandbox, store };
}

section('songChord()/songKey(): swap first, transpose second');
{
    const { sandbox } = makeBrowser();
    sandbox.state.currentSong = { title: 'x', key: 'C', lines: [] };
    sandbox.state.transpose = 0;
    check('off: chords pass through', ...eq(sandbox.songChord('Am'), 'Am'));
    check('off: key is the song key', ...eq(sandbox.songKey(), 'C'));
    sandbox.state.minorMode = true;
    check('on: Am -> Ab', ...eq(sandbox.songChord('Am'), 'Ab'));
    check('on: key is Cm', ...eq(sandbox.songKey(), 'Cm'));
    check('on: getDisplayKey() follows', ...eq(sandbox.getDisplayKey(), 'Cm'));
    sandbox.state.transpose = 2;
    check('on + transpose 2: Am -> Ab -> Bb (A#)', ...eq(sandbox.canonicalRoot(sandbox.songChord('Am')), 'A#'));
    check('on + transpose 2: key Dm', ...eq(sandbox.songKey(), 'Dm'));
    check('on + transpose 2: the dominant transposes too (G -> A)', ...eq(sandbox.songChord('G'), 'A'));
    check('equals transposing the swapped chord', ...eq(sandbox.songChord('Em'), sandbox.transposeChord(sandbox.toParallelMinor('Em', 'C'), 2)));
}

section('Minor mode is ignored on a song already in minor');
{
    const { sandbox } = makeBrowser();
    sandbox.state.currentSong = { title: 'x', key: 'Am', lines: [] };
    sandbox.state.minorMode = true;
    check('isMinorModeActive() is false', sandbox.isMinorModeActive() === false);
    check('chords untouched', ...eq(sandbox.songChord('C'), 'C'));
    check('key untouched', ...eq(sandbox.songKey(), 'Am'));
    sandbox.state.currentSong = null;
    check('no song: songKey() is null', sandbox.songKey() === null);
}

section('Remembered per song in localStorage');
{
    const { sandbox, store } = makeBrowser();
    check('unknown song is off', sandbox.getStoredMinorMode('a') === false);
    sandbox.storeMinorMode('a', true);
    sandbox.storeMinorMode('b', true);
    check('stored value comes back', sandbox.getStoredMinorMode('a') === true);
    sandbox.storeMinorMode('a', false);
    const map = JSON.parse(store.ukeflow_minor);
    check('turning it off deletes the entry rather than storing false', !('a' in map) && map.b === true, store.ukeflow_minor);
    check('the transpose map is untouched', store.ukeflow_transpose === undefined);

    const odd = makeBrowser({ initial: { ukeflow_minor: JSON.stringify({ a: 'true', b: 1, c: true }) } });
    check('only a literal true counts (string)', odd.sandbox.getStoredMinorMode('a') === false);
    check('only a literal true counts (number)', odd.sandbox.getStoredMinorMode('b') === false);
    check('literal true counts', odd.sandbox.getStoredMinorMode('c') === true);
    const corrupt = makeBrowser({ initial: { ukeflow_minor: '[1,2' } });
    check('unparseable JSON reads as off', corrupt.sandbox.getStoredMinorMode('c') === false);
    const blocked = makeBrowser({ blocked: true });
    let threw = false;
    try { blocked.sandbox.storeMinorMode('a', true); } catch (e) { threw = true; }
    check('blocked storage does not throw', !threw && blocked.sandbox.getStoredMinorMode('a') === false);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
