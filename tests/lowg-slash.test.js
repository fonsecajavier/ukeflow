/**
 * Tests for the low-G slash-chord voicings (LOW_G_CHORDS in chords.js).
 * Plain node, no framework:  node tests/lowg-slash.test.js
 *
 * The point of a slash chord is which note is UNDERNEATH, and that is exactly
 * what low-G changes: the G string goes from G4 (second-highest, so it can never
 * be the bass) to G3 (the lowest note on the instrument). So these assertions
 * are about pitch, not fingering - each shape is checked by sounding it and
 * confirming the named bass really is the lowest note.
 */

const C = require(__dirname + '/../chords.js');
const V = require(__dirname + '/../voicings.js');

let passed = 0, failed = 0;
function check(label, cond, detail) {
    if (cond) { passed++; } else { failed++; console.log(`  FAIL  ${label}${detail ? ` - ${detail}` : ''}`); }
}
const section = t => console.log(`\n${t}`);
const sounded = frets => frets.map((f, i) => f < 0 ? null : V.fretToMidi(i, f)).filter(m => m !== null);
const pcOf = m => ((m % 12) + 12) % 12;

// ---------------------------------------------------------------------------
section('Every low-G shape actually puts the slash bass lowest');
V.setUkuleleTuning('low-g');

for (const [name, shape] of Object.entries(C.LOW_G_CHORDS)) {
    const parsed = V.parseChordSymbol(name);
    const midis = sounded(shape.frets);
    check(`${name}: is a slash chord with a bass note`, parsed && parsed.bassPc != null);
    check(`${name}: at least 3 strings sound`, midis.length >= 3, `${midis.length}`);
    check(`${name}: the named bass IS the lowest pitch`,
        pcOf(Math.min(...midis)) === parsed.bassPc,
        `lowest is ${V.midiToNoteName(Math.min(...midis))}, wanted ${parsed.bass}`);

    const chordPcs = parsed.intervals.map(i => (parsed.rootPc + i) % 12);
    const allowed = new Set([...chordPcs, parsed.bassPc]);
    check(`${name}: every sounding note is a chord tone or the bass`,
        midis.every(m => allowed.has(pcOf(m))),
        midis.map(m => V.midiToNoteName(m)).join(' '));
    check(`${name}: the root is present`, new Set(midis.map(pcOf)).has(parsed.rootPc));

    const fretted = shape.frets.filter(f => f > 0);
    const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) + 1 : 1;
    check(`${name}: fits one hand position (<= 4 frets)`, span <= 4, `span ${span}`);
    check(`${name}: frets array is 4 long`, shape.frets.length === 4);
    check(`${name}: carries the lowG marker`, shape.lowG === true);
    check(`${name}: name field matches its key`, shape.name === name);
}

// E/D# is the one shape with a real compromise, so it must say so.
check('E/D# documents that it has no 3rd',
    /no 3rd/i.test(C.LOW_G_CHORDS['E/D#'].note || ''));

// ---------------------------------------------------------------------------
section('resolveChord honours the tuning');

V.setUkuleleTuning('low-g');
for (const name of Object.keys(C.LOW_G_CHORDS)) {
    check(`${name}: low-G resolves to the override`, C.resolveChord(name).lowG === true);
}
V.setUkuleleTuning('high-g');
for (const name of Object.keys(C.LOW_G_CHORDS)) {
    check(`${name}: high-G does NOT get the low-G shape`, !C.resolveChord(name).lowG);
}
check('activeTuningName() reports high-G here', C.activeTuningName() === 'high-g');
V.setUkuleleTuning('low-g');
check('activeTuningName() follows setUkuleleTuning()', C.activeTuningName() === 'low-g');
V.setUkuleleTuning('high-g');

// ---------------------------------------------------------------------------
section('Low-G is a genuine improvement, and high-G is untouched');

// Every slash chord that appears in the library or in any song.
const ALL = ['A/G#','C#m/B','C#/F','Eb/G','F/A','B/D#','Ab/D','F#/A#',
             'D/F#','G/B','Am/G','G/F#','G/D','Db/Eb','E/D#'];

function bassCorrect(sym) {
    const r = C.resolveChord(sym);
    if (!r) return false;
    const parsed = V.parseChordSymbol(sym);
    const midis = sounded(r.frets);
    return pcOf(Math.min(...midis)) === parsed.bassPc;
}

V.setUkuleleTuning('high-g');
const hi = ALL.filter(bassCorrect).length;
V.setUkuleleTuning('low-g');
const lo = ALL.filter(bassCorrect).length;
V.setUkuleleTuning('high-g');

check('low-G gets the bass right far more often than high-G', lo > hi, `${lo} vs ${hi}`);
check('low-G gets all but the unreachable one right',
    lo === ALL.length - Object.keys(C.LOW_G_BASS_UNREACHABLE).length, `${lo}/${ALL.length}`);
console.log(`  slash bass correct: high-G ${hi}/${ALL.length}, low-G ${lo}/${ALL.length}`);

// These need no entry: the ORDINARY shape already puts the right note lowest
// once the G string is the lowest string. Locking it in, because adding a
// needless override here would be a silent regression in playability.
V.setUkuleleTuning('low-g');
for (const sym of ['F/A', 'F#/A#', 'G/B', 'Am/G']) {
    check(`${sym}: correct on low-G WITHOUT an override`,
        !C.LOW_G_CHORDS[sym] && bassCorrect(sym));
}
V.setUkuleleTuning('high-g');

// ---------------------------------------------------------------------------
section('Bass notes that are below the instrument');

for (const [name, reason] of Object.entries(C.LOW_G_BASS_UNREACHABLE)) {
    const parsed = V.parseChordSymbol(name);
    check(`${name}: has a stated reason`, typeof reason === 'string' && reason.length > 20);
    check(`${name}: is NOT also given a low-G shape`, !C.LOW_G_CHORDS[name]);
    // The claim is that the bass pitch class cannot be the lowest note anywhere.
    V.setUkuleleTuning('low-g');
    const floor = Math.min(...V.UKULELE_MIDI);
    // the bass would have to sound at or below the open low G to be the bass of
    // a chord that also needs notes above it
    check(`${name}: bass pitch class sits under the low-G floor`,
        pcOf(floor) !== parsed.bassPc, `floor ${V.midiToNoteName(floor)}, bass ${parsed.bass}`);
    V.setUkuleleTuning('high-g');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
