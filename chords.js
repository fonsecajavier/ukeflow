/**
 * Ukulele Chord Definitions
 * Standard tuning: G-C-E-A (strings 4-3-2-1)
 *
 * frets: Array of fret numbers for each string [G, C, E, A]
 *        0 = open string, -1 = muted
 * fingers: Finger numbers for each string [G, C, E, A]
 *          0 = open/not pressed, 1-4 = index to pinky
 * barre: Object with fret and fromString/toString for barre chords
 * baseFret: Starting fret position (for chords higher up the neck)
 */

const CHORDS = {
    // Major Chords
    'C': {
        name: 'C',
        frets: [0, 0, 0, 3],
        fingers: [0, 0, 0, 3],
        barre: null,
        baseFret: 1
    },
    'D': {
        name: 'D',
        frets: [2, 2, 2, 0],
        fingers: [1, 2, 3, 0],
        barre: null,
        baseFret: 1
    },
    'E': {
        name: 'E',
        frets: [1, 4, 0, 2],
        fingers: [1, 4, 0, 2],
        barre: null,
        baseFret: 1
    },
    'F': {
        name: 'F',
        frets: [2, 0, 1, 0],
        fingers: [2, 0, 1, 0],
        barre: null,
        baseFret: 1
    },
    'G': {
        name: 'G',
        frets: [0, 2, 3, 2],
        fingers: [0, 1, 3, 2],
        barre: null,
        baseFret: 1
    },
    'A': {
        name: 'A',
        frets: [2, 1, 0, 0],
        fingers: [2, 1, 0, 0],
        barre: null,
        baseFret: 1
    },
    'B': {
        name: 'B',
        frets: [4, 3, 2, 2],
        fingers: [4, 3, 1, 1],
        barre: { fret: 2, fromString: 2, toString: 3 },
        baseFret: 1
    },
    'Bb': {
        name: 'Bb',
        frets: [3, 2, 1, 1],
        fingers: [4, 3, 1, 1],
        barre: { fret: 1, fromString: 2, toString: 3 },
        baseFret: 1
    },
    'Eb': {
        name: 'Eb',
        frets: [0, 3, 3, 1],
        fingers: [0, 2, 3, 1],
        barre: null,
        baseFret: 1
    },
    'Ab': {
        name: 'Ab',
        frets: [5, 3, 4, 3],
        fingers: [4, 1, 2, 1],
        barre: { fret: 3, fromString: 1, toString: 3 },
        baseFret: 1
    },
    'C#': {
        name: 'C#',
        frets: [1, 1, 1, 4],
        fingers: [1, 1, 1, 4],
        barre: { fret: 1, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'Db': {
        name: 'Db',
        frets: [1, 1, 1, 4],
        fingers: [1, 1, 1, 4],
        barre: { fret: 1, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'D#': {
        name: 'D#',
        frets: [0, 3, 3, 1],
        fingers: [0, 2, 3, 1],
        barre: null,
        baseFret: 1
    },
    'F#': {
        name: 'F#',
        frets: [3, 1, 2, 1],
        fingers: [4, 1, 3, 2],
        barre: { fret: 1, fromString: 1, toString: 3 },
        baseFret: 1
    },
    'Gb': {
        name: 'Gb',
        frets: [3, 1, 2, 1],
        fingers: [4, 1, 3, 2],
        barre: { fret: 1, fromString: 1, toString: 3 },
        baseFret: 1
    },
    'G#': {
        name: 'G#',
        frets: [5, 3, 4, 3],
        fingers: [4, 1, 2, 1],
        barre: { fret: 3, fromString: 1, toString: 3 },
        baseFret: 1
    },
    'A#': {
        name: 'A#',
        frets: [3, 2, 1, 1],
        fingers: [4, 3, 1, 1],
        barre: { fret: 1, fromString: 2, toString: 3 },
        baseFret: 1
    },

    // Minor Chords
    'Am': {
        name: 'Am',
        frets: [2, 0, 0, 0],
        fingers: [2, 0, 0, 0],
        barre: null,
        baseFret: 1
    },
    'Bm': {
        name: 'Bm',
        frets: [4, 2, 2, 2],
        fingers: [4, 1, 1, 1],
        barre: { fret: 2, fromString: 1, toString: 3 },
        baseFret: 1
    },
    'Cm': {
        name: 'Cm',
        frets: [0, 3, 3, 3],
        fingers: [0, 1, 2, 3],
        barre: null,
        baseFret: 1
    },
    'Dm': {
        name: 'Dm',
        frets: [2, 2, 1, 0],
        fingers: [2, 3, 1, 0],
        barre: null,
        baseFret: 1
    },
    'Em': {
        name: 'Em',
        frets: [0, 4, 3, 2],
        fingers: [0, 3, 2, 1],
        barre: null,
        baseFret: 1
    },
    'Fm': {
        name: 'Fm',
        frets: [1, 0, 1, 3],
        fingers: [1, 0, 2, 4],
        barre: null,
        baseFret: 1
    },
    'Gm': {
        name: 'Gm',
        frets: [0, 2, 3, 1],
        fingers: [0, 2, 3, 1],
        barre: null,
        baseFret: 1
    },
    'F#m': {
        name: 'F#m',
        frets: [2, 1, 2, 0],
        fingers: [2, 1, 3, 0],
        barre: null,
        baseFret: 1
    },
    'C#m': {
        name: 'C#m',
        frets: [1, 1, 0, 4],
        fingers: [1, 2, 0, 4],
        barre: null,
        baseFret: 1
    },
    'D#m': {
        name: 'D#m',
        frets: [3, 3, 2, 1],
        fingers: [3, 4, 2, 1],
        barre: null,
        baseFret: 1
    },
    'G#m': {
        name: 'G#m',
        frets: [1, 3, 4, 2],
        fingers: [1, 3, 4, 2],
        barre: null,
        baseFret: 1
    },
    'Bbm': {
        name: 'Bbm',
        frets: [3, 1, 1, 1],
        fingers: [3, 1, 1, 1],
        barre: { fret: 1, fromString: 1, toString: 3 },
        baseFret: 1
    },
    'Ebm': {
        name: 'Ebm',
        frets: [3, 3, 2, 1],
        fingers: [3, 4, 2, 1],
        barre: null,
        baseFret: 1
    },
    'A#m': {
        name: 'A#m',
        frets: [3, 1, 1, 1],
        fingers: [3, 1, 1, 1],
        barre: { fret: 1, fromString: 1, toString: 3 },
        baseFret: 1
    },
    'Abm': {
        name: 'Abm',
        frets: [4, 3, 4, 2],
        fingers: [3, 2, 4, 1],
        barre: null,
        baseFret: 1
    },
    'Dbm': {
        name: 'Dbm',
        frets: [1, 1, 0, 4],
        fingers: [1, 2, 0, 4],
        barre: null,
        baseFret: 1
    },
    'Gbm': {
        name: 'Gbm',
        frets: [2, 1, 2, 0],
        fingers: [2, 1, 3, 0],
        barre: null,
        baseFret: 1
    },

    // Seventh Chords
    'G7': {
        name: 'G7',
        frets: [0, 2, 1, 2],
        fingers: [0, 2, 1, 3],
        barre: null,
        baseFret: 1
    },
    'C7': {
        name: 'C7',
        frets: [0, 0, 0, 1],
        fingers: [0, 0, 0, 1],
        barre: null,
        baseFret: 1
    },
    'D7': {
        name: 'D7',
        frets: [2, 2, 2, 3],
        fingers: [1, 1, 1, 2],
        barre: { fret: 2, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'A7': {
        name: 'A7',
        frets: [0, 1, 0, 0],
        fingers: [0, 1, 0, 0],
        barre: null,
        baseFret: 1
    },
    'E7': {
        name: 'E7',
        frets: [1, 2, 0, 2],
        fingers: [1, 2, 0, 3],
        barre: null,
        baseFret: 1
    },
    'B7': {
        name: 'B7',
        frets: [2, 3, 2, 2],
        fingers: [1, 2, 1, 1],
        barre: { fret: 2, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'F7': {
        name: 'F7',
        frets: [2, 3, 1, 0],
        fingers: [2, 3, 1, 0],
        barre: null,
        baseFret: 1
    },
    'Bb7': {
        name: 'Bb7',
        frets: [1, 2, 1, 1],
        fingers: [1, 2, 1, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'Eb7': {
        name: 'Eb7',
        frets: [3, 3, 3, 4],
        fingers: [1, 1, 1, 2],
        barre: { fret: 3, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'Ab7': {
        name: 'Ab7',
        frets: [1, 3, 2, 3],
        fingers: [1, 3, 2, 4],
        barre: null,
        baseFret: 1
    },
    'C#7': {
        name: 'C#7',
        frets: [1, 1, 1, 2],
        fingers: [1, 1, 1, 2],
        barre: { fret: 1, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'Db7': {
        name: 'Db7',
        frets: [1, 1, 1, 2],
        fingers: [1, 1, 1, 2],
        barre: { fret: 1, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'D#7': {
        name: 'D#7',
        frets: [3, 3, 3, 4],
        fingers: [1, 1, 1, 2],
        barre: { fret: 3, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'F#7': {
        name: 'F#7',
        frets: [3, 4, 2, 1],
        fingers: [3, 4, 2, 1],
        barre: null,
        baseFret: 1
    },
    'Gb7': {
        name: 'Gb7',
        frets: [3, 4, 2, 1],
        fingers: [3, 4, 2, 1],
        barre: null,
        baseFret: 1
    },
    'G#7': {
        name: 'G#7',
        frets: [1, 3, 2, 3],
        fingers: [1, 3, 2, 4],
        barre: null,
        baseFret: 1
    },
    'A#7': {
        name: 'A#7',
        frets: [1, 2, 1, 1],
        fingers: [1, 2, 1, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },

    // Eleventh Chords
    'C11': {
        name: 'C11',
        frets: [0, 0, 0, 0],
        fingers: [0, 0, 0, 0],
        barre: null,
        baseFret: 1
    },
    'C#11': {
        name: 'C#11',
        frets: [1, 1, 1, 1],
        fingers: [1, 1, 1, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'Db11': {
        name: 'Db11',
        frets: [1, 1, 1, 1],
        fingers: [1, 1, 1, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'D11': {
        name: 'D11',
        frets: [2, 2, 2, 0],
        fingers: [1, 2, 3, 0],
        barre: null,
        baseFret: 1
    },
    'D#11': {
        name: 'D#11',
        frets: [3, 3, 3, 1],
        fingers: [2, 3, 4, 1],
        barre: null,
        baseFret: 1
    },
    'Eb11': {
        name: 'Eb11',
        frets: [3, 3, 3, 1],
        fingers: [2, 3, 4, 1],
        barre: null,
        baseFret: 1
    },
    'E11': {
        name: 'E11',
        frets: [1, 2, 0, 0],
        fingers: [1, 2, 0, 0],
        barre: null,
        baseFret: 1
    },
    'F11': {
        name: 'F11',
        frets: [2, 3, 1, 1],
        fingers: [2, 3, 1, 1],
        barre: { fret: 1, fromString: 2, toString: 3 },
        baseFret: 1
    },
    'F#11': {
        name: 'F#11',
        frets: [3, 4, 2, 2],
        fingers: [2, 3, 1, 1],
        barre: { fret: 2, fromString: 2, toString: 3 },
        baseFret: 1
    },
    'Gb11': {
        name: 'Gb11',
        frets: [3, 4, 2, 2],
        fingers: [2, 3, 1, 1],
        barre: { fret: 2, fromString: 2, toString: 3 },
        baseFret: 1
    },
    'G11': {
        name: 'G11',
        frets: [0, 2, 1, 0],
        fingers: [0, 2, 1, 0],
        barre: null,
        baseFret: 1
    },
    'G#11': {
        name: 'G#11',
        frets: [1, 3, 2, 1],
        fingers: [1, 3, 2, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'Ab11': {
        name: 'Ab11',
        frets: [1, 3, 2, 1],
        fingers: [1, 3, 2, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'A11': {
        name: 'A11',
        frets: [0, 1, 0, 0],
        fingers: [0, 1, 0, 0],
        barre: null,
        baseFret: 1
    },
    'A#11': {
        name: 'A#11',
        frets: [1, 2, 1, 1],
        fingers: [1, 2, 1, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'Bb11': {
        name: 'Bb11',
        frets: [1, 2, 1, 1],
        fingers: [1, 2, 1, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'B11': {
        name: 'B11',
        frets: [2, 3, 2, 0],
        fingers: [1, 2, 1, 0],
        barre: { fret: 2, fromString: 0, toString: 2 },
        baseFret: 1
    },

    // Major Seventh Chords
    'Cmaj7': {
        name: 'Cmaj7',
        frets: [0, 0, 0, 2],
        fingers: [0, 0, 0, 2],
        barre: null,
        baseFret: 1
    },
    'Dmaj7': {
        name: 'Dmaj7',
        frets: [2, 2, 2, 4],
        fingers: [1, 1, 1, 3],
        barre: { fret: 2, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'Fmaj7': {
        name: 'Fmaj7',
        frets: [2, 4, 1, 0],
        fingers: [2, 4, 1, 0],
        barre: null,
        baseFret: 1
    },
    'Gmaj7': {
        name: 'Gmaj7',
        frets: [0, 2, 2, 2],
        fingers: [0, 1, 2, 3],
        barre: null,
        baseFret: 1
    },
    'Amaj7': {
        name: 'Amaj7',
        frets: [1, 1, 0, 0],
        fingers: [1, 2, 0, 0],
        barre: null,
        baseFret: 1
    },
    'Bbmaj7': {
        name: 'Bbmaj7',
        frets: [3, 2, 1, 0],
        fingers: [4, 3, 1, 0],
        barre: null,
        baseFret: 1
    },
    'Bmaj7': {
        name: 'Bmaj7',
        frets: [4, 3, 2, 1],
        fingers: [4, 3, 2, 1],
        barre: null,
        baseFret: 1
    },
    'C#maj7': {
        name: 'C#maj7',
        frets: [1, 1, 1, 3],
        fingers: [1, 1, 1, 3],
        barre: { fret: 1, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'Dbmaj7': {
        name: 'Dbmaj7',
        frets: [1, 1, 1, 3],
        fingers: [1, 1, 1, 3],
        barre: { fret: 1, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'D#maj7': {
        name: 'D#maj7',
        frets: [3, 3, 3, 5],
        fingers: [1, 1, 1, 3],
        barre: { fret: 3, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'Ebmaj7': {
        name: 'Ebmaj7',
        frets: [3, 3, 3, 5],
        fingers: [1, 1, 1, 3],
        barre: { fret: 3, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'Emaj7': {
        name: 'Emaj7',
        frets: [1, 3, 0, 2],
        fingers: [1, 3, 0, 2],
        barre: null,
        baseFret: 1
    },
    'F#maj7': {
        name: 'F#maj7',
        frets: [3, 5, 2, 1],
        fingers: [2, 4, 1, 1],
        barre: null,
        baseFret: 1
    },
    'Gbmaj7': {
        name: 'Gbmaj7',
        frets: [3, 5, 2, 1],
        fingers: [2, 4, 1, 1],
        barre: null,
        baseFret: 1
    },
    'G#maj7': {
        name: 'G#maj7',
        frets: [1, 3, 3, 3],
        fingers: [1, 2, 3, 4],
        barre: null,
        baseFret: 1
    },
    'Abmaj7': {
        name: 'Abmaj7',
        frets: [1, 3, 3, 3],
        fingers: [1, 2, 3, 4],
        barre: null,
        baseFret: 1
    },
    'A#maj7': {
        name: 'A#maj7',
        frets: [3, 2, 1, 0],
        fingers: [4, 3, 1, 0],
        barre: null,
        baseFret: 1
    },

    // Minor Seventh Chords
    'Am7': {
        name: 'Am7',
        frets: [0, 0, 0, 0],
        fingers: [0, 0, 0, 0],
        barre: null,
        baseFret: 1
    },
    'Bm7': {
        name: 'Bm7',
        frets: [2, 2, 2, 2],
        fingers: [1, 1, 1, 1],
        barre: { fret: 2, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'Dm7': {
        name: 'Dm7',
        frets: [2, 2, 1, 3],
        fingers: [2, 3, 1, 4],
        barre: null,
        baseFret: 1
    },
    'Em7': {
        name: 'Em7',
        frets: [0, 2, 0, 2],
        fingers: [0, 1, 0, 2],
        barre: null,
        baseFret: 1
    },
    'Fm7': {
        name: 'Fm7',
        frets: [1, 3, 1, 3],
        fingers: [1, 3, 2, 4],
        barre: null,
        baseFret: 1
    },
    'Gm7': {
        name: 'Gm7',
        frets: [0, 2, 1, 1],
        fingers: [0, 3, 1, 2],
        barre: null,
        baseFret: 1
    },
    'Bbm7': {
        name: 'Bbm7',
        frets: [1, 1, 1, 1],
        fingers: [1, 1, 1, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'Cm7': {
        name: 'Cm7',
        frets: [3, 3, 3, 3],
        fingers: [1, 1, 1, 1],
        barre: { fret: 3, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'C#m7': {
        name: 'C#m7',
        frets: [4, 4, 4, 4],
        fingers: [1, 1, 1, 1],
        barre: { fret: 4, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'Dbm7': {
        name: 'Dbm7',
        frets: [4, 4, 4, 4],
        fingers: [1, 1, 1, 1],
        barre: { fret: 4, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'D#m7': {
        name: 'D#m7',
        frets: [3, 3, 2, 4],
        fingers: [2, 3, 1, 4],
        barre: null,
        baseFret: 1
    },
    'Ebm7': {
        name: 'Ebm7',
        frets: [3, 3, 2, 4],
        fingers: [2, 3, 1, 4],
        barre: null,
        baseFret: 1
    },
    'F#m7': {
        name: 'F#m7',
        frets: [2, 4, 2, 0],
        fingers: [1, 3, 2, 0],
        barre: null,
        baseFret: 1
    },
    'Gbm7': {
        name: 'Gbm7',
        frets: [2, 4, 2, 0],
        fingers: [1, 3, 2, 0],
        barre: null,
        baseFret: 1
    },
    'G#m7': {
        name: 'G#m7',
        frets: [1, 3, 2, 2],
        fingers: [1, 4, 2, 3],
        barre: null,
        baseFret: 1
    },
    'Abm7': {
        name: 'Abm7',
        frets: [1, 3, 2, 2],
        fingers: [1, 4, 2, 3],
        barre: null,
        baseFret: 1
    },
    'A#m7': {
        name: 'A#m7',
        frets: [1, 1, 1, 1],
        fingers: [1, 1, 1, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },

    // Minor 7 flat 5 (Half-Diminished) Chords
    'Am7b5': {
        name: 'Am7b5',
        frets: [2, 0, 0, 0],
        fingers: [1, 0, 0, 0],
        barre: null,
        baseFret: 1
    },
    'A#m7b5': {
        name: 'A#m7b5',
        frets: [1, 1, 0, 1],
        fingers: [1, 2, 0, 3],
        barre: null,
        baseFret: 1
    },
    'Bbm7b5': {
        name: 'Bbm7b5',
        frets: [1, 1, 0, 1],
        fingers: [1, 2, 0, 3],
        barre: null,
        baseFret: 1
    },
    'Bm7b5': {
        name: 'Bm7b5',
        frets: [2, 2, 1, 2],
        fingers: [2, 3, 1, 4],
        barre: null,
        baseFret: 1
    },
    'Cm7b5': {
        name: 'Cm7b5',
        frets: [3, 3, 2, 3],
        fingers: [2, 3, 1, 4],
        barre: null,
        baseFret: 1
    },
    'C#m7b5': {
        name: 'C#m7b5',
        frets: [4, 4, 3, 4],
        fingers: [2, 3, 1, 4],
        barre: null,
        baseFret: 1
    },
    'Dbm7b5': {
        name: 'Dbm7b5',
        frets: [4, 4, 3, 4],
        fingers: [2, 3, 1, 4],
        barre: null,
        baseFret: 1
    },
    'Dm7b5': {
        name: 'Dm7b5',
        frets: [1, 2, 1, 3],
        fingers: [1, 2, 1, 4],
        barre: { fret: 1, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'D#m7b5': {
        name: 'D#m7b5',
        frets: [2, 3, 2, 4],
        fingers: [1, 2, 1, 4],
        barre: { fret: 2, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'Ebm7b5': {
        name: 'Ebm7b5',
        frets: [2, 3, 2, 4],
        fingers: [1, 2, 1, 4],
        barre: { fret: 2, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'Em7b5': {
        name: 'Em7b5',
        frets: [0, 2, 0, 1],
        fingers: [0, 2, 0, 1],
        barre: null,
        baseFret: 1
    },
    'Fm7b5': {
        name: 'Fm7b5',
        frets: [1, 3, 0, 3],
        fingers: [1, 2, 0, 3],
        barre: null,
        baseFret: 1
    },
    'F#m7b5': {
        name: 'F#m7b5',
        frets: [2, 4, 1, 4],
        fingers: [2, 3, 1, 4],
        barre: null,
        baseFret: 1
    },
    'Gbm7b5': {
        name: 'Gbm7b5',
        frets: [2, 4, 1, 4],
        fingers: [2, 3, 1, 4],
        barre: null,
        baseFret: 1
    },
    'Gm7b5': {
        name: 'Gm7b5',
        frets: [0, 1, 1, 1],
        fingers: [0, 1, 2, 3],
        barre: null,
        baseFret: 1
    },
    'G#m7b5': {
        name: 'G#m7b5',
        frets: [1, 2, 2, 2],
        fingers: [1, 2, 3, 4],
        barre: null,
        baseFret: 1
    },
    'Abm7b5': {
        name: 'Abm7b5',
        frets: [1, 2, 2, 2],
        fingers: [1, 2, 3, 4],
        barre: null,
        baseFret: 1
    },

    // Diminished Chords
    'Bdim': {
        name: 'Bdim',
        frets: [1, 2, 1, 2],
        fingers: [1, 3, 2, 4],
        barre: null,
        baseFret: 1
    },
    'Cdim': {
        name: 'Cdim',
        frets: [2, 3, 2, 3],
        fingers: [1, 3, 2, 4],
        barre: null,
        baseFret: 1
    },
    'Ddim': {
        name: 'Ddim',
        frets: [1, 2, 1, 2],
        fingers: [1, 3, 2, 4],
        barre: null,
        baseFret: 1
    },
    'Edim': {
        name: 'Edim',
        frets: [0, 4, 3, 1],
        fingers: [0, 4, 3, 1],
        barre: null,
        baseFret: 1
    },
    'F#dim': {
        name: 'F#dim',
        frets: [2, 0, 2, 0],
        fingers: [1, 0, 2, 0],
        barre: null,
        baseFret: 1
    },
    'G#dim': {
        name: 'G#dim',
        frets: [1, 2, 1, 2],
        fingers: [1, 3, 2, 4],
        barre: null,
        baseFret: 1
    },
    'Adim': {
        name: 'Adim',
        frets: [2, 3, 2, 3],
        fingers: [1, 3, 2, 4],
        barre: null,
        baseFret: 1
    },
    'A#dim': {
        name: 'A#dim',
        frets: [0, 1, 0, 1],
        fingers: [0, 1, 0, 2],
        barre: null,
        baseFret: 1
    },
    'Bbdim': {
        name: 'Bbdim',
        frets: [0, 1, 0, 1],
        fingers: [0, 1, 0, 2],
        barre: null,
        baseFret: 1
    },
    'C#dim': {
        name: 'C#dim',
        frets: [0, 1, 0, 1],
        fingers: [0, 1, 0, 2],
        barre: null,
        baseFret: 1
    },
    'Dbdim': {
        name: 'Dbdim',
        frets: [0, 1, 0, 1],
        fingers: [0, 1, 0, 2],
        barre: null,
        baseFret: 1
    },
    'D#dim': {
        name: 'D#dim',
        frets: [2, 3, 2, 3],
        fingers: [1, 3, 2, 4],
        barre: null,
        baseFret: 1
    },
    'Ebdim': {
        name: 'Ebdim',
        frets: [2, 3, 2, 3],
        fingers: [1, 3, 2, 4],
        barre: null,
        baseFret: 1
    },
    'Fdim': {
        name: 'Fdim',
        frets: [1, 2, 1, 2],
        fingers: [1, 3, 2, 4],
        barre: null,
        baseFret: 1
    },
    'Gbdim': {
        name: 'Gbdim',
        frets: [2, 0, 2, 0],
        fingers: [1, 0, 2, 0],
        barre: null,
        baseFret: 1
    },
    'Gdim': {
        name: 'Gdim',
        frets: [0, 1, 0, 1],
        fingers: [0, 1, 0, 2],
        barre: null,
        baseFret: 1
    },
    'Abdim': {
        name: 'Abdim',
        frets: [1, 2, 1, 2],
        fingers: [1, 3, 2, 4],
        barre: null,
        baseFret: 1
    },

    // Augmented Chords
    'Caug': {
        name: 'Caug',
        frets: [1, 0, 0, 3],
        fingers: [1, 0, 0, 4],
        barre: null,
        baseFret: 1
    },
    'Daug': {
        name: 'Daug',
        frets: [3, 2, 2, 1],
        fingers: [4, 2, 3, 1],
        barre: null,
        baseFret: 1
    },
    'Eaug': {
        name: 'Eaug',
        frets: [1, 0, 0, 3],
        fingers: [1, 0, 0, 4],
        barre: null,
        baseFret: 1
    },
    'Faug': {
        name: 'Faug',
        frets: [2, 1, 1, 0],
        fingers: [3, 1, 2, 0],
        barre: null,
        baseFret: 1
    },
    'Gaug': {
        name: 'Gaug',
        frets: [0, 3, 3, 2],
        fingers: [0, 2, 3, 1],
        barre: null,
        baseFret: 1
    },
    'Aaug': {
        name: 'Aaug',
        frets: [2, 1, 1, 0],
        fingers: [3, 1, 2, 0],
        barre: null,
        baseFret: 1
    },
    'Baug': {
        name: 'Baug',
        frets: [0, 3, 3, 2],
        fingers: [0, 2, 3, 1],
        barre: null,
        baseFret: 1
    },
    'Bbaug': {
        name: 'Bbaug',
        frets: [3, 2, 2, 1],
        fingers: [4, 2, 3, 1],
        barre: null,
        baseFret: 1
    },
    'A#aug': {
        name: 'A#aug',
        frets: [3, 2, 2, 1],
        fingers: [4, 2, 3, 1],
        barre: null,
        baseFret: 1
    },
    'C#aug': {
        name: 'C#aug',
        frets: [2, 1, 1, 0],
        fingers: [3, 1, 2, 0],
        barre: null,
        baseFret: 1
    },
    'Dbaug': {
        name: 'Dbaug',
        frets: [2, 1, 1, 0],
        fingers: [3, 1, 2, 0],
        barre: null,
        baseFret: 1
    },
    'D#aug': {
        name: 'D#aug',
        frets: [0, 3, 3, 2],
        fingers: [0, 2, 3, 1],
        barre: null,
        baseFret: 1
    },
    'Ebaug': {
        name: 'Ebaug',
        frets: [0, 3, 3, 2],
        fingers: [0, 2, 3, 1],
        barre: null,
        baseFret: 1
    },
    'F#aug': {
        name: 'F#aug',
        frets: [3, 2, 2, 1],
        fingers: [4, 2, 3, 1],
        barre: null,
        baseFret: 1
    },
    'Gbaug': {
        name: 'Gbaug',
        frets: [3, 2, 2, 1],
        fingers: [4, 2, 3, 1],
        barre: null,
        baseFret: 1
    },
    'G#aug': {
        name: 'G#aug',
        frets: [1, 0, 0, 3],
        fingers: [1, 0, 0, 4],
        barre: null,
        baseFret: 1
    },
    'Abaug': {
        name: 'Abaug',
        frets: [1, 0, 0, 3],
        fingers: [1, 0, 0, 4],
        barre: null,
        baseFret: 1
    },

    // Add9 Chords
    'C9': {
        name: 'C9',
        frets: [0, 2, 0, 3],
        fingers: [0, 2, 0, 3],
        barre: null,
        baseFret: 1
    },
    'Cadd9': {
        name: 'Cadd9',
        frets: [0, 2, 0, 3],
        fingers: [0, 2, 0, 3],
        barre: null,
        baseFret: 1
    },
    'G9': {
        name: 'G9',
        frets: [2, 2, 1, 2],
        fingers: [2, 3, 1, 4],
        barre: null,
        baseFret: 1
    },
    'Gadd9': {
        name: 'Gadd9',
        frets: [0, 2, 0, 2],
        fingers: [0, 1, 0, 2],
        barre: null,
        baseFret: 1
    },
    'D9': {
        name: 'D9',
        frets: [2, 4, 2, 3],
        fingers: [1, 3, 1, 2],
        barre: { fret: 2, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'Dadd9': {
        name: 'Dadd9',
        frets: [2, 2, 2, 0],
        fingers: [1, 2, 3, 0],
        barre: null,
        baseFret: 1
    },
    'A9': {
        name: 'A9',
        frets: [2, 1, 3, 2],
        fingers: [2, 1, 4, 3],
        barre: null,
        baseFret: 1
    },
    'E9': {
        name: 'E9',
        frets: [1, 2, 2, 2],
        fingers: [1, 2, 3, 4],
        barre: null,
        baseFret: 1
    },
    'B9': {
        name: 'B9',
        frets: [4, 3, 5, 4],
        fingers: [2, 1, 4, 3],
        barre: null,
        baseFret: 1
    },
    'F9': {
        name: 'F9',
        frets: [0, 3, 1, 0],
        fingers: [0, 3, 1, 0],
        barre: null,
        baseFret: 1
    },
    'Bb9': {
        name: 'Bb9',
        frets: [1, 2, 1, 1],
        fingers: [1, 2, 1, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'A#9': {
        name: 'A#9',
        frets: [1, 2, 1, 1],
        fingers: [1, 2, 1, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'Eb9': {
        name: 'Eb9',
        frets: [0, 1, 1, 1],
        fingers: [0, 1, 2, 3],
        barre: null,
        baseFret: 1
    },
    'D#9': {
        name: 'D#9',
        frets: [0, 1, 1, 1],
        fingers: [0, 1, 2, 3],
        barre: null,
        baseFret: 1
    },
    'Ab9': {
        name: 'Ab9',
        frets: [1, 0, 2, 1],
        fingers: [1, 0, 3, 2],
        barre: null,
        baseFret: 1
    },
    'G#9': {
        name: 'G#9',
        frets: [1, 0, 2, 1],
        fingers: [1, 0, 3, 2],
        barre: null,
        baseFret: 1
    },
    'Db9': {
        name: 'Db9',
        frets: [1, 1, 1, 4],
        fingers: [1, 1, 1, 4],
        barre: { fret: 1, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'C#9': {
        name: 'C#9',
        frets: [1, 1, 1, 4],
        fingers: [1, 1, 1, 4],
        barre: { fret: 1, fromString: 0, toString: 2 },
        baseFret: 1
    },
    'F#9': {
        name: 'F#9',
        frets: [1, 1, 2, 1],
        fingers: [1, 1, 2, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'Gb9': {
        name: 'Gb9',
        frets: [1, 1, 2, 1],
        fingers: [1, 1, 2, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },

    // Sharp 9 Chords
    'B7#9': {
        name: 'B7#9',
        frets: [4, 3, 5, 5],
        fingers: [2, 1, 3, 4],
        barre: null,
        baseFret: 1
    },

    // Suspended Chords
    'Csus2': {
        name: 'Csus2',
        frets: [0, 2, 3, 3],
        fingers: [0, 1, 2, 3],
        barre: null,
        baseFret: 1
    },
    'Csus4': {
        name: 'Csus4',
        frets: [0, 0, 1, 3],
        fingers: [0, 0, 1, 3],
        barre: null,
        baseFret: 1
    },
    'Dsus2': {
        name: 'Dsus2',
        frets: [2, 2, 0, 0],
        fingers: [1, 2, 0, 0],
        barre: null,
        baseFret: 1
    },
    'Dsus4': {
        name: 'Dsus4',
        frets: [0, 2, 3, 0],
        fingers: [0, 1, 2, 0],
        barre: null,
        baseFret: 1
    },
    'Dsus': {
        name: 'Dsus',
        frets: [0, 2, 3, 0],
        fingers: [0, 1, 2, 0],
        barre: null,
        baseFret: 1
    },
    'Gsus4': {
        name: 'Gsus4',
        frets: [0, 2, 3, 3],
        fingers: [0, 1, 2, 3],
        barre: null,
        baseFret: 1
    },
    'Gsus': {
        name: 'Gsus',
        frets: [0, 2, 3, 3],
        fingers: [0, 1, 2, 3],
        barre: null,
        baseFret: 1
    },
    'Asus2': {
        name: 'Asus2',
        frets: [2, 4, 0, 2],
        fingers: [1, 3, 0, 2],
        barre: null,
        baseFret: 1
    },
    'Asus4': {
        name: 'Asus4',
        frets: [2, 2, 0, 0],
        fingers: [1, 2, 0, 0],
        barre: null,
        baseFret: 1
    },
    'Asus': {
        name: 'Asus',
        frets: [2, 2, 0, 0],
        fingers: [1, 2, 0, 0],
        barre: null,
        baseFret: 1
    },
    'A7sus': {
        name: 'A7sus',
        frets: [0, 2, 0, 0],
        fingers: [0, 2, 0, 0],
        barre: null,
        baseFret: 1
    },
    'A7sus4': {
        name: 'A7sus4',
        frets: [0, 2, 0, 0],
        fingers: [0, 2, 0, 0],
        barre: null,
        baseFret: 1
    },
    'Esus2': {
        name: 'Esus2',
        frets: [4, 4, 2, 2],
        fingers: [3, 4, 1, 2],
        barre: null,
        baseFret: 1
    },
    'Esus4': {
        name: 'Esus4',
        frets: [2, 4, 0, 2],
        fingers: [1, 3, 0, 2],
        barre: null,
        baseFret: 1
    },
    'Fsus2': {
        name: 'Fsus2',
        frets: [0, 0, 1, 0],
        fingers: [0, 0, 1, 0],
        barre: null,
        baseFret: 1
    },
    'Fsus4': {
        name: 'Fsus4',
        frets: [3, 0, 1, 1],
        fingers: [3, 0, 1, 2],
        barre: null,
        baseFret: 1
    },
    'Gsus2': {
        name: 'Gsus2',
        frets: [0, 2, 3, 0],
        fingers: [0, 1, 2, 0],
        barre: null,
        baseFret: 1
    },
    'Bsus2': {
        name: 'Bsus2',
        frets: [4, 1, 2, 2],
        fingers: [4, 1, 2, 3],
        barre: null,
        baseFret: 1
    },
    'Bsus4': {
        name: 'Bsus4',
        frets: [4, 4, 2, 2],
        fingers: [3, 4, 1, 2],
        barre: null,
        baseFret: 1
    },
    'Bbsus2': {
        name: 'Bbsus2',
        frets: [3, 0, 1, 1],
        fingers: [3, 0, 1, 2],
        barre: null,
        baseFret: 1
    },
    'Bbsus4': {
        name: 'Bbsus4',
        frets: [3, 3, 1, 1],
        fingers: [3, 4, 1, 2],
        barre: null,
        baseFret: 1
    },
    'A#sus2': {
        name: 'A#sus2',
        frets: [3, 0, 1, 1],
        fingers: [3, 0, 1, 2],
        barre: null,
        baseFret: 1
    },
    'A#sus4': {
        name: 'A#sus4',
        frets: [3, 3, 1, 1],
        fingers: [3, 4, 1, 2],
        barre: null,
        baseFret: 1
    },
    'C#sus2': {
        name: 'C#sus2',
        frets: [1, 1, 1, 1],
        fingers: [1, 1, 1, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'C#sus4': {
        name: 'C#sus4',
        frets: [1, 1, 2, 4],
        fingers: [1, 1, 2, 4],
        barre: { fret: 1, fromString: 0, toString: 1 },
        baseFret: 1
    },
    'Dbsus2': {
        name: 'Dbsus2',
        frets: [1, 1, 1, 1],
        fingers: [1, 1, 1, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'Dbsus4': {
        name: 'Dbsus4',
        frets: [1, 1, 2, 4],
        fingers: [1, 1, 2, 4],
        barre: { fret: 1, fromString: 0, toString: 1 },
        baseFret: 1
    },
    'D#sus2': {
        name: 'D#sus2',
        frets: [1, 3, 4, 1],
        fingers: [1, 2, 3, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'D#sus4': {
        name: 'D#sus4',
        frets: [1, 3, 4, 4],
        fingers: [1, 2, 3, 4],
        barre: null,
        baseFret: 1
    },
    'Ebsus2': {
        name: 'Ebsus2',
        frets: [1, 3, 4, 1],
        fingers: [1, 2, 3, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'Ebsus4': {
        name: 'Ebsus4',
        frets: [1, 3, 4, 4],
        fingers: [1, 2, 3, 4],
        barre: null,
        baseFret: 1
    },
    'F#sus2': {
        name: 'F#sus2',
        frets: [1, 1, 2, 4],
        fingers: [1, 1, 2, 4],
        barre: { fret: 1, fromString: 0, toString: 1 },
        baseFret: 1
    },
    'F#sus4': {
        name: 'F#sus4',
        frets: [4, 1, 2, 2],
        fingers: [4, 1, 2, 3],
        barre: null,
        baseFret: 1
    },
    'Gbsus2': {
        name: 'Gbsus2',
        frets: [1, 1, 2, 4],
        fingers: [1, 1, 2, 4],
        barre: { fret: 1, fromString: 0, toString: 1 },
        baseFret: 1
    },
    'Gbsus4': {
        name: 'Gbsus4',
        frets: [4, 1, 2, 2],
        fingers: [4, 1, 2, 3],
        barre: null,
        baseFret: 1
    },
    'G#sus2': {
        name: 'G#sus2',
        frets: [1, 3, 4, 1],
        fingers: [1, 2, 3, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'G#sus4': {
        name: 'G#sus4',
        frets: [1, 3, 4, 4],
        fingers: [1, 2, 3, 4],
        barre: null,
        baseFret: 1
    },
    'Absus2': {
        name: 'Absus2',
        frets: [1, 3, 4, 1],
        fingers: [1, 2, 3, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'Absus4': {
        name: 'Absus4',
        frets: [1, 3, 4, 4],
        fingers: [1, 2, 3, 4],
        barre: null,
        baseFret: 1
    },
    // Shorthand sus aliases (sus = sus4)
    'C#sus': {
        name: 'C#sus',
        frets: [1, 1, 2, 4],
        fingers: [1, 1, 2, 4],
        barre: { fret: 1, fromString: 0, toString: 1 },
        baseFret: 1
    },
    'Dbsus': {
        name: 'Dbsus',
        frets: [1, 1, 2, 4],
        fingers: [1, 1, 2, 4],
        barre: { fret: 1, fromString: 0, toString: 1 },
        baseFret: 1
    },
    'D#sus': {
        name: 'D#sus',
        frets: [1, 3, 4, 4],
        fingers: [1, 2, 3, 4],
        barre: null,
        baseFret: 1
    },
    'Ebsus': {
        name: 'Ebsus',
        frets: [1, 3, 4, 4],
        fingers: [1, 2, 3, 4],
        barre: null,
        baseFret: 1
    },
    'F#sus': {
        name: 'F#sus',
        frets: [4, 1, 2, 2],
        fingers: [4, 1, 2, 3],
        barre: null,
        baseFret: 1
    },
    'Gbsus': {
        name: 'Gbsus',
        frets: [4, 1, 2, 2],
        fingers: [4, 1, 2, 3],
        barre: null,
        baseFret: 1
    },
    'G#sus': {
        name: 'G#sus',
        frets: [1, 3, 4, 4],
        fingers: [1, 2, 3, 4],
        barre: null,
        baseFret: 1
    },
    'Absus': {
        name: 'Absus',
        frets: [1, 3, 4, 4],
        fingers: [1, 2, 3, 4],
        barre: null,
        baseFret: 1
    },
    'Bsus': {
        name: 'Bsus',
        frets: [4, 4, 2, 2],
        fingers: [3, 4, 1, 2],
        barre: null,
        baseFret: 1
    },
    'Esus': {
        name: 'Esus',
        frets: [2, 4, 0, 2],
        fingers: [1, 3, 0, 2],
        barre: null,
        baseFret: 1
    },
    'Cadd9': {
        name: 'Cadd9',
        frets: [0, 2, 0, 3],
        fingers: [0, 2, 0, 3],
        barre: null,
        baseFret: 1
    },
    // Slash chords (bass note shown in name). On a re-entrant GCEA ukulele the
    // bass note often cannot be voiced below the chord, so these reuse the
    // parent triad shape except where the bass note is reachable.
    'Gadd2': {
        name: 'Gadd2',
        frets: [0, 2, 0, 2],
        fingers: [0, 1, 0, 2],
        barre: null,
        baseFret: 1
    },
    'D/F#': {
        name: 'D/F#',
        frets: [2, 2, 2, 0],
        fingers: [1, 2, 3, 0],
        barre: null,
        baseFret: 1
    },
    'G/B': {
        name: 'G/B',
        frets: [4, 2, 3, 2],
        fingers: [4, 1, 3, 2],
        barre: null,
        baseFret: 1
    },
    'Am/G': {
        name: 'Am/G',
        frets: [0, 0, 0, 0],
        fingers: [0, 0, 0, 0],
        barre: null,
        baseFret: 1
    },
    'G/F#': {
        name: 'G/F#',
        frets: [0, 2, 3, 2],
        fingers: [0, 1, 3, 2],
        barre: null,
        baseFret: 1
    },
    'G/D': {
        name: 'G/D',
        frets: [0, 2, 3, 2],
        fingers: [0, 1, 3, 2],
        barre: null,
        baseFret: 1
    },
    'Db/Eb': {
        name: 'Db/Eb',
        frets: [1, 3, 1, 4],
        fingers: [1, 3, 1, 4],
        barre: null,
        baseFret: 1
    }
};

/**
 * Resolve a chord name to its CHORDS entry.
 * Tries the exact name first, then falls back to the parent chord for slash
 * chords (e.g., "Eb/G" → CHORDS["Eb"]) since re-entrant GCEA ukulele often
 * can't voice the slash bass note below the chord.
 * @param {string} chordName
 * @returns {Object|undefined} chord data, or undefined if not found
 */
function resolveChord(chordName) {
    if (CHORDS[chordName]) return CHORDS[chordName];
    if (chordName.includes('/')) {
        const parent = chordName.split('/')[0];
        return CHORDS[parent];
    }
    return undefined;
}

// Chromatic scale for transposition
const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_SCALE_FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Semitone offset of each natural note, for canonicalRoot()
const LETTER_PITCH_CLASS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Rewrite a chord's root to one canonical spelling (sharps), leaving the suffix
 * alone. "Fxm" -> "Gm", "Bb" -> "A#", "B#dim" -> "Cdim", "Cb" -> "B".
 *
 * This exists because two vocabularies meet in getScaleDegree():
 * transposeChord() emits sharps unless the source chord had a flat, while
 * SCALE_DEGREES_MAJOR/MINOR spell each key the musically correct way (Bb as the
 * IV of F, E#m as the vi of G#). Comparing those as raw strings makes a
 * perfectly diatonic chord look foreign. Canonicalising both sides first lets
 * the existing string comparison work on any spelling, double accidentals
 * included.
 *
 * Handles the root only - "D/F#" is returned unchanged, since the bass note
 * lands in the suffix.
 *
 * @param {string} name - A chord or key name
 * @returns {string} - The same name with its root respelled, or the input unchanged
 */
function canonicalRoot(name) {
    const match = String(name).match(/^([A-G])((?:#|b|x)*)(.*)$/);
    if (!match) return name;

    const [, letter, accidentals, rest] = match;
    let pc = LETTER_PITCH_CLASS[letter];
    for (const a of accidentals) {
        pc += a === '#' ? 1 : a === 'x' ? 2 : -1;
    }

    return CHROMATIC_SCALE[((pc % 12) + 12) % 12] + rest;
}

/**
 * Transpose a chord by a number of semitones
 * @param {string} chord - The chord name (e.g., "Am", "F#m7")
 * @param {number} semitones - Number of semitones to transpose (positive or negative)
 * @returns {string} - The transposed chord name
 */
function transposeChord(chord, semitones) {
    if (semitones === 0) return chord;

    // Slash chords (e.g. "D/F#"): transpose the chord and the bass note separately
    if (chord.includes('/')) {
        const [base, bass] = chord.split('/');
        return transposeChord(base, semitones) + '/' + transposeChord(bass, semitones);
    }

    // Extract root note and suffix (m, 7, maj7, etc.)
    const match = chord.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return chord;

    const [, root, suffix] = match;

    // Determine if we should use flats or sharps based on the original chord
    const useFlats = root.includes('b');
    const scale = useFlats ? CHROMATIC_SCALE_FLATS : CHROMATIC_SCALE;

    // Find the root in the chromatic scale
    let rootIndex = CHROMATIC_SCALE.indexOf(root);
    if (rootIndex === -1) {
        rootIndex = CHROMATIC_SCALE_FLATS.indexOf(root);
    }
    if (rootIndex === -1) return chord;

    // Transpose
    let newIndex = (rootIndex + semitones) % 12;
    if (newIndex < 0) newIndex += 12;

    const newRoot = scale[newIndex];
    return newRoot + suffix;
}

/**
 * Transpose a key by a number of semitones
 * @param {string} key - The key (e.g., "C", "G", "F#")
 * @param {number} semitones - Number of semitones to transpose
 * @returns {string} - The transposed key
 */
function transposeKey(key, semitones) {
    return transposeChord(key, semitones);
}

/**
 * Respell a chord's root using sharps or flats. DISPLAY ONLY.
 *
 * The result must never be fed back into CHORDS[], resolveChord(),
 * getScaleDegree(), getChordVariations() or anything in analysis.js - those all
 * match chord names as exact strings, so a respelled name silently turns a
 * scale degree into '?'. Keep the original name for lookups and respell only
 * the text that reaches the DOM.
 *
 * @param {string} chord - Chord name (e.g. "Db", "A#m7", "D/F#")
 * @param {string|null} accidental - 'sharp', 'flat', or null/anything else to leave as-is
 * @returns {string} - The respelled name, or the original when nothing applies
 */
function respellChord(chord, accidental) {
    if (!chord || (accidental !== 'sharp' && accidental !== 'flat')) return chord;

    // Slash chords (e.g. "D/F#"): respell the chord and the bass note separately
    if (chord.includes('/')) {
        const [base, bass] = chord.split('/');
        return respellChord(base, accidental) + '/' + respellChord(bass, accidental);
    }

    const match = chord.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return chord;

    const [, root, suffix] = match;

    // Only black keys get respelled. B<->Cb and E<->Fb are deliberately left
    // alone: they change the name's length, which would shift every chord after
    // them in renderLyrics()'s character-positioned chord row.
    if (!root.includes('#') && !root.includes('b')) return chord;

    // Look the root up in the *opposite* scale - a miss means it is already
    // spelled the way we want (or is something exotic like E#), so leave it.
    const from = accidental === 'flat' ? CHROMATIC_SCALE : CHROMATIC_SCALE_FLATS;
    const to = accidental === 'flat' ? CHROMATIC_SCALE_FLATS : CHROMATIC_SCALE;

    const index = from.indexOf(root);
    if (index === -1) return chord;

    return to[index] + suffix;
}

// Enharmonic equivalents - maps uncommon keys to their commonly used equivalent
const ENHARMONIC_EQUIVALENTS = {
    // Uncommon sharp keys -> common flat equivalents
    'A#': 'Bb',
    'D#': 'Eb',
    'G#': 'Ab',
    'A#m': 'Bbm',
    'D#m': 'Ebm',
    'G#m': 'Abm',
    // Uncommon flat keys -> common sharp/natural equivalents
    'Cb': 'B',
    'Fb': 'E',
    'Cbm': 'Bm',
    'Fbm': 'Em',
    'Gbm': 'F#m',
    'Abm': 'G#m'
};

/**
 * Get the enharmonic equivalent for an uncommon key (if any)
 * @param {string} key - The key
 * @returns {string|null} - The common equivalent, or null if already common
 */
function getEnharmonicEquivalent(key) {
    return ENHARMONIC_EQUIVALENTS[key] || null;
}

/**
 * Alternative chord voicings/variations
 * Each chord can have multiple ways to play it
 * The main CHORDS object contains the default (usually easiest) voicing
 * This object contains additional variations with descriptions
 */
const CHORD_VARIATIONS = {
    'C': [
        {
            name: 'C (high)',
            description: 'Higher position',
            frets: [5, 4, 3, 3],
            fingers: [4, 3, 1, 1],
            barre: { fret: 3, fromString: 2, toString: 3 },
            baseFret: 1
        },
        {
            name: 'C (bar)',
            description: 'Barre at 3rd fret',
            frets: [5, 4, 3, 3],
            fingers: [4, 3, 1, 2],
            barre: null,
            baseFret: 1
        }
    ],
    'Am': [
        {
            name: 'Am (bar)',
            description: 'Barre chord shape',
            frets: [5, 5, 5, 5],
            fingers: [1, 1, 1, 1],
            barre: { fret: 5, fromString: 0, toString: 3 },
            baseFret: 1
        },
        {
            name: 'Am (high)',
            description: 'Higher voicing',
            frets: [2, 4, 5, 3],
            fingers: [1, 3, 4, 2],
            barre: null,
            baseFret: 1
        }
    ],
    'F': [
        {
            name: 'F (bar)',
            description: 'Barre at 5th fret',
            frets: [5, 5, 5, 8],
            fingers: [1, 1, 1, 4],
            barre: { fret: 5, fromString: 0, toString: 2 },
            baseFret: 1
        },
        {
            name: 'F (alt)',
            description: 'Alternative fingering',
            frets: [5, 5, 6, 5],
            fingers: [1, 1, 2, 1],
            barre: { fret: 5, fromString: 0, toString: 3 },
            baseFret: 1
        }
    ],
    'G': [
        {
            name: 'G (easy)',
            description: 'Two finger version',
            frets: [0, 2, 3, 0],
            fingers: [0, 1, 2, 0],
            barre: null,
            baseFret: 1
        },
        {
            name: 'G (bar)',
            description: 'Barre at 7th fret',
            frets: [7, 7, 7, 10],
            fingers: [1, 1, 1, 4],
            barre: { fret: 7, fromString: 0, toString: 2 },
            baseFret: 1
        }
    ],
    'D': [
        {
            name: 'D (alt)',
            description: 'Higher position',
            frets: [7, 7, 7, 5],
            fingers: [2, 3, 4, 1],
            barre: null,
            baseFret: 1
        }
    ],
    'A': [
        {
            name: 'A (bar)',
            description: 'Barre shape',
            frets: [4, 4, 4, 4],
            fingers: [1, 1, 1, 1],
            barre: { fret: 4, fromString: 0, toString: 3 },
            baseFret: 5
        },
        {
            name: 'A (alt)',
            description: 'One finger version',
            frets: [2, 1, 0, 0],
            fingers: [2, 1, 0, 0],
            barre: null,
            baseFret: 1
        }
    ],
    'E': [
        {
            name: 'E (easy)',
            description: 'Simplified',
            frets: [4, 4, 4, 2],
            fingers: [2, 3, 4, 1],
            barre: null,
            baseFret: 1
        }
    ],
    'Em': [
        {
            name: 'Em (easy)',
            description: 'Open position',
            frets: [0, 4, 3, 2],
            fingers: [0, 3, 2, 1],
            barre: null,
            baseFret: 1
        },
        {
            name: 'Em (bar)',
            description: 'Barre at 7th fret',
            frets: [7, 7, 7, 7],
            fingers: [1, 1, 1, 1],
            barre: { fret: 7, fromString: 0, toString: 3 },
            baseFret: 1
        }
    ],
    'Dm': [
        {
            name: 'Dm (bar)',
            description: 'Barre at 5th fret',
            frets: [5, 5, 5, 5],
            fingers: [1, 1, 1, 1],
            barre: { fret: 5, fromString: 0, toString: 3 },
            baseFret: 1
        }
    ],
    'Bm': [
        {
            name: 'Bm7',
            description: 'Bm7 (2nd fret barre)',
            frets: [2, 2, 2, 2],
            fingers: [1, 1, 1, 1],
            barre: { fret: 2, fromString: 0, toString: 3 },
            baseFret: 1
        }
    ],
    'A#m': [
        {
            name: 'A#m (6th)',
            description: 'Higher position',
            frets: [6, 6, 6, 6],
            fingers: [1, 1, 1, 1],
            barre: { fret: 6, fromString: 0, toString: 3 },
            baseFret: 1
        }
    ],
    'F#': [
        {
            name: 'F# (easy)',
            description: 'Easier fingering',
            frets: [3, 1, 2, 1],
            fingers: [3, 1, 2, 1],
            barre: { fret: 1, fromString: 1, toString: 3 },
            baseFret: 1
        }
    ],
    'G#': [
        {
            name: 'G# (4th)',
            description: 'At 4th fret',
            frets: [1, 3, 4, 3],
            fingers: [1, 2, 4, 3],
            barre: null,
            baseFret: 1
        }
    ],
    'C7': [
        {
            name: 'C7 (bar)',
            description: 'Barre version',
            frets: [3, 3, 3, 3],
            fingers: [1, 1, 1, 1],
            barre: { fret: 3, fromString: 0, toString: 3 },
            baseFret: 1
        }
    ],
    'G7': [
        {
            name: 'G7 (alt)',
            description: 'Alternative',
            frets: [0, 2, 1, 2],
            fingers: [0, 2, 1, 3],
            barre: null,
            baseFret: 1
        }
    ],
    'Db/Eb': [
        {
            name: 'Db (simple)',
            description: 'Parent triad (no bass)',
            frets: [1, 1, 1, 4],
            fingers: [1, 1, 1, 4],
            barre: { fret: 1, fromString: 0, toString: 2 },
            baseFret: 1
        }
    ]
};

/**
 * Get all variations for a chord (including the default)
 * @param {string} chordName - The chord name
 * @returns {Array} - Array of chord data objects
 */
function getChordVariations(chordName) {
    const defaultChord = CHORDS[chordName];
    if (!defaultChord) return [];

    const variations = [{ ...defaultChord, description: 'Default' }];

    if (CHORD_VARIATIONS[chordName]) {
        variations.push(...CHORD_VARIATIONS[chordName]);
    }

    return variations;
}

// Expose to global scope for access from app.js
if (typeof window !== 'undefined') {
    window.getChordVariations = getChordVariations;
    window.CHORD_VARIATIONS = CHORD_VARIATIONS;
}

// Scale degree mappings for major keys
const SCALE_DEGREES_MAJOR = {
    'C':  ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
    'G':  ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
    'D':  ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
    'A':  ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
    'E':  ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'],
    'B':  ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#dim'],
    'F':  ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim'],
    'F#': ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#dim'],
    'Gb': ['Gb', 'Abm', 'Bbm', 'Cb', 'Db', 'Ebm', 'Fdim'],
    'Bb': ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim'],
    'Eb': ['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm', 'Ddim'],
    'Ab': ['Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'Fm', 'Gdim'],
    'C#': ['C#', 'D#m', 'E#m', 'F#', 'G#', 'A#m', 'B#dim'],
    'Db': ['Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Bbm', 'Cdim'],
    // Uncommon keys (enharmonic equivalents exist)
    'A#': ['A#', 'B#m', 'Cxm', 'D#', 'E#', 'Fxm', 'Gxdim'],
    'D#': ['D#', 'E#m', 'Fxm', 'G#', 'A#', 'B#m', 'Cxdim'],
    'G#': ['G#', 'A#m', 'B#m', 'C#', 'D#', 'E#m', 'Fxdim'],
    'Cb': ['Cb', 'Dbm', 'Ebm', 'Fb', 'Gb', 'Abm', 'Bbdim'],
    'Fb': ['Fb', 'Gbm', 'Abm', 'Bbb', 'Cb', 'Dbm', 'Ebdim']
};

// Scale degree mappings for minor keys (natural minor + common borrowed chords)
// Includes major IV (from Dorian) and major V (from harmonic minor) as these are extremely common
const SCALE_DEGREES_MINOR = {
    'Am':  ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G', 'D', 'E'],
    'Em':  ['Em', 'F#dim', 'G', 'Am', 'Bm', 'C', 'D', 'A', 'B'],
    'Bm':  ['Bm', 'C#dim', 'D', 'Em', 'F#m', 'G', 'A', 'E', 'F#'],
    'F#m': ['F#m', 'G#dim', 'A', 'Bm', 'C#m', 'D', 'E', 'B', 'C#'],
    'C#m': ['C#m', 'D#dim', 'E', 'F#m', 'G#m', 'A', 'B', 'F#', 'G#'],
    'G#m': ['G#m', 'A#dim', 'B', 'C#m', 'D#m', 'E', 'F#', 'C#', 'D#'],
    'Dm':  ['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C', 'G', 'A'],
    'Gm':  ['Gm', 'Adim', 'Bb', 'Cm', 'Dm', 'Eb', 'F', 'C', 'D'],
    'Cm':  ['Cm', 'Ddim', 'Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'F', 'G'],
    'Fm':  ['Fm', 'Gdim', 'Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'Bb', 'C'],
    'Bbm': ['Bbm', 'Cdim', 'Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Eb', 'F'],
    'Ebm': ['Ebm', 'Fdim', 'Gb', 'Abm', 'Bbm', 'Cb', 'Db', 'Ab', 'Bb'],
    // Uncommon keys (enharmonic equivalents exist)
    'A#m': ['A#m', 'B#dim', 'C#', 'D#m', 'E#m', 'F#', 'G#', 'D#', 'E#'],
    'D#m': ['D#m', 'E#dim', 'F#', 'G#m', 'A#m', 'B', 'C#', 'G#', 'A#'],
    'Abm': ['Abm', 'Bbdim', 'Cb', 'Dbm', 'Ebm', 'Fb', 'Gb', 'Db', 'Eb']
};

// Roman numeral representations for major keys
const ROMAN_NUMERALS_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

// Roman numeral representations for minor keys
// Indices 7 and 8 are for borrowed major IV and major V chords
const ROMAN_NUMERALS_MINOR = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII', 'IV', 'V'];

/**
 * Check if a key is minor
 * @param {string} key - The key (e.g., "Am", "C", "F#m")
 * @returns {boolean} - True if minor key
 */
function isMinorKey(key) {
    return key.endsWith('m') && !key.endsWith('dim');
}

/**
 * Get the scale degree (roman numeral) for a chord in a given key
 * @param {string} chord - The chord name
 * @param {string} key - The key of the song
 * @returns {string} - The roman numeral or the original chord if not found
 */
function getScaleDegree(chord, key) {
    const isMinor = isMinorKey(key);
    const scale = isMinor ? SCALE_DEGREES_MINOR[key] : SCALE_DEGREES_MAJOR[key];
    const romanNumerals = isMinor ? ROMAN_NUMERALS_MINOR : ROMAN_NUMERALS_MAJOR;

    if (!scale) return chord;

    // Normalize chord for comparison (handle 7ths, maj7, etc.)
    const baseChord = chord.replace(/7|maj7|m7|dim7|aug/, '');
    // NB: suffix is derived from the un-canonicalised baseChord, so that
    // canonicalising never disturbs the 7th detection below
    const suffix = chord.replace(baseChord, '');

    // Compare on canonical roots so a diatonic chord is recognised whatever
    // spelling it arrives in - Bb vs A# in F, Fm vs E#m in G#
    const canonicalBase = canonicalRoot(baseChord);

    const index = scale.findIndex(c => {
        const canonicalScaleChord = canonicalRoot(c);
        const scaleBase = canonicalScaleChord.replace(/dim/, '');
        return scaleBase === canonicalBase || canonicalScaleChord === canonicalBase;
    });

    if (index === -1) return '?';

    let roman = romanNumerals[index];

    // Add suffix for 7th chords
    if (suffix.includes('7')) {
        roman += '7';
    }

    return roman;
}

/**
 * Find chords that match the given fret positions
 * @param {Array} inputFrets - Array of 4 fret numbers [G, C, E, A], null for unspecified, 0 for open, -1 for muted
 * @returns {Array} - Array of matching chord names
 */
function findChordByFrets(inputFrets) {
    const matches = [];

    // Check if at least one string has a value
    const hasInput = inputFrets.some(f => f !== null);
    if (!hasInput) return matches;

    // For ukulele, unspecified strings default to open (0)
    // This makes the tool more intuitive - if you only press fret 3 on A string,
    // it assumes G, C, E are open (which is a C chord)
    const normalizedInput = inputFrets.map(f => f === null ? 0 : f);

    for (const [name, chord] of Object.entries(CHORDS)) {
        const baseFret = chord.baseFret || 1;

        // Calculate actual fret positions (accounting for baseFret)
        const chordFrets = chord.frets.map(f => {
            if (f <= 0) return f; // Open (0) or muted (-1) stays as is
            return f + baseFret - 1; // Add baseFret offset
        });

        // Compare normalized input with chord frets
        let isMatch = true;
        for (let i = 0; i < 4; i++) {
            if (normalizedInput[i] !== chordFrets[i]) {
                isMatch = false;
                break;
            }
        }

        if (isMatch) {
            matches.push(name);
        }
    }

    // Also check variations
    for (const [baseName, variations] of Object.entries(CHORD_VARIATIONS)) {
        for (const variation of variations) {
            const baseFret = variation.baseFret || 1;
            const chordFrets = variation.frets.map(f => {
                if (f <= 0) return f;
                return f + baseFret - 1;
            });

            let isMatch = true;
            for (let i = 0; i < 4; i++) {
                if (normalizedInput[i] !== chordFrets[i]) {
                    isMatch = false;
                    break;
                }
            }

            if (isMatch && !matches.includes(variation.name)) {
                matches.push(variation.name);
            }
        }
    }

    return matches;
}

/**
 * Compute chord name(s) from fret positions using music theory
 * Analyzes the actual notes being played and identifies the chord type
 * @param {Array} inputFrets - Array of 4 fret numbers [G, C, E, A]
 * @returns {Array} - Array of possible chord names (root position chords prioritized)
 */
function computeChordFromFrets(inputFrets) {
    // Ukulele open string notes (in semitones from C)
    // G4=7, C4=0, E4=4, A4=9
    const openStrings = [7, 0, 4, 9]; // G, C, E, A
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // Get the actual notes being played
    const playedNotes = [];
    const playedSemitones = [];

    for (let i = 0; i < 4; i++) {
        const fret = inputFrets[i];
        if (fret === null || fret === -1) continue; // Skip null/muted
        const semitone = (openStrings[i] + fret) % 12;
        if (!playedSemitones.includes(semitone)) {
            playedSemitones.push(semitone);
            playedNotes.push(noteNames[semitone]);
        }
    }

    if (playedNotes.length < 2) return []; // Need at least 2 notes

    // Get bass note (lowest string that's not muted)
    let bassSemitone = null;
    let bassNote = null;
    for (let i = 0; i < 4; i++) {
        const fret = inputFrets[i];
        if (fret !== null && fret !== -1) {
            bassSemitone = (openStrings[i] + fret) % 12;
            bassNote = noteNames[bassSemitone];
            break;
        }
    }

    // Sort semitones for interval analysis
    const sortedSemitones = [...playedSemitones].sort((a, b) => a - b);

    // Chord patterns (intervals from root) - ordered by priority (simpler first)
    const chordPatterns = [
        ['major', [0, 4, 7]],
        ['minor', [0, 3, 7]],
        ['7', [0, 4, 7, 10]],
        ['m7', [0, 3, 7, 10]],
        ['maj7', [0, 4, 7, 11]],
        ['6', [0, 4, 7, 9]],
        ['m6', [0, 3, 7, 9]],
        ['dim', [0, 3, 6]],
        ['aug', [0, 4, 8]],
        ['sus2', [0, 2, 7]],
        ['sus4', [0, 5, 7]],
        ['dim7', [0, 3, 6, 9]],
        ['m7b5', [0, 3, 6, 10]],
        ['add9', [0, 2, 4, 7]],
    ];

    const rootPositionChords = [];  // Chords where bass = root
    const inversionChords = [];     // Chords where bass ≠ root

    // Try each note as potential root
    for (const rootSemitone of playedSemitones) {
        const rootNote = noteNames[rootSemitone];
        const isRootPosition = rootSemitone === bassSemitone;

        // Calculate intervals from this root
        const intervals = playedSemitones.map(s => (s - rootSemitone + 12) % 12).sort((a, b) => a - b);

        // Check against chord patterns
        for (const [chordType, pattern] of chordPatterns) {
            // Check if all pattern intervals are present (and not too many extra notes)
            const hasAllIntervals = pattern.every(interval => intervals.includes(interval % 12));
            const extraNotes = intervals.filter(i => i !== 0 && !pattern.includes(i)).length;

            // Only match if we have all required intervals and at most 1 extra note
            if (hasAllIntervals && extraNotes <= 1) {
                let chordName;
                if (chordType === 'major') {
                    chordName = rootNote;
                } else if (chordType === 'minor') {
                    chordName = rootNote + 'm';
                } else {
                    chordName = rootNote + chordType;
                }

                // For ukulele, don't use slash notation - just show the chord name
                // The bass note is always part of a 4-note voicing, inversions are normal
                if (isRootPosition) {
                    if (!rootPositionChords.includes(chordName)) {
                        rootPositionChords.push(chordName);
                    }
                } else {
                    // Add as inversion (without slash) - will be shown after root position chords
                    if (!inversionChords.includes(chordName) && !rootPositionChords.includes(chordName)) {
                        inversionChords.push(chordName);
                    }
                }
            }
        }
    }

    // Filter out simpler chords when a more complete chord with the same root exists
    // e.g., if Am7 matches, don't also show Am
    const subsumes = {
        'm7': ['minor'],      // Am7 subsumes Am
        '7': ['major'],       // A7 subsumes A
        'maj7': ['major'],    // Amaj7 subsumes A
        '6': ['major'],       // A6 subsumes A
        'm6': ['minor'],      // Am6 subsumes Am
        'dim7': ['dim'],      // Adim7 subsumes Adim
        'm7b5': ['dim'],      // Am7b5 subsumes Adim
    };

    function filterSubsumedChords(chordList) {
        const result = [];
        for (const chord of chordList) {
            // Extract root and type from chord name
            let root, type;
            if (chord.endsWith('maj7')) {
                root = chord.slice(0, -4);
                type = 'maj7';
            } else if (chord.endsWith('m7b5')) {
                root = chord.slice(0, -4);
                type = 'm7b5';
            } else if (chord.endsWith('dim7')) {
                root = chord.slice(0, -4);
                type = 'dim7';
            } else if (chord.endsWith('m7')) {
                root = chord.slice(0, -2);
                type = 'm7';
            } else if (chord.endsWith('m6')) {
                root = chord.slice(0, -2);
                type = 'm6';
            } else if (chord.endsWith('m')) {
                root = chord.slice(0, -1);
                type = 'minor';
            } else if (chord.endsWith('7')) {
                root = chord.slice(0, -1);
                type = '7';
            } else if (chord.endsWith('6')) {
                root = chord.slice(0, -1);
                type = '6';
            } else if (chord.endsWith('dim')) {
                root = chord.slice(0, -3);
                type = 'dim';
            } else {
                root = chord;
                type = 'major';
            }

            // Check if this chord is subsumed by a more complete chord in the list
            let isSubsumed = false;
            for (const otherChord of chordList) {
                if (otherChord === chord) continue;

                // Check if otherChord subsumes this chord
                for (const [superType, subTypes] of Object.entries(subsumes)) {
                    if (subTypes.includes(type)) {
                        // This chord type can be subsumed - check if the super version exists
                        let expectedSuper;
                        if (superType === 'major') {
                            expectedSuper = root;
                        } else if (superType === 'minor') {
                            expectedSuper = root + 'm';
                        } else {
                            expectedSuper = root + superType;
                        }
                        if (otherChord === expectedSuper) {
                            isSubsumed = true;
                            break;
                        }
                    }
                }
                if (isSubsumed) break;
            }

            if (!isSubsumed) {
                result.push(chord);
            }
        }
        return result;
    }

    // Return root position chords first, then all inversions
    // On ukulele, inversions are very common due to the reentrant G string
    const allChords = [...rootPositionChords, ...inversionChords];
    const results = filterSubsumedChords(allChords);

    // If we have 2 notes and no chord matches, identify the interval
    if (playedNotes.length === 2 && results.length === 0) {
        const interval = Math.abs(sortedSemitones[1] - sortedSemitones[0]);
        const intervalNames = {
            1: 'minor 2nd',
            2: 'major 2nd',
            3: 'minor 3rd',
            4: 'major 3rd',
            5: 'perfect 4th',
            6: 'tritone',
            7: 'perfect 5th',
            8: 'minor 6th',
            9: 'major 6th',
            10: 'minor 7th',
            11: 'major 7th'
        };
        if (intervalNames[interval]) {
            results.push(`${bassNote} + ${intervalNames[interval]}`);
        }
    }

    return results;
}

// Expose to global scope
if (typeof window !== 'undefined') {
    window.findChordByFrets = findChordByFrets;
    window.computeChordFromFrets = computeChordFromFrets;
}

// CommonJS export for the node test scripts in tests/ (same pattern as voicings.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CHORDS, CHORD_VARIATIONS, SCALE_DEGREES_MAJOR, SCALE_DEGREES_MINOR,
        CHROMATIC_SCALE, CHROMATIC_SCALE_FLATS,
        transposeChord, transposeKey, respellChord, canonicalRoot, getScaleDegree, isMinorKey,
        getChordVariations, resolveChord, findChordByFrets, computeChordFromFrets,
    };
}
