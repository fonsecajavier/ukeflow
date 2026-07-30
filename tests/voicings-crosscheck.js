/**
 * Cross-check the generator against the real hand-authored shapes in chords.js.
 * For each stored chord shape: compute its actual highest-sounding note, then ask
 * the generator for that chord with that note on top and see if the stored shape
 * comes back. A stored shape that the generator cannot rediscover is either a
 * generator bug or a shape outside its stated playability limits.
 */
const fs = require('fs');
const path = __dirname + '/../chords.js';

// chords.js assigns to window at the bottom; give it a stub and grab CHORDS.
const src = fs.readFileSync(path, 'utf8');
const sandbox = { window: {} };
const loader = new Function('window', src + '\n; return { CHORDS, CHORD_VARIATIONS, computeChordFromFrets };');
const { CHORDS, computeChordFromFrets } = loader(sandbox.window);

const V = require(__dirname + '/../voicings.js');
const { findMelodyVoicings, parseChordSymbol, fretToMidi, midiToNoteName, countFingers } = V;

// -------------------------------------------------------------------------
// Barre convention: chords.js stores fromString/toString as 0-indexed array
// positions (e.g. C# [1,1,1,4] barres strings 0-2 = G,C,E), and ui.js line ~295
// uses them directly as array indices. countFingers() must use the same basis or
// every generated barre renders on the wrong strings.
// -------------------------------------------------------------------------
let barreAgree = 0, barreDisagree = [], barreMissed = 0;
for (const [name, data] of Object.entries(CHORDS)) {
    if (!data.barre || !Array.isArray(data.frets)) continue;
    if ((data.baseFret || 1) !== 1) continue;
    const mine = countFingers(data.frets).barre;
    if (!mine) { barreMissed++; continue; }
    const same = mine.fret === data.barre.fret &&
                 mine.fromString === data.barre.fromString &&
                 mine.toString === data.barre.toString;
    if (same) barreAgree++;
    else barreDisagree.push(`${name} [${data.frets.join(' ')}] library=${JSON.stringify(data.barre)} mine=${JSON.stringify(mine)}`);
}
console.log('Barre convention vs chords.js');
console.log(`  agree exactly:        ${barreAgree}`);
console.log(`  disagree:             ${barreDisagree.length}`);
barreDisagree.forEach(s => console.log(`     ${s}`));
console.log(`  library barres not found: ${barreMissed}`);
// A G-string barre is the case where a 0-indexed vs 1-indexed mixup would show
const cSharp = countFingers([1, 1, 1, 4]).barre;
console.log(`  G-string barre check: C# [1 1 1 4] -> ${JSON.stringify(cSharp)} ` +
    `(${cSharp.fromString === 0 ? 'OK 0-indexed, matches library' : 'WRONG BASIS'})`);
console.log('');

const results = { checked: 0, rediscovered: 0, rootless: 0, unknownType: [], outOfLimits: [], missed: [] };

for (const [name, data] of Object.entries(CHORDS)) {
    const frets = data.frets;
    if (!Array.isArray(frets) || frets.length !== 4) continue;
    if ((data.baseFret || 1) !== 1) continue;        // stored relative to a shifted position
    if (!parseChordSymbol(name)) { results.unknownType.push(name); continue; }

    const midis = frets.map((f, i) => fretToMidi(i, f));
    const sounding = midis.filter(m => m !== null);
    if (sounding.length < 3) continue;

    const topMidi = Math.max(...sounding);
    const topNote = midiToNoteName(topMidi);
    const fretted = frets.filter(f => f > 0);
    const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
    const { count: fingerCount } = countFingers(frets);

    results.checked++;

    const found = findMelodyVoicings(name, topNote, { limit: 500, maxSpan: 6, maxFingers: 4 });
    const hit = found.find(v => v.frets.join(',') === frets.join(','));

    if (hit) {
        results.rediscovered++;
        // Also confirm the generator agrees on which string carries the melody
        if (midis[hit.melodyString] !== topMidi) {
            console.log(`  melody-string mismatch: ${name}`);
        }
        continue;
    }

    // Second pass: allow rootless voicings (standard for extended jazz chords)
    const rootlessFound = findMelodyVoicings(name, topNote, { limit: 500, maxSpan: 6, maxFingers: 4, allowRootless: true });
    if (rootlessFound.some(v => v.frets.join(',') === frets.join(','))) {
        results.rootless++;
        continue;
    }

    if (span > 6 || fingerCount > 4) {
        results.outOfLimits.push(`${name} [${frets.join(' ')}] span=${span} fingers=${fingerCount}`);
    } else {
        // Ask the app's OWN chord identifier what this shape actually is
        const actual = computeChordFromFrets(frets);
        const chord = parseChordSymbol(name);
        const pcs = new Set(sounding.map(m => m % 12));
        const missingRequired = [...chord.requiredPcs].filter(pc => !pcs.has(pc));
        const foreign = sounding.filter(m => !chord.allowedPcs.has(m % 12)).map(m => midiToNoteName(m));
        results.missed.push(
            `${name.padEnd(8)} [${frets.join(' ')}] is really: ${(actual.slice(0, 3).join(' / ') || '?').padEnd(24)}` +
            (missingRequired.length ? ` missing=${missingRequired.map(pc => midiToNoteName(60 + pc).slice(0, -1)).join('/')}` : '') +
            (foreign.length ? ` foreign=${[...new Set(foreign.map(n => n.slice(0, -1)))].join('/')}` : '')
        );
    }
}

console.log(`\nStored shapes checked:       ${results.checked}`);
console.log(`Rediscovered by generator:   ${results.rediscovered} (${(100 * results.rediscovered / results.checked).toFixed(1)}%)`);
console.log(`  + with allowRootless:true: ${results.rootless} (running total ${(100 * (results.rediscovered + results.rootless) / results.checked).toFixed(1)}%)`);
console.log(`Outside playability limits:  ${results.outOfLimits.length}`);
results.outOfLimits.forEach(s => console.log(`   ${s}`));
console.log(`Chord types generator skips: ${results.unknownType.length}${results.unknownType.length ? ' -> ' + results.unknownType.join(' ') : ''}`);
console.log(`\nNot rediscovered (${results.missed.length}):`);
results.missed.forEach(s => console.log(`   ${s}`));
