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
 * Analyze key confidence - helps determine if the assigned key is correct
 * Returns indicators about what key the song appears to be in
 */
function analyzeKeyConfidence(key) {
    const transposedKey = transposeKey(key, state.transpose);
    const isMinor = isMinorKey(transposedKey);
    const relativeKey = getRelativeKey(transposedKey);

    const indicators = {
        firstChord: null,
        lastChord: null,
        mostFrequent: null,
        mostFrequentCount: 0,
        cadences: [],
        iiVI: [],           // ii-V-I progressions (strong key indicator)
        sectionEndings: [], // Where sections resolve to
        missingTonic: false,    // Key indicator: tonic chord not present!
        missingDominant: false, // Key indicator: no V chord present
        confidence: 'strong',
        alternativeKey: null,
        reasons: []
    };

    // All 12 major keys for scanning
    const allMajorKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const flatEquivalents = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

    // Get all chords in order, tracking section boundaries
    const allChords = [];
    const sectionEndChords = [];
    const sectionStartChords = [];
    let lastChordBeforeSection = null;
    let expectingSectionStart = true; // First chord is a section start

    state.currentSong.lines.forEach(line => {
        if (line.section) {
            // Track what chord ended the previous section
            if (lastChordBeforeSection) {
                sectionEndChords.push(lastChordBeforeSection);
            }
            expectingSectionStart = true;
        }
        if (line.chords && line.chords.length > 0) {
            const sortedChords = [...line.chords].sort((a, b) => a.position - b.position);
            sortedChords.forEach(c => {
                const transposed = transposeChord(c.chord, state.transpose);
                allChords.push(transposed);
                lastChordBeforeSection = transposed;

                // Track first chord after section marker
                if (expectingSectionStart) {
                    sectionStartChords.push(transposed);
                    expectingSectionStart = false;
                }
            });
        }
    });
    // Add the final chord as a section ending too
    if (lastChordBeforeSection) {
        sectionEndChords.push(lastChordBeforeSection);
    }

    if (allChords.length === 0) return indicators;

    // First and last chords
    indicators.firstChord = allChords[0];
    indicators.lastChord = allChords[allChords.length - 1];
    indicators.sectionEndings = sectionEndChords;
    indicators.sectionOpenings = sectionStartChords;

    // Detect "tension ending" pattern: sections end on X but start on Y
    // This suggests Y is the tonic (resolution) and X is tension
    const endingsResolveToDifferentChord = sectionEndChords.length > 0 &&
        sectionStartChords.length > 0 &&
        sectionEndChords.every(end => {
            const endBase = end.replace(/7|maj7|m7/, '');
            return sectionStartChords.some(start => {
                const startBase = start.replace(/7|maj7|m7/, '');
                return startBase !== endBase;
            });
        });

    // Most frequent chord
    const chordCounts = {};
    allChords.forEach(chord => {
        const base = chord.replace(/7|maj7|m7/, ''); // Normalize
        chordCounts[base] = (chordCounts[base] || 0) + 1;
    });

    let maxCount = 0;
    Object.entries(chordCounts).forEach(([chord, count]) => {
        if (count > maxCount) {
            maxCount = count;
            indicators.mostFrequent = chord;
            indicators.mostFrequentCount = count;
        }
    });

    // Key roots
    const keyRoot = transposedKey.replace('m', '');
    const relativeRoot = relativeKey.replace('m', '');

    // Get dominant chord for stated key
    const dominant = transposeChord(keyRoot, 7);

    // Check if tonic and dominant chords are present in the song
    const uniqueChords = [...new Set(allChords.map(c => c.replace(/7|maj7|m7/, '')))];

    // Check for tonic chord (e.g., "Em" for E minor, "E" for E major)
    const tonicChord = isMinor ? keyRoot + 'm' : keyRoot;
    const hasTonic = uniqueChords.includes(tonicChord) || uniqueChords.includes(keyRoot);

    if (!hasTonic) {
        indicators.missingTonic = true;
        indicators.missingTonicChord = tonicChord;
    }

    // Check for dominant chord
    const hasDominant = uniqueChords.includes(dominant);

    if (!hasDominant) {
        indicators.missingDominant = true;
        indicators.missingDominantChord = dominant;
    }

    // Scan for V→I cadences and ii-V-I progressions to ANY major key
    const cadencesTo = {};  // Count cadences to each key
    const iiViTo = {};      // Count ii-V-I progressions to each key

    for (let i = 0; i < allChords.length - 1; i++) {
        const current = allChords[i].replace(/7|maj7|m7/, '');
        const next = allChords[i + 1].replace(/7|maj7|m7/, '');

        // Check V→I to every major key
        for (const targetKey of allMajorKeys) {
            const targetDominant = transposeChord(targetKey, 7);
            if (current === targetDominant && next === targetKey) {
                cadencesTo[targetKey] = (cadencesTo[targetKey] || 0) + 1;
                indicators.cadences.push({ type: 'V→I', target: targetKey });
            }
        }

        // Check ii-V-I to every major key
        if (i < allChords.length - 2) {
            const nextNext = allChords[i + 2].replace(/7|maj7|m7/, '');

            for (const targetKey of allMajorKeys) {
                const targetDominant = transposeChord(targetKey, 7);  // V
                const targetSupertonic = transposeChord(targetKey, 2); // ii

                // ii (minor) → V → I - the ii must be minor!
                if (current === targetSupertonic + 'm' &&
                    next === targetDominant &&
                    nextNext === targetKey) {
                    iiViTo[targetKey] = (iiViTo[targetKey] || 0) + 1;
                    indicators.iiVI.push({ target: targetKey });
                }
            }
        }
    }

    // Score all candidate keys
    const keyScores = {};

    for (const candidateKey of allMajorKeys) {
        const candidateRoot = candidateKey;
        const candidateMinor = candidateKey + 'm';
        const candidateDominant = transposeChord(candidateKey, 7);

        let score = 0;
        const reasons = [];

        // First chord
        const firstBase = indicators.firstChord.replace(/7|maj7|m7/, '');
        if (firstBase === candidateRoot) {
            score += 1;
            reasons.push(`Opens on ${indicators.firstChord}`);
        }

        // Last chord (stronger weight)
        const lastBase = indicators.lastChord.replace(/7|maj7|m7/, '');
        if (lastBase === candidateRoot) {
            score += 2;
            reasons.push(`Ends on ${indicators.lastChord}`);
        }

        // Most frequent
        if (indicators.mostFrequent === candidateRoot) {
            score += 1;
            reasons.push(`${indicators.mostFrequent} most frequent`);
        }

        // V→I cadences (strong)
        if (cadencesTo[candidateKey]) {
            score += 2 * cadencesTo[candidateKey];
            reasons.push(`V→I cadence to ${candidateKey} (${cadencesTo[candidateKey]}×)`);
        }

        // ii-V-I progressions (very strong!)
        if (iiViTo[candidateKey]) {
            score += 3 * iiViTo[candidateKey];
            reasons.push(`ii-V-I to ${candidateKey} (${iiViTo[candidateKey]}×)`);
        }

        // Section openings (strong indicator - where sections "land")
        const sectionStartsOnCandidate = sectionStartChords.filter(c =>
            c.replace(/7|maj7|m7/, '') === candidateRoot).length;
        if (sectionStartsOnCandidate > 0) {
            score += 2 * sectionStartsOnCandidate;
            reasons.push(`Sections start on ${candidateRoot} (${sectionStartsOnCandidate}×)`);
        }

        // Section endings (weaker if endings ≠ openings, indicating tension)
        const sectionEndsOnCandidate = sectionEndChords.filter(c =>
            c.replace(/7|maj7|m7/, '') === candidateRoot).length;
        if (sectionEndsOnCandidate > 0) {
            // If sections end on this chord but start on a different chord,
            // this is likely tension, not resolution - give less weight
            if (endingsResolveToDifferentChord && sectionStartsOnCandidate === 0) {
                // This chord is used for tension, not resolution
                // Don't add points, and note it's a tension chord
            } else {
                score += sectionEndsOnCandidate;
                reasons.push(`Sections end on ${candidateRoot} (${sectionEndsOnCandidate}×)`);
            }
        }

        // Has dominant chord present
        if (uniqueChords.includes(candidateDominant)) {
            score += 1;
        }

        // Check how many song chords are diatonic to this candidate key
        // Diatonic chords in major: I, ii(m), iii(m), IV, V, vi(m), vii(dim)
        const diatonicChords = [
            candidateRoot,                              // I
            transposeChord(candidateRoot, 2) + 'm',     // ii
            transposeChord(candidateRoot, 4) + 'm',     // iii
            transposeChord(candidateRoot, 5),           // IV
            transposeChord(candidateRoot, 7),           // V
            transposeChord(candidateRoot, 9) + 'm',     // vi
            transposeChord(candidateRoot, 11) + 'dim'   // vii°
        ];
        // Also accept bVII as common borrowed chord
        const bVII = transposeChord(candidateRoot, 10);
        diatonicChords.push(bVII);

        // Count non-diatonic chords
        let nonDiatonicCount = 0;
        for (const chord of uniqueChords) {
            const chordBase = chord.replace(/7|maj7|m7|dim|aug/, '');
            const isDiatonic = diatonicChords.some(d => {
                const dBase = d.replace(/dim/, '');
                return chordBase === dBase || chordBase === d;
            });
            if (!isDiatonic) {
                nonDiatonicCount++;
            }
        }

        // Penalize keys with non-diatonic chords (-2 per non-diatonic chord)
        if (nonDiatonicCount > 0) {
            score -= 2 * nonDiatonicCount;
        }

        if (score > 0) {
            keyScores[candidateKey] = { score, reasons };
        }
    }

    // Also score minor keys (relative minors of the major keys)
    for (const majorKey of allMajorKeys) {
        const minorKey = transposeChord(majorKey, -3) + 'm';  // Relative minor
        const minorRoot = minorKey.replace('m', '');
        const minorChordName = minorRoot + 'm';

        let score = 0;
        const reasons = [];

        // First chord
        const firstBase = indicators.firstChord.replace(/7|maj7|m7/, '');
        if (firstBase === minorChordName || indicators.firstChord === minorKey) {
            score += 1;
            reasons.push(`Opens on ${indicators.firstChord}`);
        }

        // Last chord
        const lastBase = indicators.lastChord.replace(/7|maj7|m7/, '');
        if (lastBase === minorChordName || indicators.lastChord === minorKey) {
            score += 2;
            reasons.push(`Ends on ${indicators.lastChord}`);
        }

        // Section openings (strong indicator)
        const sectionStartsOnMinor = sectionStartChords.filter(c =>
            c.replace(/7|maj7|m7/, '') === minorChordName).length;
        if (sectionStartsOnMinor > 0) {
            score += 2 * sectionStartsOnMinor;
            reasons.push(`Sections start on ${minorChordName} (${sectionStartsOnMinor}×)`);
        }

        if (score > 0) {
            keyScores[minorKey] = { score, reasons };
        }
    }

    // Find the best scoring key
    // For minor keys, look up the full key (e.g., "Dm") not just the root (e.g., "D")
    const statedKeyLookup = isMinor ? transposedKey : keyRoot;
    let bestKey = transposedKey;
    let bestScore = keyScores[statedKeyLookup]?.score || 0;
    let bestReasons = keyScores[statedKeyLookup]?.reasons || [];

    // Penalize stated key if missing tonic or dominant
    // Missing tonic is a HUGE red flag (-5), missing dominant is significant (-2)
    if (indicators.missingTonic) {
        bestScore -= 5;
    }
    if (indicators.missingDominant) {
        bestScore -= 2;
    }

    for (const [candidateKey, data] of Object.entries(keyScores)) {
        // Skip if this is the stated key
        if (candidateKey === keyRoot || candidateKey === statedKeyLookup) continue;

        // Only consider keys whose tonic chord is actually in the song
        const candidateIsMinor = candidateKey.endsWith('m');
        const candidateTonic = candidateIsMinor ? candidateKey : candidateKey;
        const candidateTonicInSong = uniqueChords.includes(candidateTonic) ||
            uniqueChords.includes(candidateKey.replace('m', ''));

        // Also check if the candidate key's dominant is in the song
        // A key without its V chord is very unlikely to be correct
        const candidateRoot = candidateKey.replace('m', '');
        const candidateDominant = transposeChord(candidateRoot, 7);
        const candidateDominantInSong = uniqueChords.includes(candidateDominant);

        // Reject candidate if its dominant is missing (strong disqualifier)
        if (!candidateDominantInSong) {
            continue;
        }

        if (data.score > bestScore && candidateTonicInSong) {
            bestKey = candidateKey;
            bestScore = data.score;
            bestReasons = data.reasons;
        }
    }

    // Build reasons for stated key
    const statedKeyScore = keyScores[statedKeyLookup]?.score || 0;
    let penalty = 0;
    if (indicators.missingTonic) penalty += 5;
    if (indicators.missingDominant) penalty += 2;
    indicators.reasons = keyScores[statedKeyLookup]?.reasons || [];
    indicators.tonicScore = statedKeyScore - penalty;

    // Determine confidence
    const scoreDiff = bestScore - indicators.tonicScore;

    if (bestKey === keyRoot || bestKey === transposedKey) {
        indicators.confidence = 'strong';
    } else if (scoreDiff >= 3) {
        // Strong evidence for a different key
        indicators.confidence = 'likely different';
        indicators.alternativeKey = bestKey;
        indicators.alternativeReasons = bestReasons;
        indicators.alternativeScore = bestScore;
    } else if (scoreDiff >= 1) {
        // Some evidence for different key
        indicators.confidence = 'ambiguous';
        indicators.alternativeKey = bestKey;
        indicators.alternativeReasons = bestReasons;
        indicators.alternativeScore = bestScore;
    } else if (indicators.missingDominant) {
        indicators.confidence = 'weak';
    } else {
        indicators.confidence = 'strong';
    }

    return indicators;
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
