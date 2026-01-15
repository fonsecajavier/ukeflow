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
    highlightedIndex: -1  // For dropdown keyboard navigation
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
