/**
 * UkeFlow - Ukulele Chord Progression Learning App
 */

// Application State
const state = {
    songs: [],
    currentSong: null,
    showAsNumbers: false,
    transpose: 0
};

// DOM Elements
const elements = {
    songSelector: document.getElementById('song-selector'),
    songSelectorWrapper: document.querySelector('.song-selector-wrapper'),
    songSelectorClear: document.getElementById('song-selector-clear'),
    songList: document.getElementById('song-list'),
    songInfo: document.getElementById('song-info'),
    songTitle: document.getElementById('song-title'),
    songArtist: document.getElementById('song-artist'),
    songKey: document.getElementById('song-key'),
    transposeSelect: document.getElementById('transpose-select'),
    toggleBtn: document.getElementById('toggle-progression'),
    chordReference: document.getElementById('chord-reference'),
    scaleGrid: document.getElementById('scale-grid'),
    progressionContent: document.getElementById('progression-content'),
    chordGrid: document.getElementById('chord-grid'),
    lyricsSection: document.getElementById('lyrics-section'),
    lyricsContainer: document.getElementById('lyrics-container'),
    welcomeMessage: document.getElementById('welcome-message'),
    modalOverlay: document.getElementById('modal-overlay'),
    modalContent: document.getElementById('modal-content'),
    modalChord: document.getElementById('modal-chord'),
    modalClose: document.getElementById('modal-close')
};

/**
 * Initialize the application
 */
async function init() {
    await loadSongs();
    setupEventListeners();
    loadFromURL();
}

/**
 * Load song from URL parameters
 */
function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const songParam = params.get('song');
    const transposeParam = params.get('transpose');

    if (songParam) {
        // Find song by slug
        const song = state.songs.find(song => slugify(song.title) === songParam);
        if (song) {
            elements.songSelector.value = `${song.title} - ${song.artist}`;
            updateClearButtonVisibility();
            state.currentSong = song;

            // Apply transpose if specified
            if (transposeParam) {
                const transpose = parseInt(transposeParam, 10);
                if (!isNaN(transpose) && transpose >= -5 && transpose <= 6) {
                    state.transpose = transpose;
                    elements.transposeSelect.value = transpose.toString();
                }
            }

            displaySong();
        }
    }
}

/**
 * Update URL with current song state
 */
function updateURL() {
    const params = new URLSearchParams();

    if (state.currentSong) {
        params.set('song', slugify(state.currentSong.title));
        if (state.transpose !== 0) {
            params.set('transpose', state.transpose.toString());
        }
    }

    const newURL = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;

    window.history.replaceState({}, '', newURL);
}

/**
 * Convert song title to URL-friendly slug
 */
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
}

/**
 * Load songs from JSON files
 * First loads songs.json which contains paths to individual song files
 */
async function loadSongs() {
    try {
        // Load the index file that lists all song files
        const indexResponse = await fetch('songs.json');
        const indexData = await indexResponse.json();

        // Load each individual song file
        const songPromises = indexData.songs.map(async (songPath) => {
            const response = await fetch(songPath);
            return response.json();
        });

        state.songs = await Promise.all(songPromises);
        populateSongSelector();
    } catch (error) {
        console.error('Error loading songs:', error);
        elements.welcomeMessage.innerHTML = '<p>Error loading songs. Make sure songs.json and song files exist.</p>';
    }
}

/**
 * Populate the song selector datalist
 */
function populateSongSelector() {
    // Sort songs alphabetically by title
    const sortedSongs = [...state.songs].sort((a, b) =>
        a.title.localeCompare(b.title)
    );

    sortedSongs.forEach((song) => {
        const option = document.createElement('option');
        option.value = `${song.title} - ${song.artist}`;
        elements.songList.appendChild(option);
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    elements.songSelector.addEventListener('input', handleSongSelect);
    elements.songSelectorClear.addEventListener('click', clearSongSelector);
    elements.transposeSelect.addEventListener('change', handleTranspose);
    elements.toggleBtn.addEventListener('click', handleToggleProgression);
    elements.modalOverlay.addEventListener('click', handleModalClose);
    elements.modalClose.addEventListener('click', closeModal);
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
 * Clear the song selector input
 */
function clearSongSelector() {
    elements.songSelector.value = '';
    updateClearButtonVisibility();
    hideSong();
    updateURL();
    elements.songSelector.focus();
}

/**
 * Handle song selection
 */
function handleSongSelect(e) {
    const inputValue = e.target.value.trim();
    updateClearButtonVisibility();

    if (inputValue === '') {
        hideSong();
        updateURL();
        return;
    }

    // Find song by matching "Title - Artist" format
    const song = state.songs.find(s => `${s.title} - ${s.artist}` === inputValue);

    if (song) {
        // Reset transpose when switching songs
        state.transpose = 0;
        elements.transposeSelect.value = '0';

        state.currentSong = song;
        displaySong();
        updateURL();
    }
}

/**
 * Hide song display
 */
function hideSong() {
    state.currentSong = null;
    elements.songInfo.style.display = 'none';
    elements.chordReference.style.display = 'none';
    elements.lyricsSection.style.display = 'none';
    elements.welcomeMessage.style.display = 'block';
}

/**
 * Display the current song
 */
function displaySong() {
    if (!state.currentSong) return;

    // Update song info
    elements.songTitle.textContent = state.currentSong.title;
    elements.songArtist.textContent = state.currentSong.artist;

    // Show transposed key
    const displayKey = transposeKey(state.currentSong.key, state.transpose);
    elements.songKey.textContent = displayKey;

    // Show sections
    elements.songInfo.style.display = 'flex';
    elements.chordReference.style.display = 'block';
    elements.lyricsSection.style.display = 'block';
    elements.welcomeMessage.style.display = 'none';

    // Render scale reference, progression summary, chord reference and lyrics
    renderScaleReference();
    renderProgressionSummary();
    renderChordReference();
    renderLyrics();
}

/**
 * Render the scale reference (all chords in the key)
 */
function renderScaleReference() {
    const transposedKey = transposeKey(state.currentSong.key, state.transpose);
    const isMinor = isMinorKey(transposedKey);
    const scale = isMinor ? SCALE_DEGREES_MINOR[transposedKey] : SCALE_DEGREES_MAJOR[transposedKey];
    const romanNumerals = isMinor ? ROMAN_NUMERALS_MINOR : ROMAN_NUMERALS_MAJOR;

    elements.scaleGrid.innerHTML = '';

    if (!scale) return;

    // Check if this is an uncommon key with an enharmonic equivalent
    const enharmonic = getEnharmonicEquivalent(transposedKey);
    if (enharmonic) {
        const notice = document.createElement('div');
        notice.className = 'enharmonic-notice';
        notice.textContent = `Uncommon key. Consider using ${enharmonic} instead.`;
        elements.scaleGrid.appendChild(notice);
    }

    // Only show the 7 diatonic chords (not borrowed chords at indices 7+)
    for (let i = 0; i < 7; i++) {
        const chord = scale[i];
        const numeral = romanNumerals[i];

        const item = document.createElement('div');
        item.className = 'scale-item';

        // Make clickable if chord exists in library
        if (CHORDS[chord]) {
            item.classList.add('clickable');
            item.addEventListener('click', () => {
                openChordModal(chord);
            });
        }

        const degree = document.createElement('span');
        degree.className = 'scale-degree';
        degree.textContent = numeral;
        item.appendChild(degree);

        const chordName = document.createElement('span');
        chordName.className = 'scale-chord';
        chordName.textContent = chord;
        item.appendChild(chordName);

        elements.scaleGrid.appendChild(item);
    }
}

/**
 * Render the progression summary (chord sequences used in the song)
 */
function renderProgressionSummary() {
    const transposedKey = transposeKey(state.currentSong.key, state.transpose);
    elements.progressionContent.innerHTML = '';

    // Extract chord sequences from each section
    const sectionProgressions = {};
    let currentSection = 'Intro';

    state.currentSong.lines.forEach(line => {
        if (line.section) {
            currentSection = line.section;
        } else if (line.chords && line.chords.length > 0) {
            if (!sectionProgressions[currentSection]) {
                sectionProgressions[currentSection] = [];
            }
            // Get chords in order for this line
            const lineChords = line.chords
                .sort((a, b) => a.position - b.position)
                .map(c => transposeChord(c.chord, state.transpose));
            sectionProgressions[currentSection].push(lineChords);
        }
    });

    // Analyze progressions by section
    for (const [section, lines] of Object.entries(sectionProgressions)) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'progression-section';

        const title = document.createElement('div');
        title.className = 'progression-section-title';
        title.textContent = section;
        sectionDiv.appendChild(title);

        const list = document.createElement('div');
        list.className = 'progression-list';

        // Count unique progressions in this section
        const progressionCounts = {};
        lines.forEach(chords => {
            const key = chords.join(' → ');
            const degrees = chords.map(c => getScaleDegree(c, transposedKey)).join(' → ');
            const id = degrees;
            if (!progressionCounts[id]) {
                progressionCounts[id] = { chords: key, degrees, count: 0 };
            }
            progressionCounts[id].count++;
        });

        // Display each unique progression
        for (const prog of Object.values(progressionCounts)) {
            const item = document.createElement('div');
            item.className = 'progression-item';

            const degrees = document.createElement('span');
            degrees.className = 'prog-degrees';
            degrees.textContent = prog.degrees;
            item.appendChild(degrees);

            const chords = document.createElement('span');
            chords.className = 'prog-chords';
            chords.textContent = `(${prog.chords})`;
            item.appendChild(chords);

            if (prog.count > 1) {
                const count = document.createElement('span');
                count.className = 'prog-count';
                count.textContent = `×${prog.count}`;
                item.appendChild(count);
            }

            list.appendChild(item);
        }

        sectionDiv.appendChild(list);
        elements.progressionContent.appendChild(sectionDiv);
    }
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
 * Render chord reference section at the top
 */
function renderChordReference() {
    const usedChords = getUsedChords();
    elements.chordGrid.innerHTML = '';

    usedChords.forEach(chordName => {
        const chordData = CHORDS[chordName];
        if (chordData) {
            const diagram = createChordDiagram(chordData, false, chordName);
            diagram.style.cursor = 'pointer';
            diagram.addEventListener('click', () => {
                openChordModal(chordName);
            });
            elements.chordGrid.appendChild(diagram);
        } else {
            // Chord not in library, show name only
            const placeholder = document.createElement('div');
            placeholder.className = 'chord-diagram';
            placeholder.innerHTML = `<div class="chord-name">${chordName}</div><div style="color:#666;font-size:0.8rem;">No diagram</div>`;
            elements.chordGrid.appendChild(placeholder);
        }
    });
}

/**
 * Create a chord diagram element
 * @param {Object} chordData - Chord definition object
 * @param {boolean} large - Whether to render a large version
 */
function createChordDiagram(chordData, large = false, displayName = null) {
    const container = document.createElement('div');
    container.className = 'chord-diagram';

    const name = document.createElement('div');
    name.className = 'chord-name';
    const chordName = displayName || chordData.name;
    name.textContent = chordName;
    container.appendChild(name);

    // Add scale degree below chord name
    if (state.currentSong) {
        const transposedKey = transposeKey(state.currentSong.key, state.transpose);
        const scaleDegree = getScaleDegree(chordName, transposedKey);
        const degreeDiv = document.createElement('div');
        degreeDiv.className = 'chord-degree';
        degreeDiv.textContent = scaleDegree;
        container.appendChild(degreeDiv);
    }

    const svg = createChordSVG(chordData, large);
    container.appendChild(svg);

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

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Draw nut (thick line at top)
    const nut = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    nut.setAttribute('x', startX - 2);
    nut.setAttribute('y', startY - 4);
    nut.setAttribute('width', stringSpacing * 3 + 4);
    nut.setAttribute('height', large ? 5 : 3);
    nut.setAttribute('fill', '#e4e4e4');
    svg.appendChild(nut);

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

    // Draw barre if present
    if (chord.barre) {
        const barreY = startY + (chord.barre.fret - 0.5) * fretSpacing;
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

    // Draw finger positions
    chord.frets.forEach((fret, stringIndex) => {
        const x = startX + stringIndex * stringSpacing;

        if (fret === 0) {
            // Open string - draw circle above nut
            const open = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            open.setAttribute('cx', x);
            open.setAttribute('cy', startY - (large ? 12 : 8));
            open.setAttribute('r', dotRadius - 2);
            open.setAttribute('fill', 'none');
            open.setAttribute('stroke', '#888');
            open.setAttribute('stroke-width', 1.5);
            svg.appendChild(open);
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
            // Skip if this position is covered by a barre
            const isBarre = chord.barre &&
                fret === chord.barre.fret &&
                stringIndex >= chord.barre.fromString &&
                stringIndex <= chord.barre.toString;

            if (!isBarre) {
                // Fretted note - draw filled circle with finger number
                const y = startY + (fret - 0.5) * fretSpacing;

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

    // Add barre finger number
    if (chord.barre) {
        const barreY = startY + (chord.barre.fret - 0.5) * fretSpacing;
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
 * Render lyrics with chords
 */
function renderLyrics() {
    elements.lyricsContainer.innerHTML = '';

    state.currentSong.lines.forEach(line => {
        if (line.section) {
            // Section marker (verse, chorus, etc.)
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'section-break';
            sectionDiv.textContent = `[${line.section}]`;
            elements.lyricsContainer.appendChild(sectionDiv);
        } else {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'lyric-line';

            // Chord row
            const chordRow = document.createElement('div');
            chordRow.className = 'chord-row';

            if (line.chords && line.chords.length > 0) {
                // Build chord row with proper spacing
                let chordText = '';

                // Sort chords by position
                const sortedChords = [...line.chords].sort((a, b) => a.position - b.position);

                // Get transposed key for scale degree calculation
                const transposedKey = transposeKey(state.currentSong.key, state.transpose);

                sortedChords.forEach(c => {
                    // Add spaces to reach the chord position
                    while (chordText.length < c.position) {
                        chordText += ' ';
                    }

                    // Transpose the chord
                    const transposedChord = transposeChord(c.chord, state.transpose);

                    const displayChord = state.showAsNumbers
                        ? getScaleDegree(transposedChord, transposedKey)
                        : transposedChord;

                    // Create a placeholder for the chord marker
                    const markerPlaceholder = `{{CHORD:${transposedChord}:${displayChord}}}`;
                    chordText += markerPlaceholder;
                });

                // Replace placeholders with actual chord markers
                chordRow.innerHTML = chordText.replace(
                    /\{\{CHORD:([^:]+):([^}]+)\}\}/g,
                    (match, chordName, displayChord) => {
                        return `<span class="chord-marker" data-chord="${chordName}">${displayChord}</span>`;
                    }
                );

                // Add click handlers to chord markers
                chordRow.querySelectorAll('.chord-marker').forEach(marker => {
                    marker.addEventListener('click', () => {
                        openChordModal(marker.dataset.chord);
                    });
                });
            }

            lineDiv.appendChild(chordRow);

            // Lyrics row
            const lyricsRow = document.createElement('div');
            lyricsRow.className = 'lyric-text';
            lyricsRow.textContent = line.lyrics || '';
            lineDiv.appendChild(lyricsRow);

            elements.lyricsContainer.appendChild(lineDiv);
        }
    });
}

/**
 * Handle transpose selection
 */
function handleTranspose(e) {
    state.transpose = parseInt(e.target.value, 10);
    displaySong();
    updateURL();
}

/**
 * Handle toggle between chord names and progression numbers
 */
function handleToggleProgression() {
    state.showAsNumbers = !state.showAsNumbers;
    elements.toggleBtn.textContent = state.showAsNumbers ? 'Show as Chords' : 'Show as Numbers';
    elements.toggleBtn.classList.toggle('active', state.showAsNumbers);

    // Re-render chord reference and lyrics
    renderChordReference();
    renderLyrics();
}

/**
 * Open chord modal
 */
function openChordModal(chordName) {
    const chordData = CHORDS[chordName];
    if (!chordData) return;

    elements.modalChord.innerHTML = '';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'chord-name';
    const transposedKey = transposeKey(state.currentSong.key, state.transpose);
    nameDiv.textContent = state.showAsNumbers
        ? `${getScaleDegree(chordName, transposedKey)} (${chordName})`
        : chordName;
    elements.modalChord.appendChild(nameDiv);

    const svg = createChordSVG(chordData, true);
    elements.modalChord.appendChild(svg);

    elements.modalOverlay.classList.add('active');
}

/**
 * Close chord modal
 */
function closeModal() {
    elements.modalOverlay.classList.remove('active');
}

/**
 * Handle modal overlay click (close if clicking outside)
 */
function handleModalClose(e) {
    if (e.target === elements.modalOverlay) {
        closeModal();
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
