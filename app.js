/**
 * UkeFlow - Ukulele Chord Progression Learning App
 */

// Application State
const state = {
    songs: [],
    currentSong: null,
    showAsNumbers: false,
    transpose: 0,
    useRelativeKey: false
};

// Audio Context for chord playback
let audioContext = null;

/**
 * Get or create the audio context (must be initialized after user interaction)
 */
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

/**
 * Ukulele string frequencies (standard tuning: G4-C4-E4-A4)
 * Note: G4 is actually higher than C4 (reentrant tuning)
 */
const UKULELE_TUNING = [
    392.00,  // G4
    261.63,  // C4
    329.63,  // E4
    440.00   // A4
];

/**
 * Play styles for ukulele - Strums and Arpeggios
 *
 * Strums: 'D' = down, 'U' = up, 'x' = muted chunk
 * Arpeggios: Array of string indices (0=G, 1=C, 2=E, 3=A) or arrays for simultaneous
 */
// Tempo settings
let currentBPM = 120;

/**
 * Get beat duration based on current tempo
 */
function getBeat() {
    return 60 / currentBPM;
}

const PLAY_STYLES = {
    strums: {
        label: 'Strums',
        patterns: {
            'strum-down': {
                name: 'Down Strums',
                type: 'strum',
                // Simple quarter notes: 1, 2, 3, 4 (beat multipliers)
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'D', beat: 1 },
                    { dir: 'D', beat: 2 },
                    { dir: 'D', beat: 3 }
                ]
            },
            'strum-island': {
                name: 'Island Strum',
                type: 'strum',
                // D  D  U  U  D  U  pattern: 1, 2, 2+, 3+, 4, 4+
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'D', beat: 1 },
                    { dir: 'U', beat: 1.5 },
                    { dir: 'U', beat: 2.5 },
                    { dir: 'D', beat: 3 },
                    { dir: 'U', beat: 3.5 }
                ]
            },
            'strum-basic': {
                name: 'Basic (D-U-D-U)',
                type: 'strum',
                // Eighth notes
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'U', beat: 0.5 },
                    { dir: 'D', beat: 1 },
                    { dir: 'U', beat: 1.5 },
                    { dir: 'D', beat: 2 },
                    { dir: 'U', beat: 2.5 },
                    { dir: 'D', beat: 3 },
                    { dir: 'U', beat: 3.5 }
                ]
            },
            'strum-rock': {
                name: 'Rock (D-D-U-D)',
                type: 'strum',
                // Driving: 1, 2, 2+, 3, repeat
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'D', beat: 1 },
                    { dir: 'U', beat: 1.5 },
                    { dir: 'D', beat: 2 },
                    { dir: 'D', beat: 3 },
                    { dir: 'U', beat: 3.5 }
                ]
            },
            'strum-calypso': {
                name: 'Calypso',
                type: 'strum',
                // Syncopated: 1, 1+, 2+, 3, 3+, 4+
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'U', beat: 0.5 },
                    { dir: 'U', beat: 1.5 },
                    { dir: 'D', beat: 2 },
                    { dir: 'U', beat: 2.5 },
                    { dir: 'U', beat: 3.5 }
                ]
            },
            'strum-chunk': {
                name: 'Chunk (Muted)',
                type: 'strum',
                // Percussive with mutes
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'x', beat: 0.5 },
                    { dir: 'U', beat: 1 },
                    { dir: 'x', beat: 1.5 },
                    { dir: 'D', beat: 2 },
                    { dir: 'x', beat: 2.5 },
                    { dir: 'U', beat: 3 },
                    { dir: 'x', beat: 3.5 }
                ]
            },
            'strum-waltz': {
                name: 'Waltz (3/4)',
                type: 'strum',
                // 3/4 time: strong 1, soft 2, soft 3
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'D', beat: 1 },
                    { dir: 'D', beat: 2 }
                ]
            },
            'strum-reggae': {
                name: 'Reggae Skank',
                type: 'strum',
                // Off-beat emphasis: +, 2+, +, 4+
                pattern: [
                    { dir: 'x', beat: 0.5 },
                    { dir: 'U', beat: 1.5 },
                    { dir: 'x', beat: 2.5 },
                    { dir: 'U', beat: 3.5 }
                ]
            }
        }
    },
    arpeggios: {
        label: 'Arpeggios',
        patterns: {
            'arp-down': {
                name: 'Down Roll',
                type: 'arpeggio',
                pattern: [0, 1, 2, 3],
                delay: 0.08
            },
            'arp-up': {
                name: 'Up Roll',
                type: 'arpeggio',
                pattern: [3, 2, 1, 0],
                delay: 0.08
            },
            'arp-pinch': {
                name: 'Pinch & Roll',
                type: 'arpeggio',
                pattern: [[0, 3], 1, 2, 1],
                delay: 0.12
            },
            'arp-travis': {
                name: 'Travis Pick',
                type: 'arpeggio',
                pattern: [0, 2, 1, 3, 0, 2, 1, 2],
                delay: 0.1
            },
            'arp-pimi': {
                name: 'Fingerpick (p-i-m-i)',
                type: 'arpeggio',
                pattern: [0, 2, 3, 2],
                delay: 0.12
            },
            'arp-pima': {
                name: 'Fingerpick (p-i-m-a)',
                type: 'arpeggio',
                pattern: [0, 2, 3, 1],
                delay: 0.12
            },
            'arp-campanella': {
                name: 'Campanella',
                type: 'arpeggio',
                pattern: [0, 3, 1, 2, 0, 2, 1, 3],
                delay: 0.09
            }
        }
    }
};

// Current selected play style
let currentPlayStyle = 'arp-down';

/**
 * Get a play style config by key
 */
function getPlayStyle(key) {
    for (const group of Object.values(PLAY_STYLES)) {
        if (group.patterns[key]) {
            return group.patterns[key];
        }
    }
    return PLAY_STYLES.strums.patterns['strum-down'];
}

/**
 * Calculate the frequency for a given string and fret
 */
function getNoteFrequency(stringIndex, fret) {
    if (fret < 0) return null; // Muted string
    const baseFreq = UKULELE_TUNING[stringIndex];
    return baseFreq * Math.pow(2, fret / 12);
}

/**
 * Karplus-Strong plucked string synthesis
 * Creates a realistic plucked string sound
 */
function pluckString(frequency, duration = 1.5, volume = 0.3) {
    const ctx = getAudioContext();
    const sampleRate = ctx.sampleRate;
    const samples = Math.ceil(sampleRate * duration);
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    // Delay line length determines pitch
    const delayLength = Math.round(sampleRate / frequency);
    const delayLine = new Float32Array(delayLength);

    // Initialize delay line with noise burst (shaped for ukulele character)
    for (let i = 0; i < delayLength; i++) {
        // Mix of noise and slight sine component for ukulele brightness
        delayLine[i] = (Math.random() * 2 - 1) * 0.5 +
                       Math.sin(2 * Math.PI * i / delayLength) * 0.5;
    }

    // Damping factor (controls decay rate) - ukulele has quick decay
    const damping = 0.996;
    // Brightness filter coefficient
    const brightness = 0.4;

    let delayIndex = 0;
    let prevSample = 0;

    // Generate samples using Karplus-Strong algorithm
    for (let i = 0; i < samples; i++) {
        // Get current sample from delay line
        const currentSample = delayLine[delayIndex];

        // Low-pass filter: average with previous sample
        // This simulates string damping and creates the decaying tone
        const nextIndex = (delayIndex + 1) % delayLength;
        const filtered = damping * (
            brightness * delayLine[delayIndex] +
            (1 - brightness) * delayLine[nextIndex]
        );

        // Additional smoothing for warmer ukulele tone
        const smoothed = 0.5 * filtered + 0.5 * prevSample;
        prevSample = filtered;

        // Store filtered sample back in delay line
        delayLine[delayIndex] = smoothed;

        // Output the sample
        data[i] = currentSample * volume;

        // Move to next position in delay line
        delayIndex = nextIndex;
    }

    // Apply amplitude envelope for natural attack and release
    const attackTime = 0.005 * sampleRate;
    const releaseStart = samples - 0.1 * sampleRate;

    for (let i = 0; i < samples; i++) {
        if (i < attackTime) {
            // Quick attack
            data[i] *= i / attackTime;
        } else if (i > releaseStart) {
            // Smooth release
            data[i] *= (samples - i) / (samples - releaseStart);
        }
    }

    return buffer;
}

/**
 * Play a strum (all strings quickly)
 * @param {Array} stringFreqs - Frequencies for each string
 * @param {string} direction - 'D' for down, 'U' for up, 'x' for muted
 * @param {number} startTime - When to start playing
 */
function playStrum(stringFreqs, direction, startTime) {
    const ctx = getAudioContext();
    const strumSpeed = 0.02; // Time between each string in a strum

    if (direction === 'x') {
        // Muted chunk - percussive sound
        playChunk(startTime);
        return;
    }

    // Determine string order based on direction
    const order = direction === 'D' ? [0, 1, 2, 3] : [3, 2, 1, 0];

    order.forEach((stringIndex, i) => {
        const freq = stringFreqs[stringIndex];
        if (freq) {
            const buffer = pluckString(freq, 0.8, 0.25);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(startTime + i * strumSpeed);
        }
    });
}

/**
 * Play a muted chunk sound (percussive)
 */
function playChunk(startTime) {
    const ctx = getAudioContext();
    const duration = 0.08;
    const sampleRate = ctx.sampleRate;
    const samples = Math.ceil(sampleRate * duration);
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    // Create a short noise burst for percussive chunk
    for (let i = 0; i < samples; i++) {
        const envelope = Math.exp(-i / (sampleRate * 0.02));
        data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Add a bandpass filter for that woody chunk sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 1;

    source.connect(filter);
    filter.connect(ctx.destination);
    source.start(startTime);
}

/**
 * Play a chord using the selected play style
 */
function playChord(chordData) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const styleConfig = getPlayStyle(currentPlayStyle);
    const pattern = styleConfig.pattern;

    // Get frequencies for each string in the chord
    const stringFreqs = chordData.frets.map((fret, stringIndex) =>
        getNoteFrequency(stringIndex, fret)
    );

    if (styleConfig.type === 'strum') {
        // Play strum pattern with precise timing based on current tempo
        const beatDuration = getBeat();
        pattern.forEach((strum) => {
            playStrum(stringFreqs, strum.dir, now + strum.beat * beatDuration);
        });
    } else {
        // Play arpeggio pattern - scale delay based on tempo (120 BPM = base tempo)
        const tempoScale = 120 / currentBPM;
        const delay = styleConfig.delay * tempoScale;
        let stepIndex = 0;
        pattern.forEach((step) => {
            const strings = Array.isArray(step) ? step : [step];

            strings.forEach(stringIndex => {
                const freq = stringFreqs[stringIndex];
                if (freq) {
                    const buffer = pluckString(freq, 1.2, 0.3);
                    const source = ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(ctx.destination);
                    source.start(now + stepIndex * delay);
                }
            });

            stepIndex++;
        });
    }
}

// Keep old function name for compatibility
function playChordArpeggio(chordData) {
    playChord(chordData);
}

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
    populatePlayStyleSelector();
    updatePatternDisplay();
    setupEventListeners();
    loadFromURL();
}

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
    elements.arpeggioSelect.addEventListener('change', handleArpeggioChange);
    elements.tempoSelect.addEventListener('change', handleTempoChange);
    elements.toggleBtn.addEventListener('click', handleToggleProgression);
    elements.toggleRelativeKey.addEventListener('click', handleToggleRelativeKey);
    elements.modalOverlay.addEventListener('click', handleModalClose);
    elements.modalClose.addEventListener('click', closeModal);
    document.addEventListener('keydown', handleKeyDown);
}

/**
 * Handle play style change
 */
function handleArpeggioChange(e) {
    currentPlayStyle = e.target.value;
    updatePatternDisplay();
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
 * Handle tempo change
 */
function handleTempoChange(e) {
    currentBPM = parseInt(e.target.value, 10);
}

/**
 * Handle keyboard events
 */
function handleKeyDown(e) {
    if (e.key === 'Escape' && elements.modalOverlay.classList.contains('active')) {
        closeModal();
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
        // Reset transpose and relative key when switching songs
        state.transpose = 0;
        state.useRelativeKey = false;
        elements.transposeSelect.value = '0';
        elements.toggleRelativeKey.classList.remove('active');

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
    updateKeyDisplay();

    // Show sections
    elements.songInfo.style.display = 'flex';
    elements.chordReference.style.display = 'block';
    elements.lyricsSection.style.display = 'block';
    elements.welcomeMessage.style.display = 'none';

    // Render scale reference, progression summary, trivia, harmonic analysis, chord reference and lyrics
    renderScaleReference();
    renderProgressionSummary();
    renderMusicTrivia();
    renderHarmonicAnalysis();
    renderChordReference();
    renderLyrics();
}

/**
 * Render the scale reference (all chords in the key)
 */
function renderScaleReference() {
    const transposedKey = getDisplayKey();
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

        const chordData = CHORDS[chord];

        // Make clickable if chord exists in library
        if (chordData) {
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

        // Add play button if chord exists
        if (chordData) {
            const playBtn = document.createElement('button');
            playBtn.className = 'scale-play-btn';
            playBtn.innerHTML = '&#9654;';
            playBtn.title = 'Play chord';
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playChord(chordData);
                playBtn.classList.add('playing');
                setTimeout(() => playBtn.classList.remove('playing'), 400);
            });
            item.appendChild(playBtn);
        }

        elements.scaleGrid.appendChild(item);
    }
}

/**
 * Render the progression summary (chord sequences used in the song)
 */
function renderProgressionSummary() {
    const transposedKey = getDisplayKey();
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
 * Render music trivia section
 */
function renderMusicTrivia() {
    const transposedKey = getDisplayKey();
    const isMinor = isMinorKey(transposedKey);
    const usedChords = getUsedChords();

    elements.triviaContent.innerHTML = '';
    const trivia = [];

    // Key information
    const keyType = isMinor ? 'minor' : 'major';
    const relativeKey = getRelativeKey(transposedKey);
    trivia.push({
        icon: '🎵',
        text: `This song is in <strong>${transposedKey}</strong> (${keyType}). Its relative ${isMinor ? 'major' : 'minor'} is <strong>${relativeKey}</strong>.`
    });

    // Chord count
    trivia.push({
        icon: '🎸',
        text: `Uses <strong>${usedChords.length}</strong> unique chord${usedChords.length > 1 ? 's' : ''}: <span class="highlight">${usedChords.join(', ')}</span>.`
    });

    // Check for famous progressions
    const progressions = detectFamousProgressions(transposedKey);
    if (progressions.length > 0) {
        progressions.forEach(prog => {
            trivia.push({
                icon: '⭐',
                text: prog
            });
        });
    }

    // Check for borrowed chords
    const borrowedChords = detectBorrowedChords(transposedKey, usedChords);
    if (borrowedChords.length > 0) {
        trivia.push({
            icon: '🎭',
            text: `Uses borrowed chord${borrowedChords.length > 1 ? 's' : ''}: <strong>${borrowedChords.join(', ')}</strong>. These add color by borrowing from ${isMinor ? 'major modes' : 'minor modes'}.`
        });
    }

    // Chord variety assessment
    if (usedChords.length <= 3) {
        trivia.push({
            icon: '✨',
            text: 'A simple song with few chords - great for beginners!'
        });
    } else if (usedChords.length >= 6) {
        trivia.push({
            icon: '🎓',
            text: 'A harmonically rich song with many chord changes.'
        });
    }

    // Render trivia items
    trivia.forEach(item => {
        const div = document.createElement('div');
        div.className = 'trivia-item';

        const icon = document.createElement('span');
        icon.className = 'trivia-icon';
        icon.textContent = item.icon;
        div.appendChild(icon);

        const text = document.createElement('span');
        text.className = 'trivia-text';
        text.innerHTML = item.text;
        div.appendChild(text);

        elements.triviaContent.appendChild(div);
    });
}

/**
 * Render harmonic analysis table showing chord, scale degree, and function
 */
function renderHarmonicAnalysis() {
    const transposedKey = getDisplayKey();
    const isMinor = isMinorKey(transposedKey);
    const usedChords = getUsedChords();

    elements.harmonicContent.innerHTML = '';

    // Create table
    const table = document.createElement('table');
    table.className = 'harmonic-table';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Chord', 'Degree', 'Function'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');

    usedChords.forEach(chord => {
        const row = document.createElement('tr');

        // Chord name (clickable) with play button
        const chordCell = document.createElement('td');
        chordCell.className = 'chord-cell';

        const chordData = CHORDS[chord];
        if (chordData) {
            // Play button
            const playBtn = document.createElement('button');
            playBtn.className = 'harmonic-play-btn';
            playBtn.innerHTML = '&#9654;';
            playBtn.title = 'Play chord';
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playChord(chordData);
                playBtn.classList.add('playing');
                setTimeout(() => playBtn.classList.remove('playing'), 400);
            });
            chordCell.appendChild(playBtn);
        }

        const chordName = document.createElement('span');
        chordName.textContent = chord;
        if (chordData) {
            chordName.style.cursor = 'pointer';
            chordName.addEventListener('click', () => openChordModal(chord));
        }
        chordCell.appendChild(chordName);
        row.appendChild(chordCell);

        // Scale degree
        const degreeCell = document.createElement('td');
        degreeCell.className = 'degree-cell';
        const degree = getScaleDegree(chord, transposedKey);
        degreeCell.textContent = degree;
        row.appendChild(degreeCell);

        // Harmonic function
        const functionCell = document.createElement('td');
        functionCell.className = 'function-cell';
        const func = getHarmonicFunction(chord, degree, transposedKey, isMinor);
        functionCell.textContent = func.name;
        functionCell.classList.add(func.class);
        row.appendChild(functionCell);

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    elements.harmonicContent.appendChild(table);
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

    // Handle unknown degrees
    if (degree === '?') {
        funcName = 'Non-diatonic';
        funcClass = 'function-borrowed';
    }

    return { name: funcName, class: funcClass };
}

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
                const transposedKey = getDisplayKey();

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
 * Handle toggle between original key and relative key
 */
function handleToggleRelativeKey() {
    if (!state.currentSong) return;

    state.useRelativeKey = !state.useRelativeKey;
    elements.toggleRelativeKey.classList.toggle('active', state.useRelativeKey);

    // Update key display
    updateKeyDisplay();

    // Re-render all sections that depend on key
    renderScaleReference();
    renderProgressionSummary();
    renderMusicTrivia();
    renderHarmonicAnalysis();
    renderChordReference();
    renderLyrics();
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

/**
 * Update the key display in the UI
 */
function updateKeyDisplay() {
    if (!state.currentSong) return;
    const transposedKey = transposeKey(state.currentSong.key, state.transpose);
    const displayKey = getDisplayKey();

    if (state.useRelativeKey) {
        const originalType = isMinorKey(transposedKey) ? 'minor' : 'major';
        const relativeType = isMinorKey(displayKey) ? 'minor' : 'major';
        elements.songKey.textContent = `${displayKey} (rel. ${relativeType})`;
        elements.toggleRelativeKey.title = `Switch back to ${transposedKey}`;
    } else {
        elements.songKey.textContent = displayKey;
        const relativeKey = getRelativeKey(transposedKey);
        elements.toggleRelativeKey.title = `Switch to relative key (${relativeKey})`;
    }
}

/**
 * Open chord modal with all variations
 */
function openChordModal(chordName) {
    const chordData = CHORDS[chordName];
    if (!chordData) return;

    elements.modalChord.innerHTML = '';

    // Get all variations for this chord
    const variations = getChordVariations(chordName);
    const hasVariations = variations.length > 1;

    // Title with chord name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'chord-name modal-chord-title';
    const transposedKey = getDisplayKey();
    nameDiv.textContent = state.showAsNumbers
        ? `${getScaleDegree(chordName, transposedKey)} (${chordName})`
        : chordName;
    elements.modalChord.appendChild(nameDiv);

    if (hasVariations) {
        // Create a container for all variations
        const variationsContainer = document.createElement('div');
        variationsContainer.className = 'variations-container';

        variations.forEach((variation, index) => {
            const variationItem = document.createElement('div');
            variationItem.className = 'variation-item';
            if (index === 0) variationItem.classList.add('default');

            // Variation label
            const label = document.createElement('div');
            label.className = 'variation-label';
            label.textContent = variation.description || (index === 0 ? 'Default' : `Variation ${index}`);
            variationItem.appendChild(label);

            // SVG diagram
            const svg = createChordSVG(variation, true);
            variationItem.appendChild(svg);

            // Play button for this variation
            const playBtn = document.createElement('button');
            playBtn.className = 'chord-play-btn variation-play-btn';
            playBtn.innerHTML = '&#9654;';
            playBtn.title = 'Play this voicing';
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playChordArpeggio(variation);
                playBtn.classList.add('playing');
                setTimeout(() => playBtn.classList.remove('playing'), 400);
            });
            variationItem.appendChild(playBtn);

            variationsContainer.appendChild(variationItem);
        });

        elements.modalChord.appendChild(variationsContainer);
    } else {
        // Single chord (no variations) - show as before
        const svg = createChordSVG(chordData, true);
        elements.modalChord.appendChild(svg);

        // Add play button for modal
        const playBtn = document.createElement('button');
        playBtn.className = 'chord-play-btn modal-play-btn';
        playBtn.innerHTML = '&#9654; Play';
        playBtn.title = 'Play chord';
        playBtn.addEventListener('click', () => {
            playChordArpeggio(chordData);
            playBtn.classList.add('playing');
            setTimeout(() => playBtn.classList.remove('playing'), 400);
        });
        elements.modalChord.appendChild(playBtn);
    }

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
