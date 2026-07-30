/**
 * UkeFlow - Voicings Module
 * Chord-melody voicing generator.
 *
 * Given a chord symbol and a melody note, finds playable ukulele voicings where
 * the melody note is the HIGHEST-SOUNDING note of the chord.
 *
 * IMPORTANT - re-entrant tuning:
 * Standard GCEA tuning is re-entrant: the G string (G4, MIDI 67) is the
 * SECOND-HIGHEST pitched string, not the lowest. So "melody on the A string" is
 * NOT a valid rule on ukulele - an open G string will sing over a melody note
 * fretted low on the A or E string. Every comparison in this module is made on
 * actual pitch (MIDI), never on string index, and muting or re-fretting the G
 * string is a normal outcome. This is what makes uke chord melody distinct from
 * a guitar arrangement.
 */

// MIDI note numbers for each open string [G, C, E, A].
// Note the order is NOT ascending - that is the re-entrant G.
const UKULELE_MIDI = [67, 60, 64, 69]; // G4, C4, E4, A4

const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Semitone offset for each letter name, before accidentals
const LETTER_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Chord type definitions, keyed by the suffix used in chord symbols.
 * - intervals: every semitone offset from the root the chord may contain
 * - optional:  intervals that may be omitted (the 5th, mostly) - on a 4-string
 *              instrument something usually has to go, and the 5th is the note
 *              that carries the least information.
 * - characteristic: the tones that define the chord's quality, used by shell
 *              voicings (the `shell` option on findMelodyVoicings). Everything
 *              else - including the ROOT - may be dropped to get a shape playable
 *              with two fingers. For a triad this is the 3rd; for a seventh chord
 *              it is the guide-tone PAIR (3rd + 7th), because dropping either one
 *              stops the chord being itself: a dominant 7th without its 3rd is a
 *              sus chord, and without its b7 it is just a major triad.
 *
 * Note: CHORDS in chords.js voices some extended chords loosely (e.g. 'C9' is
 * stored as an add9 shape with no b7). This table is strict music theory, so a
 * generated 9th voicing may not match the stored diagram for the same symbol.
 */
const CHORD_TYPES = {
    '':       { intervals: [0, 4, 7],            optional: [],     characteristic: [4] },
    'm':      { intervals: [0, 3, 7],            optional: [],     characteristic: [3] },
    // On a 4-string uke a plain "dim" is conventionally voiced as a dim7 (the
    // shapes in chords.js do exactly this), so the bb7 is allowed but not required
    'dim':    { intervals: [0, 3, 6, 9],         optional: [9],    characteristic: [3, 6] },
    'aug':    { intervals: [0, 4, 8],            optional: [],     characteristic: [4, 8] },
    'sus4':   { intervals: [0, 5, 7],            optional: [],     characteristic: [5] },
    'sus':    { intervals: [0, 5, 7],            optional: [],     characteristic: [5] },  // bare "sus" means sus4
    'sus2':   { intervals: [0, 2, 7],            optional: [],     characteristic: [2] },
    '5':      { intervals: [0, 7],               optional: [],     characteristic: [7] },
    '6':      { intervals: [0, 4, 7, 9],         optional: [7],    characteristic: [4, 9] },
    'm6':     { intervals: [0, 3, 7, 9],         optional: [7],    characteristic: [3, 9] },
    '7':      { intervals: [0, 4, 7, 10],        optional: [7],    characteristic: [4, 10] },
    'm7':     { intervals: [0, 3, 7, 10],        optional: [7],    characteristic: [3, 10] },
    'maj7':   { intervals: [0, 4, 7, 11],        optional: [7],    characteristic: [4, 11] },
    'mmaj7':  { intervals: [0, 3, 7, 11],        optional: [7],    characteristic: [3, 11] },
    'dim7':   { intervals: [0, 3, 6, 9],         optional: [],     characteristic: [3, 6] },
    'm7b5':   { intervals: [0, 3, 6, 10],        optional: [],     characteristic: [3, 6] },
    '7sus4':  { intervals: [0, 5, 7, 10],        optional: [7],    characteristic: [5, 10] },
    '7sus':   { intervals: [0, 5, 7, 10],        optional: [7],    characteristic: [5, 10] },
    'add9':   { intervals: [0, 2, 4, 7],         optional: [7],    characteristic: [4] },
    'add2':   { intervals: [0, 2, 4, 7],         optional: [7],    characteristic: [4] },
    '9':      { intervals: [0, 2, 4, 7, 10],     optional: [7],    characteristic: [4, 10] },
    'm9':     { intervals: [0, 2, 3, 7, 10],     optional: [7],    characteristic: [3, 10] },
    'maj9':   { intervals: [0, 2, 4, 7, 11],     optional: [7],    characteristic: [4, 11] },
    '7#9':    { intervals: [0, 3, 4, 7, 10],     optional: [7],    characteristic: [4, 10] },
    '7b9':    { intervals: [0, 1, 4, 7, 10],     optional: [7],    characteristic: [4, 10] },
    '11':     { intervals: [0, 2, 4, 5, 7, 10],  optional: [4, 7, 2], characteristic: [5, 10] },
    '13':     { intervals: [0, 2, 4, 7, 9, 10],  optional: [7, 2], characteristic: [4, 10] },
};

// Semitone offset -> scale-degree label, for annotating what each string plays
const DEGREE_LABELS = {
    0: 'R', 1: 'b9', 2: '9', 3: 'b3', 4: '3', 5: '11',
    6: 'b5', 7: '5', 8: '#5', 9: '6', 10: 'b7', 11: '7'
};

/**
 * Parse a note name into pitch class and (if an octave is given) absolute MIDI.
 * Accepts "E", "Eb", "F#", "E5", "Bb3". Octave 4 = the octave of middle C
 * (C4 = MIDI 60), matching the tuning constants above.
 * @param {string} name
 * @returns {{pc: number, midi: number|null, name: string}|null}
 */
function parseNoteName(name) {
    if (typeof name !== 'string') return null;
    const match = name.trim().match(/^([A-Ga-g])([#b]*)(-?\d+)?$/);
    if (!match) return null;

    const [, letter, accidentals, octave] = match;
    let semitone = LETTER_SEMITONES[letter.toUpperCase()];
    for (const accidental of accidentals) {
        semitone += accidental === '#' ? 1 : -1;
    }

    const pc = ((semitone % 12) + 12) % 12;
    // MIDI 60 = C4, so octave n starts at 12 * (n + 1)
    const midi = octave === undefined ? null : 12 * (parseInt(octave, 10) + 1) + semitone;

    return { pc, midi, name: name.trim() };
}

/**
 * Convert a MIDI number to a note name with octave (e.g. 76 -> "E5").
 * @param {number} midi
 * @param {boolean} useFlats - spell accidentals as flats
 * @returns {string}
 */
function midiToNoteName(midi, useFlats = false) {
    const names = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
    const pc = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return names[pc] + octave;
}

/**
 * MIDI number produced by a string/fret pair. Returns null for a muted string.
 * @param {number} stringIndex - 0=G, 1=C, 2=E, 3=A
 * @param {number} fret - 0 = open, -1 = muted
 * @returns {number|null}
 */
function fretToMidi(stringIndex, fret) {
    if (fret === null || fret < 0) return null;
    return UKULELE_MIDI[stringIndex] + fret;
}

/**
 * Parse a chord symbol into the pitch classes it may and must contain.
 * Handles slash chords: the bass note is allowed as a sounding note even when it
 * is not a chord tone, and is treated as a scoring preference rather than a
 * requirement (see CLAUDE.md - a re-entrant uke often cannot put it in the bass).
 * @param {string} symbol - e.g. "Am7", "Cmaj7", "Eb/G"
 * @returns {Object|null} parsed chord, or null if unrecognized
 */
function parseChordSymbol(symbol) {
    if (typeof symbol !== 'string' || !symbol.trim()) return null;

    let working = symbol.trim();
    let bass = null;
    let bassPc = null;

    if (working.includes('/')) {
        const [chordPart, bassPart] = working.split('/');
        working = chordPart;
        const parsedBass = parseNoteName(bassPart);
        if (parsedBass) {
            bass = bassPart;
            bassPc = parsedBass.pc;
        }
    }

    const match = working.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return null;

    const [, root, rawType] = match;
    const type = rawType.trim();
    if (!(type in CHORD_TYPES)) return null;

    const rootParsed = parseNoteName(root);
    if (!rootParsed) return null;

    const { intervals, optional, characteristic } = CHORD_TYPES[type];
    const useFlats = root.includes('b');
    const rootPc = rootParsed.pc;

    const toPc = (interval) => (rootPc + interval) % 12;
    const requiredIntervals = intervals.filter(i => !optional.includes(i));

    const allowedPcs = new Set(intervals.map(toPc));
    if (bassPc !== null) allowedPcs.add(bassPc);

    return {
        symbol: symbol.trim(),
        root,
        rootPc,
        type,
        useFlats,
        intervals,
        optionalIntervals: optional,
        requiredPcs: new Set(requiredIntervals.map(toPc)),
        // The bare minimum that still sounds like this chord - see CHORD_TYPES
        characteristicPcs: new Set((characteristic || requiredIntervals).map(toPc)),
        chordPcs: new Set(intervals.map(toPc)),
        allowedPcs,
        bass,
        bassPc,
    };
}

/**
 * Label what a pitch class is doing relative to the chord root (R, 3, b7, 9...).
 * @param {number} pc - pitch class of the note
 * @param {Object} chord - parsed chord from parseChordSymbol()
 * @returns {string}
 */
function degreeLabel(pc, chord) {
    const interval = ((pc - chord.rootPc) % 12 + 12) % 12;
    // In a diminished 7th the 9-semitone note is a diminished 7th, not a 6th
    if (chord.type === 'dim7' && interval === 9) return 'bb7';
    return DEGREE_LABELS[interval] || String(interval);
}

/**
 * Work out the fingering for a set of frets, accounting for one barre.
 * Contiguous strings stopped at the same fret can be covered by a single finger.
 * @param {Array<number>} frets - [G, C, E, A], -1 muted, 0 open
 * @returns {{count: number, fingers: Array<number>, barre: Object|null}}
 *          count = fingers required; fingers = per-string assignment (1-4, or 0
 *          for open/muted) in the [G, C, E, A] shape createChordSVG() expects
 */
function countFingers(frets) {
    const fretted = frets
        .map((fret, stringIndex) => ({ fret, stringIndex }))
        .filter(f => f.fret > 0);

    if (fretted.length === 0) return { count: 0, fingers: [0, 0, 0, 0], barre: null };

    const lowestFret = Math.min(...fretted.map(f => f.fret));
    const atLowest = fretted.filter(f => f.fret === lowestFret).map(f => f.stringIndex).sort((a, b) => a - b);

    // A barre spans from the first to the last string stopped at the lowest fret.
    // Strings *inside* that span may be fretted higher - you lay the index finger
    // flat across all of them and stack other fingers on top (the standard Bb7
    // [1,2,1,1] and B7 [2,3,2,2] shapes work exactly this way). What breaks a
    // barre is an open or muted string inside the span: you cannot barre across a
    // string that has to ring open or stay silent.
    let barre = null;
    let saved = 0;

    const spanIsBarrable = (from, to) => {
        for (let i = from; i <= to; i++) {
            if (frets[i] < lowestFret) return false;  // open (0) or muted (-1)
        }
        return true;
    };

    if (atLowest.length >= 2 && spanIsBarrable(atLowest[0], atLowest[atLowest.length - 1])) {
        barre = { fret: lowestFret, fromString: atLowest[0], toString: atLowest[atLowest.length - 1] };
        saved = atLowest.length - 1;
    } else if (atLowest.length >= 2) {
        // Something open or muted interrupts the full span - fall back to the
        // longest uninterrupted run of strings sitting on the lowest fret.
        let bestRun = [atLowest[0]];
        let currentRun = [atLowest[0]];
        for (let i = 1; i < atLowest.length; i++) {
            currentRun = atLowest[i] === atLowest[i - 1] + 1 ? [...currentRun, atLowest[i]] : [atLowest[i]];
            if (currentRun.length > bestRun.length) bestRun = [...currentRun];
        }
        if (bestRun.length >= 2) {
            barre = { fret: lowestFret, fromString: bestRun[0], toString: bestRun[bestRun.length - 1] };
            saved = bestRun.length - 1;
        }
    }

    // Assign actual finger numbers: the barre (if any) takes the index finger,
    // then the rest go in ascending fret order - the natural way a hand falls.
    const fingers = [0, 0, 0, 0];
    const barred = barre ? frets.map((f, i) => i >= barre.fromString && i <= barre.toString && f === barre.fret) : [];
    let nextFinger = 1;
    if (barre) {
        for (let i = 0; i < 4; i++) if (barred[i]) fingers[i] = 1;
        nextFinger = 2;
    }
    const remaining = fretted
        .filter(f => !barre || !barred[f.stringIndex])
        .sort((a, b) => a.fret - b.fret || a.stringIndex - b.stringIndex);
    for (const { stringIndex } of remaining) {
        fingers[stringIndex] = Math.min(nextFinger++, 4);
    }

    return { count: fretted.length - saved, fingers, barre };
}

/**
 * Score a candidate voicing. Lower is better.
 * Weights encode playability (span, fingers, position, awkward mutes) plus
 * musical clarity (does the melody note actually ring above the chord).
 */
function scoreVoicing(candidate, chord, options) {
    const { frets, midis, melodyMidi } = candidate;
    const fretted = frets.filter(f => f > 0);
    const minFret = fretted.length ? Math.min(...fretted) : 0;
    const maxFret = fretted.length ? Math.max(...fretted) : 0;
    const span = fretted.length ? maxFret - minFret : 0;

    const { count: fingerCount, fingers, barre } = countFingers(frets);
    const openStrings = frets.filter(f => f === 0).length;
    const mutedStrings = frets.map((f, i) => (f === -1 ? i : -1)).filter(i => i >= 0);

    let score = 0;
    const warnings = [];

    // Stretch: a 1-fret span is free, beyond that it hurts
    score += Math.max(0, span - 1) * 2;

    // Fingers in use (a barre already counted as one)
    score += fingerCount * 1.0;

    // Prefer shapes near the nut
    score += minFret * 0.4;

    // Open strings ring and cost nothing to hold
    score -= openStrings * 0.5;

    // Muting: the outer G string is easy to damp with the fretting hand, the
    // A string is awkward, and an interior C or E is very hard to silence
    // cleanly while strumming.
    for (const stringIndex of mutedStrings) {
        if (stringIndex === 0) {
            score += 1.5;
        } else if (stringIndex === 3) {
            score += 3;
            warnings.push('mutes-a-string');
        } else {
            score += 6;
            warnings.push('mutes-interior-string');
        }
    }

    // Melody clarity: how far the melody sits above the next-highest note
    const otherMidis = midis.filter((m, i) => m !== null && i !== candidate.melodyString);
    const nextHighest = otherMidis.length ? Math.max(...otherMidis) : null;
    const clearance = nextHighest === null ? 12 : melodyMidi - nextHighest;
    if (clearance === 0) {
        score += 2;
        warnings.push('melody-doubled-in-unison');
    } else if (clearance <= 2) {
        score += 1;
    }

    // Bass preference: root in the bass is stable; for a slash chord the written
    // bass note is better still (when it happens to be reachable down there)
    const soundingMidis = midis.filter(m => m !== null);
    const bassMidi = Math.min(...soundingMidis);
    const bassPc = bassMidi % 12;
    if (chord.bassPc !== null && bassPc === chord.bassPc) {
        score -= 2.5;
    } else if (bassPc === chord.rootPc) {
        score -= 1.5;
    }

    // A melody note outside the chord (passing tone) is musically fine but
    // slightly less resolved, so it sorts below a chord-tone melody
    if (!candidate.melodyIsChordTone) {
        score += 1.5;
    }

    // In shell mode, keep as much of the chord as the hand allows: a fuller voicing
    // and a present root both make the shape stand on its own, so they outrank a
    // bare double stop even though the double stop is easier to hold.
    if (options.shell) {
        score += (4 - soundingMidis.length) * 1.5;
        if (!soundingMidis.some(m => m % 12 === chord.rootPc)) score += 1.2;
    }

    if (span > (options.maxSpan ?? 4)) warnings.push('wide-stretch');

    return { score, span, fingerCount, fingers, barre, openStrings, mutedStrings, bassMidi, clearance, warnings };
}

/**
 * Find playable voicings of a chord with a given melody note on top.
 *
 * @param {string} chordSymbol - e.g. "C", "Am7", "Eb/G"
 * @param {string} melodyNote - pitch class ("E") or exact pitch ("E5"). Without
 *        an octave, every reachable octave is searched.
 * @param {Object} [options]
 * @param {number} [options.maxFret=12]  highest fret to consider
 * @param {number} [options.maxSpan=4]   largest fret span allowed
 * @param {number} [options.minNotes=3]  fewest sounding strings
 * @param {number} [options.maxFingers=4]
 * @param {boolean} [options.allowMutes=true]
 * @param {boolean} [options.allowNonChordMelody=true] permit a melody note that
 *        is not a chord tone (passing tones, real melodies do this constantly)
 * @param {boolean} [options.allowRootless=false] for chords with a 7th, permit
 *        voicings that omit the root - standard jazz practice and often the only
 *        way to fit an extended chord under a melody, but confusing for beginners
 * @param {boolean} [options.shell=false] strip the chord to its quality-defining
 *        tones (CHORD_TYPES.characteristic), dropping the root and 5th as needed.
 *        This is how a 3- or 4-finger stretch becomes playable with two fingers,
 *        and it is normal chord-melody practice - the harmony around you supplies
 *        the root. Implies minNotes 2 unless minNotes is given. Results are tagged
 *        `isShell` and `shellTier` ('solid' for 3+ notes, 'fragment' for 2 notes,
 *        which is a double stop that only makes sense in context).
 * @param {number} [options.limit=8] how many voicings to return
 * @returns {Array<Object>} voicings, best first
 */
function findMelodyVoicings(chordSymbol, melodyNote, options = {}) {
    const chord = parseChordSymbol(chordSymbol);
    const melody = parseNoteName(melodyNote);
    if (!chord || !melody) return [];

    const opts = {
        maxFret: 12,
        maxSpan: 4,
        maxFingers: 4,
        allowMutes: true,
        allowNonChordMelody: true,
        allowRootless: false,
        shell: false,
        limit: 8,
        ...options,
        // A shell is allowed to be a two-note double stop, unless told otherwise
        minNotes: options.minNotes ?? (options.shell ? 2 : 3),
    };

    const melodyIsChordTone = chord.chordPcs.has(melody.pc);
    if (!melodyIsChordTone && !opts.allowNonChordMelody) return [];

    // Which tones must survive. Normally everything but the 5th; in shell mode only
    // the tones that define the chord's quality, so the root and 5th can go.
    let requiredPcs = new Set(chord.requiredPcs);
    if (opts.shell) {
        requiredPcs = new Set(chord.characteristicPcs);
    } else if (opts.allowRootless) {
        // Rootless voicings only make sense for chords carrying a 7th - drop the
        // root from a triad and you have simply named a different chord.
        const hasSeventh = chord.intervals.includes(10) || chord.intervals.includes(11);
        if (hasSeventh) requiredPcs.delete(chord.rootPc);
    }

    // Which absolute pitches count as "the melody note"?
    const targetMidis = [];
    if (melody.midi !== null) {
        targetMidis.push(melody.midi);
    } else {
        const lowest = Math.min(...UKULELE_MIDI);
        const highest = Math.max(...UKULELE_MIDI) + opts.maxFret;
        for (let midi = lowest; midi <= highest; midi++) {
            if (midi % 12 === melody.pc) targetMidis.push(midi);
        }
    }

    const candidates = [];

    for (const targetMidi of targetMidis) {
        // Every string/fret that can produce the melody pitch
        for (let melodyString = 0; melodyString < 4; melodyString++) {
            const melodyFret = targetMidi - UKULELE_MIDI[melodyString];
            if (melodyFret < 0 || melodyFret > opts.maxFret) continue;

            // For each other string, the frets that are usable: a chord tone (or
            // the slash bass) at a pitch not above the melody. Pitch, not string
            // index - the re-entrant G is exactly why.
            const stringOptions = [];
            for (let stringIndex = 0; stringIndex < 4; stringIndex++) {
                if (stringIndex === melodyString) {
                    stringOptions.push([melodyFret]);
                    continue;
                }
                const usable = [];
                if (opts.allowMutes) usable.push(-1);
                for (let fret = 0; fret <= opts.maxFret; fret++) {
                    const midi = UKULELE_MIDI[stringIndex] + fret;
                    if (midi > targetMidi) break;         // would sing over the melody
                    if (!chord.allowedPcs.has(midi % 12)) continue;
                    usable.push(fret);
                }
                stringOptions.push(usable);
            }

            // Walk the cartesian product of the per-string options
            for (const g of stringOptions[0]) {
                for (const c of stringOptions[1]) {
                    for (const e of stringOptions[2]) {
                        for (const a of stringOptions[3]) {
                            const frets = [g, c, e, a];
                            const midis = frets.map((fret, i) => fretToMidi(i, fret));
                            const sounding = midis.filter(m => m !== null);

                            if (sounding.length < opts.minNotes) continue;

                            // The melody must be the highest pitch in the voicing
                            if (Math.max(...sounding) !== targetMidi) continue;

                            // All required chord tones present somewhere
                            const pcs = new Set(sounding.map(m => m % 12));
                            let hasRequired = true;
                            for (const pc of requiredPcs) {
                                if (!pcs.has(pc)) { hasRequired = false; break; }
                            }
                            if (!hasRequired) continue;

                            const fretted = frets.filter(f => f > 0);
                            const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
                            if (span > opts.maxSpan) continue;

                            const { count: fingerCount } = countFingers(frets);
                            if (fingerCount > opts.maxFingers) continue;

                            candidates.push({
                                frets,
                                midis,
                                melodyString,
                                melodyMidi: targetMidi,
                                melodyIsChordTone,
                                soundingCount: sounding.length,
                                // A shell is any voicing missing a tone the strict
                                // rules would have demanded (the root, usually)
                                isShell: ![...chord.requiredPcs].every(pc => pcs.has(pc)),
                                hasRoot: pcs.has(chord.rootPc),
                            });
                        }
                    }
                }
            }
        }
    }

    // Score, dedupe by fret shape (keeping the better-scoring reading), sort
    const byShape = new Map();
    for (const candidate of candidates) {
        const metrics = scoreVoicing(candidate, chord, opts);
        const key = candidate.frets.join(',');
        const existing = byShape.get(key);
        if (existing && existing.score <= metrics.score) continue;

        byShape.set(key, {
            chord: chord.symbol,
            // name / frets / fingers / barre / baseFret match the CHORDS field shape,
            // so a voicing can be passed to createChordSVG() in ui.js. Note that
            // createChordSVG derives its own 5-fret window from the frets array and
            // ignores baseFret; the maxSpan limit keeps fretted notes inside that
            // window, but a high-position voicing that also has open strings will be
            // drawn as e.g. "7fr" with open markers - check that in the UI step.
            name: chord.symbol,
            frets: candidate.frets,
            fingers: metrics.fingers,
            barre: metrics.barre,
            baseFret: 1,
            fingerCount: metrics.fingerCount,
            midis: candidate.midis,
            notes: candidate.midis.map(m => (m === null ? null : midiToNoteName(m, chord.useFlats))),
            degrees: candidate.midis.map(m => (m === null ? null : degreeLabel(m % 12, chord))),
            melodyString: candidate.melodyString,
            melodyMidi: candidate.melodyMidi,
            melodyNote: midiToNoteName(candidate.melodyMidi, chord.useFlats),
            melodyDegree: degreeLabel(candidate.melodyMidi % 12, chord),
            melodyIsChordTone: candidate.melodyIsChordTone,
            noteCount: candidate.soundingCount,
            hasRoot: candidate.hasRoot,
            isShell: candidate.isShell,
            // 'solid' still stands on its own; 'fragment' is a two-note double stop
            // that needs the surrounding harmony to make sense
            shellTier: candidate.isShell
                ? (candidate.soundingCount >= 3 ? 'solid' : 'fragment')
                : null,
            bassNote: midiToNoteName(metrics.bassMidi, chord.useFlats),
            span: metrics.span,
            openStrings: metrics.openStrings,
            mutedStrings: metrics.mutedStrings,
            clearance: metrics.clearance,
            score: Math.round(metrics.score * 100) / 100,
            warnings: metrics.warnings,
        });
    }

    return [...byShape.values()]
        .sort((a, b) => a.score - b.score || a.melodyMidi - b.melodyMidi)
        .slice(0, opts.limit);
}

/**
 * Name a pitch class without an octave (e.g. 11 -> "B").
 */
function pitchClassName(pc, useFlats = false) {
    return (useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP)[((pc % 12) + 12) % 12];
}

/**
 * Find the easiest playable way to get a melody note on top of a chord, for players
 * who find a three- or four-finger shape a stretch in an awkward position.
 *
 * Escalates only as far as it has to, so the answer is never weaker than it needs
 * to be:
 *   1. a normal voicing that already fits under the finger limit
 *   2. a shell that keeps 3+ notes - the root may be gone, but it stands on its own
 *   3. a two-note double stop - honest, but it needs the harmony around it
 *
 * @param {string} chordSymbol
 * @param {string} melodyNote
 * @param {Object} [options]
 * @param {number} [options.maxFingers=2]
 * @returns {Object|null} the voicing, with `easyTier` set to 'normal', 'solid' or
 *          'fragment', or null when even a double stop is impossible
 */
function findEasiestVoicing(chordSymbol, melodyNote, options = {}) {
    const maxFingers = options.maxFingers ?? 2;
    const base = { ...options, maxFingers, limit: 1 };

    const normal = findMelodyVoicings(chordSymbol, melodyNote, base);
    if (normal.length) return { ...normal[0], easyTier: 'normal' };

    // Shell mode ranks fuller voicings first, so asking for 3 notes and then
    // falling back to 2 keeps the tiers honest rather than jumping straight to a
    // double stop that happens to be one finger
    const solid = findMelodyVoicings(chordSymbol, melodyNote, { ...base, shell: true, minNotes: 3 });
    if (solid.length) return { ...solid[0], easyTier: 'solid' };

    const fragment = findMelodyVoicings(chordSymbol, melodyNote, { ...base, shell: true, minNotes: 2 });
    if (fragment.length) return { ...fragment[0], easyTier: 'fragment' };

    return null;
}

/**
 * "a G" but "an A" - note names beginning A, E or F take "an" when spoken
 * ("an A", "an E flat", "an eff").
 */
function articleFor(noteName) {
    return 'AEF'.includes(noteName[0]) ? 'an' : 'a';
}

/**
 * Can this pitch class be played at or below a ceiling pitch, anywhere on the neck?
 */
function isReachableAtOrBelow(pc, ceilingMidi, maxFret) {
    for (let stringIndex = 0; stringIndex < 4; stringIndex++) {
        for (let fret = 0; fret <= maxFret; fret++) {
            const midi = UKULELE_MIDI[stringIndex] + fret;
            if (midi > ceilingMidi) break;
            if (midi % 12 === pc) return true;
        }
    }
    return false;
}

/**
 * Explain why a chord/melody pair produced no voicings.
 *
 * An empty result is usually musically meaningful rather than an error - the note
 * may be too low to sit on top at all, or the chord may need a note that simply
 * is not available underneath it. This turns that into something a player can
 * learn from, and is the text the UI shows in place of "no results".
 *
 * @param {string} chordSymbol
 * @param {string} melodyNote
 * @param {Object} [options] - same options as findMelodyVoicings()
 * @returns {{reason: string, message: string|null, missingTones?: Array<string>,
 *           relaxation?: Object}}
 *          reason is one of: has-voicings, unknown-chord, unknown-note,
 *          below-range, missing-chord-tone, needs-relaxation, no-voicing
 */
function explainNoVoicings(chordSymbol, melodyNote, options = {}) {
    const chord = parseChordSymbol(chordSymbol);
    if (!chord) return { reason: 'unknown-chord', message: `"${chordSymbol}" is not a chord shape this app knows.` };

    const melody = parseNoteName(melodyNote);
    if (!melody) return { reason: 'unknown-note', message: `"${melodyNote}" is not a note name.` };

    const opts = { maxFret: 12, maxSpan: 4, minNotes: 3, maxFingers: 4, allowRootless: false, ...options };

    if (findMelodyVoicings(chordSymbol, melodyNote, opts).length > 0) {
        return { reason: 'has-voicings', message: null };
    }

    // Diagnose against the target pitch with the most headroom beneath it
    let target = melody.midi;
    if (target === null) {
        const highest = Math.max(...UKULELE_MIDI) + opts.maxFret;
        target = highest - ((highest - melody.pc) % 12);
    }
    const targetName = midiToNoteName(target, chord.useFlats);

    // 1. Is the note simply too low to have a chord underneath it? On a re-entrant
    //    uke the floor is C4 (the open C string), so low melody notes leave nothing
    //    to harmonize with - only strings tuned at or below the note can be used.
    const stringsBeneath = UKULELE_MIDI.filter(m => m <= target).length;
    if (stringsBeneath < opts.minNotes) {
        const floor = midiToNoteName(Math.min(...UKULELE_MIDI), chord.useFlats);
        return {
            reason: 'below-range',
            message: `${targetName} is too low to carry the melody: only ${stringsBeneath} of the four ` +
                `strings can sound at or below it, and a chord needs at least ${opts.minNotes} notes. ` +
                `${floor} is the lowest pitch on a ukulele, so nothing can sit under it.`,
        };
    }

    // 2. Does the chord need a note that cannot be played below the melody?
    const missing = [...chord.requiredPcs]
        .filter(pc => !isReachableAtOrBelow(pc, target, opts.maxFret))
        .map(pc => pitchClassName(pc, chord.useFlats));
    if (missing.length > 0) {
        const needs = missing.length > 1
            ? `these notes: ${missing.join(' and ')}`
            : `${articleFor(missing[0])} ${missing[0]}`;
        return {
            reason: 'missing-chord-tone',
            missingTones: missing,
            message: `${chord.symbol} needs ${needs}, and ` +
                `${missing.length > 1 ? 'none of them can' : 'it cannot'} be played at or below ${targetName}. ` +
                `Every other note has to stay under the melody, so this chord cannot support ${targetName} on top.`,
        };
    }

    // 3. The notes exist but the shape is not playable within the limits - find the
    //    smallest relaxation that would work, so the UI can say what it would cost
    const relaxations = [
        { opts: { maxSpan: 7 }, message: `needs a stretch wider than ${opts.maxSpan} frets` },
        { opts: { allowRootless: true }, message: `only works as a rootless voicing (no ${chord.root} in the chord)` },
        { opts: { minNotes: 2 }, message: `only works as a two-note shape - more of a double-stop than a chord` },
        { opts: { maxSpan: 7, minNotes: 2, allowRootless: true }, message: `needs a wide stretch and a thinner voicing` },
    ];
    for (const relaxation of relaxations) {
        if (findMelodyVoicings(chordSymbol, melodyNote, { ...opts, ...relaxation.opts }).length > 0) {
            return {
                reason: 'needs-relaxation',
                relaxation: relaxation.opts,
                message: `${chord.symbol} with ${targetName} on top ${relaxation.message}.`,
            };
        }
    }

    return {
        reason: 'no-voicing',
        message: `There is no playable way to voice ${chord.symbol} with ${targetName} as the highest note.`,
    };
}

// Expose to global scope (browser), and to require() so the generator can be
// exercised from node without a browser.
if (typeof window !== 'undefined') {
    window.UKULELE_MIDI = UKULELE_MIDI;
    window.CHORD_TYPES = CHORD_TYPES;
    window.parseNoteName = parseNoteName;
    window.midiToNoteName = midiToNoteName;
    window.fretToMidi = fretToMidi;
    window.parseChordSymbol = parseChordSymbol;
    window.countFingers = countFingers;
    window.degreeLabel = degreeLabel;
    window.pitchClassName = pitchClassName;
    window.findMelodyVoicings = findMelodyVoicings;
    window.findEasiestVoicing = findEasiestVoicing;
    window.explainNoVoicings = explainNoVoicings;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UKULELE_MIDI, CHORD_TYPES, parseNoteName, midiToNoteName, fretToMidi,
        parseChordSymbol, countFingers, degreeLabel, pitchClassName,
        findMelodyVoicings, findEasiestVoicing, explainNoVoicings,
    };
}
