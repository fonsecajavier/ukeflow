// Tests for respellChord() - the flats/sharps display toggle.
// Run with: node tests/respell.test.js
const { respellChord, CHORDS, getScaleDegree } = require(__dirname + '/../chords.js');

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
    if (cond) { pass++; console.log(`  ok   ${name}`); }
    else { fail++; console.log(`  FAIL ${name}${detail ? ' -- ' + detail : ''}`); }
}
function section(t) { console.log(`\n${t}`); }
const eq = (got, want) => [got === want, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`];

// ------------------------------------------------------------- black keys
section('Black keys respell both ways');
check('C# -> Db', ...eq(respellChord('C#', 'flat'), 'Db'));
check('Db -> C#', ...eq(respellChord('Db', 'sharp'), 'C#'));
check('A#m7 -> Bbm7 (suffix preserved)', ...eq(respellChord('A#m7', 'flat'), 'Bbm7'));
check('Ebmaj7 -> D#maj7', ...eq(respellChord('Ebmaj7', 'sharp'), 'D#maj7'));
check('G#dim -> Abdim', ...eq(respellChord('G#dim', 'flat'), 'Abdim'));

section('Already in the requested spelling is a no-op');
check('Db stays Db', ...eq(respellChord('Db', 'flat'), 'Db'));
check('C# stays C#', ...eq(respellChord('C#', 'sharp'), 'C#'));

// --------------------------------------------------------------- naturals
// B<->Cb and E<->Fb are deliberately excluded: they change the name's length,
// which would shift renderLyrics()'s character-positioned chord row.
section('Naturals are never respelled (keeps lyric columns aligned)');
for (const n of ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
    check(`${n} unchanged both ways`,
        respellChord(n, 'flat') === n && respellChord(n, 'sharp') === n);
}
check('Bm not turned into Cbm', ...eq(respellChord('Bm', 'flat'), 'Bm'));
check('E7 not turned into Fb7', ...eq(respellChord('E7', 'flat'), 'E7'));

section('Exotic spellings are left alone rather than mangled');
check('Cb unchanged', ...eq(respellChord('Cb', 'sharp'), 'Cb'));
check('E# unchanged', ...eq(respellChord('E#', 'flat'), 'E#'));

// ----------------------------------------------------------- slash chords
section('Slash chords respell both halves');
check('D/F# -> D/Gb', ...eq(respellChord('D/F#', 'flat'), 'D/Gb'));
check('Eb/G -> D#/G', ...eq(respellChord('Eb/G', 'sharp'), 'D#/G'));
check('Db/Eb -> C#/D#', ...eq(respellChord('Db/Eb', 'sharp'), 'C#/D#'));

// -------------------------------------------------------------- passthru
section('Passthrough when no style is requested');
check('null accidental', ...eq(respellChord('C#', null), 'C#'));
check('unrecognised accidental', ...eq(respellChord('C#', 'bogus'), 'C#'));
check('empty string', ...eq(respellChord('', 'flat'), ''));
check('undefined chord', ...eq(respellChord(undefined, 'flat'), undefined));
check('not a chord name', ...eq(respellChord('N.C.', 'flat'), 'N.C.'));

// ------------------------------------------------- library-wide invariants
section('Invariants across the whole chord library');
const names = Object.keys(CHORDS);

let lenBad = [];
for (const name of names) {
    for (const a of ['flat', 'sharp']) {
        if (respellChord(name, a).length !== name.length) lenBad.push(`${name}->${respellChord(name, a)}`);
    }
}
check(`length never changes (${names.length} chords) so lyric columns stay aligned`,
    lenBad.length === 0, lenBad.join(' '));

let notIdem = [];
for (const name of names) {
    for (const a of ['flat', 'sharp']) {
        const once = respellChord(name, a);
        if (respellChord(once, a) !== once) notIdem.push(name);
    }
}
check('idempotent - respelling twice equals respelling once', notIdem.length === 0, notIdem.join(' '));

let noRound = [];
for (const name of names) {
    // flat -> sharp -> flat lands back on a name meaning the same pitch
    const there = respellChord(name, 'sharp');
    const back = respellChord(there, 'flat');
    if (respellChord(name, 'flat') !== back) noRound.push(`${name}->${there}->${back}`);
}
check('round trip is stable', noRound.length === 0, noRound.slice(0, 8).join(' '));

// ------------------------------------------- the reason this is display-only
// getScaleDegree() matches chord names as exact strings, so a respelled name
// must never reach it. This documents what breaks if that rule is violated.
section('Why respelled names must not reach analysis');
check('Db is IV in Ab', getScaleDegree('Db', 'Ab') === 'IV');
check('respelled C# is NOT IV in Ab (would silently become "?")',
    getScaleDegree(respellChord('Db', 'sharp'), 'Ab') === '?');
check('Fm is vi in Ab', getScaleDegree('Fm', 'Ab') === 'vi');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
