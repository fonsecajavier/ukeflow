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
        frets: [2, 2, 2, 2],
        fingers: [1, 1, 1, 1],
        barre: { fret: 2, fromString: 0, toString: 3 },
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
        frets: [1, 1, 0, 0],
        fingers: [1, 2, 0, 0],
        barre: null,
        baseFret: 1
    },
    'G#m': {
        name: 'G#m',
        frets: [4, 3, 4, 2],
        fingers: [3, 2, 4, 1],
        barre: null,
        baseFret: 1
    },
    'Bbm': {
        name: 'Bbm',
        frets: [1, 1, 1, 1],
        fingers: [1, 1, 1, 1],
        barre: { fret: 1, fromString: 0, toString: 3 },
        baseFret: 1
    },
    'Ebm': {
        name: 'Ebm',
        frets: [3, 3, 2, 1],
        fingers: [3, 4, 2, 1],
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
        frets: [2, 2, 2, 0],
        fingers: [1, 2, 3, 0],
        barre: null,
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
        frets: [1, 2, 1, 0],
        fingers: [1, 3, 2, 0],
        barre: null,
        baseFret: 1
    },
    'Edim': {
        name: 'Edim',
        frets: [0, 3, 2, 3],
        fingers: [0, 2, 1, 3],
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
    'Gsus4': {
        name: 'Gsus4',
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
    }
};

// Scale degree mappings for different keys
const SCALE_DEGREES = {
    'C':  ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
    'G':  ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
    'D':  ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
    'A':  ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
    'E':  ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'],
    'B':  ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#dim'],
    'F':  ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim'],
    'Bb': ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim'],
    'Eb': ['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm', 'Ddim'],
    'Ab': ['Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'Fm', 'Gdim']
};

// Roman numeral representations
const ROMAN_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

/**
 * Get the scale degree (roman numeral) for a chord in a given key
 * @param {string} chord - The chord name
 * @param {string} key - The key of the song
 * @returns {string} - The roman numeral or the original chord if not found
 */
function getScaleDegree(chord, key) {
    const scale = SCALE_DEGREES[key];
    if (!scale) return chord;

    // Normalize chord for comparison (handle 7ths, maj7, etc.)
    const baseChord = chord.replace(/7|maj7|m7|dim7|aug/, '');
    const suffix = chord.replace(baseChord, '');

    const index = scale.findIndex(c => {
        const scaleBase = c.replace(/dim/, '');
        return scaleBase === baseChord || c === baseChord;
    });

    if (index === -1) return chord;

    let roman = ROMAN_NUMERALS[index];

    // Add suffix for 7th chords
    if (suffix.includes('7')) {
        roman += '7';
    }

    return roman;
}
