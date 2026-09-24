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

// ---------------------------------------------------------------------------
// Tuning preference (high-G vs low-G), persisted in a cookie
// ---------------------------------------------------------------------------

const TUNING_COOKIE = 'ukeflow_tuning';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year

/**
 * Read a cookie value, or null. Never throws: a document without cookies (a
 * file:// page, or a browser with cookies blocked) must degrade to the default
 * rather than take the app down on load.
 */
function readCookie(name) {
    try {
        const match = document.cookie.match(
            new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
        );
        return match ? decodeURIComponent(match[1]) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Write a cookie scoped to the whole site, so a tuning chosen on index.html is
 * still in force on practice.html. SameSite=Lax because this is a same-site
 * preference with no reason to ride along on cross-site requests.
 */
function writeCookie(name, value, maxAge = COOKIE_MAX_AGE) {
    try {
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    } catch (e) {
        // A blocked cookie jar costs persistence, not function - the setting
        // still applies for this page view.
    }
}

/**
 * Apply the stored tuning, if any. Call this once at startup, AFTER every module
 * is loaded - setUkuleleTuning() also updates audio.js's frequency table, which
 * does not exist yet while state.js itself is being parsed.
 *
 * An unrecognised cookie value falls through to high-G: setUkuleleTuning()
 * ignores names it does not know, so a hand-edited or stale cookie cannot put
 * the app into an undefined tuning.
 *
 * @returns {string} the tuning key actually in effect
 */
function applyStoredTuning() {
    const stored = readCookie(TUNING_COOKIE);
    if (stored) setUkuleleTuning(stored);
    return getUkuleleTuning();
}

/**
 * Switch tuning and remember it.
 * @returns {string} the tuning key actually in effect
 */
function setAndStoreTuning(name) {
    const applied = setUkuleleTuning(name);
    writeCookie(TUNING_COOKIE, applied);
    return applied;
}
