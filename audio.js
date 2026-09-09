/**
 * UkeFlow - Audio Module
 * Handles audio context, Karplus-Strong synthesis, and chord playback
 */

// Audio Context for chord playback
let audioContext = null;

// Track active audio sources for muting
let activeSources = [];

/**
 * Track an audio source for potential muting
 * @param {AudioBufferSourceNode} source - The audio source to track
 * @param {number} endTime - When the source will finish playing
 */
function trackSource(source, endTime) {
    activeSources.push({ source, endTime });
    // Clean up when source ends
    source.onended = () => {
        activeSources = activeSources.filter(s => s.source !== source);
    };
}

/**
 * Stop all active audio sources (for muting when chunk is played)
 * @param {number} stopTime - When to stop the sources (defaults to now)
 */
function stopAllSources(stopTime) {
    const ctx = getAudioContext();
    const time = stopTime || ctx.currentTime;
    activeSources.forEach(({ source }) => {
        try {
            source.stop(time);
        } catch (e) {
            // Source may have already stopped
        }
    });
    activeSources = [];
}

/**
 * States the context can be woken from.
 *
 * 'interrupted' is a WebKit-only state and the reason audio would die on
 * iPhones: Safari moves the context there when the screen locks, a call comes
 * in, the tab is backgrounded, or another app takes the audio session. It is
 * NOT 'suspended', so checking for 'suspended' alone left the context dead and
 * every later tap silent until the page was reloaded.
 */
const RESUMABLE_AUDIO_STATES = ['suspended', 'interrupted'];

// resume() can hang forever rather than reject when the gesture is not
// accepted; without this the caller awaits it and plays nothing, silently.
const AUDIO_RESUME_TIMEOUT_MS = 1000;

/**
 * Make chord playback audible even with the iPhone ringer switch on silent.
 *
 * On iOS the hardware silent switch mutes Web Audio (HTML <audio> elements are
 * exempt, Web Audio is not), so an app like this is mute for anyone whose phone
 * is on silent - with no visible cause. Safari 16.4+ lets a page opt out by
 * declaring its audio session type. Safari-only; a no-op everywhere else.
 *
 * KNOWN TRADE-OFF, accepted deliberately: 'playback' is an EXCLUSIVE type. Per
 * spec it "will pause other playback audio on the device", which may include
 * the Spotify embed each song carries. Behaving like an instrument app -
 * always audible - was judged more valuable than play-along mixing. 'ambient'
 * would mix but is still muted by the ringer switch, so it is not an option.
 *
 * Called from getAudioContext(), so the exclusive session is only claimed once
 * the user actually plays a chord. Someone who only uses the Spotify embed
 * never triggers it.
 */
function configureAudioSession() {
    try {
        if (typeof navigator !== 'undefined' && navigator.audioSession) {
            navigator.audioSession.type = 'playback';
        }
    } catch (e) {
        // Unsupported or disallowed - playback still works, it just follows
        // the ringer switch as before
    }
}

/**
 * iOS interrupts the context when the page is hidden. Try to recover as soon as
 * we are visible again. iOS often refuses a resume() outside a user gesture, so
 * this is best-effort - the load-bearing path is ensureAudioReady() retrying on
 * the next tap.
 */
function watchAudioContextState() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // A drone has to be rebuilt rather than resumed - its oscillators
            // were started against a clock that has since moved on. Plucks need
            // no such help because each one makes a fresh source.
            ensureAudioReady().then(() => {
                if (typeof restartDroneIfRunning === 'function') {
                    restartDroneIfRunning();
                }
            });
        }
    });
}

/**
 * Get or create the audio context (must be initialized after user interaction)
 */
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        configureAudioSession();
        watchAudioContextState();
    }
    return audioContext;
}

/**
 * Ensure audio context is ready to play (handles iOS suspend/interrupt/resume)
 * @returns {Promise<AudioContext>}
 */
async function ensureAudioReady() {
    const ctx = getAudioContext();
    if (!RESUMABLE_AUDIO_STATES.includes(ctx.state)) return ctx;

    try {
        // Race the timeout so a resume() that never settles cannot wedge
        // playback. If it does time out we still attempt to play - the worst
        // case is the same silence we would have had while awaiting forever.
        await Promise.race([
            ctx.resume(),
            new Promise(resolve => setTimeout(resolve, AUDIO_RESUME_TIMEOUT_MS)),
        ]);
    } catch (e) {
        // resume() rejects if the gesture was refused; fall through and try
    }

    if (ctx.state !== 'running') {
        console.warn(`[UkeFlow] audio context is "${ctx.state}" after resume; tap a play button again`);
    }

    return ctx;
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
 * Calculate the frequency for a given string and fret
 */
function getNoteFrequency(stringIndex, fret) {
    if (fret < 0) return null; // Muted string
    const baseFreq = UKULELE_TUNING[stringIndex];
    return baseFreq * Math.pow(2, fret / 12);
}

/**
 * Karplus-Strong plucked string synthesis with ukulele body resonance
 * Creates a warm, bright nylon string ukulele sound
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

    // Initialize delay line with shaped noise burst for nylon string character
    // Mellow ukulele sound - minimal noise, smooth fundamental
    for (let i = 0; i < delayLength; i++) {
        const t = i / delayLength;
        // Very little noise for soft attack
        const noise = (Math.random() * 2 - 1) * 0.1;
        const fundamental = Math.sin(2 * Math.PI * t) * 0.6;
        const harmonic2 = Math.sin(4 * Math.PI * t) * 0.05;
        // Smoother burst shape
        const burstShape = Math.sin(Math.PI * t);
        delayLine[i] = (noise + fundamental + harmonic2) * (0.6 + 0.4 * burstShape);
    }

    // Damping factor - higher value for mellower, longer sustain
    const damping = 0.997;
    // Brightness - lower value for warmer, mellower tone
    const brightness = 0.25;
    // Body resonance frequencies (typical ukulele body resonance ~400-500Hz)
    const bodyResonance1 = 420;
    const bodyResonance2 = 520;

    let delayIndex = 0;
    let prevSample = 0;
    let prevSample2 = 0;

    // Body resonance state variables (simple 2-pole resonator simulation)
    let bodyState1 = 0, bodyState1Prev = 0;
    let bodyState2 = 0, bodyState2Prev = 0;
    const bodyDecay1 = 0.985;  // Faster decay to reduce boominess
    const bodyDecay2 = 0.982;
    const bodyFreq1 = 2 * Math.PI * bodyResonance1 / sampleRate;
    const bodyFreq2 = 2 * Math.PI * bodyResonance2 / sampleRate;

    // Generate samples using Karplus-Strong algorithm
    for (let i = 0; i < samples; i++) {
        // Get current sample from delay line
        const currentSample = delayLine[delayIndex];

        // Low-pass filter with slight allpass character for nylon warmth
        const nextIndex = (delayIndex + 1) % delayLength;
        const filtered = damping * (
            brightness * delayLine[delayIndex] +
            (1 - brightness) * delayLine[nextIndex]
        );

        // Three-sample averaging for warmer, mellower tone
        const smoothed = 0.35 * filtered + 0.35 * prevSample + 0.3 * prevSample2;
        prevSample2 = prevSample;
        prevSample = filtered;

        // Store filtered sample back in delay line
        delayLine[delayIndex] = smoothed;

        // Add body resonance (minimal - just a hint of wood)
        const excitation = currentSample * 0.01;
        bodyState1 = bodyDecay1 * (bodyState1 * Math.cos(bodyFreq1) - bodyState1Prev * Math.sin(bodyFreq1)) + excitation;
        bodyState1Prev = bodyState1;
        bodyState2 = bodyDecay2 * (bodyState2 * Math.cos(bodyFreq2) - bodyState2Prev * Math.sin(bodyFreq2)) + excitation;
        bodyState2Prev = bodyState2;

        // Mix string sound with body resonance (very subtle)
        const bodySound = (bodyState1 + bodyState2) * 0.012;

        // Output the sample with body coloration
        data[i] = (currentSample + bodySound) * volume;

        // Move to next position in delay line
        delayIndex = nextIndex;
    }

    // Apply amplitude envelope for natural attack and release
    const attackTime = 0.008 * sampleRate; // Softer attack for mellow pluck
    const releaseStart = samples - 0.15 * sampleRate;

    for (let i = 0; i < samples; i++) {
        if (i < attackTime) {
            // Quick attack with slight curve
            const t = i / attackTime;
            data[i] *= t * t; // Quadratic attack
        } else if (i > releaseStart) {
            // Smooth release
            const t = (samples - i) / (samples - releaseStart);
            data[i] *= t * t; // Quadratic release
        }
    }

    // Gentle high-frequency roll-off for mellow but clear sound
    let lpState = 0;
    const lpCoef = 0.82; // Light filtering - warm but not muddy
    for (let i = 0; i < samples; i++) {
        lpState = lpCoef * lpState + (1 - lpCoef) * data[i];
        data[i] = 0.6 * data[i] + 0.4 * lpState;
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
            const sourceStartTime = startTime + i * strumSpeed;
            source.start(sourceStartTime);
            // Track source for muting by chunk
            trackSource(source, sourceStartTime + 0.8);
        }
    });
}

/**
 * Play a muted chunk sound (percussive)
 * Simulates the sound of palm-muting strings on a ukulele
 * Also stops all currently ringing strings (real palm mute behavior)
 */
function playChunk(startTime) {
    const ctx = getAudioContext();

    // Stop all currently ringing strings at the moment the chunk plays
    // This is what a real palm mute does
    stopAllSources(startTime);
    const duration = 0.12;
    const sampleRate = ctx.sampleRate;
    const samples = Math.ceil(sampleRate * duration);
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    // Muted string frequencies (deadened but still have some pitch)
    const mutedFreqs = [392, 262, 330, 440]; // G, C, E, A but muted

    for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;

        // Soft attack, gentle decay - more like a soft palm touch
        const attackEnv = 1 - Math.exp(-i / (sampleRate * 0.003));
        const decayEnv = Math.exp(-i / (sampleRate * 0.04));
        const envelope = attackEnv * decayEnv;

        // Layer 1: Muted strings - very subtle pitched content
        let mutedStrings = 0;
        for (let s = 0; s < 4; s++) {
            const stringDecay = Math.exp(-i / (sampleRate * (0.02 + s * 0.005)));
            mutedStrings += Math.sin(2 * Math.PI * mutedFreqs[s] * t) * stringDecay * 0.06;
        }

        // Layer 2: Soft body thump (low frequency, gentle)
        const thumpFreq = 120;
        const thumpDecay = Math.exp(-i / (sampleRate * 0.05));
        const bodyThump = Math.sin(2 * Math.PI * thumpFreq * t) * thumpDecay * 0.12;

        // Layer 3: Very subtle high-frequency texture (almost no click)
        const clickDecay = Math.exp(-i / (sampleRate * 0.015));
        const click = (Math.random() * 2 - 1) * clickDecay * 0.05;

        // Layer 4: Soft woody resonance
        const woodyFreq = 380;
        const woodyDecay = Math.exp(-i / (sampleRate * 0.045));
        const woody = Math.sin(2 * Math.PI * woodyFreq * t) * woodyDecay * 0.08;

        // Combine all layers - softer overall
        data[i] = (mutedStrings + bodyThump + click + woody) * envelope * 0.5;
    }

    // Very gentle saturation for warmth
    for (let i = 0; i < samples; i++) {
        data[i] = Math.tanh(data[i] * 1.2) * 0.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Shape the final sound with filters - softer, rounder
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 60;
    highpass.Q.value = 0.5;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1800; // Roll off more highs for softer sound
    lowpass.Q.value = 0.5;

    // Gentle body resonance
    const bodyResonance = ctx.createBiquadFilter();
    bodyResonance.type = 'peaking';
    bodyResonance.frequency.value = 350;
    bodyResonance.Q.value = 1.5;
    bodyResonance.gain.value = 2;

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(bodyResonance);
    bodyResonance.connect(ctx.destination);
    source.start(startTime);
}

/**
 * Play a chord using the selected play style
 * Requires: currentPlayStyle, currentBPM, getPlayStyle, getBeat from patterns.js
 */
async function playChord(chordData) {
    const ctx = await ensureAudioReady();

    // Stop any currently playing chord before starting new one
    stopAllSources();

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
                    const sourceStartTime = now + stepIndex * delay;
                    source.start(sourceStartTime);
                    // Track source for muting by chunk
                    trackSource(source, sourceStartTime + 1.2);
                }
            });

            stepIndex++;
        });
    }
}

// Keep old function name for compatibility
async function playChordArpeggio(chordData) {
    await playChord(chordData);
}

/**
 * Play a chord-melody voicing with the melody note singing on top.
 *
 * The strings are plucked in ascending PITCH order, not string order - on a
 * re-entrant ukulele the G string is the second-highest pitch, so plucking
 * G-C-E-A would put a middle voice last. Ordering by pitch means the melody note
 * always lands last and loudest, which is the sound the whole feature is about.
 *
 * @param {Object} voicing - a voicing from findMelodyVoicings() in voicings.js
 *                           (needs frets[] and melodyString)
 */
async function playChordMelody(voicing) {
    const ctx = await ensureAudioReady();

    // Match playChord(): never let two taps overlap
    stopAllSources();

    const now = ctx.currentTime;
    const spread = 0.02;          // 20ms between strings - a chord, not an arpeggio
    const melodyVolume = 0.42;    // the tune
    const accompanimentVolume = 0.2;

    const voices = voicing.frets
        .map((fret, stringIndex) => ({
            stringIndex,
            fret,
            freq: getNoteFrequency(stringIndex, fret),
            isMelody: stringIndex === voicing.melodyString,
        }))
        .filter(v => v.freq !== null)
        .sort((a, b) => a.freq - b.freq);

    voices.forEach((voice, i) => {
        const duration = voice.isMelody ? 2.2 : 1.4;
        const volume = voice.isMelody ? melodyVolume : accompanimentVolume;
        const buffer = pluckString(voice.freq, duration, volume);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        const startTime = now + i * spread;
        source.start(startTime);
        trackSource(source, startTime + duration);
    });
}

// ---------------------------------------------------------------------------
// Tonic drone and single notes (Melody Practice)
// ---------------------------------------------------------------------------

/**
 * The running drone, or null. Held outside `activeSources` on purpose: every
 * pluck goes through stopAllSources(), so a drone registered with trackSource()
 * would be cut off by the first note played over it.
 */
let droneNodes = null;

// What the drone is currently sounding, so it can be rebuilt after the audio
// context is interrupted (see restartDroneIfRunning).
let droneFrequency = null;

// Quiet enough to sit under the melody, loud enough to hear the tonic pull.
const DRONE_VOLUME = 0.055;
const DRONE_RAMP_SECONDS = 0.08;

/**
 * Start a sustained tonic drone, replacing any drone already running.
 *
 * A drone is what turns scale practice into ear training: against a held tonic
 * the degrees stop being abstract pitches and start sounding like functions -
 * the b3 sounds minor, the 5 sounds stable, the b7 wants to fall. Without it
 * you are only memorising finger positions.
 *
 * Deliberately NOT Karplus-Strong: pluckString() renders a fixed-length,
 * DECAYING buffer with a synchronous per-sample loop (about 1.4 million
 * iterations for 30 seconds of audio), so it would both fade out and block the
 * main thread. Two oscillators cost nothing and sustain indefinitely.
 *
 * @param {number} frequency - the tonic, in Hz
 * @returns {Promise<void>}
 */
async function startDrone(frequency) {
    const ctx = await ensureAudioReady();
    stopDrone();

    // Remember the pitch even if it cannot be sounded yet, so a later gesture
    // or a visibilitychange can retry it.
    droneFrequency = frequency;

    // ensureAudioReady() gives up after AUDIO_RESUME_TIMEOUT_MS and returns a
    // context that may still be suspended or interrupted. Starting oscillators
    // on one would set droneNodes and make isDroneRunning() report true while
    // producing silence - a dead drone under a toggle that reads ON, which is
    // the whole failure this module is trying to avoid. Leave it unstarted and
    // let the next attempt do it properly.
    if (ctx.state !== 'running') {
        console.warn(`[UkeFlow] audio context is "${ctx.state}"; drone deferred until the next tap`);
        return;
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(DRONE_VOLUME, ctx.currentTime + DRONE_RAMP_SECONDS);
    gain.connect(ctx.destination);

    // The tonic plus its fifth - a bare open fifth, which states the key
    // without committing to major or minor. A third here would fight scales
    // that disagree with it (playing a minor scale over a major drone).
    const tonic = ctx.createOscillator();
    tonic.type = 'triangle';
    tonic.frequency.value = frequency;

    const fifth = ctx.createOscillator();
    fifth.type = 'triangle';
    fifth.frequency.value = frequency * 1.5;

    const fifthGain = ctx.createGain();
    fifthGain.gain.value = 0.6;
    fifth.connect(fifthGain);
    fifthGain.connect(gain);
    tonic.connect(gain);

    tonic.start();
    fifth.start();

    droneNodes = { gain, oscillators: [tonic, fifth] };
}

/**
 * Stop the drone. Safe to call when nothing is playing.
 * @param {boolean} forget - also clear the remembered pitch, so an interruption
 *        does not bring the drone back. Pass true when the user turns it off.
 */
function stopDrone(forget = false) {
    if (droneNodes) {
        const ctx = getAudioContext();
        const { gain, oscillators } = droneNodes;
        // Ramp down rather than cutting, which would click.
        try {
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + DRONE_RAMP_SECONDS);
        } catch (e) {
            // Context may be closed or interrupted; stopping below still works
        }
        oscillators.forEach(osc => {
            try {
                osc.stop(ctx.currentTime + DRONE_RAMP_SECONDS * 2);
            } catch (e) {
                // Already stopped
            }
        });
        droneNodes = null;
    }
    if (forget) droneFrequency = null;
}

/**
 * @returns {boolean} whether a drone is currently sounding
 */
function isDroneRunning() {
    return droneNodes !== null;
}

/**
 * Rebuild the drone after the audio context has been interrupted.
 *
 * This is the iOS bug this function exists to prevent: Safari parks the context
 * in 'interrupted' after a screen lock or a phone call (see
 * RESUMABLE_AUDIO_STATES). Oscillators started before that are still nominally
 * running, but the context clock has moved on and they are silent - leaving a
 * dead drone under a toggle the UI still shows as ON. Plucks recover on their
 * own because each one creates a new source; a drone is long-lived, so it has
 * to be torn down and started again.
 *
 * @returns {Promise<void>}
 */
async function restartDroneIfRunning() {
    if (droneFrequency === null) return;
    const frequency = droneFrequency;
    stopDrone();
    await startDrone(frequency);
}

/**
 * Play a single fretted note.
 * @param {number} stringIndex - 0-3 for [G, C, E, A]
 * @param {number} fret
 * @param {Object} options - { duration, volume }
 * @returns {Promise<void>}
 */
async function playFretNote(stringIndex, fret, options = {}) {
    const { duration = 1.6, volume = 0.34 } = options;
    const ctx = await ensureAudioReady();

    const frequency = getNoteFrequency(stringIndex, fret);
    if (frequency === null) return;

    const buffer = pluckString(frequency, duration, volume);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(ctx.currentTime);
    trackSource(source, ctx.currentTime + duration);
}
