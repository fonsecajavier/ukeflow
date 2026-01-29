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
    tempo: 60,
    intervalId: null,
    chordPool: [],
    filters: {
        major: true,
        minor: true,
        seventh: false,
        sharps: false,
        flats: false
    }
};

// DOM elements
const practiceElements = {
    tempoSlider: document.getElementById('tempo-slider'),
    tempoDisplay: document.getElementById('tempo-display'),
    filterMajor: document.getElementById('filter-major'),
    filterMinor: document.getElementById('filter-minor'),
    filter7th: document.getElementById('filter-7th'),
    filterSharps: document.getElementById('filter-sharps'),
    filterFlats: document.getElementById('filter-flats'),
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
    // Set up event listeners
    practiceElements.tempoSlider.addEventListener('input', handleTempoChange);
    practiceElements.filterMajor.addEventListener('change', handleFilterChange);
    practiceElements.filterMinor.addEventListener('change', handleFilterChange);
    practiceElements.filter7th.addEventListener('change', handleFilterChange);
    practiceElements.filterSharps.addEventListener('change', handleFilterChange);
    practiceElements.filterFlats.addEventListener('change', handleFilterChange);
    practiceElements.startStopBtn.addEventListener('click', togglePractice);

    // Initialize chord pool
    updateChordPool();

    // Show initial state
    updateDisplay();
}

/**
 * Handle tempo slider change
 */
function handleTempoChange() {
    practiceState.tempo = parseInt(practiceElements.tempoSlider.value);
    practiceElements.tempoDisplay.textContent = `${practiceState.tempo} BPM`;

    // If playing, restart with new tempo
    if (practiceState.isPlaying) {
        stopMetronome();
        startMetronome();
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
 * Get a random chord from the pool (avoiding the current chord)
 */
function getRandomChord() {
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
    // Initialize audio context (needs user gesture)
    getAudioContext();

    practiceState.isPlaying = true;
    practiceState.currentBeat = 0;

    // Get initial chords
    practiceState.currentChord = getRandomChord();
    practiceState.nextChord = getRandomChord();

    updateDisplay();
    updateButtonState();
    startMetronome();
}

/**
 * Stop practice session
 */
function stopPractice() {
    practiceState.isPlaying = false;
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
    // Play metronome tick
    const isAccent = practiceState.currentBeat === 0;
    playMetronomeTick(isAccent);

    // Update beat indicator
    updateBeatIndicator();

    // Advance to next chord on beat 0 (except first time)
    if (practiceState.currentBeat === 0 && practiceState.currentChord) {
        // Only advance after the first 4 beats
        if (practiceState.intervalId) {
            highlightTransition();
        }
    }

    // Increment beat
    practiceState.currentBeat = (practiceState.currentBeat + 1) % 4;

    // Advance chord after beat 4 (when we wrap to 0)
    if (practiceState.currentBeat === 0) {
        advanceChord();
    }
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
    practiceState.currentChord = practiceState.nextChord;
    practiceState.nextChord = getRandomChord();
    updateDisplay();
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
    if (practiceState.currentChord && CHORDS[practiceState.currentChord]) {
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
