/**
 * Practice Mode for UkeFlow
 * Displays random chords with metronome for chord transition practice
 */

// Practice state
const practiceState = {
    isPlaying: false,
    currentChord: null,
    nextChord: null,
    currentBeat: 0,
    tempo: 120,
    intervalId: null,
    chordPool: [],
    filters: {
        major: true,
        minor: true,
        seventh: false,
        sharps: false,
        flats: false
    },
    cycleSameRoot: false,
    currentRoot: null,
    rootCycleIndex: 0,
    rootChords: [],
    // Progression mode
    mode: 'progression', // 'random' or 'progression'
    progressions: [],
    selectedProgression: null,
    progressionKey: 'C',
    progressionChords: [],
    progressionIndex: 0,
    // Count-in
    isCountingIn: false,
    // Sound
    playChordSound: true
};

// DOM elements
const practiceElements = {
    // Tabs
    tabs: document.querySelectorAll('.practice-tab'),
    // Random mode
    randomControls: document.getElementById('random-controls'),
    tempoSlider: document.getElementById('tempo-slider'),
    tempoDisplay: document.getElementById('tempo-display'),
    filterMajor: document.getElementById('filter-major'),
    filterMinor: document.getElementById('filter-minor'),
    filter7th: document.getElementById('filter-7th'),
    filterSharps: document.getElementById('filter-sharps'),
    filterFlats: document.getElementById('filter-flats'),
    cycleSameRoot: document.getElementById('cycle-same-root'),
    // Progression mode
    progressionSection: document.getElementById('progression-section'),
    progressionSearch: document.getElementById('progression-search'),
    progressionDropdown: document.getElementById('progression-dropdown'),
    progressionInfo: document.getElementById('progression-info'),
    progressionName: document.getElementById('progression-name'),
    progressionNumerals: document.getElementById('progression-numerals'),
    progressionDescription: document.getElementById('progression-description'),
    progressionSongsList: document.getElementById('progression-songs-list'),
    progressionKeySelector: document.getElementById('progression-key-selector'),
    progressionKey: document.getElementById('progression-key'),
    progressionChords: document.getElementById('progression-chords'),
    progressionSequence: document.getElementById('progression-sequence'),
    // Shared
    tempoSection: document.getElementById('tempo-section'),
    soundToggle: document.getElementById('sound-toggle'),
    chordDisplay: document.getElementById('chord-display'),
    currentChordName: document.getElementById('current-chord-name'),
    currentChordDiagram: document.getElementById('current-chord-diagram'),
    nextChordPreview: document.getElementById('next-chord-preview'),
    nextChordName: document.getElementById('next-chord-name'),
    nextChordDiagram: document.getElementById('next-chord-diagram'),
    beatIndicator: document.getElementById('beat-indicator'),
    startStopBtn: document.getElementById('start-stop-btn')
};

/**
 * Initialize practice mode
 */
function initPractice() {
    // Set up tab listeners
    practiceElements.tabs.forEach(tab => {
        tab.addEventListener('click', () => handleTabChange(tab.dataset.mode));
    });

    // Set up random mode event listeners
    practiceElements.tempoSlider.addEventListener('input', handleTempoChange);
    practiceElements.filterMajor.addEventListener('change', handleFilterChange);
    practiceElements.filterMinor.addEventListener('change', handleFilterChange);
    practiceElements.filter7th.addEventListener('change', handleFilterChange);
    practiceElements.filterSharps.addEventListener('change', handleFilterChange);
    practiceElements.filterFlats.addEventListener('change', handleFilterChange);
    practiceElements.cycleSameRoot.addEventListener('change', handleCycleModeChange);

    // Set up progression mode event listeners
    practiceElements.progressionSearch.addEventListener('input', handleProgressionSearch);
    practiceElements.progressionSearch.addEventListener('focus', () => showProgressionDropdown());
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.progression-search-wrapper')) {
            hideProgressionDropdown();
        }
    });
    practiceElements.progressionKey.addEventListener('change', handleProgressionKeyChange);

    // Shared
    practiceElements.startStopBtn.addEventListener('click', togglePractice);
    practiceElements.soundToggle.addEventListener('click', handleSoundToggle);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyPress);

    // Load progressions
    loadProgressions();

    // Initialize chord pool
    updateChordPool();

    // Show initial state
    updateDisplay();
}

/**
 * Show or hide the practice controls (tempo, chord display, beat indicator, start button)
 */
function showPracticeControls(show) {
    const display = show ? '' : 'none';
    practiceElements.tempoSection.style.display = display;
    practiceElements.chordDisplay.style.display = display;
    practiceElements.beatIndicator.style.display = display;
    practiceElements.startStopBtn.style.display = display;
}

/**
 * Handle tab change between random and progression modes
 */
function handleTabChange(mode) {
    // Stop if playing
    if (practiceState.isPlaying) {
        stopPractice();
    }

    practiceState.mode = mode;

    // Update tab styles
    practiceElements.tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    // Show/hide sections
    if (mode === 'random') {
        practiceElements.randomControls.style.display = '';
        practiceElements.progressionSection.style.display = 'none';
        // Always show practice controls in random mode
        showPracticeControls(true);
    } else {
        practiceElements.randomControls.style.display = 'none';
        practiceElements.progressionSection.style.display = '';
        // Hide practice controls until progression is selected
        showPracticeControls(!!practiceState.selectedProgression);
    }

    // Reset display
    practiceState.currentChord = null;
    practiceState.nextChord = null;
    updateDisplay();
}

/**
 * Load progressions from JSON file
 */
async function loadProgressions() {
    try {
        const response = await fetch('progressions.json');
        const data = await response.json();
        practiceState.progressions = data.progressions;

        // Check URL for bookmarked progression
        loadFromUrlParams();
    } catch (error) {
        console.error('Failed to load progressions:', error);
    }
}

/**
 * Handle progression search input
 */
function handleProgressionSearch() {
    const query = practiceElements.progressionSearch.value.toLowerCase();
    showProgressionDropdown(query);
}

/**
 * Show progression dropdown with optional filter
 */
function showProgressionDropdown(filter = '') {
    const dropdown = practiceElements.progressionDropdown;
    dropdown.innerHTML = '';

    const filtered = practiceState.progressions.filter(p =>
        p.name.toLowerCase().includes(filter) ||
        p.numerals.join('-').toLowerCase().includes(filter)
    );

    if (filtered.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    filtered.forEach(progression => {
        const li = document.createElement('li');
        li.className = 'progression-option';
        li.innerHTML = `
            <span class="progression-option-name">${progression.name}</span>
            <span class="progression-option-numerals">(${progression.numerals.join(' - ')})</span>
        `;
        li.addEventListener('click', () => selectProgression(progression));
        dropdown.appendChild(li);
    });

    dropdown.style.display = 'block';
}

/**
 * Hide progression dropdown
 */
function hideProgressionDropdown() {
    practiceElements.progressionDropdown.style.display = 'none';
}

/**
 * Select a progression
 */
function selectProgression(progression, updateUrl = true, useDefaultKey = true) {
    practiceState.selectedProgression = progression;
    practiceElements.progressionSearch.value = progression.name;
    hideProgressionDropdown();

    // Show progression info
    practiceElements.progressionInfo.style.display = '';
    practiceElements.progressionName.textContent = progression.name;
    practiceElements.progressionNumerals.textContent = progression.numerals.join(' - ');
    practiceElements.progressionDescription.textContent = progression.description;

    // Populate songs list
    practiceElements.progressionSongsList.innerHTML = '';
    progression.songs.forEach(song => {
        const li = document.createElement('li');
        li.textContent = song;
        practiceElements.progressionSongsList.appendChild(li);
    });

    // Show key selector
    practiceElements.progressionKeySelector.style.display = '';

    // Set default key based on progression mode (if not overridden by URL)
    if (useDefaultKey) {
        const defaultKey = progression.mode === 'minor' ? 'Am' : 'C';
        practiceState.progressionKey = defaultKey;
        practiceElements.progressionKey.value = defaultKey;
    }

    // Show practice controls
    showPracticeControls(true);

    // Update chords for current key
    updateProgressionChords();

    // Update URL with progression and key
    if (updateUrl) {
        updateUrlParams();
    }
}

/**
 * Update URL with current progression, key, and tempo
 */
function updateUrlParams() {
    const params = new URLSearchParams();
    if (practiceState.selectedProgression) {
        params.set('progression', practiceState.selectedProgression.id);
        params.set('key', practiceState.progressionKey);
    }
    if (practiceState.tempo !== 120) {
        params.set('tempo', practiceState.tempo);
    }
    const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
}

/**
 * Load progression from URL params
 */
function loadFromUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const progressionId = params.get('progression');
    const key = params.get('key');
    const tempo = params.get('tempo');

    // Set tempo if provided
    if (tempo) {
        const tempoValue = parseInt(tempo);
        if (tempoValue >= 60 && tempoValue <= 180) {
            practiceState.tempo = tempoValue;
            practiceElements.tempoSlider.value = tempoValue;
            practiceElements.tempoDisplay.textContent = `${tempoValue} BPM`;
        }
    }

    if (progressionId && practiceState.progressions.length > 0) {
        const progression = practiceState.progressions.find(p => p.id === progressionId);
        if (progression) {
            // Switch to progression tab
            handleTabChange('progression');

            // Set key if provided in URL
            if (key) {
                practiceState.progressionKey = key;
                practiceElements.progressionKey.value = key;
            }

            // Select the progression (don't update URL, and don't use default key if URL had one)
            selectProgression(progression, false, !key);
        }
    }
}

/**
 * Handle progression key change
 */
function handleProgressionKeyChange() {
    practiceState.progressionKey = practiceElements.progressionKey.value;
    updateProgressionChords();
    updateUrlParams();

    // If playing, restart with new key
    if (practiceState.isPlaying) {
        practiceState.progressionIndex = 0;
        practiceState.currentChord = practiceState.progressionChords[0];
        practiceState.nextChord = practiceState.progressionChords[1] || practiceState.progressionChords[0];
        updateDisplay();
    }
}

/**
 * Convert roman numeral to chord name in given key
 */
function numeralToChord(numeral, key) {
    const isMinorKey = key.endsWith('m');
    const rootKey = isMinorKey ? key.slice(0, -1) : key;

    // Major scale degrees
    const majorScale = {
        'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
        'G': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
        'D': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
        'A': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
        'E': ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
        'B': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
        'F': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
        'Bb': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
        'Eb': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
        'Ab': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G']
    };

    // Minor scale degrees (natural minor)
    const minorScale = {
        'A': ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        'E': ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
        'B': ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'],
        'F#': ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],
        'C#': ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'],
        'D': ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
        'G': ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F']
    };

    const scale = isMinorKey ? (minorScale[rootKey] || majorScale[rootKey]) : majorScale[key];
    if (!scale) return numeral;

    // Parse numeral
    const numeralMap = {
        'I': 0, 'i': 0,
        'II': 1, 'ii': 1,
        'III': 2, 'iii': 2,
        'IV': 3, 'iv': 3,
        'V': 4, 'v': 4,
        'VI': 5, 'vi': 5,
        'VII': 6, 'vii': 6
    };

    // Extract base numeral and modifiers
    // Match roman numerals I-VII (case sensitive for major/minor detection)
    const match = numeral.match(/^(VII|VII|VI|VI|IV|IV|V|V|III|III|II|II|I|I|vii|vi|iv|v|iii|ii|i)(.*)/);
    if (!match) return numeral;

    const baseNumeral = match[1];
    const modifier = match[2]; // e.g., '', 'm', '7', etc.

    const degree = numeralMap[baseNumeral];
    if (degree === undefined) return numeral;

    const root = scale[degree];
    const isLowerCase = baseNumeral === baseNumeral.toLowerCase();

    // Build chord name
    let chordName = root;
    if (isLowerCase && !modifier.includes('m')) {
        chordName += 'm';
    }
    if (modifier) {
        chordName += modifier.replace('m', ''); // Avoid double 'm'
    }

    return chordName;
}

/**
 * Update progression chords display for current key
 */
function updateProgressionChords() {
    if (!practiceState.selectedProgression) return;

    const key = practiceState.progressionKey;
    const numerals = practiceState.selectedProgression.numerals;

    // Convert numerals to chord names
    practiceState.progressionChords = numerals.map(n => numeralToChord(n, key));

    // Display chord diagrams
    practiceElements.progressionChords.innerHTML = '';
    practiceState.progressionChords.forEach((chordName, index) => {
        const chordData = CHORDS[chordName];
        if (chordData) {
            const wrapper = document.createElement('div');
            wrapper.className = 'progression-chord-item';

            const numeral = document.createElement('div');
            numeral.className = 'progression-chord-numeral';
            numeral.textContent = numerals[index];
            wrapper.appendChild(numeral);

            const diagram = createChordDiagram(chordData, false, chordName, false, false);
            wrapper.appendChild(diagram);

            practiceElements.progressionChords.appendChild(wrapper);
        }
    });

    // Show the containers
    practiceElements.progressionChords.style.display = '';
    practiceElements.progressionSequence.style.display = '';

    // Display progression sequence
    const sequenceText = practiceState.progressionChords.join(' → ');
    practiceElements.progressionSequence.textContent = sequenceText;
}

/**
 * Handle tempo slider change
 */
function handleTempoChange() {
    practiceState.tempo = parseInt(practiceElements.tempoSlider.value);
    practiceElements.tempoDisplay.textContent = `${practiceState.tempo} BPM`;
    updateUrlParams();

    // If playing, restart with new tempo
    if (practiceState.isPlaying) {
        stopMetronome();
        startMetronome();
    }
}

/**
 * Handle sound toggle button click
 */
function handleSoundToggle() {
    practiceState.playChordSound = !practiceState.playChordSound;
    practiceElements.soundToggle.classList.toggle('active', practiceState.playChordSound);
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyPress(e) {
    // Ignore if typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'p' || e.key === 'P') {
        handleSoundToggle();
    }
}

/**
 * Play the current chord as a downroll strum
 */
function playCurrentChordSound() {
    if (!practiceState.playChordSound || !practiceState.currentChord) return;

    const chordData = CHORDS[practiceState.currentChord];
    if (chordData && typeof playChord === 'function') {
        playChord(chordData);
    }
}

/**
 * Handle chord filter checkbox changes
 */
function handleFilterChange() {
    practiceState.filters.major = practiceElements.filterMajor.checked;
    practiceState.filters.minor = practiceElements.filterMinor.checked;
    practiceState.filters.seventh = practiceElements.filter7th.checked;
    practiceState.filters.sharps = practiceElements.filterSharps.checked;
    practiceState.filters.flats = practiceElements.filterFlats.checked;

    // Ensure at least one chord type filter is active
    if (!practiceState.filters.major && !practiceState.filters.minor && !practiceState.filters.seventh) {
        practiceElements.filterMajor.checked = true;
        practiceState.filters.major = true;
    }


    updateChordPool();

    // If playing, get new chords from updated pool
    if (practiceState.isPlaying) {
        practiceState.currentChord = getRandomChord();
        practiceState.nextChord = getRandomChord();
        updateDisplay();
    }
}

/**
 * Update the chord pool based on current filters
 */
function updateChordPool() {
    practiceState.chordPool = Object.keys(CHORDS).filter(name => {
        // Check accidentals first
        const hasSharp = name.includes('#');
        const hasFlat = name.includes('b');
        const isNatural = !hasSharp && !hasFlat;

        // Filter by accidentals (naturals always included)
        if (!isNatural) {
            if (hasSharp && !practiceState.filters.sharps) return false;
            if (hasFlat && !practiceState.filters.flats) return false;
        }

        // Major chords: no 'm', no '7', no 'dim', no 'aug', no 'sus', no '9'
        const isMajor = !name.includes('m') &&
                        !name.includes('7') &&
                        !name.includes('dim') &&
                        !name.includes('aug') &&
                        !name.includes('sus') &&
                        !name.includes('9');

        // Minor chords: ends with 'm' but not 'dim', no '7'
        const isMinor = (name.endsWith('m') || name.match(/m$/)) &&
                        !name.includes('7') &&
                        !name.includes('dim') &&
                        !name.includes('maj');

        // 7th chords: contains '7'
        const is7th = name.includes('7');

        if (practiceState.filters.major && isMajor) return true;
        if (practiceState.filters.minor && isMinor) return true;
        if (practiceState.filters.seventh && is7th) return true;
        return false;
    });
}

/**
 * Handle cycle same root mode change
 */
function handleCycleModeChange() {
    practiceState.cycleSameRoot = practiceElements.cycleSameRoot.checked;

    // Reset cycle state
    practiceState.currentRoot = null;
    practiceState.rootCycleIndex = 0;
    practiceState.rootChords = [];

    // If playing, restart with new mode
    if (practiceState.isPlaying) {
        if (practiceState.cycleSameRoot) {
            startNewRootCycle();
        } else {
            practiceState.currentChord = getRandomChord();
            practiceState.nextChord = getRandomChord();
        }
        updateDisplay();
    }
}

/**
 * Extract root note from chord name (e.g., "Am7" -> "A", "F#m" -> "F#")
 */
function getChordRoot(chordName) {
    const match = chordName.match(/^([A-G][#b]?)/);
    return match ? match[1] : null;
}

/**
 * Get all available roots based on current filters
 */
function getAvailableRoots() {
    const roots = new Set();
    practiceState.chordPool.forEach(chord => {
        const root = getChordRoot(chord);
        if (root) roots.add(root);
    });
    return Array.from(roots);
}

/**
 * Get all chords for a given root from the current pool
 */
function getChordsForRoot(root) {
    return practiceState.chordPool.filter(chord => getChordRoot(chord) === root);
}

/**
 * Start a new root cycle with a random root
 */
function startNewRootCycle() {
    const availableRoots = getAvailableRoots();
    if (availableRoots.length === 0) return;

    // Pick a random root (avoid same root if possible)
    let roots = availableRoots;
    if (practiceState.currentRoot && availableRoots.length > 1) {
        roots = availableRoots.filter(r => r !== practiceState.currentRoot);
    }

    const randomIndex = Math.floor(Math.random() * roots.length);
    practiceState.currentRoot = roots[randomIndex];
    practiceState.rootChords = getChordsForRoot(practiceState.currentRoot);
    practiceState.rootCycleIndex = 0;

    // Shuffle the chords for this root
    shuffleArray(practiceState.rootChords);
}

/**
 * Shuffle array in place (Fisher-Yates)
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Get next chord in cycle same root mode
 */
function getNextCycleChord() {
    if (practiceState.rootChords.length === 0) {
        startNewRootCycle();
    }

    if (practiceState.rootChords.length === 0) return null;

    // If we've cycled through all chords for this root, start new root
    if (practiceState.rootCycleIndex >= practiceState.rootChords.length) {
        startNewRootCycle();
    }

    const chord = practiceState.rootChords[practiceState.rootCycleIndex];
    practiceState.rootCycleIndex++;

    return chord;
}

/**
 * Get next chord in progression mode
 */
function getNextProgressionChord() {
    if (practiceState.progressionChords.length === 0) return null;

    practiceState.progressionIndex = (practiceState.progressionIndex + 1) % practiceState.progressionChords.length;
    return practiceState.progressionChords[practiceState.progressionIndex];
}

/**
 * Get a random chord from the pool (avoiding the current chord)
 */
function getRandomChord() {
    // Use progression mode if enabled
    if (practiceState.mode === 'progression') {
        return getNextProgressionChord();
    }

    // Use cycle mode if enabled
    if (practiceState.cycleSameRoot) {
        return getNextCycleChord();
    }

    if (practiceState.chordPool.length === 0) return null;

    let available = practiceState.chordPool;

    // Avoid repeating the current chord if possible
    if (practiceState.currentChord && practiceState.chordPool.length > 1) {
        available = practiceState.chordPool.filter(c => c !== practiceState.currentChord);
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
}

/**
 * Toggle practice on/off
 */
function togglePractice() {
    if (practiceState.isPlaying) {
        stopPractice();
    } else {
        startPractice();
    }
}

/**
 * Start practice session
 */
function startPractice() {
    // Check if progression mode has a selected progression
    if (practiceState.mode === 'progression' && !practiceState.selectedProgression) {
        alert('Please select a progression first');
        return;
    }

    // Initialize audio context (needs user gesture)
    getAudioContext();

    practiceState.isPlaying = true;
    practiceState.currentBeat = 0;
    practiceState.isCountingIn = true; // Start with count-in
    practiceState.firstBeat = true; // Skip chord advance on first beat

    if (practiceState.mode === 'progression') {
        // Progression mode
        practiceState.progressionIndex = 0;
        // During count-in, show first chord in preview
        practiceState.currentChord = null;
        practiceState.nextChord = practiceState.progressionChords[0];
    } else {
        // Random mode
        // Reset cycle state
        practiceState.currentRoot = null;
        practiceState.rootCycleIndex = 0;
        practiceState.rootChords = [];

        // Get initial chords
        if (practiceState.cycleSameRoot) {
            startNewRootCycle();
        }
        // During count-in, show first chord in preview
        practiceState.currentChord = null;
        practiceState.nextChord = getRandomChord();
    }

    updateDisplay();
    updateButtonState();
    startMetronome();
}

/**
 * Stop practice session
 */
function stopPractice() {
    practiceState.isPlaying = false;
    practiceState.isCountingIn = false;
    stopMetronome();
    updateButtonState();
    clearBeatIndicator();
}

/**
 * Start the metronome
 */
function startMetronome() {
    const beatDuration = (60 / practiceState.tempo) * 1000; // ms per beat

    // Play first beat immediately
    onBeat();

    practiceState.intervalId = setInterval(onBeat, beatDuration);
}

/**
 * Stop the metronome
 */
function stopMetronome() {
    if (practiceState.intervalId) {
        clearInterval(practiceState.intervalId);
        practiceState.intervalId = null;
    }
}

/**
 * Called on each beat
 */
function onBeat() {
    // Advance chord at the START of beat 1 (before tick plays)
    // Skip on very first beat to preserve count-in
    if (practiceState.currentBeat === 0 && !practiceState.firstBeat) {
        advanceChord();
        highlightTransition();
    }
    practiceState.firstBeat = false;

    // Play metronome tick
    const isAccent = practiceState.currentBeat === 0;
    playMetronomeTick(isAccent);

    // Update beat indicator
    updateBeatIndicator();

    // Increment beat
    practiceState.currentBeat = (practiceState.currentBeat + 1) % 4;
}

/**
 * Play metronome tick sound
 */
function playMetronomeTick(accent = false) {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Higher pitch and louder for accent (beat 1)
    osc.frequency.value = accent ? 1000 : 800;
    osc.type = 'sine';

    const volume = accent ? 0.3 : 0.15;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
}

/**
 * Advance to the next chord
 */
function advanceChord() {
    // If counting in, transition to first real chord
    if (practiceState.isCountingIn) {
        practiceState.isCountingIn = false;
        practiceState.currentChord = practiceState.nextChord;

        // Get the next chord after the first one
        if (practiceState.mode === 'progression') {
            practiceState.progressionIndex = 1;
            practiceState.nextChord = practiceState.progressionChords[1] || practiceState.progressionChords[0];
        } else {
            practiceState.nextChord = getRandomChord();
        }
    } else {
        practiceState.currentChord = practiceState.nextChord;
        practiceState.nextChord = getRandomChord();
    }
    updateDisplay();
    playCurrentChordSound();
}

/**
 * Highlight the transition with a subtle animation
 */
function highlightTransition() {
    practiceElements.chordDisplay.classList.add('transitioning');
    setTimeout(() => {
        practiceElements.chordDisplay.classList.remove('transitioning');
    }, 200);
}

/**
 * Update the chord display
 */
function updateDisplay() {
    // Update current chord
    if (practiceState.isCountingIn) {
        // Show "Get Ready!" during count-in
        practiceElements.currentChordName.textContent = 'Get Ready!';
        practiceElements.currentChordDiagram.innerHTML = '';
    } else if (practiceState.currentChord && CHORDS[practiceState.currentChord]) {
        practiceElements.currentChordName.textContent = practiceState.currentChord;
        practiceElements.currentChordDiagram.innerHTML = '';

        const chordData = CHORDS[practiceState.currentChord];
        const svg = createChordSVG(chordData, true);
        practiceElements.currentChordDiagram.appendChild(svg);
    } else {
        practiceElements.currentChordName.textContent = 'Press Start';
        practiceElements.currentChordDiagram.innerHTML = '';
    }

    // Update next chord preview
    if (practiceState.nextChord && CHORDS[practiceState.nextChord]) {
        practiceElements.nextChordName.textContent = practiceState.nextChord;
        practiceElements.nextChordDiagram.innerHTML = '';

        const chordData = CHORDS[practiceState.nextChord];
        const svg = createChordSVG(chordData, false);
        practiceElements.nextChordDiagram.appendChild(svg);

        practiceElements.nextChordPreview.style.display = 'flex';
    } else {
        practiceElements.nextChordName.textContent = '-';
        practiceElements.nextChordDiagram.innerHTML = '';
        practiceElements.nextChordPreview.style.display = practiceState.isPlaying ? 'flex' : 'none';
    }
}

/**
 * Update the beat indicator dots
 */
function updateBeatIndicator() {
    const dots = practiceElements.beatIndicator.querySelectorAll('.beat-dot');
    dots.forEach((dot, index) => {
        if (index === practiceState.currentBeat) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

/**
 * Clear the beat indicator
 */
function clearBeatIndicator() {
    const dots = practiceElements.beatIndicator.querySelectorAll('.beat-dot');
    dots.forEach(dot => dot.classList.remove('active'));
}

/**
 * Update the start/stop button state
 */
function updateButtonState() {
    const btn = practiceElements.startStopBtn;
    const icon = btn.querySelector('.btn-icon');
    const text = btn.querySelector('.btn-text');

    if (practiceState.isPlaying) {
        btn.classList.add('playing');
        icon.innerHTML = '&#9632;'; // Stop square
        text.textContent = 'Stop';
    } else {
        btn.classList.remove('playing');
        icon.innerHTML = '&#9654;'; // Play triangle
        text.textContent = 'Start';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPractice);
