// Tests for canonicalRoot() and spelling-agnostic getScaleDegree().
// Run with: node tests/degrees.test.js
const fs = require('fs');
const {
    canonicalRoot, chordBaseName, getScaleDegree, transposeChord,
    SCALE_DEGREES_MAJOR, SCALE_DEGREES_MINOR,
} = require(__dirname + '/../chords.js');

// The roman arrays are module-private; read them out of the source so this test
// validates against what getScaleDegree() actually returns, not a copy.
const src = fs.readFileSync(__dirname + '/../chords.js', 'utf8');
const grab = (n) => eval(src.match(new RegExp('const ' + n + ' = (\\[[^\\]]*\\])'))[1]);
const ROMAN_MAJOR = grab('ROMAN_NUMERALS_MAJOR');
const ROMAN_MINOR = grab('ROMAN_NUMERALS_MINOR');

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
    if (cond) { pass++; console.log(`  ok   ${name}`); }
    else { fail++; console.log(`  FAIL ${name}${detail ? ' -- ' + detail : ''}`); }
}
function section(t) { console.log(`\n${t}`); }
const eq = (got, want) => [got === want, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`];

// -------------------------------------------------------- canonicalRoot
section('canonicalRoot normalises every accidental spelling');
check('naturals untouched', ...eq(canonicalRoot('C'), 'C'));
check('sharps untouched', ...eq(canonicalRoot('F#'), 'F#'));
check('flat -> sharp', ...eq(canonicalRoot('Bb'), 'A#'));
check('Db -> C#', ...eq(canonicalRoot('Db'), 'C#'));
check('double sharp (x)', ...eq(canonicalRoot('Fx'), 'G'));
check('double sharp (##)', ...eq(canonicalRoot('F##'), 'G'));
check('double flat', ...eq(canonicalRoot('Bbb'), 'A'));
check('wraps at B#', ...eq(canonicalRoot('B#'), 'C'));
check('wraps at Cb', ...eq(canonicalRoot('Cb'), 'B'));
check('suffix preserved', ...eq(canonicalRoot('Fxm'), 'Gm'));
check('dim suffix preserved', ...eq(canonicalRoot('B#dim'), 'Cdim'));
check('7th suffix preserved', ...eq(canonicalRoot('Bbmaj7'), 'A#maj7'));
check('idempotent', ...eq(canonicalRoot(canonicalRoot('Bb')), canonicalRoot('Bb')));
check('non-chord text untouched', ...eq(canonicalRoot('~'), '~'));
// documented limitation: the bass note lands in the suffix and is left alone
check('slash chord root only', ...eq(canonicalRoot('Db/F'), 'C#/F'));

// ----------------------------------------------- the four broken keys
// transposeChord() emits sharps; the tables spell each key musically. Before
// canonicalRoot() these four keys returned '?' for perfectly diatonic chords.
section('I-vi-IV-V resolves in all 12 keys (D#, F, G#, A# were broken)');
for (let s = 0; s < 12; s++) {
    const key = transposeChord('C', s);
    const chords = ['C', 'Am', 'F', 'G'].map(c => transposeChord(c, s));
    const degrees = chords.map(c => getScaleDegree(c, key)).join(' ');
    check(`${key.padEnd(2)} : ${chords.join(' ').padEnd(14)} -> ${degrees}`,
        degrees === 'I vi IV V');
}

section('The specific mismatches that caused it');
check('Bb is IV in F (transposeChord would say A#)', ...eq(getScaleDegree('Bb', 'F'), 'IV'));
check('A# is IV in F', ...eq(getScaleDegree('A#', 'F'), 'IV'));
check('Fm is vi in G# (table spells it E#m)', ...eq(getScaleDegree('Fm', 'G#'), 'vi'));
check('Cm is iii in G# (table spells it B#m)', ...eq(getScaleDegree('Cm', 'G#'), 'iii'));
check('Gm is vi in A# (table spells it Fxm)', ...eq(getScaleDegree('Gm', 'A#'), 'vi'));
check('Ab and G# agree on their IV', ...eq(getScaleDegree('C#', 'G#'), getScaleDegree('Db', 'Ab')));

section('7th suffixes still ride along');
check('G7 is V7 in C', ...eq(getScaleDegree('G7', 'C'), 'V7'));
check('A#7 is IV7 in F', ...eq(getScaleDegree('A#7', 'F'), 'IV7'));
check('Bbmaj7 is IV7 in F, same as A#maj7',
    ...eq(getScaleDegree('Bbmaj7', 'F'), getScaleDegree('A#maj7', 'F')));

// chordBaseName() keeps the chord's quality. The old /7|maj7|m7|dim7|aug/ stripped
// 'm7' whole, so 'Am7' became 'A': it matched no scale entry in a major key, and in a
// minor key it matched the BORROWED MAJOR IV instead of the minor iv.
section('Minor 7ths keep their quality');
check('Am7 is vi7 in C (was "?")', ...eq(getScaleDegree('Am7', 'C'), 'vi7'));
check('Am is vi in C', ...eq(getScaleDegree('Am', 'C'), 'vi'));
check('Dm7 is ii7 in C', ...eq(getScaleDegree('Dm7', 'C'), 'ii7'));
check('Bbm7 is ii7 in Ab', ...eq(getScaleDegree('Bbm7', 'Ab'), 'ii7'));
check('A#m7 is ii7 in Ab too (spelling-agnostic)', ...eq(getScaleDegree('A#m7', 'Ab'), 'ii7'));

section('Minor iv vs borrowed major IV are no longer confused');
check('Am7 is iv7 in Em (was IV7, the borrowed major)', ...eq(getScaleDegree('Am7', 'Em'), 'iv7'));
check('Am is iv in Em', ...eq(getScaleDegree('Am', 'Em'), 'iv'));
check('A is still the borrowed IV in Em', ...eq(getScaleDegree('A', 'Em'), 'IV'));
check('A7 is still IV7 in Em', ...eq(getScaleDegree('A7', 'Em'), 'IV7'));

section('Other suffixes are unaffected');
check('G7 stays V7 in C', ...eq(getScaleDegree('G7', 'C'), 'V7'));
check('Bdim7 stays vii°7 in C', ...eq(getScaleDegree('Bdim7', 'C'), 'vii°7'));
check('Caug reduces to the triad (I in C)', ...eq(getScaleDegree('Caug', 'C'), 'I'));
// still a known quirk, pinned so a future edit is deliberate: maj7 reports as plain 7
check('maj7 is still labelled like a dominant 7 (Cmaj7 -> I7)',
    ...eq(getScaleDegree('Cmaj7', 'C'), 'I7'));

section('chordBaseName strips extensions but keeps quality');
check('Am7 -> Am', ...eq(chordBaseName('Am7'), 'Am'));
check('Cmaj7 -> C', ...eq(chordBaseName('Cmaj7'), 'C'));
check('G7 -> G', ...eq(chordBaseName('G7'), 'G'));
check('Bdim7 -> Bdim', ...eq(chordBaseName('Bdim7'), 'Bdim'));
check('Caug -> C', ...eq(chordBaseName('Caug'), 'C'));
check('Am (no extension) unchanged', ...eq(chordBaseName('Am'), 'Am'));

section('Non-diatonic chords still report "?"');
check('F# is not in C', ...eq(getScaleDegree('F#', 'C'), '?'));
check('Gb is not in C either (same pitch)', ...eq(getScaleDegree('Gb', 'C'), '?'));
check('unknown key returns the chord', ...eq(getScaleDegree('C', 'Zz'), 'C'));

// ------------------------------------------- exhaustive table sweep
section('Exhaustive sweep: every table key x every degree');
const wrong = [];
for (const [table, roman] of [[SCALE_DEGREES_MAJOR, ROMAN_MAJOR], [SCALE_DEGREES_MINOR, ROMAN_MINOR]]) {
    for (const [key, scale] of Object.entries(table)) {
        scale.forEach((chord, i) => {
            if (getScaleDegree(chord, key) !== roman[i]) {
                wrong.push(`${key}:${chord} -> ${getScaleDegree(chord, key)} (want ${roman[i]})`);
            }
        });
    }
}
check('every table entry resolves to its own roman numeral', wrong.length === 0, wrong.join(', '));

const crossWrong = [];
for (const [table, roman] of [[SCALE_DEGREES_MAJOR, ROMAN_MAJOR], [SCALE_DEGREES_MINOR, ROMAN_MINOR]]) {
    for (const [key, scale] of Object.entries(table)) {
        scale.forEach((chord, i) => {
            // the sharp spelling transposeChord() would actually emit
            const alt = canonicalRoot(chord);
            if (alt !== chord && getScaleDegree(alt, key) !== roman[i]) {
                crossWrong.push(`${key}:${chord}(as ${alt}) -> ${getScaleDegree(alt, key)}`);
            }
        });
    }
}
check('every degree also resolves under its enharmonic spelling',
    crossWrong.length === 0, crossWrong.join(', '));

// ---------------------------------------------- real songs, all transpositions
section('Real song library through all 12 transpositions');
let cells = 0, unknown = 0, diatonicUnknown = [];
for (const f of fs.readdirSync(__dirname + '/../songs')) {
    const song = JSON.parse(fs.readFileSync(__dirname + '/../songs/' + f, 'utf8'));
    const chords = [...new Set([].concat(...(song.lines || [])
        .map(l => (l.chords || []).map(c => c.chord))))];
    for (let s = 0; s < 12; s++) {
        const key = transposeChord(song.key, s);
        const scale = (key.endsWith('m') && !key.endsWith('dim'))
            ? SCALE_DEGREES_MINOR[key] : SCALE_DEGREES_MAJOR[key];
        for (const c of chords) {
            const tc = transposeChord(c, s);
            cells++;
            if (getScaleDegree(tc, key) !== '?') continue;
            unknown++;
            // a '?' is only a bug if the chord IS in this key's table
            if (scale && scale.some(e => canonicalRoot(e) === canonicalRoot(tc))) {
                diatonicUnknown.push(`${tc} in ${key}`);
            }
        }
    }
}
console.log(`  ${cells} chord/key cells, ${unknown} report "?"`);
check('no diatonic chord reports "?" in any key',
    diatonicUnknown.length === 0, diatonicUnknown.slice(0, 10).join(', '));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
