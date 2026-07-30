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
 * Get or create the audio context (must be initialized after user interaction)
 */
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

/**
 * Ensure audio context is ready to play (handles iOS suspend/resume)
 * @returns {Promise<AudioContext>}
 */
async function ensureAudioReady() {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        await ctx.resume();
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
