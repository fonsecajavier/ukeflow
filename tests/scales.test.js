/**
 * Tests for scales.js - scale definitions and the melody box finder.
 * Plain node, no framework:  node tests/scales.test.js
 *
 * Several of these assertions lock in MEASURED facts about the instrument
 * rather than opinions about the code. They are the reason the Melody Practice
 * UI can teach "melody lives on C-E-A" as a rule instead of a hunch, so if one
 * of them starts failing the UI copy needs rewriting, not the assertion.
 */

const S = require(__dirname + '/../scales.js');
const V = require(__dirname + '/../voicings.js');

let passed = 0;
let failed = 0;

function check(label, condition, detail) {
    if (condition) {
        passed++;
    } else {
        failed++;
        console.log(`  FAIL  ${label}${detail ? ` - ${detail}` : ''}`);
    }
}

function section(title) {
    console.log(`\n${title}`);
}

const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const TYPES = Object.keys(S.SCALE_TYPES);
// The only two roots whose octave is past the top of a 12-fret neck.
const ROOTS_WITHOUT_OCTAVE = ['Bb', 'B'];

// ---------------------------------------------------------------------------
section('Scale definitions');

TYPES.forEach(type => {
    const def = S.SCALE_TYPES[type];
    check(`${type} has a name`, typeof def.name === 'string' && def.name.length > 0);
    check(`${type} has a description`, typeof def.description === 'string' && def.description.length > 0);
    check(`${type} starts on the root`, def.intervals[0] === 0, `starts at ${def.intervals[0]}`);
    check(`${type} intervals ascend`,
        def.intervals.every((v, i) => i === 0 || v > def.intervals[i - 1]),
        def.intervals.join(','));
    check(`${type} stays inside one octave`,
        def.intervals.every(v => v >= 0 && v < 12),
        def.intervals.join(','));
    check(`${type} has no duplicates`,
        new Set(def.intervals).size === def.intervals.length);
});

// Spot-check a few interval sets against music theory
check('major is 0 2 4 5 7 9 11', S.SCALE_TYPES['major'].intervals.join(',') === '0,2,4,5,7,9,11');
check('natural minor is 0 2 3 5 7 8 10', S.SCALE_TYPES['minor'].intervals.join(',') === '0,2,3,5,7,8,10');
check('harmonic minor raises the 7th to 11', S.SCALE_TYPES['harmonic-minor'].intervals.includes(11));
check('harmonic minor keeps the b6', S.SCALE_TYPES['harmonic-minor'].intervals.includes(8));
check('melodic minor raises 6 and 7',
    S.SCALE_TYPES['melodic-minor'].intervals.includes(9) && S.SCALE_TYPES['melodic-minor'].intervals.includes(11));
check('minor pentatonic has 5 notes', S.SCALE_TYPES['minor-pentatonic'].intervals.length === 5);
check('major pentatonic has 5 notes', S.SCALE_TYPES['major-pentatonic'].intervals.length === 5);
check('major pentatonic drops the 4th and 7th',
    !S.SCALE_TYPES['major-pentatonic'].intervals.includes(5) &&
    !S.SCALE_TYPES['major-pentatonic'].intervals.includes(11));
check('blues has the b5 blue note', S.SCALE_TYPES['blues'].intervals.includes(6));
check('blues is minor pentatonic plus one',
    S.SCALE_TYPES['blues'].intervals.length === S.SCALE_TYPES['minor-pentatonic'].intervals.length + 1);
check('mixolydian is major with a b7',
    S.SCALE_TYPES['mixolydian'].intervals.includes(10) && !S.SCALE_TYPES['mixolydian'].intervals.includes(11));
check('lydian has the #4', S.SCALE_TYPES['lydian'].intervals.includes(6));
check('phrygian has the b2', S.SCALE_TYPES['phrygian'].intervals.includes(1));
check('dorian is minor with a natural 6',
    S.SCALE_TYPES['dorian'].intervals.includes(9) && S.SCALE_TYPES['dorian'].intervals.includes(3));

// ---------------------------------------------------------------------------
section('Root parsing and spelling');

check('parses G', S.parseScaleRoot('G').pc === 7);
check('parses Bb', S.parseScaleRoot('Bb').pc === 10);
check('parses F#', S.parseScaleRoot('F#').pc === 6);
check('tolerates a trailing m (Gm)', S.parseScaleRoot('Gm').pc === 7);
check('Gm and G parse alike', S.parseScaleRoot('Gm').pc === S.parseScaleRoot('G').pc);
check('rejects nonsense', S.parseScaleRoot('H') === null);
check('rejects empty', S.parseScaleRoot('') === null);

// Key-appropriate spelling: the whole point is that F major shows Bb, not A#
check('G natural minor spells Bb and Eb',
    S.getScaleNotes('Gm', 'minor').notes.map(n => n.name).join(' ') === 'G A Bb C D Eb F',
    S.getScaleNotes('Gm', 'minor').notes.map(n => n.name).join(' '));
check('D major spells F# and C#',
    S.getScaleNotes('D', 'major').notes.map(n => n.name).join(' ') === 'D E F# G A B C#',
    S.getScaleNotes('D', 'major').notes.map(n => n.name).join(' '));
check('F major spells Bb, not A#',
    S.getScaleNotes('F', 'major').notes.map(n => n.name).join(' ') === 'F G A Bb C D E',
    S.getScaleNotes('F', 'major').notes.map(n => n.name).join(' '));
check('Eb major uses flats', S.scaleUsesFlats('Eb', 'major') === true);
check('E major uses sharps', S.scaleUsesFlats('E', 'major') === false);
check('C major uses sharps by default', S.scaleUsesFlats('C', 'major') === false);
check('C minor uses flats', S.scaleUsesFlats('C', 'minor') === true);

// Degree labels are plain scale degrees, NOT the jazz extension names that
// voicings.js uses - a scale learner wants "2" and "4", not "9" and "11".
check('degree label for 2 semitones is 2', S.SCALE_DEGREE_LABELS[2] === '2');
check('degree label for 5 semitones is 4', S.SCALE_DEGREE_LABELS[5] === '4');
// degreeLabel() in voicings.js labels a pitch class against a parsed chord, so
// compare like for like: a C chord's D is its "9", the C scale's D is its "2".
const cChord = V.parseChordSymbol('C');
check('scale degrees use plain numbers where voicings.js uses jazz extensions',
    V.degreeLabel(2, cChord) === '9' && S.SCALE_DEGREE_LABELS[2] === '2',
    `voicings says ${V.degreeLabel(2, cChord)}, scales says ${S.SCALE_DEGREE_LABELS[2]}`);
check('4th is "4" in a scale but "11" in a chord',
    V.degreeLabel(5, cChord) === '11' && S.SCALE_DEGREE_LABELS[5] === '4',
    `voicings says ${V.degreeLabel(5, cChord)}, scales says ${S.SCALE_DEGREE_LABELS[5]}`);

// ---------------------------------------------------------------------------
section('Instrument range');

check('lowest pitch is C4 / MIDI 60', S.LOWEST_MIDI === 60);
check('highest pitch inside 12 frets is A5 / MIDI 81', S.HIGHEST_MIDI === 81);
check('lowest pitch is the open C string, not the open G',
    V.fretToMidi(1, 0) === S.LOWEST_MIDI && V.fretToMidi(0, 0) > S.LOWEST_MIDI);
check('range spans 21 semitones, so two octaves never fit',
    S.HIGHEST_MIDI - S.LOWEST_MIDI === 21 && S.HIGHEST_MIDI - S.LOWEST_MIDI < 24);

// ---------------------------------------------------------------------------
section('Full-neck scale positions');

const cMajorPositions = S.getScalePositions('C', 'major');
check('C major has positions on every string',
    new Set(cMajorPositions.map(p => p.string)).size === 4);
check('every position is in the scale',
    cMajorPositions.every(p => [0, 2, 4, 5, 7, 9, 11].includes(((p.midi % 12) + 12) % 12)));
check('open C string is a root position',
    cMajorPositions.some(p => p.string === 1 && p.fret === 0 && p.isRoot));
check('positions carry a degree label',
    cMajorPositions.every(p => typeof p.degree === 'string' && p.degree.length > 0));
check('no position exceeds the fret limit',
    cMajorPositions.every(p => p.fret >= 0 && p.fret <= S.MAX_FRET));
check('a scale with fewer notes yields fewer positions',
    S.getScalePositions('C', 'major-pentatonic').length < cMajorPositions.length);

// ---------------------------------------------------------------------------
section('Melody box - every root, every scale type');

let boxCount = 0;
const usesGString = [];
const withJumps = [];
const notAscending = [];
const outsideWindow = [];
const missingOctave = [];

TYPES.forEach(type => {
    ROOTS.forEach(root => {
        const box = S.getMelodyBox(root, type);
        if (!box || !box.path.length) {
            failed++;
            console.log(`  FAIL  no melody box for ${root} ${type}`);
            return;
        }
        boxCount++;

        if (box.usesGString) usesGString.push(`${root} ${type}`);
        if (box.backwardJumps !== 0) withJumps.push(`${root} ${type} (${box.backwardJumps})`);

        // Ascending by PITCH is the invariant that matters on a re-entrant
        // instrument - string index order would be meaningless here.
        const ascending = box.path.every((step, i) => i === 0 || step.midi > box.path[i - 1].midi);
        if (!ascending) notAscending.push(`${root} ${type}`);

        // Everything must be inside the one hand position (open strings only
        // when the hand is already at the nut).
        const inWindow = box.path.every(step =>
            (step.fret >= box.lo && step.fret <= box.hi) || (step.fret === 0 && box.lo === 0));
        if (!inWindow) outsideWindow.push(`${root} ${type}`);

        if (!box.fullOctave) missingOctave.push(`${root} ${type}`);

        // The path's own arithmetic must be self-consistent
        const midiOk = box.path.every(step => V.fretToMidi(step.string, step.fret) === step.midi);
        if (!midiOk) {
            failed++;
            console.log(`  FAIL  ${root} ${type}: path MIDI does not match fretToMidi`);
        }
    });
});

check('a melody box exists for all 144 root/type combinations',
    boxCount === ROOTS.length * TYPES.length, `got ${boxCount} of ${ROOTS.length * TYPES.length}`);

// MEASURED FINDING 1: the clean fingering never needs the re-entrant G string.
check('no melody box uses the G string (melody lives on C-E-A)',
    usesGString.length === 0, usesGString.join(', '));

// MEASURED FINDING 2: a jump-free fingering always exists within 6 frets.
check('every melody box is free of backward string jumps',
    withJumps.length === 0, withJumps.join(', '));

check('every melody box ascends in pitch', notAscending.length === 0, notAscending.join(', '));
check('every melody box stays inside its fret window', outsideWindow.length === 0, outsideWindow.join(', '));

// MEASURED FINDING 3: only Bb and B roots fall off the top of the neck.
check('exactly the Bb and B roots lack a full octave',
    missingOctave.length === ROOTS_WITHOUT_OCTAVE.length * TYPES.length &&
    missingOctave.every(entry => ROOTS_WITHOUT_OCTAVE.includes(entry.split(' ')[0])),
    `${missingOctave.length} entries: ${missingOctave.slice(0, 4).join(', ')}...`);

// ---------------------------------------------------------------------------
section('Melody box - box width by scale type');

// MEASURED FINDING 4: major scales resolve inside a 4-fret hand position;
// natural minor needs a 5-fret stretch. This is why the UI labels minor boxes
// as a stretch, and it is not a code choice - it is the interval pattern.
check('C major fits a 4-fret box', S.getMelodyBox('C', 'major').width === 4,
    `width ${S.getMelodyBox('C', 'major').width}`);
check('G major fits a 4-fret box', S.getMelodyBox('G', 'major').width === 4);
check('G natural minor needs a 5-fret box', S.getMelodyBox('G', 'minor').width === 5,
    `width ${S.getMelodyBox('G', 'minor').width}`);
check('A natural minor needs a 5-fret box', S.getMelodyBox('A', 'minor').width === 5);
check('all boxes are between the declared width bounds',
    TYPES.every(t => ROOTS.every(r => {
        const w = S.getMelodyBox(r, t).width;
        return w >= S.MIN_BOX_WIDTH && w <= S.MAX_BOX_WIDTH;
    })));
check('pentatonic scales always fit a 4-fret box',
    ROOTS.every(r => S.getMelodyBox(r, 'minor-pentatonic').width === 4 &&
                     S.getMelodyBox(r, 'major-pentatonic').width === 4));

// ---------------------------------------------------------------------------
section('Melody box - specific fingerings');

// C major at the nut: the shape a beginner should meet first.
const cBox = S.getMelodyBox('C', 'major');
check('C major box sits at the nut', cBox.lo === 0, `lo ${cBox.lo}`);
check('C major box is C0 C2 E0 E1 E3 A0 A2 A3',
    cBox.path.map(s => `${'GCEA'[s.string]}${s.fret}`).join(' ') === 'C0 C2 E0 E1 E3 A0 A2 A3',
    cBox.path.map(s => `${'GCEA'[s.string]}${s.fret}`).join(' '));
check('C major box starts on the tonic and ends on the octave',
    cBox.path[0].isRoot && cBox.path[cBox.path.length - 1].isOctave);
check('C major box has 8 notes (7 degrees plus the octave)', cBox.path.length === 8);

// G minor: the key the feature was asked for.
const gmBox = S.getMelodyBox('Gm', 'minor');
check('Gm box is frets 6-10', gmBox.lo === 6 && gmBox.hi === 10, `${gmBox.lo}-${gmBox.hi}`);
check('Gm box starts on G4', gmBox.path[0].midi === 67);
check('Gm box ends on G5', gmBox.path[gmBox.path.length - 1].midi === 79);
check('Gm box spells its b3 as Bb',
    gmBox.path.some(s => s.degree === 'b3' && s.noteName === 'Bb'),
    gmBox.path.map(s => `${s.degree}=${s.noteName}`).join(' '));
check('Gm box degrees run 1 2 b3 4 5 b6 b7 1',
    gmBox.path.map(s => s.degree).join(' ') === '1 2 b3 4 5 b6 b7 1',
    gmBox.path.map(s => s.degree).join(' '));

// ---------------------------------------------------------------------------
section('Range explanations');

const cNotice = S.explainScaleRange('C', 'major');
check('C major needs no range warning', cNotice === null, String(cNotice));

const gmNotice = S.explainScaleRange('Gm', 'minor');
check('Gm explains that nothing sits below C4', typeof gmNotice === 'string' && gmNotice.includes('C4'), String(gmNotice));
check('Gm names the 4 as its lowest reachable degree', gmNotice.includes('the 4'), String(gmNotice));

const bbNotice = S.explainScaleRange('Bb', 'major');
check('Bb major explains the missing octave', typeof bbNotice === 'string' && bbNotice.includes('octave'));
check('Bb major names A5 as the ceiling', bbNotice.includes('A5'));
// The octave must be spelled the way the KEY spells it - saying "A#5" to
// someone practising Bb major is the bug this guards.
check('Bb major spells its octave Bb5, not A#5',
    bbNotice.includes('Bb5') && !bbNotice.includes('A#5'), bbNotice);

const bNotice = S.explainScaleRange('B', 'minor');
check('B minor explains the missing octave', typeof bNotice === 'string' && bNotice.includes('octave'));
check('unknown scale type is explained, not crashed',
    typeof S.explainScaleRange('C', 'not-a-scale') === 'string');

check('Bb box still returns a usable partial run',
    S.getMelodyBox('Bb', 'major').path.length === 7,
    `${S.getMelodyBox('Bb', 'major').path.length} notes`);
check('Bb partial run carries the notice',
    typeof S.getMelodyBox('Bb', 'major').notice === 'string');

// ---------------------------------------------------------------------------
section('Practice patterns');

const eightNotes = 8;
Object.entries(S.SCALE_PATTERNS).forEach(([key, pattern]) => {
    const indices = pattern.build(eightNotes);
    check(`${key} has a name`, typeof pattern.name === 'string' && pattern.name.length > 0);
    check(`${key} produces indices`, Array.isArray(indices) && indices.length > 0);
    check(`${key} stays inside the path`,
        indices.every(i => Number.isInteger(i) && i >= 0 && i < eightNotes),
        indices.join(','));
});

check('ascending pattern is in order',
    S.SCALE_PATTERNS['up'].build(eightNotes).join(',') === '0,1,2,3,4,5,6,7');
check('descending pattern is reversed',
    S.SCALE_PATTERNS['down'].build(eightNotes).join(',') === '7,6,5,4,3,2,1,0');
check('up-down does not repeat the turnaround note',
    S.SCALE_PATTERNS['up-down'].build(eightNotes).join(',') === '0,1,2,3,4,5,6,7,6,5,4,3,2,1');
check('thirds pairs each note with the one two above',
    S.SCALE_PATTERNS['thirds'].build(eightNotes).slice(0, 6).join(',') === '0,2,1,3,2,4');
check('random pattern visits every note once',
    new Set(S.SCALE_PATTERNS['random'].build(eightNotes)).size === eightNotes);
check('patterns cope with a short pentatonic path',
    Object.values(S.SCALE_PATTERNS).every(p => p.build(6).every(i => i >= 0 && i < 6)));

// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
