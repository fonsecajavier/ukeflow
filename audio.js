/**
 * UkeFlow - Audio Module
 * Handles audio context, Karplus-Strong synthesis, and chord playback
 */

// Audio Context for chord playback
let audioContext = null;

// Track active audio sources for muting
let activeSources = [];

// How fast a choked string dies. A real finger damping a string takes a few
// milliseconds; cutting a buffer source dead at a non-zero sample clicks.
const CHOKE_SECONDS = 0.006;

/**
 * Track an audio source for potential muting
 * @param {AudioBufferSourceNode} source - The audio source to track
 * @param {number} endTime - When the source will finish playing
 * @param {GainNode} [gain] - the source's own gain, so it can be faded rather
 *        than cut. Sources without one are stopped outright.
 */
function trackSource(source, endTime, gain = null) {
    activeSources.push({ source, endTime, gain });
    // Clean up when source ends
    source.onended = () => {
        activeSources = activeSources.filter(s => s.source !== source);
    };
}

/**
 * Silence one tracked source at a given time, with a short fade when it has a
 * gain node. Safe on sources that have already ended.
 */
function chokeSource({ source, gain }, time) {
    try {
        if (gain) {
            gain.gain.cancelScheduledValues(time);
            gain.gain.setTargetAtTime(0, time, CHOKE_SECONDS / 3);
            source.stop(time + CHOKE_SECONDS * 4);
        } else {
            source.stop(time);
        }
    } catch (e) {
        // Source may have already stopped
    }
}

/**
 * Stop all active audio sources (for muting when chunk is played)
 * @param {number} stopTime - When to stop the sources (defaults to now)
 */
function stopAllSources(stopTime) {
    const ctx = getAudioContext();
    const time = stopTime || ctx.currentTime;
    activeSources.forEach(entry => chokeSource(entry, time));
    activeSources = [];
    ringingStrings.fill(null);
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
 * Ukulele string frequencies, in string order [G, C, E, A].
 *
 * Defaults to standard high-G tuning, where G4 is actually HIGHER than C4 and E4
 * (re-entrant). MUTATED IN PLACE by setUkuleleTuning() in voicings.js when the
 * player switches to low-G, which drops this first entry to G3 (196.00 Hz) and
 * makes the instrument linear. Never reassign it - the tuning switch and
 * getNoteFrequency() both rely on this one array identity.
 */
const UKULELE_TUNING = [
    392.00,  // G4 (196.00 in low-G)
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

// ---------------------------------------------------------------------------
// Plucked string synthesis
// ---------------------------------------------------------------------------
//
// An extended Karplus-Strong model (Jaffe & Smith). The things that make it
// sound like a ukulele rather than a synthesizer, in rough order of how much
// each one matters:
//
// - The delay line is FRACTIONAL. Rounding it to whole samples put every note
//   up the neck out of tune: at 44.1 kHz an A at fret 12 came out 4 cents
//   sharp and a C at A-string fret 15 came out 6 cents sharp. The loop reads
//   between samples (linear interpolation), so the pitch is exact.
// - Two strings per note. A real string vibrates in two planes at very
//   slightly different frequencies, so the note beats slowly and decays in two
//   stages (a fast initial drop, then a long quiet tail). One loop gives a dead
//   exponential; two detuned loops give a note that moves.
// - Decay time is set per PITCH (a T60 in seconds), not per sample. With a
//   fixed per-sample loss a high note loses the same fraction per period as a
//   low one and so decays several times faster in wall-clock time - the old
//   loop made an A5 die 6x faster than a C4.
// - The excitation is the shape of an ideal pluck - a pulse whose width is the
//   pluck position along the string - plus a little filtered noise for finger
//   texture. A ukulele is strummed roughly a quarter to a third of the way
//   along the string, which is what cancels the 3rd/4th harmonics and gives
//   the instrument its hollow sound. Previously the excitation was mostly a
//   sine wave, which is why every pluck sounded identical and electronic.
// - A short pitch bend on the attack. Nylon is floppy: the pluck stretches the
//   string, so a note starts a few cents sharp and settles over ~20 ms.
// - The BODY is not in here. It is a shared output chain (see getBodyChain())
//   with a synthetic impulse response, so every string plays through the same
//   piece of wood.
//
// Buffers are rendered at unit peak and cached by (pitch, duration, pluck
// position); volume, panning and humanisation are applied on playback, so a
// strum pattern that hits the same chord eight times renders it once.

const PLUCK_CACHE_MAX = 64;
const pluckCache = new Map();

/**
 * How long a note rings (T60, seconds) as a function of pitch. Low strings on a
 * nylon ukulele sustain for a couple of seconds; notes above the 12th fret are
 * closer to one. The square-root curve is a fit to that, clamped at both ends.
 */
function decayTimeFor(frequency) {
    return Math.min(3.2, Math.max(1.2, 2.8 * Math.sqrt(261.63 / frequency)));
}

/**
 * Render one plucked note into an AudioBuffer (mono, peak-normalised).
 *
 * @param {number} frequency - Hz
 * @param {number} duration - buffer length in seconds; the note fades over the
 *        last part of it if it is still ringing
 * @param {Object} [options]
 * @param {number} [options.pluckPosition=0.28] - where along the string it is
 *        struck, 0..0.5. Nearer the bridge (smaller) is brighter and twangier;
 *        a strum over the neck joint is ~0.35 and mellow.
 * @returns {AudioBuffer}
 */
function pluckString(frequency, duration = 1.5, options = {}) {
    const ctx = getAudioContext();
    const sampleRate = ctx.sampleRate;
    const pluckPosition = options.pluckPosition ?? 0.28;

    const key = `${sampleRate}|${frequency.toFixed(3)}|${duration}|${pluckPosition}`;
    const cached = pluckCache.get(key);
    if (cached) return cached;

    const samples = Math.ceil(sampleRate * duration);
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const out = buffer.getChannelData(0);

    // --- loop parameters -------------------------------------------------
    const N = sampleRate / frequency;           // loop length, fractional
    // One-zero loop filter y = (1-S)x[n] + S x[n-1]. S=0.5 is the classic KS
    // average, which bleeds highs out of a high note within a few hundred
    // milliseconds; easing it off above ~300 Hz keeps upper-fret notes from
    // turning into pure sines almost immediately. S is also the filter's
    // delay, so it is subtracted from the line length to keep the pitch exact.
    const S = Math.max(0.25, Math.min(0.5, 0.5 - 0.25 * Math.log2(frequency / 300) / Math.log2(1000 / 300)));
    const t60 = decayTimeFor(frequency);
    // The loop filter also loses a little of the FUNDAMENTAL each period, and
    // at 880 Hz that alone is ~12 dB/s - enough to make the T60 a fiction up
    // the neck. Divide it out so the decay time means what it says everywhere.
    const omega = 2 * Math.PI * frequency / sampleRate;
    const filterGain = Math.sqrt((1 - S) * (1 - S) + S * S + 2 * S * (1 - S) * Math.cos(omega));
    const rho1 = Math.pow(10, -3 / (frequency * t60)) / filterGain;         // loss per period
    const rho2 = Math.pow(10, -3 / (frequency * t60 * 1.7)) / filterGain;   // the slower plane
    const detune = 1.0012;                                     // ~2 cents between planes
    const bendDepth = 0.006;                                   // ~10 cents sharp at the attack
    const bendTau = 0.02 * sampleRate;

    // --- excitation: ideal pluck pulse + filtered, comb-filtered noise ----
    const Ne = Math.round(N);
    const cut = Math.max(1, Math.round(pluckPosition * Ne));
    const exc = new Float32Array(Ne);
    for (let i = 0; i < Ne; i++) {
        // Zero-mean rectangular pulse: the force an ideal pluck at this
        // position delivers to the bridge. Its harmonics go as sin(k*pi*p)/k.
        exc[i] = (i < cut ? 1 - pluckPosition : -pluckPosition) * 0.65;
    }
    const noise = new Float32Array(Ne);
    const noiseLp = Math.exp(-2 * Math.PI * 4500 / sampleRate);
    let lp = 0;
    for (let i = 0; i < Ne; i++) {
        lp = noiseLp * lp + (1 - noiseLp) * (Math.random() * 2 - 1);
        noise[i] = lp;
    }
    for (let i = Ne - 1; i >= cut; i--) noise[i] -= noise[i - cut];   // same pluck-position comb
    let noisePeak = 1e-6;
    for (let i = 0; i < Ne; i++) noisePeak = Math.max(noisePeak, Math.abs(noise[i]));
    for (let i = 0; i < Ne; i++) exc[i] += 0.35 * noise[i] / noisePeak;
    // Soft fingertip rather than a plectrum: round the whole burst off
    const brightLp = Math.exp(-2 * Math.PI * 3200 / sampleRate);
    lp = 0;
    let mean = 0;
    for (let i = 0; i < Ne; i++) {
        lp = brightLp * lp + (1 - brightLp) * exc[i];
        exc[i] = lp;
        mean += lp;
    }
    mean /= Ne;
    for (let i = 0; i < Ne; i++) exc[i] -= mean;

    // --- the two string loops -------------------------------------------
    const L = Math.ceil(N * detune * (1 + bendDepth)) + 8;
    const line1 = new Float32Array(L);
    const line2 = new Float32Array(L);
    let w = 0;
    let prev1 = 0, prev2 = 0;
    const tickLen = Math.round(0.004 * sampleRate);
    const tickTau = 0.0012 * sampleRate;
    let lastNoise = 0;

    for (let n = 0; n < samples; n++) {
        const bend = 1 + bendDepth * Math.exp(-n / bendTau);
        const D1 = N / bend - S;
        const D2 = (N * detune) / bend - S;

        // Read the sample written D samples ago, between integer taps
        let r1 = w - D1; if (r1 < 0) r1 += L;
        let i1 = r1 | 0; let f1 = r1 - i1; let j1 = i1 + 1; if (j1 >= L) j1 -= L;
        const x1 = line1[i1] + f1 * (line1[j1] - line1[i1]);

        let r2 = w - D2; if (r2 < 0) r2 += L;
        let i2 = r2 | 0; let f2 = r2 - i2; let j2 = i2 + 1; if (j2 >= L) j2 -= L;
        const x2 = line2[i2] + f2 * (line2[j2] - line2[i2]);

        const y1 = rho1 * ((1 - S) * x1 + S * prev1); prev1 = x1;
        const y2 = rho2 * ((1 - S) * x2 + S * prev2); prev2 = x2;

        const e = n < Ne ? exc[n] : 0;
        line1[w] = y1 + e;
        line2[w] = y2 + e * 0.8;

        let sample = 0.72 * line1[w] + 0.28 * line2[w];

        // Nail/fingertip contact: a few milliseconds of high-passed noise,
        // the same at every pitch because it is the finger, not the string
        if (n < tickLen) {
            const white = Math.random() * 2 - 1;
            sample += (white - lastNoise) * 0.12 * Math.exp(-n / tickTau);
            lastNoise = white;
        }

        out[n] = sample;
        if (++w === L) w = 0;
    }

    // --- fade the tail so a buffer that ends mid-ring does not click --------
    const fadeLen = Math.min(Math.round(0.2 * sampleRate), Math.round(samples * 0.25));
    for (let i = 0; i < fadeLen; i++) {
        const t = i / fadeLen;                       // 0 at the very end
        out[samples - 1 - i] *= 0.5 - 0.5 * Math.cos(Math.PI * t);
    }

    // --- unit peak, so volume on playback means the same at every pitch ------
    let peak = 1e-6;
    for (let i = 0; i < samples; i++) peak = Math.max(peak, Math.abs(out[i]));
    const norm = 0.95 / peak;
    for (let i = 0; i < samples; i++) out[i] *= norm;

    if (pluckCache.size >= PLUCK_CACHE_MAX) {
        pluckCache.delete(pluckCache.keys().next().value);   // oldest entry
    }
    pluckCache.set(key, buffer);
    return buffer;
}

// ---------------------------------------------------------------------------
// The instrument body: a shared output chain every pluck plays through
// ---------------------------------------------------------------------------

let bodyChain = null;

/**
 * A synthetic ukulele body impulse response, ~90 ms, stereo.
 *
 * A small body is a handful of resonances: the air in it (the Helmholtz
 * "A0" mode, around 400 Hz on a soprano/concert, and the reason the
 * instrument booms a little on G#/A), the top plate near 650 Hz, and weaker
 * modes above. Each is a damped sine. On top of that, a few milliseconds of
 * decaying noise stand in for the diffuse early reflections inside the box.
 * The two channels get different phases so the body also gives the sound
 * some width.
 */
function createBodyImpulse(ctx) {
    const sampleRate = ctx.sampleRate;
    const length = Math.round(0.09 * sampleRate);
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const modes = [
        { freq: 410,  tau: 0.018, amp: 1.0 },
        { freq: 650,  tau: 0.012, amp: 0.55 },
        { freq: 930,  tau: 0.009, amp: 0.35 },
        { freq: 1340, tau: 0.007, amp: 0.22 },
        { freq: 2100, tau: 0.005, amp: 0.12 },
    ];
    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        const phases = modes.map(() => Math.random() * Math.PI * 2);
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            let v = 0;
            modes.forEach((m, k) => {
                v += m.amp * Math.sin(2 * Math.PI * m.freq * t + phases[k]) * Math.exp(-t / m.tau);
            });
            v += (Math.random() * 2 - 1) * 0.5 * Math.exp(-t / 0.004);
            data[i] = v;
        }
    }
    return buffer;
}

/**
 * Lazily build the shared output chain and return its input node:
 *
 *   plucks -> [dry] ----------------------+-> compressor -> master -> out
 *          -> [body convolver] -> wet gain +
 *          -> low shelf (uke has no bass) / high shelf (no sizzle) before both
 *
 * The compressor is there because the buffers are peak-normalised: four
 * strings plus a melody note can sum past 1.0, and clipping at the output is
 * the one thing that sounds worse than any synthesis shortcut.
 *
 * The drone (startDrone) deliberately bypasses this - it is not a string.
 */
function getBodyChain() {
    if (bodyChain) return bodyChain.input;
    const ctx = getAudioContext();

    const input = ctx.createGain();

    const lowShelf = ctx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 180;
    lowShelf.gain.value = -4;

    const highShelf = ctx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 6000;
    highShelf.gain.value = -3;

    const dry = ctx.createGain();
    dry.gain.value = 1.0;

    const wet = ctx.createGain();
    wet.gain.value = 0.28;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.12;

    const master = ctx.createGain();
    master.gain.value = 0.9;

    input.connect(lowShelf);
    lowShelf.connect(highShelf);
    highShelf.connect(dry);
    dry.connect(compressor);

    // ConvolverNode has been in every engine for years, but guard anyway:
    // losing the body is a far better failure than losing all sound.
    if (typeof ctx.createConvolver === 'function') {
        const convolver = ctx.createConvolver();
        convolver.normalize = true;
        convolver.buffer = createBodyImpulse(ctx);
        highShelf.connect(convolver);
        convolver.connect(wet);
        wet.connect(compressor);
    }

    compressor.connect(master);
    master.connect(ctx.destination);

    bodyChain = { input, compressor, master };
    return input;
}

// Where each string sits in the stereo image, G to A. The G string is nearest
// the player's head (left), the A nearest the floor (right).
const STRING_PAN = [-0.35, -0.12, 0.12, 0.35];

// The source currently ringing on each string, so a re-pluck can choke it.
// Striking a string that is already vibrating restarts it; it does not add a
// second copy on top, which is what stacking buffer sources would do.
const ringingStrings = [null, null, null, null];

/**
 * Play one plucked note through the body at a scheduled time.
 *
 * @param {number} frequency - Hz
 * @param {number} startTime - context time
 * @param {Object} [options]
 * @param {number} [options.duration=1.5]
 * @param {number} [options.volume=0.3]
 * @param {number} [options.stringIndex] - 0-3; sets the pan position and
 *        chokes whatever that string was already playing
 * @param {number} [options.pluckPosition] - see pluckString()
 * @param {number} [options.humanize=1] - 0 for a mechanical hit, 1 for the
 *        normal +-1 dB / +-3 cent wobble of a human hand
 * @returns {{source: AudioBufferSourceNode, gain: GainNode}}
 */
function playPluck(frequency, startTime, options = {}) {
    const ctx = getAudioContext();
    const {
        duration = 1.5,
        volume = 0.3,
        stringIndex = null,
        pluckPosition,
        humanize = 1,
    } = options;

    const source = ctx.createBufferSource();
    source.buffer = pluckString(frequency, duration, { pluckPosition });
    // A hair of detune per hit: no two strokes of a real hand land the same
    source.playbackRate.value = 1 + humanize * (Math.random() * 2 - 1) * 0.0015;

    const gain = ctx.createGain();
    gain.gain.value = volume * (1 + humanize * (Math.random() * 2 - 1) * 0.12);

    source.connect(gain);
    let tail = gain;
    if (stringIndex !== null && typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.value = STRING_PAN[stringIndex] ?? 0;
        gain.connect(panner);
        tail = panner;
    }
    tail.connect(getBodyChain());

    if (stringIndex !== null) {
        const previous = ringingStrings[stringIndex];
        if (previous) chokeSource(previous, Math.max(ctx.currentTime, startTime - 0.001));
        ringingStrings[stringIndex] = { source, gain };
    }

    source.start(startTime);
    trackSource(source, startTime + duration, gain);
    return { source, gain };
}

/**
 * Play a strum (all strings quickly)
 * @param {Array} stringFreqs - Frequencies for each string
 * @param {string} direction - 'D' for down, 'U' for up, 'x' for muted
 * @param {number} startTime - When to start playing
 */
function playStrum(stringFreqs, direction, startTime) {
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
            // The strings let ring for 1.5 s: the next stroke chokes them
            // (see playPluck), so the length only matters for the last stroke
            // of the pattern, which should trail off naturally. The hand
            // sweeps across the strings at a slightly uneven pace, and an
            // upstroke catches the strings lighter than a downstroke.
            const jitter = (Math.random() * 2 - 1) * 0.004;
            playPluck(freq, startTime + i * strumSpeed + Math.max(0, jitter), {
                duration: 1.5,
                volume: direction === 'U' ? 0.21 : 0.25,
                stringIndex,
                pluckPosition: 0.34,   // strummed over the neck joint: mellow
            });
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

    // Muted string frequencies (deadened but still have some pitch). Taken from
    // the live tuning rather than a second literal, so a low-G chunk thuds an
    // octave lower on the G string like the real instrument does.
    const mutedFreqs = UKULELE_TUNING;

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
    bodyResonance.connect(getBodyChain());
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
                    playPluck(freq, now + stepIndex * delay, {
                        duration: 1.6,
                        volume: 0.3,
                        stringIndex,
                    });
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
        playPluck(voice.freq, now + i * spread, {
            duration: voice.isMelody ? 2.2 : 1.4,
            volume: voice.isMelody ? melodyVolume : accompanimentVolume,
            stringIndex: voice.stringIndex,
        });
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

    // A single note is a fingerpick, nearer the soundhole than a strum, and
    // it should land exactly in tune: the ear drill judges pitch on it.
    playPluck(frequency, ctx.currentTime, {
        duration,
        volume,
        stringIndex,
        pluckPosition: 0.26,
        humanize: 0,
    });
}
