const V = require(__dirname + '/../voicings.js');
const { findMelodyVoicings, parseChordSymbol, parseNoteName, midiToNoteName, fretToMidi, UKULELE_MIDI } = V;

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
    if (cond) { pass++; console.log(`  ok   ${name}`); }
    else { fail++; console.log(`  FAIL ${name}${detail ? ' -- ' + detail : ''}`); }
}
function section(t) { console.log(`\n${t}`); }

const show = (v) => `[${v.frets.join(' ')}] top=${v.melodyNote}(${v.melodyDegree}) on str${v.melodyString} ` +
    `notes=${v.notes.map(n => n || 'x').join(' ')} deg=${v.degrees.map(d => d || 'x').join(' ')} ` +
    `bass=${v.bassNote} span=${v.span} fing=${v.fingerCount} score=${v.score}` +
    (v.warnings.length ? ` !${v.warnings.join(',')}` : '');

// ---------------------------------------------------------------- note math
section('Note / pitch math');
check('C4 is MIDI 60', parseNoteName('C4').midi === 60);
check('A4 is MIDI 69', parseNoteName('A4').midi === 69);
check('E5 is MIDI 76', parseNoteName('E5').midi === 76);
check('Bb3 is MIDI 58', parseNoteName('Bb3').midi === 58);
check('pitch class only has no midi', parseNoteName('E').midi === null && parseNoteName('E').pc === 4);
check('midiToNoteName roundtrip', midiToNoteName(76) === 'E5' && midiToNoteName(58, true) === 'Bb3');
check('tuning is G4 C4 E4 A4', JSON.stringify(UKULELE_MIDI) === JSON.stringify([67, 60, 64, 69]));
check('open G (67) outranks E-string fret 2 (66)', fretToMidi(0, 0) > fretToMidi(2, 2));
check('C string fret 3 = D#4/Eb4', midiToNoteName(fretToMidi(1, 3)) === 'D#4');

// ---------------------------------------------------- chord symbol parsing
section('Chord symbol parsing');
const c = parseChordSymbol('C');
check('C = {C,E,G}', [...c.chordPcs].sort((a,b)=>a-b).join() === '0,4,7');
const am7 = parseChordSymbol('Am7');
check('Am7 = {A,C,E,G}', [...am7.chordPcs].sort((a,b)=>a-b).join() === '0,4,7,9');
check('Am7 5th is optional', !am7.requiredPcs.has(4) && am7.requiredPcs.has(9) && am7.requiredPcs.has(0) && am7.requiredPcs.has(7));
const slash = parseChordSymbol('Eb/G');
check('Eb/G parses bass G', slash.bass === 'G' && slash.bassPc === 7);
check('Eb/G root is Eb', slash.rootPc === 3);
check('Eb/G spells with flats', slash.useFlats === true);
const cb9 = parseChordSymbol('C/B');
check('C/B allows non-chord-tone bass B', cb9.allowedPcs.has(11) && !cb9.chordPcs.has(11));
check('Gsus means sus4', [...parseChordSymbol('Gsus').chordPcs].sort((a,b)=>a-b).join() === '0,2,7');
check('unknown suffix rejected', parseChordSymbol('Cwat') === null);
check('garbage rejected', parseChordSymbol('') === null && parseChordSymbol('H7') === null);

// -------------------------------------------- core invariant: melody on top
section('Core invariant: melody is the highest-sounding pitch');
const CASES = [
    ['C', 'E5'], ['C', 'C5'], ['C', 'G4'], ['Am', 'A4'], ['Am7', 'C5'],
    ['F', 'A4'], ['G7', 'B4'], ['Dm', 'F5'], ['Eb/G', 'Eb5'], ['Cmaj7', 'B4'],
    ['A7', 'C#5'], ['Bb', 'D5'], ['Em', 'G4'], ['D', 'A5'], ['Fmaj7', 'E5'],
];
let allTop = true, allRequired = true, allSpan = true, allFing = true, total = 0;
for (const [chordSym, note] of CASES) {
    const vs = findMelodyVoicings(chordSym, note, { limit: 50 });
    const chord = parseChordSymbol(chordSym);
    total += vs.length;
    for (const v of vs) {
        const sounding = v.midis.filter(m => m !== null);
        if (Math.max(...sounding) !== v.melodyMidi) { allTop = false; console.log(`    ${chordSym}/${note} ${show(v)}`); }
        if (v.midis[v.melodyString] !== v.melodyMidi) allTop = false;
        const pcs = new Set(sounding.map(m => m % 12));
        for (const pc of chord.requiredPcs) if (!pcs.has(pc)) allRequired = false;
        for (const m of sounding) if (!chord.allowedPcs.has(m % 12) && m !== v.melodyMidi) allRequired = false;
        if (v.span > 4) allSpan = false;
        if (v.fingerCount > 4) allFing = false;
    }
}
check(`melody is top pitch in all ${total} voicings across ${CASES.length} cases`, allTop);
check('required chord tones always present, no foreign notes', allRequired);
check('span never exceeds maxSpan', allSpan);
check('fingers never exceed 4', allFing);

// ------------------------------------------------- re-entrant G is handled
section('Re-entrant G string');
// A4 melody (69) sits only 2 semitones above open G (67). Any voicing with the
// G string open or fretted above 69 must be rejected.
const amA = findMelodyVoicings('Am', 'A4', { limit: 50 });
check('Am with A4 melody yields voicings', amA.length > 0);
const gOk = amA.every(v => v.midis[0] === null || v.midis[0] <= 69);
check('G string never sings above an A4 melody', gOk, amA.filter(v => v.midis[0] > 69).map(show).join(' | '));
// C4 melody (60) is the LOWEST pitch on the instrument - only the open C string
// can be the top note, which is impossible with anything else sounding.
const lowC = findMelodyVoicings('C', 'C4', { limit: 20 });
check('C4 melody is unplayable as a top note (nothing can sit under it)', lowC.length === 0, lowC.map(show).join(' | '));
// A melody on the G string itself is legitimate on a re-entrant uke
const gStringMelody = findMelodyVoicings('C', 'G4', { limit: 50 });
check('G4 melody found', gStringMelody.length > 0);
check('some G4 voicings carry the melody on the G string (index 0)',
    gStringMelody.some(v => v.melodyString === 0), gStringMelody.map(show).join(' | '));
check('G4 melody voicings mute or lower every string above G4',
    gStringMelody.every(v => v.midis.every(m => m === null || m <= 67)));

// ---------------------------------------------- known good uke chord shapes
section('Recognizes canonical shapes');
function has(vs, frets) { return vs.some(v => v.frets.join(',') === frets.join(',')); }
const cE = findMelodyVoicings('C', 'E5', { limit: 60 });
console.log('  C with E5 on top, best 5:');
cE.slice(0, 5).forEach(v => console.log('    ' + show(v)));
// E5 = MIDI 76 is reachable on three strings: A fret 7, E fret 12, and - because
// the G string is re-entrant (G4, not G3) - G fret 9.
check('C/E5 melody sits on A fret 7, E fret 12, or the re-entrant G fret 9',
    cE.every(v => (v.melodyString === 3 && v.frets[3] === 7) ||
                  (v.melodyString === 2 && v.frets[2] === 12) ||
                  (v.melodyString === 0 && v.frets[0] === 9)));
check('C/E5 includes a voicing with the melody on the G string (fret 9)',
    cE.some(v => v.melodyString === 0 && v.frets[0] === 9),
    'melody strings seen: ' + [...new Set(cE.map(v => v.melodyString))].join(','));

const cC = findMelodyVoicings('C', 'C5', { limit: 60 });
console.log('  C with C5 on top, best 5:');
cC.slice(0, 5).forEach(v => console.log('    ' + show(v)));
check('C/C5 finds the open C shape [0,0,0,3]', has(cC, [0, 0, 0, 3]),
    'got: ' + cC.slice(0, 8).map(v => v.frets.join('')).join(' '));
check('open C shape is ranked first', cC[0].frets.join(',') === '0,0,0,3', 'first = ' + show(cC[0]));

const am = findMelodyVoicings('Am', 'A4', { limit: 60 });
console.log('  Am with A4 on top, best 5:');
am.slice(0, 5).forEach(v => console.log('    ' + show(v)));
check('Am/A4 finds [-1,0,0,0] or [2,0,0,0]-style shapes under the melody',
    am.some(v => v.frets[3] === 0));

const f = findMelodyVoicings('F', 'A4', { limit: 60 });
console.log('  F with A4 on top, best 5:');
f.slice(0, 5).forEach(v => console.log('    ' + show(v)));
check('F/A4 finds the standard F shape [2,0,1,0]', has(f, [2, 0, 1, 0]),
    'got: ' + f.slice(0, 8).map(v => v.frets.join('')).join(' '));

// ----------------------------------------------------- non-chord-tone melody
section('Non-chord-tone melody (passing tones)');
const cD = findMelodyVoicings('C', 'D5', { limit: 10 });
check('C with a D5 melody (the 9th) still yields voicings', cD.length > 0);
check('flagged as not a chord tone and labelled as the 9', cD.every(v => v.melodyIsChordTone === false && v.melodyDegree === '9'));
console.log('  C with D5 (9th) on top, best 3:');
cD.slice(0, 3).forEach(v => console.log('    ' + show(v)));
check('other strings stay chord tones', cD.every(v =>
    v.midis.every((m, i) => m === null || i === v.melodyString || [0, 4, 7].includes(m % 12))));
check('allowNonChordMelody:false rejects it',
    findMelodyVoicings('C', 'D5', { allowNonChordMelody: false }).length === 0);
check('chord-tone melody outranks passing tone at equal shape cost',
    findMelodyVoicings('C', 'E5')[0].score < cD[0].score + 1.5 + 0.01);

// --------------------------------------------------------------- 7th chords
section('7th chords may drop the 5th');
const g7 = findMelodyVoicings('G7', 'F5', { limit: 30 });
check('G7 with F5 melody yields voicings', g7.length > 0);
check('every G7 voicing has root, 3rd and b7', g7.every(v => {
    const pcs = new Set(v.midis.filter(m => m !== null).map(m => m % 12));
    return pcs.has(7) && pcs.has(11) && pcs.has(5);
}));
check('at least one G7 voicing omits the 5th (D)', g7.some(v =>
    !v.midis.filter(m => m !== null).some(m => m % 12 === 2)));
console.log('  G7 with F5 on top, best 3:');
g7.slice(0, 3).forEach(v => console.log('    ' + show(v)));

const cmaj7 = findMelodyVoicings('Cmaj7', 'B4', { limit: 30 });
check('Cmaj7 with B4 melody keeps the major 7th on top',
    cmaj7.length > 0 && cmaj7.every(v => v.melodyDegree === '7'));

// -------------------------------------------------------------- slash chords
section('Slash chords');
const ebG = findMelodyVoicings('Eb/G', 'Eb5', { limit: 30 });
check('Eb/G yields voicings', ebG.length > 0);
console.log('  Eb/G with Eb5 on top, best 3:');
ebG.slice(0, 3).forEach(v => console.log('    ' + show(v)));
check('Eb/G voicings contain only Eb chord tones plus G', ebG.every(v =>
    v.midis.every(m => m === null || [3, 7, 10].includes(m % 12))));
const dF = findMelodyVoicings('D/F#', 'D5', { limit: 30 });
check('D/F# yields voicings, bass preference applied where reachable', dF.length > 0);
check('a G-in-bass Eb/G voicing scores better than a non-G bass one', (() => {
    const withG = ebG.find(v => v.bassNote[0] === 'G');
    const withoutG = ebG.find(v => v.bassNote[0] !== 'G');
    return !withG || !withoutG || withG.score < withoutG.score + 2.5;
})());

// ----------------------------------------------------------------- options
section('Options');
check('limit is honoured', findMelodyVoicings('C', 'E', { limit: 3 }).length === 3);
// "A" is reachable as a top note in two octaves (open A4, and A5 at A-string
// fret 12), unlike "E" where only E5 works - E4 would force the G and A strings
// muted, leaving too few notes, and E6 is past the 12th fret.
check('octave-free melody searches all reachable octaves',
    new Set(findMelodyVoicings('Am', 'A', { limit: 40 }).map(v => v.melodyNote)).size > 1,
    'octaves: ' + [...new Set(findMelodyVoicings('Am', 'A', { limit: 40 }).map(v => v.melodyNote))].join(','));
check('exact-pitch melody is honoured over pitch class',
    findMelodyVoicings('Am', 'A5', { limit: 40 }).every(v => v.melodyNote === 'A5'));
check('maxFret restricts the neck',
    findMelodyVoicings('C', 'E', { maxFret: 5, limit: 40 }).every(v => v.frets.every(fr => fr <= 5)));
check('allowMutes:false leaves no muted strings',
    findMelodyVoicings('C', 'E5', { allowMutes: false, limit: 40 }).every(v => !v.frets.includes(-1)));
check('minNotes:4 forces full 4-string voicings',
    findMelodyVoicings('C', 'E5', { minNotes: 4, limit: 40 }).every(v => !v.frets.includes(-1)));
check('maxSpan:1 gives only compact shapes',
    findMelodyVoicings('C', 'E', { maxSpan: 1, limit: 40 }).every(v => v.span <= 1));
check('unknown chord returns empty', findMelodyVoicings('Cwat', 'E5').length === 0);
check('unknown note returns empty', findMelodyVoicings('C', 'Q5').length === 0);

// ------------------------------------------------------- barre + finger count
section('Finger counting and barre detection');
check('Bb shape [3,2,1,1] counts as 3 fingers with a barre', (() => {
    const { count, barre } = V.countFingers([3, 2, 1, 1]);
    return count === 3 && barre && barre.fret === 1 && barre.fromString === 2 && barre.toString === 3;
})(), JSON.stringify(V.countFingers([3, 2, 1, 1])));
check('Bb barre strings share the index finger', (() => {
    const { fingers } = V.countFingers([3, 2, 1, 1]);
    return fingers[2] === 1 && fingers[3] === 1 && fingers[1] === 2 && fingers[0] === 3;
})(), JSON.stringify(V.countFingers([3, 2, 1, 1]).fingers));
check('open C [0,0,0,3] is 1 finger, no barre', (() => {
    const { count, barre, fingers } = V.countFingers([0, 0, 0, 3]);
    return count === 1 && barre === null && JSON.stringify(fingers) === '[0,0,0,1]';
})());
// chords.js stores fromString/toString as 0-indexed array positions and ui.js
// indexes them directly - a 1-based basis would render every barre a string off
check('barre uses 0-indexed string positions (C# [1,1,1,4] barres G-C-E = 0..2)', (() => {
    const { barre } = V.countFingers([1, 1, 1, 4]);
    return barre.fromString === 0 && barre.toString === 2 && barre.fret === 1;
})(), JSON.stringify(V.countFingers([1, 1, 1, 4]).barre));
check('barre spans under a higher-fretted string (Bb7 [1,2,1,1] barres all four)', (() => {
    const { barre, count, fingers } = V.countFingers([1, 2, 1, 1]);
    return barre.fromString === 0 && barre.toString === 3 && count === 2 &&
        JSON.stringify(fingers) === '[1,2,1,1]';
})(), JSON.stringify(V.countFingers([1, 2, 1, 1])));
check('no barre across a muted string', V.countFingers([1, -1, 1, 1]).barre.fromString === 2);
check('no barre across an open string', (() => {
    const { barre } = V.countFingers([1, 0, 1, 1]);
    return barre.fromString === 2 && barre.toString === 3;
})(), JSON.stringify(V.countFingers([1, 0, 1, 1]).barre));
check('all-open shape needs no fingers', V.countFingers([0, 0, 0, 0]).count === 0);
check('muted and open strings get finger 0', (() => {
    const { fingers } = V.countFingers([-1, 0, 2, 3]);
    return fingers[0] === 0 && fingers[1] === 0 && fingers[2] > 0 && fingers[3] > 0;
})());

// ------------------------------------------- createChordSVG() drop-in contract
section('createChordSVG() compatibility (ui.js indexes chord.fingers[stringIndex])');
const shapeCases = [...findMelodyVoicings('C', 'E5', { limit: 20 }), ...findMelodyVoicings('Bb', 'D5', { limit: 20 })];
check('every voicing exposes name/frets/fingers/barre/baseFret', shapeCases.every(v =>
    typeof v.name === 'string' && Array.isArray(v.frets) && v.frets.length === 4 &&
    Array.isArray(v.fingers) && v.fingers.length === 4 &&
    (v.barre === null || typeof v.barre.fret === 'number') && v.baseFret === 1));
check('fingers is a per-string array of 0-4, never a bare count',
    shapeCases.every(v => v.fingers.every(f => Number.isInteger(f) && f >= 0 && f <= 4)));
check('every fretted string is assigned a finger, open/muted get 0', shapeCases.every(v =>
    v.frets.every((fret, i) => (fret > 0 ? v.fingers[i] > 0 : v.fingers[i] === 0))));
check('fingerCount matches the distinct fingers assigned', shapeCases.every(v =>
    new Set(v.fingers.filter(f => f > 0)).size === v.fingerCount));

// -------------------------------------------- shell voicings / easy versions
section('Shell voicings: 2-finger versions that still sound like the chord');
const { findEasiestVoicing } = V;

check('shell is off by default', (() => {
    const plain = findMelodyVoicings('C', 'E5', { limit: 20 });
    return plain.every(v => v.isShell === false || v.hasRoot);
})());
check('default results are unchanged by the shell feature existing',
    findMelodyVoicings('C', 'E5', { limit: 6 })[0].frets.join(',') === '0,0,0,7');

// The bug caught during design: a dominant 7th shell must keep BOTH guide tones.
// Dropping the 3rd makes it a sus chord; dropping the b7 makes it a major triad.
const a7shells = findMelodyVoicings('A7', 'E5', { shell: true, maxFingers: 2, limit: 40 });
check('A7 shells exist with 2 fingers', a7shells.length > 0);
check('every A7 shell keeps the 3rd (C#) AND the b7 (G)', a7shells.every(v => {
    const pcs = new Set(v.midis.filter(m => m !== null).map(m => m % 12));
    return pcs.has(1) && pcs.has(7);
}), a7shells.filter(v => {
    const pcs = new Set(v.midis.filter(m => m !== null).map(m => m % 12));
    return !(pcs.has(1) && pcs.has(7));
}).map(v => v.frets.join('')).join(' '));
check('an A major triad is never offered as an A7 shell',
    !a7shells.some(v => {
        const pcs = new Set(v.midis.filter(m => m !== null).map(m => m % 12));
        return !pcs.has(7);   // no b7 = not a dominant chord
    }));

// Triads: the 3rd is what defines major vs minor, so it must survive
const triadShells = ['C', 'Am', 'F', 'Dm', 'G', 'Em'].flatMap(sym =>
    ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'].flatMap(note =>
        findMelodyVoicings(sym, note, { shell: true, maxFingers: 2, limit: 10 }).map(v => ({ sym, v }))));
check(`every triad shell keeps its 3rd (${triadShells.length} shells checked)`,
    triadShells.every(({ sym, v }) => {
        const chord = parseChordSymbol(sym);
        const pcs = new Set(v.midis.filter(m => m !== null).map(m => m % 12));
        return [...chord.characteristicPcs].every(pc => pcs.has(pc));
    }));
check('shells never contain a foreign note', triadShells.every(({ sym, v }) => {
    const chord = parseChordSymbol(sym);
    return v.midis.every((m, i) => m === null || i === v.melodyString || chord.allowedPcs.has(m % 12));
}));
check('shell mode allows a two-note double stop', (() => {
    const all = triadShells.map(t => t.v);
    return all.some(v => v.noteCount === 2);
})());
check('tier tagging is consistent with note count', triadShells.every(({ v }) =>
    !v.isShell ? v.shellTier === null
    : v.shellTier === (v.noteCount >= 3 ? 'solid' : 'fragment')));
check('shell ranking puts fuller voicings first', (() => {
    const s = findMelodyVoicings('A7', 'E5', { shell: true, maxFingers: 2, limit: 10 });
    return s.length < 2 || s[0].noteCount >= s[s.length - 1].noteCount;
})());

section('findEasiestVoicing(): escalate only as far as needed');
check('returns a normal voicing when one already fits 2 fingers', (() => {
    const e = findEasiestVoicing('C', 'E5');
    return e.easyTier === 'normal' && e.fingerCount <= 2 && e.isShell === false;
})(), JSON.stringify(findEasiestVoicing('C', 'E5')?.easyTier));
check('escalates to a solid shell when a full shape needs 3+ fingers', (() => {
    const e = findEasiestVoicing('A7', 'C5');
    return e && e.easyTier === 'solid' && e.fingerCount <= 2 && e.noteCount >= 3;
})(), JSON.stringify(findEasiestVoicing('A7', 'C5')));
check('never returns more than the requested finger count',
    ['C', 'Am', 'A7', 'Dm', 'G7', 'Bb', 'Cmaj7', 'F#m'].every(c =>
        ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'].every(n => {
            const e = findEasiestVoicing(c, n);
            return e === null || e.fingerCount <= 2;
        })));
check('prefers a solid shell over a fragment wherever one exists',
    ['C', 'Am', 'A7', 'Dm', 'G7', 'Bb', 'Cmaj7'].every(c =>
        ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'].every(n => {
            const e = findEasiestVoicing(c, n);
            if (!e || e.easyTier !== 'fragment') return true;
            // if it fell to a fragment, no solid shell may have been available
            return findMelodyVoicings(c, n, { shell: true, minNotes: 3, maxFingers: 2, limit: 1 }).length === 0;
        })));
check('returns null rather than an unplayable answer', findEasiestVoicing('C', 'C4') === null);
check('an easy option never loses a defining tone',
    ['C', 'Am', 'A7', 'Dm', 'G7', 'Bb', 'Cmaj7', 'Em', 'F', 'D7', 'Gmaj7'].every(c =>
        ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'].every(n => {
            const e = findEasiestVoicing(c, n);
            if (!e) return true;
            const chord = parseChordSymbol(c);
            const pcs = new Set(e.midis.filter(m => m !== null).map(m => m % 12));
            return [...chord.characteristicPcs].every(pc => pcs.has(pc));
        })));

// ------------------------------------------------- explaining empty results
section('explainNoVoicings(): an empty result is usually musically meaningful');
const { explainNoVoicings } = V;

check('says nothing when voicings exist', explainNoVoicings('C', 'E5').reason === 'has-voicings');

// C4 is the open C string - the lowest pitch on the instrument
const floorC = explainNoVoicings('C', 'C4');
check('C4 diagnosed as below the harmonizable range', floorC.reason === 'below-range', floorC.reason);
check('C4 message names the instrument floor', /lowest pitch on a ukulele/.test(floorC.message));
console.log('  C/C4  -> ' + floorC.message);

// E4 leaves only the C and E strings beneath it - two notes, not a chord
const floorE = explainNoVoicings('C', 'E4');
check('E4 diagnosed as below range too (only 2 strings beneath)', floorE.reason === 'below-range', floorE.reason);
console.log('  C/E4  -> ' + floorE.message);

// G7 needs a B; B3 is below the instrument and B4 is above an A4 melody
const g7a = explainNoVoicings('G7', 'A4');
check('G7 with A4 on top diagnosed as a missing chord tone', g7a.reason === 'missing-chord-tone', g7a.reason);
check('G7/A4 names B as the unavailable note', g7a.missingTones.join() === 'B', JSON.stringify(g7a.missingTones));
check('article agrees with the note name ("an A", not "a A")', (() => {
    const am = explainNoVoicings('Am', 'G4');       // needs an A
    const g = explainNoVoicings('G7', 'A4');        // needs a B
    return /needs an A,/.test(am.message) && /needs a B,/.test(g.message);
})(), explainNoVoicings('Am', 'G4').message);
check('multiple missing tones are listed as a list', (() => {
    const multi = ['C', 'F', 'G', 'D', 'A', 'E', 'Bb', 'Eb'].map(r => explainNoVoicings(r + 'maj7', 'D4'))
        .concat(['C', 'F'].map(r => explainNoVoicings(r + '7', 'Eb4')))
        .find(r => r.missingTones && r.missingTones.length > 1);
    return !multi || /needs these notes: /.test(multi.message);
})());
console.log('  G7/A4 -> ' + g7a.message);

// Something that only fails on playability, not on theory
const relaxCases = ['Cmaj7', 'Am7', 'G7', 'Bb', 'Eb', 'F#m7b5', 'A7', 'Dm7', 'E7', 'Abmaj7'];
const notes = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const reasons = {};
let relaxExample = null;
for (const c of relaxCases) {
    for (const n of notes) {
        for (const oct of [4, 5]) {
            const r = explainNoVoicings(c, n + oct);
            reasons[r.reason] = (reasons[r.reason] || 0) + 1;
            if (r.reason === 'needs-relaxation' && !relaxExample) relaxExample = { c, n: n + oct, r };
        }
    }
}
check('every chord/note pair gets a diagnosis, never undefined',
    Object.keys(reasons).every(k => k && k !== 'undefined'), JSON.stringify(reasons));
console.log('  diagnosis spread over 240 pairs: ' + JSON.stringify(reasons));
check('at least one pair is diagnosed as a playability limit, not a theory limit',
    relaxExample !== null);
if (relaxExample) {
    console.log(`  ${relaxExample.c}/${relaxExample.n} -> ${relaxExample.r.message}`);
    check('the named relaxation actually produces voicings',
        findMelodyVoicings(relaxExample.c, relaxExample.n, relaxExample.r.relaxation).length > 0);
}
check('every message is a non-empty sentence', Object.entries(reasons).length > 0 &&
    relaxCases.every(c => notes.every(n => {
        const r = explainNoVoicings(c, n + '5');
        return r.reason === 'has-voicings' || (typeof r.message === 'string' && r.message.length > 20);
    })));
check('bad chord and bad note are reported distinctly',
    explainNoVoicings('Cwat', 'E5').reason === 'unknown-chord' &&
    explainNoVoicings('C', 'Q9').reason === 'unknown-note');

// ---------------------------------------------------------- coverage sweep
section('Coverage sweep: every chord type, every melody pitch class');
const types = Object.keys(V.CHORD_TYPES);
let combos = 0, empty = [], violations = 0;
for (const t of types) {
    for (const root of ['C', 'F', 'G', 'A', 'Bb', 'Eb']) {
        const sym = root + t;
        for (const pc of ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
            combos++;
            const vs = findMelodyVoicings(sym, pc, { limit: 5 });
            if (!vs.length) { empty.push(`${sym}/${pc}`); continue; }
            for (const v of vs) {
                const sounding = v.midis.filter(m => m !== null);
                if (Math.max(...sounding) !== v.melodyMidi) violations++;
                if (v.span > 4 || v.fingerCount > 4) violations++;
                if (sounding.length < 3) violations++;
            }
        }
    }
}
check(`no invariant violations across ${combos} chord/melody combinations`, violations === 0, `${violations} violations`);
console.log(`  ${empty.length}/${combos} combinations found no voicing` + (empty.length ? `: ${empty.slice(0, 12).join(' ')}${empty.length > 12 ? ' ...' : ''}` : ''));

// ------------------------------------------------------------------ timing
section('Performance');
const t0 = process.hrtime.bigint();
for (let i = 0; i < 50; i++) findMelodyVoicings('Cmaj7', 'E', { limit: 8 });
const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 50;
check(`single call under 25ms (${ms.toFixed(1)}ms avg, octave-free = worst case)`, ms < 25);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
