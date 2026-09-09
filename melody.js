/**
 * UkeFlow - Melody Practice
 *
 * The Scales tab of Practice Mode. Its goal is not to display scales but to make
 * a key feel automatic: hear it, then find it without looking.
 *
 * Three drills, deliberately different in what they train:
 *   Listen     - the app plays the box over a held tonic drone. Trains the EAR.
 *                The drone is what makes a b3 sound minor rather than just
 *                sounding like a pitch.
 *   Ear Drill  - the app sounds one degree; you tap where it lives. Trains the
 *                mapping from a heard note to a fret, which is the actual skill
 *                behind "a song in Gm comes naturally".
 *   Play Along - metronome names the next note; you play it. Trains the HAND.
 *
 * Everything on the fretboard comes from getMelodyBox() in scales.js, which
 * picks one hand position per key. See that module for why the box never uses
 * the G string.
 *
 * Loaded after practice.js, and uses playMetronomeTick() from it.
 */

const melodyState = {
    root: 'G',
    type: 'minor',
    pattern: 'up-down',
    drill: 'listen',
    box: null,
    flipped: true,
    droneEnabled: true,
    showDegrees: true,

    isRunning: false,
    intervalId: null,
    sequence: [],
    sequenceIndex: 0,
    activePathIndex: null,
    beat: 0,

    // Ear drill
    target: null,
    // The pending "move to the next question" timer. Tracked so it can be
    // cancelled: an untracked timer fired after a Stop and a quick Start again,
    // double-advancing the drill.
    earTimeoutId: null,
    awaitingAnswer: false,
    revealed: false,
    lastAnswerCorrect: null,
    score: { correct: 0, total: 0, streak: 0, bestStreak: 0 },
};

const melodyElements = {};

// Roots offered in the key selector, spelled the way players write them.
const MELODY_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Scale types offered, in teaching order rather than alphabetical.
const MELODY_TYPE_ORDER = [
    'major', 'minor', 'major-pentatonic', 'minor-pentatonic', 'blues',
    'harmonic-minor', 'melodic-minor', 'dorian', 'mixolydian', 'lydian',
    'phrygian', 'locrian',
];

const DRILL_HINTS = {
    listen: 'The app plays the scale over a held tonic. Just listen first - the drone ' +
            'is what makes each degree sound like a job (the 5 settles, the b7 wants to fall) ' +
            'instead of just a pitch. Play along once it sticks.',
    ear: 'A single note from the scale is played over the tonic. Tap where you think it ' +
         'is on the fretboard. The dots are hidden on purpose - this is the drill that ' +
         'makes a key feel familiar.',
    play: 'The metronome names the next note and waits for you to play it. Nothing is ' +
          'sounded for you, so your hand has to know the shape.',
};

/**
 * Cache DOM references and wire up the tab. Called from initPractice().
 */
function initMelodyPractice() {
    const ids = {
        section: 'scales-section',
        root: 'scale-root',
        type: 'scale-type',
        pattern: 'scale-pattern',
        patternControl: 'scale-pattern-control',
        description: 'scale-description',
        drillTabs: 'scale-drill-tabs',
        drillHint: 'scale-drill-hint',
        boxInfo: 'scale-box-info',
        fretboard: 'scale-fretboard',
        flip: 'scale-flip',
        drone: 'scale-drone',
        degrees: 'scale-degrees',
        notice: 'scale-notice',
        status: 'scale-status',
        score: 'scale-score',
        insight: 'scale-insight',
    };
    Object.entries(ids).forEach(([key, id]) => {
        melodyElements[key] = document.getElementById(id);
    });
    if (!melodyElements.section) return;

    populateMelodySelectors();

    melodyElements.root.addEventListener('change', handleMelodySettingChange);
    melodyElements.type.addEventListener('change', handleMelodySettingChange);
    melodyElements.pattern.addEventListener('change', () => {
        melodyState.pattern = melodyElements.pattern.value;
        if (melodyState.isRunning) restartMelodySequence();
    });
    melodyElements.flip.addEventListener('click', () => {
        melodyState.flipped = !melodyState.flipped;
        renderMelodyFretboard();
    });
    melodyElements.drone.addEventListener('change', handleDroneToggle);
    melodyElements.degrees.addEventListener('change', () => {
        melodyState.showDegrees = melodyElements.degrees.checked;
        renderMelodyFretboard();
    });

    melodyElements.drillTabs.querySelectorAll('.scale-drill-tab').forEach(tab => {
        tab.addEventListener('click', () => setMelodyDrill(tab.dataset.drill));
    });

    // Runs the drill setup for the default drill, so the hint and the pattern
    // selector are correct before the user touches anything.
    setMelodyDrill(melodyState.drill);
    updateMelodyBox();
}

/**
 * Fill the key, scale and pattern selectors.
 */
function populateMelodySelectors() {
    melodyElements.root.innerHTML = '';
    MELODY_ROOTS.forEach(root => {
        const option = document.createElement('option');
        option.value = root;
        option.textContent = root;
        if (root === melodyState.root) option.selected = true;
        melodyElements.root.appendChild(option);
    });

    melodyElements.type.innerHTML = '';
    MELODY_TYPE_ORDER.forEach(key => {
        const type = SCALE_TYPES[key];
        if (!type) return;
        const option = document.createElement('option');
        option.value = key;
        option.textContent = type.name;
        if (key === melodyState.type) option.selected = true;
        melodyElements.type.appendChild(option);
    });

    melodyElements.pattern.innerHTML = '';
    Object.entries(SCALE_PATTERNS).forEach(([key, pattern]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = pattern.name;
        if (key === melodyState.pattern) option.selected = true;
        melodyElements.pattern.appendChild(option);
    });
}

/**
 * Key or scale type changed: rebuild the box and, if a drill is running, move it
 * to the new key rather than leaving stale notes on screen.
 */
function handleMelodySettingChange() {
    melodyState.root = melodyElements.root.value;
    melodyState.type = melodyElements.type.value;
    updateMelodyBox();
    updateMelodyUrlParams();

    if (melodyState.isRunning) {
        restartMelodySequence();
        if (melodyState.droneEnabled) startMelodyDrone();
    }
}

/**
 * Recompute the melody box and redraw everything that depends on it.
 */
function updateMelodyBox() {
    melodyState.box = getMelodyBox(melodyState.root, melodyState.type);
    melodyState.activePathIndex = null;
    melodyState.target = null;
    melodyState.awaitingAnswer = false;
    melodyState.revealed = false;
    melodyState.lastAnswerCorrect = null;

    renderMelodyInfo();
    renderMelodyFretboard();
    renderMelodyStatus();
    renderMelodyScore();
}

/**
 * The written description of the box: what it is, where it sits, and what the
 * instrument refuses to give you.
 */
function renderMelodyInfo() {
    const box = melodyState.box;
    if (!box) return;

    const type = SCALE_TYPES[melodyState.type];
    melodyElements.description.textContent = type ? type.description : '';

    if (!box.path.length) {
        melodyElements.boxInfo.textContent = '';
        melodyElements.notice.textContent = box.notice || '';
        melodyElements.notice.style.display = box.notice ? '' : 'none';
        return;
    }

    const stretch = box.width > 4
        ? `${box.width}-fret stretch`
        : `${box.width}-fret position`;
    const spanLabel = box.lo === 0
        ? 'open strings to fret ' + box.hi
        : `frets ${box.lo}–${box.hi}`;

    melodyElements.boxInfo.innerHTML = '';
    const heading = document.createElement('div');
    heading.className = 'scale-box-heading';
    heading.textContent = `${box.root} ${box.typeName}`;
    melodyElements.boxInfo.appendChild(heading);

    const detail = document.createElement('div');
    detail.className = 'scale-box-detail';
    detail.textContent = `One hand position: ${spanLabel} (${stretch}). ` +
        `${box.path.length} notes${box.fullOctave ? ', tonic to octave' : ', no octave available'}.`;
    melodyElements.boxInfo.appendChild(detail);

    // The finding worth teaching: melody sits on C-E-A, the re-entrant G string
    // stays out of the way. Stated from the computed path, not hardcoded.
    if (melodyElements.insight) {
        const strings = [...new Set(melodyState.box.path.map(step => 'GCEA'[step.string]))];
        melodyElements.insight.textContent = box.usesGString
            ? `This shape uses the G string (${strings.join('-')}).`
            : `Notice the shape only uses the ${strings.join('-')} strings. The G string is ` +
              `tuned higher than the C and E strings, so leaving it out is what keeps the run ` +
              `ascending under your fingers - this is why guitar scale charts do not transfer.`;
    }

    melodyElements.notice.textContent = box.notice || '';
    melodyElements.notice.style.display = box.notice ? '' : 'none';
}

/**
 * Draw the fretboard with the box marked.
 *
 * In the ear drill the dots are hidden until the answer is revealed - showing
 * them would turn an ear test into a reading test.
 */
function renderMelodyFretboard() {
    const box = melodyState.box;
    if (!melodyElements.fretboard) return;

    melodyElements.fretboard.innerHTML = '';
    if (!box || !box.path.length) return;

    const hideNotes = melodyState.drill === 'ear' && !melodyState.revealed;

    const markers = [];
    box.path.forEach((step, index) => {
        const isActive = melodyState.activePathIndex === index;
        const isTarget = melodyState.target && melodyState.target.pathIndex === index;

        if (hideNotes && !isTarget) return;
        if (hideNotes && isTarget && !melodyState.revealed) return;

        const classes = [];
        if (step.isRoot) classes.push('scale-note-root');
        if (isActive) classes.push('scale-note-active');
        if (isTarget && melodyState.revealed) classes.push('scale-note-target');

        markers.push({
            string: step.string,
            fret: step.fret,
            label: melodyState.showDegrees ? step.degree : step.noteName,
            className: classes.join(' '),
            dimmed: !isActive && melodyState.isRunning && melodyState.drill !== 'ear',
        });
    });

    // Mark a wrong guess where it was tapped, so the mistake is visible next to
    // the right answer.
    if (melodyState.lastAnswerCorrect === false && melodyState.lastGuess) {
        markers.push({
            string: melodyState.lastGuess.string,
            fret: melodyState.lastGuess.fret,
            label: melodyState.lastGuess.noteName,
            className: 'scale-note-wrong',
        });
    }

    const svg = createFretboardSVG(
        [null, null, null, null],
        {
            onFretClick: (stringIndex, fret) => handleMelodyFretClick(stringIndex, fret),
            onOpenClick: (stringIndex) => handleMelodyFretClick(stringIndex, 0),
        },
        melodyState.flipped,
        markers
    );
    melodyElements.fretboard.appendChild(svg);
}

/**
 * Tapping the fretboard: answers the ear drill, or just sounds the note.
 */
function handleMelodyFretClick(stringIndex, fret) {
    if (melodyState.drill === 'ear' && melodyState.awaitingAnswer) {
        submitEarAnswer(stringIndex, fret);
        return;
    }
    playFretNote(stringIndex, fret);
}

// ---------------------------------------------------------------------------
// Drills
// ---------------------------------------------------------------------------

/**
 * Switch drill. Stops anything running, because the drills mean different
 * things by "playing".
 */
function setMelodyDrill(drill) {
    if (melodyState.isRunning) stopMelodyPractice();

    melodyState.drill = drill;
    melodyState.revealed = false;
    melodyState.target = null;
    melodyState.awaitingAnswer = false;
    melodyState.lastAnswerCorrect = null;
    melodyState.lastGuess = null;

    melodyElements.drillTabs.querySelectorAll('.scale-drill-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.drill === drill);
    });
    melodyElements.drillHint.textContent = DRILL_HINTS[drill] || '';

    // The pattern selector only means something when something is playing a
    // sequence; the ear drill picks notes at random by definition.
    if (melodyElements.patternControl) {
        melodyElements.patternControl.style.display = drill === 'ear' ? 'none' : '';
    }

    renderMelodyFretboard();
    renderMelodyStatus();
    renderMelodyScore();
    updateMelodyUrlParams();
}

/**
 * Start/stop, driven by the shared Start button.
 */
function toggleMelodyPractice() {
    if (melodyState.isRunning) {
        stopMelodyPractice();
    } else {
        startMelodyPractice();
    }
}

async function startMelodyPractice() {
    const box = melodyState.box;
    if (!box || !box.path.length) return;

    await ensureAudioReady();

    melodyState.isRunning = true;
    melodyState.beat = 0;
    melodyState.score = { correct: 0, total: 0, streak: 0, bestStreak: 0 };

    if (melodyState.droneEnabled) await startMelodyDrone();

    if (melodyState.drill === 'ear') {
        nextEarQuestion();
    } else {
        buildMelodySequence();
        startMelodyLoop();
    }

    updateMelodyButtonState();
    renderMelodyStatus();
    renderMelodyScore();
}

function stopMelodyPractice() {
    melodyState.isRunning = false;
    stopMelodyLoop();
    clearEarTimeout();
    stopDrone(true);

    melodyState.activePathIndex = null;
    melodyState.awaitingAnswer = false;
    melodyState.target = null;
    melodyState.revealed = false;

    updateMelodyButtonState();
    renderMelodyFretboard();
    renderMelodyStatus();
    clearMelodyBeatIndicator();
}

/**
 * Start the tonic drone at the pitch of the box's tonic, so the drone and the
 * scale are in the same octave.
 */
async function startMelodyDrone() {
    const box = melodyState.box;
    if (!box || !box.path.length) return;
    // MIDI to Hz, with A4 = 440 = MIDI 69
    const frequency = 440 * Math.pow(2, (box.tonicMidi - 69) / 12);
    await startDrone(frequency);
}

function handleDroneToggle() {
    melodyState.droneEnabled = melodyElements.drone.checked;
    if (!melodyState.isRunning) return;

    if (melodyState.droneEnabled) {
        startMelodyDrone();
    } else {
        stopDrone(true);
    }
}

/**
 * Turn the chosen pattern into a list of indices into the box path.
 */
function buildMelodySequence() {
    const box = melodyState.box;
    const pattern = SCALE_PATTERNS[melodyState.pattern] || SCALE_PATTERNS['up'];
    melodyState.sequence = pattern.build(box.path.length);
    melodyState.sequenceIndex = 0;
}

function restartMelodySequence() {
    if (melodyState.drill === 'ear') return;
    buildMelodySequence();
    melodyState.activePathIndex = null;
}

function startMelodyLoop() {
    stopMelodyLoop();
    const beatDuration = (60 / getMelodyTempo()) * 1000;
    melodyTick();
    melodyState.intervalId = setInterval(melodyTick, beatDuration);
}

function stopMelodyLoop() {
    if (melodyState.intervalId) {
        clearInterval(melodyState.intervalId);
        melodyState.intervalId = null;
    }
}

function getMelodyTempo() {
    return (typeof practiceState !== 'undefined' && practiceState.tempo)
        ? practiceState.tempo
        : 120;
}

/**
 * One beat of Listen or Play Along.
 */
function melodyTick() {
    const box = melodyState.box;
    if (!box || !melodyState.sequence.length) return;

    if (melodyState.sequenceIndex >= melodyState.sequence.length) {
        // Loop, reshuffling if the pattern is random so it is not the same
        // order every time round.
        buildMelodySequence();
    }

    const pathIndex = melodyState.sequence[melodyState.sequenceIndex];
    const step = box.path[pathIndex];
    melodyState.activePathIndex = pathIndex;
    melodyState.sequenceIndex++;

    if (melodyState.drill === 'listen') {
        playFretNote(step.string, step.fret, { duration: 1.2, volume: 0.32 });
    } else {
        // Play Along: the click keeps time, the player makes the note.
        if (typeof playMetronomeTick === 'function') {
            playMetronomeTick(melodyState.beat === 0);
        }
    }

    updateMelodyBeatIndicator();
    melodyState.beat = (melodyState.beat + 1) % 4;

    renderMelodyFretboard();
    renderMelodyStatus();
}

// ---------------------------------------------------------------------------
// Ear drill
// ---------------------------------------------------------------------------

/**
 * Sound one note from the box and wait for the player to find it.
 *
 * Never repeats the previous note twice in a row - a repeat is answered from
 * memory rather than by hearing it.
 */
function nextEarQuestion() {
    const box = melodyState.box;
    if (!box || !box.path.length) return;

    clearEarTimeout();

    const previous = melodyState.target ? melodyState.target.pathIndex : null;
    let pathIndex = previous;
    if (box.path.length > 1) {
        while (pathIndex === previous) {
            pathIndex = Math.floor(Math.random() * box.path.length);
        }
    } else {
        pathIndex = 0;
    }

    melodyState.target = { pathIndex, step: box.path[pathIndex] };
    melodyState.awaitingAnswer = true;
    melodyState.revealed = false;
    melodyState.lastAnswerCorrect = null;
    melodyState.lastGuess = null;

    renderMelodyFretboard();
    renderMelodyStatus();
    playEarTarget();
}

function playEarTarget() {
    if (!melodyState.target) return;
    const { step } = melodyState.target;
    playFretNote(step.string, step.fret, { duration: 1.8, volume: 0.36 });
}

/**
 * Judge a tap.
 *
 * Correct means the same PITCH, not the same fret: on a re-entrant instrument
 * the same note genuinely exists in more than one place, and finding it
 * somewhere else is a right answer, not a wrong one.
 */
function submitEarAnswer(stringIndex, fret) {
    if (!melodyState.target || !melodyState.awaitingAnswer) return;

    const guessMidi = fretToMidi(stringIndex, fret);
    const targetMidi = melodyState.target.step.midi;
    const correct = guessMidi === targetMidi;

    melodyState.awaitingAnswer = false;
    melodyState.revealed = true;
    melodyState.lastAnswerCorrect = correct;
    melodyState.lastGuess = {
        string: stringIndex,
        fret,
        midi: guessMidi,
        noteName: guessMidi === null
            ? '?'
            : scaleNoteName(guessMidi, melodyState.root, melodyState.type),
        // Same pitch found somewhere other than the box position
        elsewhere: correct && !(stringIndex === melodyState.target.step.string &&
                                fret === melodyState.target.step.fret),
    };

    melodyState.score.total++;
    if (correct) {
        melodyState.score.correct++;
        melodyState.score.streak++;
        melodyState.score.bestStreak = Math.max(melodyState.score.bestStreak, melodyState.score.streak);
    } else {
        melodyState.score.streak = 0;
    }

    renderMelodyFretboard();
    renderMelodyStatus();
    renderMelodyScore();

    // Let the answer be seen and heard before moving on.
    clearEarTimeout();
    melodyState.earTimeoutId = setTimeout(() => {
        melodyState.earTimeoutId = null;
        if (melodyState.isRunning && melodyState.drill === 'ear') nextEarQuestion();
    }, correct ? 1400 : 2400);
}

/**
 * Cancel a pending move to the next ear-drill question.
 */
function clearEarTimeout() {
    if (melodyState.earTimeoutId !== null) {
        clearTimeout(melodyState.earTimeoutId);
        melodyState.earTimeoutId = null;
    }
}

// ---------------------------------------------------------------------------
// Status, score, button, beat indicator
// ---------------------------------------------------------------------------

function renderMelodyStatus() {
    if (!melodyElements.status) return;
    const box = melodyState.box;

    if (!box || !box.path.length) {
        melodyElements.status.textContent = '';
        melodyElements.status.className = 'scale-status';
        return;
    }

    if (melodyState.drill === 'ear') {
        if (!melodyState.isRunning) {
            melodyElements.status.textContent = 'Press Start, then tap the note you hear.';
            melodyElements.status.className = 'scale-status';
            return;
        }
        if (melodyState.awaitingAnswer) {
            melodyElements.status.textContent = 'Listening… tap where that note is.';
            melodyElements.status.className = 'scale-status scale-status-waiting';
            return;
        }
        if (melodyState.lastAnswerCorrect === true) {
            const guess = melodyState.lastGuess;
            melodyElements.status.textContent = guess && guess.elsewhere
                ? `Right note - that is the same pitch in another place. It is also at ` +
                  `${'GCEA'[melodyState.target.step.string]} string fret ${melodyState.target.step.fret}.`
                : `Correct - ${melodyState.target.step.noteName} (the ${melodyState.target.step.degree}).`;
            melodyElements.status.className = 'scale-status scale-status-correct';
            return;
        }
        if (melodyState.lastAnswerCorrect === false) {
            const target = melodyState.target.step;
            melodyElements.status.textContent =
                `That was ${melodyState.lastGuess.noteName}. The note was ` +
                `${target.noteName} - the ${target.degree} - on the ` +
                `${'GCEA'[target.string]} string at fret ${target.fret}.`;
            melodyElements.status.className = 'scale-status scale-status-wrong';
            return;
        }
        melodyElements.status.textContent = '';
        melodyElements.status.className = 'scale-status';
        return;
    }

    if (!melodyState.isRunning) {
        melodyElements.status.textContent = melodyState.drill === 'listen'
            ? 'Press Start to hear the scale over its tonic. Tap any dot to hear that note.'
            : 'Press Start. The metronome will name each note - you play it.';
        melodyElements.status.className = 'scale-status';
        return;
    }

    const step = melodyState.activePathIndex !== null ? box.path[melodyState.activePathIndex] : null;
    if (!step) {
        melodyElements.status.textContent = '';
        return;
    }
    melodyElements.status.innerHTML =
        `<strong>${escapeHtml(step.noteName)}</strong> — the ${escapeHtml(step.degree)} ` +
        `— ${'GCEA'[step.string]} string, ${step.fret === 0 ? 'open' : 'fret ' + step.fret}`;
    melodyElements.status.className = 'scale-status scale-status-playing';
}

function renderMelodyScore() {
    if (!melodyElements.score) return;

    if (melodyState.drill !== 'ear' || melodyState.score.total === 0) {
        melodyElements.score.style.display = 'none';
        return;
    }

    const { correct, total, streak, bestStreak } = melodyState.score;
    const percent = Math.round((correct / total) * 100);
    melodyElements.score.style.display = '';
    melodyElements.score.textContent =
        `${correct}/${total} correct (${percent}%) · streak ${streak} · best ${bestStreak}`;
}

/**
 * The shared Start/Stop button, relabelled for the active drill.
 */
function updateMelodyButtonState() {
    const btn = document.getElementById('start-stop-btn');
    if (!btn) return;
    const icon = btn.querySelector('.btn-icon');
    const text = btn.querySelector('.btn-text');

    if (melodyState.isRunning) {
        btn.classList.add('playing');
        icon.innerHTML = '&#9632;';
        text.textContent = 'Stop';
    } else {
        btn.classList.remove('playing');
        icon.innerHTML = '&#9654;';
        text.textContent = melodyState.drill === 'ear' ? 'Start ear drill' : 'Start';
    }
}

function updateMelodyBeatIndicator() {
    const indicator = document.getElementById('beat-indicator');
    if (!indicator) return;
    indicator.querySelectorAll('.beat-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === melodyState.beat);
    });
}

function clearMelodyBeatIndicator() {
    const indicator = document.getElementById('beat-indicator');
    if (!indicator) return;
    indicator.querySelectorAll('.beat-dot').forEach(dot => dot.classList.remove('active'));
}

/**
 * Called by practice.js when the tempo slider moves.
 */
function handleMelodyTempoChange() {
    if (melodyState.isRunning && melodyState.drill !== 'ear') {
        startMelodyLoop();
    }
}

// ---------------------------------------------------------------------------
// Visibility and URL
// ---------------------------------------------------------------------------

/**
 * Show or hide the Scales tab and the shared controls it uses.
 *
 * The chord display is never shown here (there is no chord), and the beat
 * indicator only appears for Play Along, where a click is actually keeping time.
 */
function showMelodySection(show) {
    if (!melodyElements.section) return;
    melodyElements.section.style.display = show ? '' : 'none';

    const tempoSection = document.getElementById('tempo-section');
    const chordDisplay = document.getElementById('chord-display');
    const beatIndicator = document.getElementById('beat-indicator');
    const startBtn = document.getElementById('start-stop-btn');
    const nextPreview = document.getElementById('next-chord-preview');
    const soundToggle = document.getElementById('sound-toggle');

    if (!show) return;

    if (chordDisplay) chordDisplay.style.display = 'none';
    if (nextPreview) nextPreview.style.display = 'none';
    if (soundToggle) soundToggle.style.display = 'none';
    if (tempoSection) tempoSection.style.display = melodyState.drill === 'ear' ? 'none' : '';
    if (beatIndicator) beatIndicator.style.display = melodyState.drill === 'play' ? '' : 'none';
    if (startBtn) startBtn.style.display = '';

    updateMelodyButtonState();
}

/**
 * Restore the shared controls the chord modes expect. Called when leaving the
 * Scales tab, since showMelodySection() hides things they need.
 */
function restoreSharedPracticeControls() {
    const soundToggle = document.getElementById('sound-toggle');
    const beatIndicator = document.getElementById('beat-indicator');
    if (soundToggle) soundToggle.style.display = '';
    if (beatIndicator) beatIndicator.style.display = '';
}

/**
 * Keep the key, scale and drill in the URL so a practice setup can be
 * bookmarked, matching how progression mode behaves.
 */
function updateMelodyUrlParams() {
    if (typeof practiceState === 'undefined' || practiceState.mode !== 'scales') return;

    const params = new URLSearchParams();
    params.set('mode', 'scales');
    params.set('root', melodyState.root);
    params.set('scale', melodyState.type);
    if (melodyState.drill !== 'listen') params.set('drill', melodyState.drill);
    if (getMelodyTempo() !== 120) params.set('tempo', getMelodyTempo());

    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
}

/**
 * Apply ?mode=scales&root=G&scale=minor&drill=ear from the URL.
 * @returns {boolean} whether the scales tab was requested
 */
function loadMelodyFromUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') !== 'scales') return false;

    const root = params.get('root');
    const scale = params.get('scale');
    const drill = params.get('drill');

    if (root && MELODY_ROOTS.includes(root)) {
        melodyState.root = root;
        if (melodyElements.root) melodyElements.root.value = root;
    }
    if (scale && SCALE_TYPES[scale]) {
        melodyState.type = scale;
        if (melodyElements.type) melodyElements.type.value = scale;
    }
    if (drill && DRILL_HINTS[drill]) {
        melodyState.drill = drill;
    }
    return true;
}
