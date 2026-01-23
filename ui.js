/**
 * UkeFlow - UI Module
 * DOM elements, rendering functions, and UI utilities
 */

// DOM Elements
const elements = {
    appTitle: document.getElementById('app-title'),
    songSelector: document.getElementById('song-selector'),
    songSelectorWrapper: document.querySelector('.song-selector-wrapper'),
    songSelectorClear: document.getElementById('song-selector-clear'),
    songDropdown: document.getElementById('song-dropdown'),
    songInfo: document.getElementById('song-info'),
    songTitle: document.getElementById('song-title'),
    songArtist: document.getElementById('song-artist'),
    songKey: document.getElementById('song-key'),
    transposeSelect: document.getElementById('transpose-select'),
    arpeggioSelect: document.getElementById('arpeggio-select'),
    tempoSelect: document.getElementById('tempo-select'),
    patternDisplay: document.getElementById('pattern-display'),
    toggleBtn: document.getElementById('toggle-progression'),
    toggleRelativeKey: document.getElementById('toggle-relative-key'),
    chordReference: document.getElementById('chord-reference'),
    scaleGrid: document.getElementById('scale-grid'),
    progressionContent: document.getElementById('progression-content'),
    triviaContent: document.getElementById('trivia-content'),
    harmonicContent: document.getElementById('harmonic-content'),
    circleContainer: document.getElementById('circle-container'),
    dom7CircleContainer: document.getElementById('dom7-circle-container'),
    chordLibraryContent: document.getElementById('chord-library-content'),
    spotifySection: document.getElementById('spotify-section'),
    spotifyEmbed: document.getElementById('spotify-embed'),
    chordGrid: document.getElementById('chord-grid'),
    lyricsSection: document.getElementById('lyrics-section'),
    lyricsContainer: document.getElementById('lyrics-container'),
    welcomeMessage: document.getElementById('welcome-message'),
    modalOverlay: document.getElementById('modal-overlay'),
    modalContent: document.getElementById('modal-content'),
    modalChord: document.getElementById('modal-chord'),
    modalClose: document.getElementById('modal-close'),
    // Chord Finder elements
    chordFinderContainer: document.getElementById('chord-finder-container'),
    fretboardWrapper: document.getElementById('fretboard-wrapper'),
    chordFinderFlip: document.getElementById('chord-finder-flip'),
    chordFinderClear: document.getElementById('chord-finder-clear'),
    chordFinderPlay: document.getElementById('chord-finder-play'),
    chordFinderResult: document.getElementById('chord-finder-result')
};

/**
 * Populate the play style selector with optgroups
 */
function populatePlayStyleSelector() {
    Object.entries(PLAY_STYLES).forEach(([groupKey, group]) => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = group.label;

        Object.entries(group.patterns).forEach(([key, config]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = config.name;
            if (key === currentPlayStyle) {
                option.selected = true;
            }
            optgroup.appendChild(option);
        });

        elements.arpeggioSelect.appendChild(optgroup);
    });
}

/**
 * Update the pattern display to show current pattern
 */
function updatePatternDisplay() {
    const styleConfig = getPlayStyle(currentPlayStyle);
    const pattern = styleConfig.pattern;
    let displayText = '';

    if (styleConfig.type === 'strum') {
        // Show strum pattern: D ↓ U ↑ x ✕
        displayText = pattern.map(s => {
            if (s.dir === 'D') return '↓';
            if (s.dir === 'U') return '↑';
            if (s.dir === 'x') return '✕';
            return s.dir;
        }).join(' ');
    } else {
        // Show arpeggio pattern with string names
        const stringNames = ['G', 'C', 'E', 'A'];
        displayText = pattern.map(step => {
            if (Array.isArray(step)) {
                return step.map(i => stringNames[i]).join('+');
            }
            return stringNames[step];
        }).join(' → ');
    }

    elements.patternDisplay.textContent = displayText;
}

/**
 * Highlight matching text in search results
 */
function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark>$1</mark>');
}

/**
 * Escape special regex characters
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Set highlighted item in dropdown
 */
function setHighlightedItem(index) {
    const items = elements.songDropdown.querySelectorAll('li');
    items.forEach((item, i) => {
        item.classList.toggle('highlighted', i === index);
    });
    state.highlightedIndex = index;

    // Scroll highlighted item into view
    if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest' });
    }
}

/**
 * Update clear button visibility based on input content
 */
function updateClearButtonVisibility() {
    if (elements.songSelector.value.trim()) {
        elements.songSelectorWrapper.classList.add('has-text');
    } else {
        elements.songSelectorWrapper.classList.remove('has-text');
    }
}

/**
 * Create a chord diagram element
 * @param {Object} chordData - Chord definition object
 * @param {boolean} large - Whether to render a large version
 * @param {string} displayName - Override name to display
 * @param {boolean} showPlayButton - Whether to show the play button
 * @param {boolean} showVariationIndicator - Whether to show indicator for variations
 */
function createChordDiagram(chordData, large = false, displayName = null, showPlayButton = true, showVariationIndicator = true) {
    const container = document.createElement('div');
    container.className = 'chord-diagram';

    const name = document.createElement('div');
    name.className = 'chord-name';
    const chordName = displayName || chordData.name;
    name.textContent = chordName;
    container.appendChild(name);

    // Add scale degree below chord name
    if (state.currentSong) {
        const transposedKey = getDisplayKey();
        const scaleDegree = getScaleDegree(chordName, transposedKey);
        const degreeDiv = document.createElement('div');
        degreeDiv.className = 'chord-degree';
        degreeDiv.textContent = scaleDegree;
        container.appendChild(degreeDiv);
    }

    const svg = createChordSVG(chordData, large);
    container.appendChild(svg);

    // Add variation indicator if this chord has alternatives
    if (showVariationIndicator) {
        const variations = getChordVariations(chordName);
        if (variations.length > 1) {
            const varIndicator = document.createElement('div');
            varIndicator.className = 'variation-indicator';
            varIndicator.title = `${variations.length} voicings available`;
            varIndicator.textContent = `+${variations.length - 1}`;
            container.appendChild(varIndicator);
        }
    }

    // Add play button
    if (showPlayButton) {
        const playBtn = document.createElement('button');
        playBtn.className = 'chord-play-btn';
        playBtn.innerHTML = '&#9654;'; // Play triangle symbol
        playBtn.title = 'Play chord';
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't trigger chord modal
            playChordArpeggio(chordData);
            // Visual feedback
            playBtn.classList.add('playing');
            setTimeout(() => playBtn.classList.remove('playing'), 400);
        });
        container.appendChild(playBtn);
    }

    return container;
}

/**
 * Create SVG chord diagram
 * @param {Object} chord - Chord definition
 * @param {boolean} large - Large size flag
 */
function createChordSVG(chord, large = false) {
    const numFrets = 5; // Show 5 frets to support all chord shapes
    const width = large ? 120 : 70;
    const height = large ? 160 : 100;
    const stringSpacing = large ? 24 : 14;
    const fretSpacing = large ? 24 : 14;
    const startX = large ? 24 : 14;
    const startY = large ? 24 : 14;
    const dotRadius = large ? 8 : 5;
    const fontSize = large ? 12 : 8;

    // Calculate the starting fret (for chords played higher up the neck)
    const frettedPositions = chord.frets.filter(f => f > 0);
    const minFret = frettedPositions.length > 0 ? Math.min(...frettedPositions) : 1;
    const startingFret = minFret > 5 ? minFret : 1;
    const isHighPosition = startingFret > 1;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Draw nut (thick line at top) - only show if at first position
    if (!isHighPosition) {
        const nut = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        nut.setAttribute('x', startX - 2);
        nut.setAttribute('y', startY - 4);
        nut.setAttribute('width', stringSpacing * 3 + 4);
        nut.setAttribute('height', large ? 5 : 3);
        nut.setAttribute('fill', '#e4e4e4');
        svg.appendChild(nut);
    } else {
        // Show fret position number for high position chords
        const fretLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        fretLabel.setAttribute('x', startX - (large ? 14 : 10));
        fretLabel.setAttribute('y', startY + fretSpacing * 0.5 + fontSize / 3);
        fretLabel.setAttribute('text-anchor', 'middle');
        fretLabel.setAttribute('font-size', large ? 14 : 10);
        fretLabel.setAttribute('fill', '#f39c12');
        fretLabel.setAttribute('font-weight', 'bold');
        fretLabel.textContent = startingFret + 'fr';
        svg.appendChild(fretLabel);
    }

    // Draw frets (horizontal lines)
    for (let i = 0; i <= numFrets; i++) {
        const fret = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        fret.setAttribute('x1', startX);
        fret.setAttribute('y1', startY + i * fretSpacing);
        fret.setAttribute('x2', startX + stringSpacing * 3);
        fret.setAttribute('y2', startY + i * fretSpacing);
        fret.setAttribute('stroke', '#666');
        fret.setAttribute('stroke-width', 1);
        svg.appendChild(fret);
    }

    // Draw strings (vertical lines) - G, C, E, A
    for (let i = 0; i < 4; i++) {
        const string = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        string.setAttribute('x1', startX + i * stringSpacing);
        string.setAttribute('y1', startY);
        string.setAttribute('x2', startX + i * stringSpacing);
        string.setAttribute('y2', startY + fretSpacing * numFrets);
        string.setAttribute('stroke', '#888');
        string.setAttribute('stroke-width', i === 0 ? 2 : 1);
        svg.appendChild(string);
    }

    // Draw barre if present (adjusted for starting fret)
    if (chord.barre) {
        const adjustedBarreFret = chord.barre.fret - startingFret + 1;
        const barreY = startY + (adjustedBarreFret - 0.5) * fretSpacing;
        const barreX1 = startX + chord.barre.fromString * stringSpacing;
        const barreX2 = startX + chord.barre.toString * stringSpacing;

        const barre = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        barre.setAttribute('x', barreX1 - dotRadius);
        barre.setAttribute('y', barreY - dotRadius);
        barre.setAttribute('width', barreX2 - barreX1 + dotRadius * 2);
        barre.setAttribute('height', dotRadius * 2);
        barre.setAttribute('rx', dotRadius);
        barre.setAttribute('fill', '#1a1a2e');
        barre.setAttribute('stroke', '#e4e4e4');
        barre.setAttribute('stroke-width', '0.75');
        svg.appendChild(barre);
    }

    // Draw finger positions (adjusted for starting fret)
    chord.frets.forEach((fret, stringIndex) => {
        const x = startX + stringIndex * stringSpacing;

        if (fret === 0) {
            // Open string - draw circle above nut (only if at first position)
            if (!isHighPosition) {
                const open = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                open.setAttribute('cx', x);
                open.setAttribute('cy', startY - (large ? 12 : 8));
                open.setAttribute('r', dotRadius - 2);
                open.setAttribute('fill', 'none');
                open.setAttribute('stroke', '#888');
                open.setAttribute('stroke-width', 1.5);
                svg.appendChild(open);
            }
        } else if (fret === -1) {
            // Muted string - draw X above nut
            const xSize = dotRadius - 1;
            const xY = startY - (large ? 12 : 8);
            const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line1.setAttribute('x1', x - xSize);
            line1.setAttribute('y1', xY - xSize);
            line1.setAttribute('x2', x + xSize);
            line1.setAttribute('y2', xY + xSize);
            line1.setAttribute('stroke', '#888');
            line1.setAttribute('stroke-width', 1.5);
            svg.appendChild(line1);

            const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line2.setAttribute('x1', x + xSize);
            line2.setAttribute('y1', xY - xSize);
            line2.setAttribute('x2', x - xSize);
            line2.setAttribute('y2', xY + xSize);
            line2.setAttribute('stroke', '#888');
            line2.setAttribute('stroke-width', 1.5);
            svg.appendChild(line2);
        } else if (fret > 0) {
            // Adjust fret position relative to starting fret
            const adjustedFret = fret - startingFret + 1;

            // Skip if this position is covered by a barre
            const isBarre = chord.barre &&
                fret === chord.barre.fret &&
                stringIndex >= chord.barre.fromString &&
                stringIndex <= chord.barre.toString;

            if (!isBarre) {
                // Fretted note - draw filled circle with finger number
                const y = startY + (adjustedFret - 0.5) * fretSpacing;

                const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                dot.setAttribute('cx', x);
                dot.setAttribute('cy', y);
                dot.setAttribute('r', dotRadius);
                dot.setAttribute('fill', '#1a1a2e');
                dot.setAttribute('stroke', '#e4e4e4');
                dot.setAttribute('stroke-width', '0.75');
                svg.appendChild(dot);

                // Add finger number
                if (chord.fingers[stringIndex] > 0) {
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('x', x);
                    text.setAttribute('y', y + fontSize / 3);
                    text.setAttribute('text-anchor', 'middle');
                    text.setAttribute('font-size', fontSize);
                    text.setAttribute('fill', '#fff');
                    text.setAttribute('font-weight', 'bold');
                    text.textContent = chord.fingers[stringIndex];
                    svg.appendChild(text);
                }
            }
        }
    });

    // Add barre finger number (adjusted for starting fret)
    if (chord.barre) {
        const adjustedBarreFret = chord.barre.fret - startingFret + 1;
        const barreY = startY + (adjustedBarreFret - 0.5) * fretSpacing;
        const barreX = startX + chord.barre.fromString * stringSpacing;

        const fingerIndex = chord.frets.findIndex((f, i) =>
            f === chord.barre.fret && i >= chord.barre.fromString && i <= chord.barre.toString
        );

        if (fingerIndex >= 0 && chord.fingers[fingerIndex] > 0) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', barreX);
            text.setAttribute('y', barreY + fontSize / 3);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', fontSize);
            text.setAttribute('fill', '#fff');
            text.setAttribute('font-weight', 'bold');
            text.textContent = chord.fingers[fingerIndex];
            svg.appendChild(text);
        }
    }

    // String labels
    const strings = ['G', 'C', 'E', 'A'];
    strings.forEach((s, i) => {
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', startX + i * stringSpacing);
        label.setAttribute('y', height - 2);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', fontSize);
        label.setAttribute('fill', '#666');
        label.textContent = s;
        svg.appendChild(label);
    });

    return svg;
}

/**
 * Create Circle of Fifths SVG
 * @param {string} currentKey - The current song's key to highlight
 * @param {function} onKeyClick - Callback when a key is clicked
 */
function createCircleOfFifthsSVG(currentKey, onKeyClick, suggestedTonic = null) {
    const size = 480;
    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = 220;
    const innerRadius = 150;
    const textRadiusMajor = 185;
    const textRadiusMinor = 115;

    // Circle of fifths order (clockwise from top)
    // Using F# instead of Gb (and D#m instead of Ebm) for ukulele-friendly notation
    const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
    const minorKeys = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

    // Draw background circles
    const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outerCircle.setAttribute('cx', centerX);
    outerCircle.setAttribute('cy', centerY);
    outerCircle.setAttribute('r', outerRadius);
    outerCircle.setAttribute('fill', 'none');
    outerCircle.setAttribute('stroke', 'rgba(255, 255, 255, 0.1)');
    outerCircle.setAttribute('stroke-width', '1');
    svg.appendChild(outerCircle);

    const middleCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    middleCircle.setAttribute('cx', centerX);
    middleCircle.setAttribute('cy', centerY);
    middleCircle.setAttribute('r', innerRadius);
    middleCircle.setAttribute('fill', 'none');
    middleCircle.setAttribute('stroke', 'rgba(255, 255, 255, 0.1)');
    middleCircle.setAttribute('stroke-width', '1');
    svg.appendChild(middleCircle);

    const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    innerCircle.setAttribute('cx', centerX);
    innerCircle.setAttribute('cy', centerY);
    innerCircle.setAttribute('r', 70);
    innerCircle.setAttribute('fill', 'rgba(255, 255, 255, 0.02)');
    innerCircle.setAttribute('stroke', 'rgba(255, 255, 255, 0.1)');
    innerCircle.setAttribute('stroke-width', '1');
    svg.appendChild(innerCircle);

    // Normalize key for comparison (handle enharmonics)
    // Normalize to ukulele-friendly notation (sharps preferred at 6 o'clock)
    const normalizeKey = (key) => {
        const enharmonics = {
            'F#': 'F#', 'Gb': 'F#',
            'C#': 'Db', 'Db': 'Db',
            'G#': 'Ab', 'Ab': 'Ab',
            'D#': 'Eb', 'Eb': 'Eb',
            'A#': 'Bb', 'Bb': 'Bb',
            'F#m': 'F#m', 'Gbm': 'F#m',
            'C#m': 'C#m', 'Dbm': 'C#m',
            'G#m': 'G#m', 'Abm': 'G#m',
            'D#m': 'D#m', 'Ebm': 'D#m',
            'A#m': 'Bbm', 'Bbm': 'Bbm'
        };
        return enharmonics[key] || key;
    };

    const normalizedCurrentKey = normalizeKey(currentKey);
    const isCurrentKeyMinor = isMinorKey(currentKey);
    const normalizedSuggestedTonic = suggestedTonic ? normalizeKey(suggestedTonic) : null;
    const isSuggestedMinor = suggestedTonic ? isMinorKey(suggestedTonic) : false;

    // Draw key segments
    for (let i = 0; i < 12; i++) {
        const angle = (i * 30 - 90) * (Math.PI / 180); // Start at top (C)
        const majorKey = majorKeys[i];
        const minorKey = minorKeys[i];

        // Create group for each key pair
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'circle-key-group');

        // Check if this is the active (displayed) key
        const isMajorActive = !isCurrentKeyMinor && normalizeKey(majorKey) === normalizedCurrentKey;
        const isMinorActive = isCurrentKeyMinor && normalizeKey(minorKey) === normalizedCurrentKey;

        // Check if this is the suggested key
        const isMajorSuggested = normalizedSuggestedTonic && !isSuggestedMinor && normalizeKey(majorKey) === normalizedSuggestedTonic;
        const isMinorSuggested = normalizedSuggestedTonic && isSuggestedMinor && normalizeKey(minorKey) === normalizedSuggestedTonic;

        if (isMajorSuggested || isMinorSuggested) {
            group.classList.add('suggested');
        }
        if (isMajorActive) {
            group.classList.add(suggestedTonic ? 'active-dim' : 'active');
        } else if (isMinorActive) {
            group.classList.add(suggestedTonic ? 'active-minor-dim' : 'active-minor');
        }

        // Draw segment background (pie slice)
        const startAngle = (i * 30 - 105) * (Math.PI / 180);
        const endAngle = (i * 30 - 75) * (Math.PI / 180);

        const x1Outer = centerX + outerRadius * Math.cos(startAngle);
        const y1Outer = centerY + outerRadius * Math.sin(startAngle);
        const x2Outer = centerX + outerRadius * Math.cos(endAngle);
        const y2Outer = centerY + outerRadius * Math.sin(endAngle);
        const x1Inner = centerX + 70 * Math.cos(startAngle);
        const y1Inner = centerY + 70 * Math.sin(startAngle);
        const x2Inner = centerX + 70 * Math.cos(endAngle);
        const y2Inner = centerY + 70 * Math.sin(endAngle);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${x1Inner} ${y1Inner}
                   L ${x1Outer} ${y1Outer}
                   A ${outerRadius} ${outerRadius} 0 0 1 ${x2Outer} ${y2Outer}
                   L ${x2Inner} ${y2Inner}
                   A 70 70 0 0 0 ${x1Inner} ${y1Inner} Z`;
        path.setAttribute('d', d);
        path.setAttribute('class', 'circle-key-bg');
        group.appendChild(path);

        // Major key text (outer ring)
        const majorX = centerX + textRadiusMajor * Math.cos(angle);
        const majorY = centerY + textRadiusMajor * Math.sin(angle);

        // Display text (show both enharmonics at 6 o'clock position)
        const isEnharmonicPosition = majorKey === 'F#';
        const majorDisplay = isEnharmonicPosition ? 'F#/Gb' : majorKey;
        const minorDisplay = isEnharmonicPosition ? 'D#m/Ebm' : minorKey;

        const majorText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        majorText.setAttribute('x', majorX);
        majorText.setAttribute('y', majorY + 5);
        majorText.setAttribute('text-anchor', 'middle');
        majorText.setAttribute('class', 'circle-key-major');
        majorText.textContent = majorDisplay;
        group.appendChild(majorText);

        // Minor key text (inner ring)
        const minorX = centerX + textRadiusMinor * Math.cos(angle);
        const minorY = centerY + textRadiusMinor * Math.sin(angle);

        const minorText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        minorText.setAttribute('x', minorX);
        minorText.setAttribute('text-anchor', 'middle');
        minorText.setAttribute('class', 'circle-key-minor');

        // Show D#m/Ebm on two lines to fit
        if (isEnharmonicPosition) {
            minorText.setAttribute('y', minorY - 4);
            const tspan1 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan1.setAttribute('x', minorX);
            tspan1.textContent = 'D#m';
            minorText.appendChild(tspan1);

            const tspan2 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan2.setAttribute('x', minorX);
            tspan2.setAttribute('dy', '22');
            tspan2.textContent = 'Ebm';
            minorText.appendChild(tspan2);
        } else {
            minorText.setAttribute('y', minorY + 4);
            minorText.textContent = minorDisplay;
        }
        group.appendChild(minorText);

        // Click handler
        group.addEventListener('click', () => {
            onKeyClick(majorKey, minorKey);
        });

        svg.appendChild(group);
    }

    // Center label
    const centerLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    centerLabel.setAttribute('x', centerX);
    centerLabel.setAttribute('y', centerY + 4);
    centerLabel.setAttribute('text-anchor', 'middle');
    centerLabel.setAttribute('font-size', '10');
    centerLabel.setAttribute('fill', '#666');
    centerLabel.textContent = '5ths';
    svg.appendChild(centerLabel);

    // Add note for suggested tonic
    if (suggestedTonic) {
        const suggestedNote = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        suggestedNote.setAttribute('x', centerX);
        suggestedNote.setAttribute('y', size - 5);
        suggestedNote.setAttribute('text-anchor', 'middle');
        suggestedNote.setAttribute('font-size', '11');
        suggestedNote.setAttribute('fill', '#2ecc71');
        suggestedNote.textContent = `💡 Analysis suggests: ${suggestedTonic}`;
        svg.appendChild(suggestedNote);
    }

    return svg;
}

/**
 * Create Songwriter's Circle SVG
 * Shows diatonic chords with secondary dominants - the "chord wheel"
 * Arc layout: IV - I - V(7) with relative minors and secondary dominants
 * @param {string} currentKey - The current song's key to highlight
 * @param {function} onChordClick - Callback when a chord is clicked
 */
function createDominant7thCircleSVG(currentKey, onChordClick, suggestedTonic = null) {
    const width = 420;
    const height = 280;
    const centerX = width / 2;
    const centerY = height - 40;

    // Radii for the different rings
    const outerRadius = 180;      // Secondary dominants (II7, VI7, III7)
    const middleRadius = 130;     // Major chords (IV, I, V/V7)
    const innerRadius = 85;       // Relative minors (ii, vi, iii)

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Get diatonic chords for the current key
    // For minor keys, show the relative major
    const isMinor = currentKey.endsWith('m') && !currentKey.endsWith('dim');
    let displayKey;
    if (isMinor) {
        // Get relative major (3 semitones up from minor root)
        const minorRoot = currentKey.replace('m', '');
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const altNotes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        let idx = notes.indexOf(minorRoot);
        if (idx === -1) idx = altNotes.indexOf(minorRoot);
        const relativeMajorIdx = (idx + 3) % 12;
        displayKey = notes[relativeMajorIdx];
    } else {
        displayKey = currentKey.replace('m', '');
    }
    const scale = SCALE_DEGREES_MAJOR[displayKey] || SCALE_DEGREES_MAJOR['C'];

    // Chord positions in the arc (from left to right)
    // Structure: [degree, roman numeral, ring (0=inner, 1=middle, 2=outer), angle offset from center]
    // Note: SCALE_DEGREES_MAJOR already contains minor chords with 'm' suffix (e.g., 'Dm', 'Em', 'Am')
    // For V/V7, we use a special 'dual' flag to show both options
    const chordPositions = [
        // Left side - subdominant family
        { chord: scale[3], roman: 'IV', ring: 1, angle: -62 },           // IV (F in C)
        { chord: scale[1], roman: 'ii', ring: 0, angle: -62 },           // ii (Dm in C) - below IV

        // Center - tonic family
        { chord: scale[0], roman: 'I', ring: 1, angle: -31 },            // I (C in C)
        { chord: scale[5], roman: 'vi', ring: 0, angle: -31 },           // vi (Am in C) - below I

        // Right side - dominant family (V/V7 combined in one cell)
        { chord: scale[4], chord7: scale[4] + '7', roman: 'V / V7', ring: 1, angle: 5, dual: true },  // V/V7 (G/G7 in C)
        { chord: scale[2], roman: 'iii', ring: 0, angle: 5, wide: true },  // iii (Em in C) - below V, wide to match V/V7
    ];

    // Secondary dominants extending outward (these lead back around the circle)
    // II(7) starts where V/V7 ends (angle 5 + half of 38 = 24, plus half of segment width 20/2 = 10, so 34)
    const secondaryDominants = [
        { chord: getSecondaryDominant(scale[4]), roman: 'II(7)', ring: 2, angle: 34, target: scale[4] },   // II7 → V
        { chord: getSecondaryDominant(scale[1]), roman: 'VI(7)', ring: 2, angle: 56, target: scale[1] },   // VI7 → ii
        { chord: getSecondaryDominant(scale[2]), roman: 'III(7)', ring: 2, angle: 78, target: scale[2] },  // III7 → iii
    ];

    // Helper to get secondary dominant
    function getSecondaryDominant(targetChord) {
        // Find the V7 of the target chord
        const target = targetChord.replace('m', '');
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const altNotes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        let idx = notes.indexOf(target);
        if (idx === -1) idx = altNotes.indexOf(target);
        if (idx === -1) return target + '7';
        // V is 7 semitones up
        const dominantIdx = (idx + 7) % 12;
        return notes[dominantIdx] + '7';
    }

    // Draw arc backgrounds
    const drawArcSegment = (startAngle, endAngle, innerR, outerR, className) => {
        const startRad = (startAngle - 90) * Math.PI / 180;
        const endRad = (endAngle - 90) * Math.PI / 180;

        const x1Inner = centerX + innerR * Math.cos(startRad);
        const y1Inner = centerY + innerR * Math.sin(startRad);
        const x2Inner = centerX + innerR * Math.cos(endRad);
        const y2Inner = centerY + innerR * Math.sin(endRad);
        const x1Outer = centerX + outerR * Math.cos(startRad);
        const y1Outer = centerY + outerR * Math.sin(startRad);
        const x2Outer = centerX + outerR * Math.cos(endRad);
        const y2Outer = centerY + outerR * Math.sin(endRad);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
        const d = `M ${x1Inner} ${y1Inner}
                   L ${x1Outer} ${y1Outer}
                   A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}
                   L ${x2Inner} ${y2Inner}
                   A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1Inner} ${y1Inner} Z`;
        path.setAttribute('d', d);
        path.setAttribute('class', className);
        return path;
    };

    // Draw main arc segments for each chord
    chordPositions.forEach((pos, idx) => {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'dom7-segment');

        // Determine radii based on ring
        let innerR, outerR;
        if (pos.ring === 0) {
            innerR = 50;
            outerR = innerRadius;
        } else {
            innerR = innerRadius;
            outerR = middleRadius;
        }

        // Calculate segment angles - wider for dual chords or wide flag
        const segmentWidth = (pos.dual || pos.wide) ? 38 : 28;
        const startAngle = pos.angle - segmentWidth/2;
        const endAngle = pos.angle + segmentWidth/2;

        const bg = drawArcSegment(startAngle, endAngle, innerR, outerR, 'dom7-bg');
        group.appendChild(bg);

        // Add chord text
        const textAngle = (pos.angle - 90) * Math.PI / 180;
        const textRadius = (innerR + outerR) / 2;
        const textX = centerX + textRadius * Math.cos(textAngle);
        const textY = centerY + textRadius * Math.sin(textAngle);

        const chordText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        chordText.setAttribute('x', textX);
        chordText.setAttribute('y', textY + 4);
        chordText.setAttribute('text-anchor', 'middle');
        chordText.setAttribute('class', pos.ring === 0 ? 'dom7-target' : 'dom7-chord');
        chordText.setAttribute('fill', pos.ring === 0 ? '#3498db' : '#f39c12');
        // Show "V / V7" style for dual chords
        chordText.textContent = pos.dual ? `${pos.chord} / ${pos.chord7}` : pos.chord;

        // Highlight current key and suggested tonic with different styles
        const chordBase = pos.chord.replace(/7|m7|maj7/, '');
        const currentKeyBase = currentKey.replace(/7|m7|maj7/, '');
        const isSuggestedTonic = suggestedTonic && chordBase === suggestedTonic.replace(/m$/, '');
        // Match the actual current key (e.g., Em matches Em, not just I position)
        const isCurrentKey = chordBase === currentKeyBase;

        if (isSuggestedTonic && !isCurrentKey) {
            // Suggested tonic (different from current) - green highlight
            bg.setAttribute('class', 'dom7-bg dom7-suggested-bg');
        } else if (isCurrentKey) {
            // Current key's chord - dotted border (dimmer if there's a different suggestion)
            bg.setAttribute('class', suggestedTonic ? 'dom7-bg dom7-tonic-dim-bg' : 'dom7-bg dom7-tonic-bg');
        }
        group.appendChild(chordText);

        // Click handler - for dual chords, pass both
        group.addEventListener('click', () => {
            if (pos.dual) {
                onChordClick(pos.chord, pos.chord7, pos.roman);
            } else {
                onChordClick(pos.chord, null, pos.roman);
            }
        });

        svg.appendChild(group);
    });

    // Draw secondary dominants extending outward
    secondaryDominants.forEach(pos => {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'dom7-segment');

        const segmentWidth = 20;
        const startAngle = pos.angle - segmentWidth/2;
        const endAngle = pos.angle + segmentWidth/2;

        const bg = drawArcSegment(startAngle, endAngle, middleRadius, outerRadius, 'dom7-bg');
        group.appendChild(bg);

        // Add chord text
        const textAngle = (pos.angle - 90) * Math.PI / 180;
        const textRadius = (middleRadius + outerRadius) / 2;
        const textX = centerX + textRadius * Math.cos(textAngle);
        const textY = centerY + textRadius * Math.sin(textAngle);

        const chordText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        chordText.setAttribute('x', textX);
        chordText.setAttribute('y', textY + 4);
        chordText.setAttribute('text-anchor', 'middle');
        chordText.setAttribute('class', 'dom7-chord');
        chordText.setAttribute('fill', '#e74c3c');
        chordText.textContent = pos.chord;
        group.appendChild(chordText);

        // Click handler
        group.addEventListener('click', () => {
            onChordClick(pos.chord, pos.roman);
        });

        svg.appendChild(group);
    });

    // Add roman numeral labels outside the arc
    const labelPositions = [
        { text: 'IV', angle: -62, radius: middleRadius + 20 },
        { text: 'I', angle: -31, radius: middleRadius + 20 },
        { text: 'V / V7', angle: 5, radius: middleRadius + 20 },
        { text: 'ii', angle: -62, radius: 40 },
        { text: 'vi', angle: -31, radius: 40 },
        { text: 'iii', angle: 5, radius: 40 },
        { text: 'II(7)', angle: 34, radius: outerRadius + 18 },
        { text: 'VI(7)', angle: 56, radius: outerRadius + 18 },
        { text: 'III(7)', angle: 78, radius: outerRadius + 18 },
    ];

    labelPositions.forEach(pos => {
        const textAngle = (pos.angle - 90) * Math.PI / 180;
        const textX = centerX + pos.radius * Math.cos(textAngle);
        const textY = centerY + pos.radius * Math.sin(textAngle);

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', textX);
        label.setAttribute('y', textY + 4);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '11');
        label.setAttribute('fill', '#888');
        label.textContent = pos.text;
        svg.appendChild(label);
    });

    // Add notes at the bottom
    let noteY = height - 5;

    // Note for suggested tonic (if different from displayed)
    if (suggestedTonic) {
        const suggestedNote = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        suggestedNote.setAttribute('x', centerX);
        suggestedNote.setAttribute('y', noteY);
        suggestedNote.setAttribute('text-anchor', 'middle');
        suggestedNote.setAttribute('font-size', '11');
        suggestedNote.setAttribute('fill', '#2ecc71');
        suggestedNote.textContent = `💡 Analysis suggests: ${suggestedTonic}`;
        svg.appendChild(suggestedNote);
        noteY -= 16;
    }

    // Note for minor keys showing relative major
    if (isMinor) {
        const note = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        note.setAttribute('x', centerX);
        note.setAttribute('y', noteY);
        note.setAttribute('text-anchor', 'middle');
        note.setAttribute('font-size', '11');
        note.setAttribute('fill', '#666');
        note.textContent = `Showing relative major: ${displayKey}`;
        svg.appendChild(note);
    }

    return svg;
}

/**
 * Create interactive fretboard SVG for Chord Finder
 * @param {Array} fretState - Array of 4 values [G, C, E, A], each can be: null, 0 (open), -1 (muted), or 1-12 (fret)
 * @param {Object} callbacks - Object with onFretClick(string, fret) and onOpenClick(string)
 * @returns {SVGElement} - The SVG fretboard
 */
function createFretboardSVG(fretState, callbacks, flipped = true) {
    const numFrets = 12;
    const numStrings = 4;

    // Dimensions
    const width = 480;
    const height = 180;
    const leftPadding = 35;  // Space for string labels
    const topPadding = 30;   // Space for open/muted markers
    const rightPadding = 20;
    const bottomPadding = 25; // Space for fret numbers

    const fretboardWidth = width - leftPadding - rightPadding;
    const fretboardHeight = height - topPadding - bottomPadding;
    const fretSpacing = fretboardWidth / numFrets;
    const stringSpacing = fretboardHeight / (numStrings - 1);

    // String order for display: default flipped shows A-E-C-G (high to low)
    // Internal index always [0,1,2,3] = [G,C,E,A]
    // displayOrder maps visual position (top to bottom) to internal index
    const displayOrder = flipped ? [3, 2, 1, 0] : [0, 1, 2, 3];
    const stringLabelsBase = ['G', 'C', 'E', 'A'];

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', 0);
    bg.setAttribute('y', 0);
    bg.setAttribute('width', width);
    bg.setAttribute('height', height);
    bg.setAttribute('fill', '#1a1a2e');
    svg.appendChild(bg);

    // Draw nut (thick line before fret 1)
    const nut = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    nut.setAttribute('x1', leftPadding);
    nut.setAttribute('y1', topPadding - 5);
    nut.setAttribute('x2', leftPadding);
    nut.setAttribute('y2', topPadding + fretboardHeight + 5);
    nut.setAttribute('class', 'fretboard-nut');
    svg.appendChild(nut);

    // Draw frets (vertical lines)
    for (let f = 1; f <= numFrets; f++) {
        const x = leftPadding + f * fretSpacing;
        const fret = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        fret.setAttribute('x1', x);
        fret.setAttribute('y1', topPadding);
        fret.setAttribute('x2', x);
        fret.setAttribute('y2', topPadding + fretboardHeight);
        fret.setAttribute('class', 'fretboard-fret');
        svg.appendChild(fret);
    }

    // Draw strings (horizontal lines) - order determined by flipped setting
    for (let visualPos = 0; visualPos < numStrings; visualPos++) {
        const y = topPadding + visualPos * stringSpacing;
        const stringIndex = displayOrder[visualPos]; // Map visual position to internal index

        const string = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        string.setAttribute('x1', leftPadding);
        string.setAttribute('y1', y);
        string.setAttribute('x2', leftPadding + fretboardWidth);
        string.setAttribute('y2', y);
        string.setAttribute('class', visualPos === 0 ? 'fretboard-string fretboard-string-first' : 'fretboard-string');
        svg.appendChild(string);

        // String label on the left
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', leftPadding - 15);
        label.setAttribute('y', y + 4);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('class', 'fretboard-label');
        label.textContent = stringLabelsBase[stringIndex];
        svg.appendChild(label);
    }

    // Draw fret markers (dots at 3, 5, 7, 9, 12)
    const markerFrets = [3, 5, 7, 9];
    markerFrets.forEach(f => {
        const x = leftPadding + (f - 0.5) * fretSpacing;
        const y = topPadding + fretboardHeight / 2;
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        marker.setAttribute('cx', x);
        marker.setAttribute('cy', y);
        marker.setAttribute('r', 4);
        marker.setAttribute('class', 'fretboard-marker');
        svg.appendChild(marker);
    });

    // Double dot at fret 12
    const x12 = leftPadding + 11.5 * fretSpacing;
    const dot1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot1.setAttribute('cx', x12);
    dot1.setAttribute('cy', topPadding + stringSpacing * 0.75);
    dot1.setAttribute('r', 4);
    dot1.setAttribute('class', 'fretboard-marker');
    svg.appendChild(dot1);

    const dot2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot2.setAttribute('cx', x12);
    dot2.setAttribute('cy', topPadding + stringSpacing * 2.25);
    dot2.setAttribute('r', 4);
    dot2.setAttribute('class', 'fretboard-marker');
    svg.appendChild(dot2);

    // Draw fret numbers
    [1, 3, 5, 7, 9, 12].forEach(f => {
        const x = leftPadding + (f - 0.5) * fretSpacing;
        const fretNum = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        fretNum.setAttribute('x', x);
        fretNum.setAttribute('y', height - 8);
        fretNum.setAttribute('text-anchor', 'middle');
        fretNum.setAttribute('class', 'fretboard-fret-number');
        fretNum.textContent = f;
        svg.appendChild(fretNum);
    });

    // Create clickable areas and display markers for each string
    for (let visualPos = 0; visualPos < numStrings; visualPos++) {
        const y = topPadding + visualPos * stringSpacing;
        const stringIndex = displayOrder[visualPos]; // Map visual position to internal index
        const currentValue = fretState[stringIndex];

        // Open/muted marker area (above nut)
        const openGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        openGroup.style.cursor = 'pointer';

        const openArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        openArea.setAttribute('x', leftPadding - 12);
        openArea.setAttribute('y', y - 10);
        openArea.setAttribute('width', 24);
        openArea.setAttribute('height', 20);
        openArea.setAttribute('fill', 'transparent');
        openGroup.appendChild(openArea);

        // Show open (O) or muted (X) marker
        if (currentValue === 0) {
            // Open string - solid green circle
            const openCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            openCircle.setAttribute('cx', leftPadding);
            openCircle.setAttribute('cy', y);
            openCircle.setAttribute('r', 6);
            openCircle.setAttribute('class', 'fretboard-open');
            openGroup.appendChild(openCircle);
        } else if (currentValue === -1) {
            // Muted string - X
            const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line1.setAttribute('x1', leftPadding - 5);
            line1.setAttribute('y1', y - 5);
            line1.setAttribute('x2', leftPadding + 5);
            line1.setAttribute('y2', y + 5);
            line1.setAttribute('class', 'fretboard-muted');
            openGroup.appendChild(line1);

            const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line2.setAttribute('x1', leftPadding + 5);
            line2.setAttribute('y1', y - 5);
            line2.setAttribute('x2', leftPadding - 5);
            line2.setAttribute('y2', y + 5);
            line2.setAttribute('class', 'fretboard-muted');
            openGroup.appendChild(line2);
        }
        // No marker shown for fretted strings (they have the orange dot instead)

        openGroup.addEventListener('click', () => {
            callbacks.onOpenClick(stringIndex);
        });
        svg.appendChild(openGroup);

        // Clickable fret positions
        for (let f = 1; f <= numFrets; f++) {
            const x = leftPadding + (f - 0.5) * fretSpacing;

            // Create clickable area
            const clickArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            clickArea.setAttribute('x', leftPadding + (f - 1) * fretSpacing);
            clickArea.setAttribute('y', y - stringSpacing / 2);
            clickArea.setAttribute('width', fretSpacing);
            clickArea.setAttribute('height', stringSpacing);
            clickArea.setAttribute('class', 'fretboard-position');
            clickArea.addEventListener('click', () => {
                callbacks.onFretClick(stringIndex, f);
            });
            svg.appendChild(clickArea);

            // Draw finger dot if this fret is selected
            if (currentValue === f) {
                const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                dot.setAttribute('cx', x);
                dot.setAttribute('cy', y);
                dot.setAttribute('r', 10);
                dot.setAttribute('class', 'fretboard-dot');
                svg.appendChild(dot);

                // Add fret number inside dot
                const fretText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                fretText.setAttribute('x', x);
                fretText.setAttribute('y', y + 4);
                fretText.setAttribute('text-anchor', 'middle');
                fretText.setAttribute('class', 'fretboard-dot-text');
                fretText.textContent = f;
                svg.appendChild(fretText);
            }
        }
    }

    return svg;
}

/**
 * Close chord modal
 */
function closeModal() {
    elements.modalOverlay.classList.remove('active');

    // Clean up key modal keyboard handler if it exists
    if (typeof keyModalKeyboardHandler !== 'undefined' && keyModalKeyboardHandler) {
        document.removeEventListener('keydown', keyModalKeyboardHandler);
        keyModalKeyboardHandler = null;
        keyModalChords = null;
    }
}
