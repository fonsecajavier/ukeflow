/**
 * UkeFlow - Music Analysis Module
 * Harmonic analysis, progression detection, and music theory functions
 */

/**
 * Get the relative major/minor key
 */
function getRelativeKey(key) {
    const isMinor = isMinorKey(key);
    const root = key.replace('m', '');

    if (isMinor) {
        // Relative major is 3 semitones up
        return transposeChord(root, 3);
    } else {
        // Relative minor is 3 semitones down
        return transposeChord(key, -3) + 'm';
    }
}

/**
 * Detect famous chord progressions in the song
 */
function detectFamousProgressions(key) {
    const found = [];
    const isMinor = isMinorKey(key);

    // Get all chord sequences in the song
    const sequences = [];
    state.currentSong.lines.forEach(line => {
        if (line.chords && line.chords.length >= 2) {
            const chords = line.chords
                .sort((a, b) => a.position - b.position)
                .map(c => getScaleDegree(transposeChord(c.chord, state.transpose), key));
            sequences.push(chords.join('-'));
        }
    });

    const allSequences = sequences.join(' ');

    // Famous progressions to detect
    const famousProgressions = [
        { pattern: 'I-V-vi-IV', name: 'I-V-vi-IV', description: 'The "Axis of Awesome" progression - used in countless pop hits!' },
        { pattern: 'I-IV-V-I', name: 'I-IV-V', description: 'The classic three-chord progression found in rock and blues.' },
        { pattern: 'ii-V-I', name: 'ii-V-I', description: 'The most common jazz progression.' },
        { pattern: 'I-vi-IV-V', name: 'I-vi-IV-V', description: 'The "50s progression" or "doo-wop" changes.' },
        { pattern: 'vi-IV-I-V', name: 'vi-IV-I-V', description: 'A rotation of the famous four-chord progression.' },
        { pattern: 'I-V-vi-iii-IV', name: 'Canon progression', description: 'Based on Pachelbel\'s Canon - a timeless chord sequence.' },
        { pattern: 'i-VII-VI-V', name: 'Andalusian cadence', description: 'A flamenco-inspired progression with Spanish flair (Am-G-F-E).' },
        { pattern: 'V-VI', name: 'Phrygian flavor', description: 'A V-VI movement common in Middle Eastern and Spanish music, creating exotic tension.' },
        { pattern: 'i-iv-v', name: 'Minor i-iv-v', description: 'The natural minor progression.' },
        { pattern: 'i-VI-III-VII', name: 'i-VI-III-VII', description: 'A popular minor key progression used in many rock songs.' },
    ];

    famousProgressions.forEach(prog => {
        if (allSequences.includes(prog.pattern)) {
            found.push(`Contains the <strong>${prog.name}</strong> progression: ${prog.description}`);
        }
    });

    return found;
}

/**
 * Detect borrowed chords (chords outside the diatonic key)
 */
function detectBorrowedChords(key, usedChords) {
    const isMinor = isMinorKey(key);
    const scale = isMinor ? SCALE_DEGREES_MINOR[key] : SCALE_DEGREES_MAJOR[key];

    if (!scale) return [];

    // Only check against the 7 diatonic chords (not the borrowed IV/V we added for minor keys)
    const diatonicScale = scale.slice(0, 7);

    const borrowed = [];
    usedChords.forEach(chord => {
        // Normalize chord for comparison
        const baseChord = chord.replace(/7|maj7|m7|dim7|aug/, '');

        // Check if it's in the diatonic scale
        const inScale = diatonicScale.some(scaleChord => {
            const scaleBase = scaleChord.replace(/dim/, '');
            return scaleBase === baseChord || scaleChord === baseChord;
        });

        if (!inScale) {
            borrowed.push(chord);
        }
    });

    return borrowed;
}

/**
 * Get all unique chords used in the current song (transposed)
 */
function getUsedChords() {
    const chords = new Set();
    state.currentSong.lines.forEach(line => {
        if (line.chords) {
            line.chords.forEach(c => {
                const transposedChord = transposeChord(c.chord, state.transpose);
                chords.add(transposedChord);
            });
        }
    });
    return Array.from(chords);
}

/**
 * Get the harmonic function of a chord based on its scale degree and chord quality
 */
function getHarmonicFunction(chord, degree, key, isMinor) {
    // Detect chord quality
    const is7th = chord.includes('7');
    const isMaj7 = chord.includes('maj7') || chord.includes('Maj7') || chord.includes('M7');
    const isMin7 = chord.includes('m7') && !chord.includes('maj7');
    const isDim = chord.includes('dim') || chord.includes('°');
    const isAug = chord.includes('aug') || chord.includes('+');
    const isSus = chord.includes('sus');
    const isAdd = chord.includes('add');

    // Normalize degree for comparison
    const normalizedDegree = degree.toUpperCase().replace(/[^IV°]/g, '');
    const isLowerCase = degree === degree.toLowerCase();

    // Check if it's the relative major/minor
    const relativeKey = getRelativeKey(key);
    const chordRoot = chord.replace(/m7?|maj7|7|dim|aug|sus[24]?|add\d+/g, '');
    const relativeRoot = relativeKey.replace('m', '');
    const isRelative = chordRoot === relativeRoot;

    // Build function description
    let funcName = '';
    let funcClass = 'function-borrowed';

    // Determine base function by degree
    if (isMinor) {
        // Minor key functions
        switch (normalizedDegree) {
            case 'I':
                funcName = 'Tonic';
                funcClass = 'function-tonic';
                break;
            case 'II':
                funcName = isDim ? 'Supertonic (dim)' : 'Supertonic';
                funcClass = 'function-subdominant';
                break;
            case 'III':
                funcName = 'Mediant (Relative Major)';
                funcClass = 'function-mediant';
                break;
            case 'IV':
                funcName = isLowerCase ? 'Subdominant' : 'Subdominant (Dorian)';
                funcClass = 'function-subdominant';
                break;
            case 'V':
                funcName = isLowerCase ? 'Dominant (natural)' : 'Dominant';
                funcClass = 'function-dominant';
                break;
            case 'VI':
                funcName = 'Submediant';
                funcClass = 'function-mediant';
                break;
            case 'VII':
                funcName = 'Subtonic';
                funcClass = 'function-mediant';
                break;
            default:
                funcName = 'Chromatic';
        }
    } else {
        // Major key functions
        switch (normalizedDegree) {
            case 'I':
                funcName = 'Tonic';
                funcClass = 'function-tonic';
                break;
            case 'II':
                funcName = 'Supertonic (Pre-dominant)';
                funcClass = 'function-subdominant';
                break;
            case 'III':
                funcName = 'Mediant';
                funcClass = 'function-mediant';
                break;
            case 'IV':
                funcName = 'Subdominant';
                funcClass = 'function-subdominant';
                break;
            case 'V':
                funcName = 'Dominant';
                funcClass = 'function-dominant';
                break;
            case 'VI':
                funcName = 'Submediant (Relative Minor)';
                funcClass = 'function-mediant';
                break;
            case 'VII':
                funcName = isDim ? 'Leading Tone (dim)' : 'Leading Tone';
                funcClass = 'function-dominant';
                break;
            default:
                funcName = 'Chromatic';
        }
    }

    // Add extensions/modifications
    const modifiers = [];

    if (isMaj7) {
        modifiers.push('maj7');
    } else if (isMin7) {
        modifiers.push('m7');
    } else if (is7th) {
        modifiers.push('dom7');
    }

    if (isDim) {
        modifiers.push('diminished');
    } else if (isAug) {
        modifiers.push('augmented');
    }

    if (isSus) {
        modifiers.push('suspended');
    }

    if (isAdd) {
        modifiers.push('added tone');
    }

    // Check for borrowed chords
    if (degree.includes('♭') || degree.includes('#')) {
        funcName = 'Borrowed';
        funcClass = 'function-borrowed';
        if (degree.includes('♭VII')) {
            funcName = 'Borrowed (Mixolydian)';
        } else if (degree.includes('♭III')) {
            funcName = 'Borrowed (Parallel Minor)';
        } else if (degree.includes('♭VI')) {
            funcName = 'Borrowed (Parallel Minor)';
        }
    }

    // Mark if it's the relative key chord
    if (isRelative && funcClass === 'function-mediant') {
        if (isMinor) {
            funcName = 'Mediant (Relative Major)';
        } else {
            funcName = 'Submediant (Relative Minor)';
        }
    }

    // Add modifier info if present
    if (modifiers.length > 0 && funcName !== 'Chromatic' && funcName !== 'Borrowed') {
        funcName += ` [${modifiers.join(', ')}]`;
    }

    // Handle unknown degrees - check for secondary dominants first
    if (degree === '?') {
        // Check for secondary dominants (V/x)
        const secondaryDom = detectSecondaryDominant(chord, key, isMinor);
        if (secondaryDom) {
            funcName = secondaryDom;
            funcClass = 'function-dominant';
        } else {
            funcName = 'Non-diatonic';
            funcClass = 'function-borrowed';
        }
    }

    return { name: funcName, class: funcClass };
}

/**
 * Detect if a chord is a secondary dominant (V/x)
 * @param {string} chord - The chord name
 * @param {string} key - The current key
 * @param {boolean} isMinor - Whether the key is minor
 * @returns {string|null} - Description like "V/vi" or null if not a secondary dominant
 */
function detectSecondaryDominant(chord, key, isMinor) {
    const chordRoot = chord.replace(/m7?|maj7|7|dim|aug|sus[24]?|add\d+|9/g, '');
    const isMinorChord = chord.includes('m') && !chord.includes('maj');

    // Secondary dominants are typically major or dominant 7th chords
    if (isMinorChord) return null;

    const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const flatScale = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

    // Get key root
    const keyRoot = key.replace('m', '');
    let keyIndex = chromaticScale.indexOf(keyRoot);
    if (keyIndex === -1) keyIndex = flatScale.indexOf(keyRoot);
    if (keyIndex === -1) return null;

    // Get chord root index
    let chordIndex = chromaticScale.indexOf(chordRoot);
    if (chordIndex === -1) chordIndex = flatScale.indexOf(chordRoot);
    if (chordIndex === -1) return null;

    // Calculate interval from key root to chord root
    const interval = (chordIndex - keyIndex + 12) % 12;

    if (isMinor) {
        // Minor key secondary dominants
        // V/III (dominant of relative major) - would be at interval 7 (a fifth above relative major root)
        // V/iv - at interval 5
        // V/v - at interval 7
        // V/VI - at interval 8
        // V/VII - at interval 10
        switch (interval) {
            case 2: return 'V/III (→ Relative Major)';
            case 5: return 'V/iv';
            case 7: return 'V/v';
            case 9: return 'V/VI';
            case 11: return 'V/VII';
        }
    } else {
        // Major key secondary dominants
        // V/ii - at interval 9 (A in key of C)
        // V/iii - at interval 11 (B in key of C)
        // V/IV - at interval 0 (C in key of C) - but this is the tonic
        // V/V - at interval 2 (D in key of C)
        // V/vi - at interval 4 (E in key of C)
        switch (interval) {
            case 2: return 'V/V (Secondary Dominant)';
            case 4: return 'V/vi (Secondary Dominant)';
            case 6: return 'V/vii° (Secondary Dominant)';
            case 9: return 'V/ii (Secondary Dominant)';
            case 11: return 'V/iii (Secondary Dominant)';
        }
    }

    return null;
}
