/**
 * UkeFlow - State Module
 * Application state management
 */

// Application State
const state = {
    songIndex: [],      // Metadata only (title, artist, path)
    songCache: {},      // Cache for loaded song data (keyed by path)
    currentSong: null,
    showAsNumbers: false,
    transpose: 0,
    useRelativeKey: false,
    highlightedIndex: -1,  // For dropdown keyboard navigation
    tapToPlayMode: false,  // When true, tapping chords plays them instead of opening modal
    accidentalStyle: 'sharp'  // 'sharp' | 'flat' - how chord names are spelled on screen
};

/**
 * Convert song title to URL-friendly slug
 */
function slugify(text) {
    return text
        .normalize('NFD')                    // Decompose accents (é → e + ́)
        .replace(/[\u0300-\u036f]/g, '')     // Remove combining diacritical marks
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')            // Remove non-word chars except spaces/hyphens
        .replace(/\s+/g, '-')                // Replace spaces with hyphens
        .trim();
}

/**
 * Chord name as it should appear on screen.
 *
 * Display only - callers must keep the original name for CHORDS lookups,
 * getScaleDegree() and analysis. See respellChord() in chords.js.
 */
function displayChordName(chord) {
    return respellChord(chord, state.accidentalStyle);
}

/**
 * Pick the accidental style a song is already written in, so opening it shows
 * the chord names exactly as authored. Counts the accidentals actually used
 * rather than trusting the key, since a natural key (C) can still be full of
 * sharps once transposed. Ties and accidental-free songs fall back to 'sharp',
 * which is what transposeChord() produces by default.
 */
function detectAccidentalStyle(song) {
    if (!song || !song.lines) return 'sharp';

    let sharps = 0;
    let flats = 0;

    const tally = (name) => {
        const root = (name.match(/^([A-G][#b]?)/) || [])[1];
        if (!root) return;
        if (root.includes('#')) sharps++;
        else if (root.includes('b')) flats++;
    };

    tally(song.key || '');
    song.lines.forEach(line => {
        (line.chords || []).forEach(c => c.chord.split('/').forEach(tally));
    });

    return flats > sharps ? 'flat' : 'sharp';
}

/**
 * Get the current display key (considering relative key toggle)
 */
function getDisplayKey() {
    if (!state.currentSong) return null;
    const transposedKey = transposeKey(state.currentSong.key, state.transpose);
    if (state.useRelativeKey) {
        return getRelativeKey(transposedKey);
    }
    return transposedKey;
}
