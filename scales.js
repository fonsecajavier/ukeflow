/**
 * UkeFlow - Scales Module
 * Scale definitions and playable single-octave "melody box" finder.
 *
 * The point of this module is NOT to draw every position of a scale on the
 * fretboard - that is easy and teaches little. It is to find the ONE hand
 * position you can practise until a key feels automatic, and to be honest about
 * where the instrument cannot give you one.
 *
 * IMPORTANT - re-entrant tuning:
 * Standard GCEA has G4 (MIDI 67) as the SECOND-HIGHEST string, so ascending in
 * pitch is not the same as moving across the strings in index order. Every path
 * this module builds is ordered by absolute MIDI pitch, never by string index.
 *
 * The consequence is measured, not assumed (see tests/scales.test.js): for a
 * single-octave run the cleanest fingering avoids the G string entirely in every
 * key and every scale type. Melody lives on C-E-A; the re-entrant G string is a
 * harmony string. This is exactly why guitar scale charts mislead on a ukulele,
 * and it is the thing the UI should teach.
 *
 * Range: the lowest pitch on the instrument is C4 (open C, MIDI 60) and the
 * highest inside 12 frets is A5 (MIDI 81) - a span of 21 semitones. Two octaves
 * therefore never fit, in any key, and roots above A4 cannot complete even one
 * octave (which rules out Bb and B, and only those).
 */

// scales.js needs the tuning and the note-name helpers. Rather than restate the
// tuning (two sources of truth for GCEA would be a real correctness risk) it
// borrows them from voicings.js: globals in the browser, require() under node.
const SCALE_DEPS = (typeof module !== 'undefined' && module.exports)
    ? require(__dirname + '/voicings.js')
    : (typeof window !== 'undefined' ? window : globalThis);

const SCALES_UKULELE_MIDI = SCALE_DEPS.UKULELE_MIDI;
const scalesFretToMidi = SCALE_DEPS.fretToMidi;
const scalesMidiToNoteName = SCALE_DEPS.midiToNoteName;

// Playable extremes with a 12-fret neck. LOWEST is the open C string - note it
// is NOT the open G, which sounds a fifth higher.
const LOWEST_MIDI = 60;   // C4, open C string
const HIGHEST_MIDI = 81;  // A5, A string at fret 12
const MAX_FRET = 12;

// A hand position spans four frets comfortably; five is a stretch but still one
// position. Beyond that it stops being a "box" and becomes a shift.
const MIN_BOX_WIDTH = 4;
const MAX_BOX_WIDTH = 6;

/**
 * Scale definitions. `intervals` are semitones above the root, ascending.
 *
 * This table is deliberately local rather than shared with chords.js, following
 * the same split voicings.js makes with CHORD_TYPES: chords.js owns chord/key
 * vocabulary, this owns note-level scale vocabulary.
 */
const SCALE_TYPES = {
    'major':            { name: 'Major (Ionian)',      intervals: [0, 2, 4, 5, 7, 9, 11], minorish: false,
                          description: 'The bright, default sound of Western music.' },
    'minor':            { name: 'Natural Minor',       intervals: [0, 2, 3, 5, 7, 8, 10], minorish: true,
                          description: 'The plain minor sound - the relative minor of a major key.' },
    'harmonic-minor':   { name: 'Harmonic Minor',      intervals: [0, 2, 3, 5, 7, 8, 11], minorish: true,
                          description: 'Natural minor with a raised 7th, which is what makes a real V chord possible in a minor key.' },
    'melodic-minor':    { name: 'Melodic Minor',       intervals: [0, 2, 3, 5, 7, 9, 11], minorish: true,
                          description: 'Minor with a raised 6th and 7th, so the run up to the tonic sings.' },
    'major-pentatonic': { name: 'Major Pentatonic',    intervals: [0, 2, 4, 7, 9],        minorish: false,
                          description: 'The major scale with the 4th and 7th removed - no note can clash, so it is the safest place to start improvising.' },
    'minor-pentatonic': { name: 'Minor Pentatonic',    intervals: [0, 3, 5, 7, 10],       minorish: true,
                          description: 'Five notes that fit almost any minor progression. The workhorse of blues and rock melody.' },
    'blues':            { name: 'Blues',               intervals: [0, 3, 5, 6, 7, 10],    minorish: true,
                          description: 'Minor pentatonic plus the b5 "blue note" squeezed between the 4th and 5th.' },
    'dorian':           { name: 'Dorian',              intervals: [0, 2, 3, 5, 7, 9, 10], minorish: true,
                          description: 'Minor with a natural 6th - darker than major but brighter than natural minor.' },
    'phrygian':         { name: 'Phrygian',            intervals: [0, 1, 3, 5, 7, 8, 10], minorish: true,
                          description: 'Minor with a b2. The Spanish/flamenco colour.' },
    'lydian':           { name: 'Lydian',              intervals: [0, 2, 4, 6, 7, 9, 11], minorish: false,
                          description: 'Major with a #4 - floating and dreamlike.' },
    'mixolydian':       { name: 'Mixolydian',          intervals: [0, 2, 4, 5, 7, 9, 10], minorish: false,
                          description: 'Major with a b7. The sound of a dominant 7th chord, and of most rock and folk.' },
    'locrian':          { name: 'Locrian',             intervals: [0, 1, 3, 5, 6, 8, 10], minorish: true,
                          description: 'Minor with a b2 and b5 - unstable, rarely used as a home key.' },
};

/**
 * Semitone offset -> scale-degree label.
 *
 * Deliberately different from DEGREE_LABELS in voicings.js, which uses jazz
 * chord-extension names (9, 11, 13) because it is labelling chord tones. When
 * you are learning a scale you want plain degree numbers, so 2 is "2" and not
 * "9", and 5 semitones is "4" and not "11".
 */
const SCALE_DEGREE_LABELS = {
    0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4',
    6: 'b5', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7',
};

const SCALE_NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALE_NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SCALE_LETTER_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Natural roots whose key signature is written with flats. F major is the only
// natural major flat key; D, G, C and F minor are the natural minor flat keys.
const FLAT_MAJOR_ROOTS = ['F'];
const FLAT_MINOR_ROOTS = ['D', 'G', 'C', 'F'];

/**
 * Parse a scale root into a pitch class. Accepts "G", "Bb", "F#", and tolerates
 * a trailing "m" so a key name like "Gm" can be passed straight through.
 * @param {string} root
 * @returns {{pc: number, name: string}|null}
 */
function parseScaleRoot(root) {
    if (typeof root !== 'string') return null;
    const match = root.trim().match(/^([A-Ga-g])([#b]*)m?$/);
    if (!match) return null;

    const [, letter, accidentals] = match;
    let semitone = SCALE_LETTER_SEMITONES[letter.toUpperCase()];
    for (const accidental of accidentals) {
        semitone += accidental === '#' ? 1 : -1;
    }
    return {
        pc: ((semitone % 12) + 12) % 12,
        name: letter.toUpperCase() + accidentals,
    };
}

/**
 * Whether to spell this scale with flats. F major shows Bb, never A#.
 * @param {string} root
 * @param {string} typeKey
 * @returns {boolean}
 */
function scaleUsesFlats(root, typeKey) {
    const parsed = parseScaleRoot(root);
    if (!parsed) return false;
    if (parsed.name.includes('b')) return true;
    if (parsed.name.includes('#')) return false;

    const type = SCALE_TYPES[typeKey];
    const roots = type && type.minorish ? FLAT_MINOR_ROOTS : FLAT_MAJOR_ROOTS;
    return roots.includes(parsed.name);
}

/**
 * Spell a MIDI note for a given scale.
 * @param {number} midi
 * @param {string} root
 * @param {string} typeKey
 * @param {boolean} withOctave - append the octave number (e.g. "Bb4")
 * @returns {string}
 */
function scaleNoteName(midi, root, typeKey, withOctave = false) {
    const useFlats = scaleUsesFlats(root, typeKey);
    if (withOctave) return scalesMidiToNoteName(midi, useFlats);
    const names = useFlats ? SCALE_NOTE_NAMES_FLAT : SCALE_NOTE_NAMES_SHARP;
    return names[((midi % 12) + 12) % 12];
}

/**
 * The pitch classes and degree labels of a scale.
 * @param {string} root
 * @param {string} typeKey - key into SCALE_TYPES
 * @returns {{root: string, type: string, typeName: string, rootPc: number,
 *            notes: Array<{pc: number, semitone: number, degree: string, name: string}>}|null}
 */
function getScaleNotes(root, typeKey) {
    const parsed = parseScaleRoot(root);
    const type = SCALE_TYPES[typeKey];
    if (!parsed || !type) return null;

    const notes = type.intervals.map(semitone => {
        const pc = (parsed.pc + semitone) % 12;
        return {
            pc,
            semitone,
            degree: SCALE_DEGREE_LABELS[semitone],
            // Spelled from a representative MIDI note in the pitch class
            name: scaleNoteName(60 + pc, root, typeKey),
        };
    });

    return { root: parsed.name, type: typeKey, typeName: type.name, rootPc: parsed.pc, notes };
}

/**
 * Every position of a scale on the neck, for the full-neck map view.
 * @param {string} root
 * @param {string} typeKey
 * @param {number} maxFret
 * @returns {Array<{string: number, fret: number, midi: number, noteName: string,
 *                  degree: string, isRoot: boolean}>}
 */
function getScalePositions(root, typeKey, maxFret = MAX_FRET) {
    const scale = getScaleNotes(root, typeKey);
    if (!scale) return [];

    const bySemitone = new Map();
    scale.notes.forEach(note => bySemitone.set(note.pc, note));

    const positions = [];
    for (let stringIndex = 0; stringIndex < SCALES_UKULELE_MIDI.length; stringIndex++) {
        for (let fret = 0; fret <= maxFret; fret++) {
            const midi = scalesFretToMidi(stringIndex, fret);
            if (midi === null) continue;
            const pc = ((midi % 12) + 12) % 12;
            const note = bySemitone.get(pc);
            if (!note) continue;

            positions.push({
                string: stringIndex,
                fret,
                midi,
                noteName: scaleNoteName(midi, root, typeKey),
                degree: note.degree,
                isRoot: note.semitone === 0,
            });
        }
    }
    return positions;
}

/**
 * The ascending run this module tries to make playable: the tonic, each scale
 * degree above it, and the octave on top.
 *
 * Truncated at HIGHEST_MIDI rather than refused, so a high root still gets a
 * useful partial run (Bb major reaches its 7th at A5 and only loses the octave).
 * @param {number} tonicMidi
 * @param {Array<number>} intervals
 * @returns {Array<number>} ascending MIDI notes
 */
function buildAscendingRun(tonicMidi, intervals) {
    const run = intervals
        .map(semitone => tonicMidi + semitone)
        .concat([tonicMidi + 12])
        .filter(midi => midi <= HIGHEST_MIDI);
    return run.sort((a, b) => a - b);
}

/**
 * The lowest playable instance of a pitch class.
 * @param {number} pc
 * @returns {number|null}
 */
function lowestMidiForPitchClass(pc) {
    for (let midi = LOWEST_MIDI; midi <= HIGHEST_MIDI; midi++) {
        if (((midi % 12) + 12) % 12 === pc) return midi;
    }
    return null;
}

/**
 * Positions available to a hand sitting over frets [lo, hi].
 *
 * Open strings count only when the hand is already at the nut - reaching back to
 * an open string from fret 7 is a different technique, not part of the box.
 * @param {Array<number>} run - the MIDI notes we need
 * @param {number} lo
 * @param {number} hi
 * @returns {Map<number, Array<{string: number, fret: number}>>}
 */
function positionsInWindow(run, lo, hi) {
    const wanted = new Set(run);
    const map = new Map();

    for (let stringIndex = 0; stringIndex < SCALES_UKULELE_MIDI.length; stringIndex++) {
        for (let fret = lo; fret <= hi; fret++) {
            if (lo > 0 && fret === 0) continue;
            const midi = scalesFretToMidi(stringIndex, fret);
            if (midi === null || !wanted.has(midi)) continue;
            if (!map.has(midi)) map.set(midi, []);
            map.get(midi).push({ string: stringIndex, fret });
        }
    }
    return map;
}

/**
 * Choose one fingering for an ascending run inside a window.
 *
 * Cost is lexicographic: first the number of BACKWARD STRING JUMPS - times the
 * fingering has to move back toward the G string while the pitch keeps rising,
 * which is the thing re-entrant tuning forces and the thing that makes a scale
 * awkward to play - then total fret movement, so ties resolve to the smoother
 * fingering.
 *
 * @param {Array<number>} run - ascending MIDI notes
 * @param {Map} map - from positionsInWindow()
 * @returns {{jumps: number, movement: number, path: Array}|null} null if the
 *          window cannot supply every note of the run
 */
function bestPathInWindow(run, map) {
    let states = null;

    for (const midi of run) {
        const candidates = map.get(midi);
        if (!candidates || candidates.length === 0) return null;

        if (states === null) {
            states = candidates.map(c => ({
                ...c, midi, jumps: 0, movement: 0, path: [{ ...c, midi }],
            }));
            continue;
        }

        // For each way of playing this note, keep only the cheapest way of
        // arriving at it - the cost so far is all that matters from here on.
        states = candidates.map(candidate => {
            let best = null;
            for (const previous of states) {
                const jumps = previous.jumps + (candidate.string < previous.string ? 1 : 0);
                const movement = previous.movement + Math.abs(candidate.fret - previous.fret);
                if (!best || jumps < best.jumps || (jumps === best.jumps && movement < best.movement)) {
                    best = {
                        ...candidate,
                        midi,
                        jumps,
                        movement,
                        path: [...previous.path, { ...candidate, midi }],
                    };
                }
            }
            return best;
        });
    }

    if (!states || states.length === 0) return null;
    return states.reduce((a, b) => {
        if (a.jumps !== b.jumps) return a.jumps < b.jumps ? a : b;
        return a.movement <= b.movement ? a : b;
    });
}

/**
 * Find the melody box: the narrowest hand position that plays a single ascending
 * octave of the scale with the fewest backward string jumps.
 *
 * Widens the search from MIN_BOX_WIDTH until a jump-free fingering exists,
 * because a clean fingering one fret wider is easier to play than a cramped one
 * that makes you cross back over the G string mid-run. In practice major scales
 * resolve at 4 frets and minor scales need 5.
 *
 * @param {string} root - "G", "Bb", "F#" (a trailing "m" is tolerated)
 * @param {string} typeKey - key into SCALE_TYPES
 * @returns {object|null} null only if the root or type is unrecognised
 */
function getMelodyBox(root, typeKey) {
    const scale = getScaleNotes(root, typeKey);
    const type = SCALE_TYPES[typeKey];
    if (!scale || !type) return null;

    const tonicMidi = lowestMidiForPitchClass(scale.rootPc);
    if (tonicMidi === null) return null;

    const run = buildAscendingRun(tonicMidi, type.intervals);
    const fullOctave = run.includes(tonicMidi + 12);

    let best = null;
    for (let width = MIN_BOX_WIDTH; width <= MAX_BOX_WIDTH; width++) {
        for (let lo = 0; lo + width - 1 <= MAX_FRET; lo++) {
            const hi = lo + width - 1;
            const candidate = bestPathInWindow(run, positionsInWindow(run, lo, hi));
            if (!candidate) continue;

            const scored = { ...candidate, lo, hi, width };
            if (!best || scored.jumps < best.jumps ||
                (scored.jumps === best.jumps && scored.movement < best.movement)) {
                best = scored;
            }
            // A jump-free fingering at this width is as good as it gets; no
            // wider window can improve on it.
            if (best.jumps === 0) break;
        }
        if (best && best.jumps === 0) break;
    }

    // Defensive: every root/type combination does in fact yield a box (see
    // tests/scales.test.js), but a caller adding a wide new scale type should
    // get an explanation rather than a crash.
    if (!best) {
        return {
            root: scale.root, type: typeKey, typeName: type.name, tonicMidi,
            fullOctave: false, path: [],
            notice: explainScaleRange(root, typeKey) ||
                    `${scale.root} ${type.name} does not fit in one hand position on a 12-fret neck.`,
        };
    }

    const bySemitone = new Map();
    scale.notes.forEach(note => bySemitone.set(note.pc, note));

    const path = best.path.map(step => {
        const pc = ((step.midi % 12) + 12) % 12;
        const note = bySemitone.get(pc);
        const semitone = step.midi - tonicMidi;
        return {
            string: step.string,
            fret: step.fret,
            midi: step.midi,
            noteName: scaleNoteName(step.midi, root, typeKey),
            noteNameWithOctave: scaleNoteName(step.midi, root, typeKey, true),
            degree: semitone === 12 ? '1' : (note ? note.degree : SCALE_DEGREE_LABELS[semitone % 12]),
            isRoot: semitone % 12 === 0,
            isOctave: semitone === 12,
        };
    });

    return {
        root: scale.root,
        type: typeKey,
        typeName: type.name,
        description: type.description,
        tonicMidi,
        lo: best.lo,
        hi: best.hi,
        width: best.width,
        backwardJumps: best.jumps,
        fullOctave,
        // Measured, not assumed - the UI surfaces this as a teaching point.
        usesGString: path.some(step => step.string === 0),
        path,
        notice: explainScaleRange(root, typeKey),
    };
}

/**
 * Say why a scale does not fit the instrument, in the voice of
 * explainNoVoicings() in voicings.js: a specific musical reason rather than
 * "no results". The UI prints this verbatim.
 *
 * @param {string} root
 * @param {string} typeKey
 * @returns {string|null} null when the scale fits in full
 */
function explainScaleRange(root, typeKey) {
    const scale = getScaleNotes(root, typeKey);
    const type = SCALE_TYPES[typeKey];
    if (!scale || !type) return 'That scale is not one I know.';

    const tonicMidi = lowestMidiForPitchClass(scale.rootPc);
    if (tonicMidi === null) return null;

    const octaveMidi = tonicMidi + 12;
    const rootLabel = `${scale.root} ${type.name}`;

    if (octaveMidi > HIGHEST_MIDI) {
        const reached = buildAscendingRun(tonicMidi, type.intervals);
        const top = reached[reached.length - 1];
        // Spell the octave the way the scale spells it - Bb major must not be
        // told its octave is "A#5".
        return `${rootLabel} starts on ${scaleNoteName(tonicMidi, root, typeKey, true)}, and the octave ` +
               `above it (${scaleNoteName(octaveMidi, root, typeKey, true)}) is past ${scalesMidiToNoteName(HIGHEST_MIDI)} ` +
               `- the highest note on a 12-fret neck. You get the scale up to ` +
               `${scaleNoteName(top, root, typeKey, true)} and no octave to land on. ` +
               `Practising it an octave down is not an option either: ` +
               `${scalesMidiToNoteName(LOWEST_MIDI)} is the lowest pitch the instrument has.`;
    }

    // A low root means the notes BELOW the tonic are unreachable, so the box
    // cannot be extended downward - worth saying, because on a guitar it could.
    if (tonicMidi > LOWEST_MIDI) {
        const belowTonic = tonicMidi - LOWEST_MIDI;
        const lowestDegree = SCALE_DEGREE_LABELS[((LOWEST_MIDI - tonicMidi) % 12 + 12) % 12];
        const isScaleTone = scale.notes.some(n => n.pc === ((LOWEST_MIDI % 12) + 12) % 12);
        if (belowTonic > 0 && isScaleTone) {
            return `The whole octave fits. Below the tonic you only have ${belowTonic} ` +
                   `semitone${belowTonic === 1 ? '' : 's'} of room, so the lowest note of ` +
                   `${rootLabel} you can reach is the ${lowestDegree} ` +
                   `(${scalesMidiToNoteName(LOWEST_MIDI)}) - there is nothing under it.`;
        }
    }

    return null;
}

/**
 * Practice patterns over a melody box path. Each returns indices into the path.
 *
 * These are what turns a shape into muscle memory - a scale played only straight
 * up and down teaches your hand one sequence, not the key.
 */
const SCALE_PATTERNS = {
    'up':        { name: 'Ascending',         build: n => range(n) },
    'down':      { name: 'Descending',        build: n => range(n).reverse() },
    'up-down':   { name: 'Up then down',      build: n => range(n).concat(range(n).reverse().slice(1, -1)) },
    'thirds':    { name: 'In thirds',         build: n => buildThirds(n) },
    'random':    { name: 'Random degrees',    build: n => shuffleIndices(n) },
};

function range(n) {
    return Array.from({ length: n }, (_, i) => i);
}

/**
 * Up in thirds: 1-3, 2-4, 3-5 ... the standard way to stop a scale sounding
 * like a scale.
 */
function buildThirds(n) {
    const out = [];
    for (let i = 0; i + 2 < n; i++) {
        out.push(i, i + 2);
    }
    return out.length ? out : range(n);
}

function shuffleIndices(n) {
    const indices = range(n);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
}

// Expose to the browser, and to require() for tests.
if (typeof window !== 'undefined') {
    window.SCALE_TYPES = SCALE_TYPES;
    window.SCALE_DEGREE_LABELS = SCALE_DEGREE_LABELS;
    window.SCALE_PATTERNS = SCALE_PATTERNS;
    window.parseScaleRoot = parseScaleRoot;
    window.scaleUsesFlats = scaleUsesFlats;
    window.scaleNoteName = scaleNoteName;
    window.getScaleNotes = getScaleNotes;
    window.getScalePositions = getScalePositions;
    window.getMelodyBox = getMelodyBox;
    window.explainScaleRange = explainScaleRange;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SCALE_TYPES, SCALE_DEGREE_LABELS, SCALE_PATTERNS,
        LOWEST_MIDI, HIGHEST_MIDI, MAX_FRET, MIN_BOX_WIDTH, MAX_BOX_WIDTH,
        parseScaleRoot, scaleUsesFlats, scaleNoteName,
        getScaleNotes, getScalePositions, getMelodyBox, explainScaleRange,
    };
}
