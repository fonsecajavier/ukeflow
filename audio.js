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
//   exponential; two detuned loops give a note that moves. The recordings
//   decay ~13 dB in the first second and only ~8 dB in the next: that second
//   stage is the slower plane.
// - Decay time is set per PITCH (a T60 in seconds), not per sample. With a
//   fixed per-sample loss a high note loses the same fraction per period as a
//   low one and so decays several times faster in wall-clock time - the old
//   loop made an A5 die 6x faster than a C4.
// - The excitation is the shape of an ideal pluck - a pulse whose width is the
//   pluck position along the string - plus a little filtered noise for finger
//   texture. Recordings of a real tenor (see PLAN.md) show the 3rd harmonic
//   notched 10-40 dB below the 2nd on every string: that is a pluck at a
//   THIRD of the string length, and it is what gives the instrument its
//   hollow sound. The same recordings are very dark (energy above 2 kHz is
//   25+ dB down within the first 50 ms) and almost noiseless (85-98% of the
//   attack energy is harmonic), so the burst is rolled off at 2 kHz with two
//   poles and carries only a little noise. A brighter, noisier burst was heard
//   as a twang. Previously the excitation was mostly a sine wave, which is why
//   every pluck sounded identical and electronic.
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
 * How long a note rings (T60, seconds) as a function of pitch. Fitted to
 * recordings of a real tenor: the open strings are still only 13-22 dB down a
 * full second after the pluck (T60 around 5 s on the low strings), and a note
 * at the 12th fret is near 3 s. The square-root curve is a fit to that,
 * clamped at both ends. The first guess here (2.8 s at C4, 1.5 s at A5) was
 * about half the real values and made every note feel clipped off.
 */
function decayTimeFor(frequency) {
    return Math.min(6.0, Math.max(2.7, 4.5 * Math.sqrt(261.63 / frequency)));
}

/**
 * Render one plucked note into an AudioBuffer (mono, peak-normalised).
 *
 * @param {number} frequency - Hz
 * @param {number} duration - buffer length in seconds; the note fades over the
 *        last part of it if it is still ringing
 * @param {Object} [options]
 * @param {number} [options.pluckPosition=0.33] - where along the string it is
 *        struck, 0..0.5. Nearer the bridge (smaller) is brighter and twangier;
 *        a third of the way along is what the recordings show, and a strum
 *        over the neck joint is ~0.36 and mellower still.
 * @returns {AudioBuffer}
 */
function pluckString(frequency, duration = 1.5, options = {}) {
    const ctx = getAudioContext();
    const sampleRate = ctx.sampleRate;
    const pluckPosition = options.pluckPosition ?? 0.33;

    const key = `${sampleRate}|${frequency.toFixed(3)}|${duration}|${pluckPosition}`;
    const cached = pluckCache.get(key);
    if (cached) return cached;

    const samples = Math.ceil(sampleRate * duration);
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const out = buffer.getChannelData(0);

    // --- loop parameters -------------------------------------------------
    const N = sampleRate / frequency;           // loop length, fractional
    const omega = 2 * Math.PI * frequency / sampleRate;
    // One-zero loop filter y = (1-S)x[n] + S x[n-1]: its loss grows with
    // frequency (as omega squared), so upper harmonics die before the
    // fundamental. S is set per pitch so the 3rd harmonic loses about 18 dB/s
    // more than the fundamental, which is what the recordings show all over
    // the neck. The classic fixed S = 0.5 gave 1 dB/s on a low G and 80 dB/s
    // on a high A - the high notes turned into sine waves within 100 ms. S is
    // also the filter's delay, so it is subtracted from the line length.
    const wantedLoss = 1 - Math.pow(10, -18 / (20 * frequency));   // per period, h3 vs h1
    const sOneMinusS = Math.min(0.25, wantedLoss / (4 * omega * omega));
    const S = Math.max(0.05, 0.5 - Math.sqrt(0.25 - sOneMinusS));
    const t60 = decayTimeFor(frequency);
    // The loop filter also loses a little of the FUNDAMENTAL each period, and
    // at 880 Hz that alone is ~12 dB/s - enough to make the T60 a fiction up
    // the neck. Divide it out so the decay time means what it says everywhere.
    const filterGain = Math.sqrt((1 - S) * (1 - S) + S * S + 2 * S * (1 - S) * Math.cos(omega));
    const rho1 = Math.pow(10, -3 / (frequency * t60)) / filterGain;         // loss per period
    const rho2 = Math.pow(10, -3 / (frequency * t60 * 2.2)) / filterGain;   // the slower plane
    // Both of these are kept SMALL on purpose. At 2 cents of plane detune and
    // a 10-cent attack bend the note audibly twanged and wobbled - a banjo, not
    // a ukulele. The detune is a fixed 0.12 Hz rather than a ratio: a ratio
    // made the beat period shrink with pitch (2.3 s at A5, a 6 dB dip right
    // in the middle of the note), where 0.12 Hz is an 8 s swell at any pitch.
    // The attack bend is OFF. Real nylon does bend sharp when struck (the
    // recordings show +10 to +30 cents in the first 20 ms), but even a
    // 1.7-cent version interacted with the allpass at some delay lengths and
    // read as a 5-cent glide on a C4; the pitch should sound nailed down.
    const detune = 1 + 0.12 / frequency;                       // 8 s beat period
    const bendDepth = 0;                                       // cents of attack bend, as a ratio
    const bendTau = 0.012 * sampleRate;

    // --- excitation: ideal pluck pulse + filtered, comb-filtered noise ----
    const Ne = Math.round(N);
    const cut = Math.max(1, Math.round(pluckPosition * Ne));
    const exc = new Float32Array(Ne);
    for (let i = 0; i < Ne; i++) {
        // Zero-mean rectangular pulse: the force an ideal pluck at this
        // position delivers to the bridge. Its harmonics go as sin(k*pi*p)/k.
        exc[i] = (i < cut ? 1 - pluckPosition : -pluckPosition) * 0.85;
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
    for (let i = 0; i < Ne; i++) exc[i] += 0.25 * noise[i] / noisePeak;
    // Soft fingertip rather than a plectrum: round the whole burst off with
    // two poles at 3.5 times the pitch. On the recordings the 4th harmonic
    // and up are 15-30 dB down on the open strings from the very first
    // milliseconds, while a note at the 12th fret keeps relatively more of
    // its top; a cutoff that follows the pitch gives both.
    const brightLp = Math.exp(-2 * Math.PI * Math.min(4500, Math.max(900, 3.5 * frequency)) / sampleRate);
    lp = 0;
    let lp2 = 0;
    let mean = 0;
    for (let i = 0; i < Ne; i++) {
        lp = brightLp * lp + (1 - brightLp) * exc[i];
        lp2 = brightLp * lp2 + (1 - brightLp) * lp;
        exc[i] = lp2;
        mean += lp2;
    }
    mean /= Ne;
    for (let i = 0; i < Ne; i++) exc[i] -= mean;

    // --- the two string loops -------------------------------------------
    // Each loop is: integer delay -> first-order allpass for the fractional
    // part -> one-zero lowpass -> gain rho. The allpass is what puts the pitch
    // exactly where it belongs; a linear interpolator does that too but has
    // its own high-frequency loss, which at A5 took another 14 dB/s off the
    // fundamental on top of the loop filter and made the T60 meaningless.
    const L = Math.ceil(N * detune * (1 + bendDepth)) + 8;
    const line1 = new Float32Array(L);
    const line2 = new Float32Array(L);
    let w = 0;
    let in1 = 0, ap1 = 0, prev1 = 0;   // allpass x[n-1] and y[n-1]; one-zero x[n-1]
    let in2 = 0, ap2 = 0, prev2 = 0;
    // The finger leaving the string: a short lowpassed thump that is NOT
    // part of the loop, so it is the only non-periodic energy in the note.
    // The recordings have 5-25% non-harmonic energy in the first 40 ms.
    const tickLen = Math.round(0.014 * sampleRate);
    const tickTau = 0.004 * sampleRate;
    const tickLp = Math.exp(-2 * Math.PI * 2500 / sampleRate);
    let tickState = 0;

    for (let n = 0; n < samples; n++) {
        const bend = 1 + bendDepth * Math.exp(-n / bendTau);

        // Split each delay into integer + fraction, keeping the fraction in
        // 0.1..1.1 so the allpass never has to realise a near-zero delay,
        // where its transient response is poor
        const D1 = N / bend - S;
        let Di1 = Math.floor(D1), fr1 = D1 - Di1;
        if (fr1 < 0.1) { Di1 -= 1; fr1 += 1; }
        const eta1 = (1 - fr1) / (1 + fr1);
        let r1 = w - Di1; if (r1 < 0) r1 += L;
        const x1 = line1[r1];
        const a1 = eta1 * (x1 - ap1) + in1;
        in1 = x1; ap1 = a1;
        const y1 = rho1 * ((1 - S) * a1 + S * prev1);
        prev1 = a1;

        const D2 = (N * detune) / bend - S;
        let Di2 = Math.floor(D2), fr2 = D2 - Di2;
        if (fr2 < 0.1) { Di2 -= 1; fr2 += 1; }
        const eta2 = (1 - fr2) / (1 + fr2);
        let r2 = w - Di2; if (r2 < 0) r2 += L;
        const x2 = line2[r2];
        const a2 = eta2 * (x2 - ap2) + in2;
        in2 = x2; ap2 = a2;
        const y2 = rho2 * ((1 - S) * a2 + S * prev2);
        prev2 = a2;

        const e = n < Ne ? exc[n] : 0;
        line1[w] = y1 + e;
        line2[w] = y2 + e * 0.8;

        let sample = 0.65 * line1[w] + 0.35 * line2[w];

        if (n < tickLen) {
            tickState = tickLp * tickState + (1 - tickLp) * (Math.random() * 2 - 1);
            sample += tickState * 0.7 * Math.exp(-n / tickTau);
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
 * A synthetic ukulele body impulse response, ~120 ms, stereo.
 *
 * A small body is a handful of resonances, each a damped sine. The
 * frequencies and ring times here were MEASURED from a knock on the body of
 * a real tenor ukulele with the strings muted (see PLAN.md): the air
 * resonance sits at 220-250 Hz (a soprano's would be nearer 400), the top
 * plate rings in a cluster at 445-490 Hz, and there are weaker modes near
 * 670 Hz and a broad lift around 1.2-1.4 kHz that the recorded notes show as
 * a boost on whichever harmonic lands there. On top of that, a few
 * milliseconds of decaying noise stand in for the diffuse early reflections
 * inside the box. The two channels get different phases so the body also
 * gives the sound some width.
 */
function createBodyImpulse(ctx) {
    const sampleRate = ctx.sampleRate;
    const length = Math.round(0.12 * sampleRate);
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const modes = [
        { freq: 223,  tau: 0.030, amp: 0.8 },
        { freq: 252,  tau: 0.035, amp: 0.9 },
        { freq: 410,  tau: 0.015, amp: 0.3 },
        { freq: 457,  tau: 0.020, amp: 0.7 },
        { freq: 486,  tau: 0.018, amp: 0.6 },
        { freq: 670,  tau: 0.012, amp: 0.3 },
        { freq: 1250, tau: 0.006, amp: 0.35 },
        { freq: 1380, tau: 0.006, amp: 0.3 },
    ];
    // Every mode starts at phase zero, like a resonator struck by an impulse.
    // Random phases were tried and they carve notches where a mode happens to
    // cancel the dry signal (a measured -11 dB at 252 Hz). The right channel
    // gets a small, fixed phase offset per mode for width.
    const fadeStart = Math.round(length * 0.8);
    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            let v = 0;
            modes.forEach((m, k) => {
                const phase = ch === 0 ? 0 : 0.35 * ((k % 3) - 1);
                v += m.amp * Math.sin(2 * Math.PI * m.freq * t + phase) * Math.exp(-t / m.tau);
            });
            v += (Math.random() * 2 - 1) * 0.5 * Math.exp(-t / 0.004);
            if (i > fadeStart) v *= 0.5 + 0.5 * Math.cos(Math.PI * (i - fadeStart) / (length - fadeStart));
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
 *          -> low shelf / plate bump / high shelf / presence before both
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

    // A small box radiates poorly below its air resonance: on the recordings
    // the 2nd harmonic of the G, C and E strings is as loud as the fundamental
    // or louder. This shelf is what makes that happen in the model.
    const lowShelf = ctx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 400;
    lowShelf.gain.value = -10;

    // ...while the top-plate modes at 430-490 Hz are strong: the open A
    // string keeps its fundamental 12 dB over its 2nd harmonic.
    const plate = ctx.createBiquadFilter();
    plate.type = 'peaking';
    plate.frequency.value = 460;
    plate.Q.value = 2.5;
    plate.gain.value = 5;

    const highShelf = ctx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 5000;
    highShelf.gain.value = -4;

    // The lift the recorded notes show around 1.1-1.4 kHz (the 2nd harmonic
    // of D5 and E5 comes out louder than their fundamentals). Kept moderate:
    // the open E string's 4th harmonic sits at the same frequency and is NOT
    // lifted on the recordings, so part of that effect is the pluck, not the
    // box.
    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 1300;
    presence.Q.value = 2;
    presence.gain.value = 6;

    const dry = ctx.createGain();
    dry.gain.value = 1.0;

    const wet = ctx.createGain();
    wet.gain.value = 0.3;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.12;

    const master = ctx.createGain();
    master.gain.value = 0.9;

    input.connect(lowShelf);
    lowShelf.connect(plate);
    plate.connect(highShelf);
    highShelf.connect(presence);
    presence.connect(dry);
    dry.connect(compressor);

    // ConvolverNode has been in every engine for years, but guard anyway:
    // losing the body is a far better failure than losing all sound.
    if (typeof ctx.createConvolver === 'function') {
        const convolver = ctx.createConvolver();
        convolver.normalize = true;
        convolver.buffer = createBodyImpulse(ctx);
        presence.connect(convolver);
        convolver.connect(wet);
        wet.connect(compressor);
    }

    // Sampled notes already contain a real body; they skip the EQ and the
    // convolver and join at the compressor
    const direct = ctx.createGain();
    direct.connect(compressor);

    compressor.connect(master);
    master.connect(ctx.destination);

    bodyChain = { input, direct, compressor, master };
    return input;
}

/** The input for sources that must not go through the synthetic body. */
function getDirectInput() {
    getBodyChain();
    return bodyChain.direct;
}

// ---------------------------------------------------------------------------
// Sampled notes: recordings of a real concert ukulele
// ---------------------------------------------------------------------------
//
// The synthesis above was fitted to these same recordings and still did not
// sound like the instrument to its owner, so the instrument plays itself:
// seven single notes and a muted "chuck", recorded on a concert ukulele with
// Worth CM-LG fluorocarbon strings (low-G), trimmed to the onset, normalised
// and encoded as ~25 KB AAC clips in samples/. A note anywhere on the neck
// plays the nearest clip with its playback rate shifted, never more than a
// few semitones, so the body resonances and the decay stay believable.
//
// The clips load at page start; until they have (or if they cannot - a
// file:// page, a blocked fetch), playPluck() falls back to pluckString(),
// so no tap is ever silent.

const SAMPLE_BASE_PATH = 'samples/';

/**
 * The bank. `reach` is how many semitones a clip may be shifted. The open A
 * is held to its own pitch: on this instrument 440 Hz sits on the body's
 * plate resonance and the note dies three times faster than any other, which
 * is right for the open A and wrong for everything near it. The 12th-fret A
 * reaches further because nothing was recorded above it.
 */
const UKULELE_SAMPLES = [
    { name: 'g3', frequency: 196.00, reach: 4.5 },
    // No C4 clip: the C4 recording was a harder, slower, nail pluck than the
    // rest, and every attempt to normalise it (a rise lift, then darkening
    // the first 15 ms) left a swell-and-open shape that was heard as a
    // "whiplash" on a C chord next to an Em, whose clips are all untouched.
    // C4 is 4 semitones under the clean E4 clip, inside the shift every
    // other note already gets, so it plays that instead.
    { name: 'e4', frequency: 329.63, reach: 4.5 },
    { name: 'a4', frequency: 440.00, reach: 0.6 },
    { name: 'd5', frequency: 587.33, reach: 4.5 },
    { name: 'e5', frequency: 659.26, reach: 4.5 },
    { name: 'a5', frequency: 880.00, reach: 9 },
];
// (4.5, not 4: A#4 is 4.000 semitones under the D5 clip and G#4 4.000 over the
// E4 clip, and a reach of exactly 4 lost both to rounding - which handed A#4
// to the open-A clip, the one note that must not be shifted.)
const CHUCK_SAMPLE = 'chuck';

let sampleBank = null;          // { name: AudioBuffer } once decoded
let sampleBankPromise = null;   // in flight, or settled
let sampleBankFailed = false;

/**
 * Pick the clip for a pitch: the nearest one within its reach, else the
 * nearest overall. Pure, so the test can sweep the whole neck.
 * @returns {{sample: Object, rate: number, semitones: number}}
 */
function chooseSample(frequency, samples = UKULELE_SAMPLES) {
    let best = null;
    for (const sample of samples) {
        const semitones = 12 * Math.log2(frequency / sample.frequency);
        const distance = Math.abs(semitones);
        const inReach = distance <= sample.reach;
        const candidate = { sample, semitones, distance, inReach };
        if (!best) { best = candidate; continue; }
        if (inReach !== best.inReach) { if (inReach) best = candidate; continue; }
        if (distance < best.distance) best = candidate;
    }
    return { sample: best.sample, rate: frequency / best.sample.frequency, semitones: best.semitones };
}

/** decodeAudioData with the callback form, which every engine supports. */
function decodeClip(ctx, arrayBuffer) {
    return new Promise((resolve, reject) => {
        const maybe = ctx.decodeAudioData(arrayBuffer, resolve, reject);
        if (maybe && typeof maybe.then === 'function') maybe.then(resolve, reject);
    });
}

/**
 * Fetch and decode the bank. Decoding wants a context; an OfflineAudioContext
 * is used when there is one so the real AudioContext - and with it the iOS
 * audio session claim in configureAudioSession() - is still created only on
 * the first tap. Buffers decoded there play fine in the live context: a
 * source node resamples on the way out.
 *
 * Failure is final and quiet: the synthesis stays in place.
 * @returns {Promise<Object|null>} the bank, or null
 */
function loadUkuleleSamples() {
    if (sampleBankPromise) return sampleBankPromise;
    sampleBankPromise = (async () => {
        try {
            if (typeof fetch !== 'function') throw new Error('no fetch');
            const Offline = typeof OfflineAudioContext === 'function' ? OfflineAudioContext
                : (typeof webkitOfflineAudioContext === 'function' ? webkitOfflineAudioContext : null);
            const ctx = Offline ? new Offline(1, 1, 48000) : getAudioContext();
            const names = [...UKULELE_SAMPLES.map(s => s.name), CHUCK_SAMPLE];
            const buffers = await Promise.all(names.map(async name => {
                const response = await fetch(`${SAMPLE_BASE_PATH}${name}.m4a`);
                if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
                return decodeClip(ctx, await response.arrayBuffer());
            }));
            const bank = {};
            names.forEach((name, i) => { bank[name] = buffers[i]; });
            sampleBank = bank;
            console.log(`[UkeFlow] ${names.length} ukulele samples loaded; notes now play the recorded instrument`);
            return bank;
        } catch (e) {
            sampleBankFailed = true;
            console.warn('[UkeFlow] ukulele samples unavailable, using synthesis:', e && e.message);
            return null;
        }
    })();
    return sampleBankPromise;
}

/** Start loading the bank without waiting for it. Call once at page start. */
function preloadUkuleleSamples() {
    loadUkuleleSamples();
}

/** @returns {boolean} whether sampled playback is available right now */
function hasUkuleleSamples() {
    return sampleBank !== null;
}

// Strings are NOT panned. They were once spread G-left to A-right, a habit
// from piano and guitar sample libraries, but a ukulele's four strings sit
// stacked top to bottom a couple of centimetres apart: from any listening
// position the instrument is a single point, and the spread put every
// single-string melody note off to one side.

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
 * @param {number} [options.stringIndex] - 0-3; chokes whatever that string
 *        was already playing
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
    // A hair of detune per hit: no two strokes of a real hand land the same,
    // but under a cent - any more and repeated strums of one chord waver
    const wobble = 1 + humanize * (Math.random() * 2 - 1) * 0.0004;
    const sampled = sampleBank !== null;
    if (sampled) {
        const choice = chooseSample(frequency);
        source.buffer = sampleBank[choice.sample.name];
        source.playbackRate.value = choice.rate * wobble;
    } else {
        source.buffer = pluckString(frequency, duration, { pluckPosition });
        source.playbackRate.value = wobble;
    }

    const gain = ctx.createGain();
    const level = volume * (1 + humanize * (Math.random() * 2 - 1) * 0.12);
    gain.gain.value = level;
    if (sampled) {
        // A clip is longer than most notes are allowed to ring; fade it out
        // over the last 150 ms of the requested duration rather than cutting
        gain.gain.setValueAtTime(level, startTime + duration - 0.15);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
    }

    source.connect(gain);
    gain.connect(sampled ? getDirectInput() : getBodyChain());

    if (stringIndex !== null) {
        const previous = ringingStrings[stringIndex];
        if (previous) chokeSource(previous, Math.max(ctx.currentTime, startTime - 0.001));
        ringingStrings[stringIndex] = { source, gain };
    }

    source.start(startTime);
    // stop() must come AFTER start(): a browser throws InvalidStateError the
    // other way round, and that once made every sampled note silent while a
    // test with a lenient fake node passed
    if (sampled) source.stop(startTime + duration + 0.02);
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
            // The strings let ring for 2 s: the next stroke chokes them
            // (see playPluck), so the length only matters for the last stroke
            // of the pattern, which should trail off naturally. The hand
            // sweeps across the strings at a slightly uneven pace, and an
            // upstroke catches the strings lighter than a downstroke.
            const jitter = (Math.random() * 2 - 1) * 0.004;
            playPluck(freq, startTime + i * strumSpeed + Math.max(0, jitter), {
                duration: 2.0,
                volume: direction === 'U' ? 0.21 : 0.25,
                stringIndex,
                pluckPosition: 0.36,   // strummed over the neck joint: mellow
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

    // The recorded chuck, when the bank is in
    if (sampleBank !== null && sampleBank[CHUCK_SAMPLE]) {
        const source = ctx.createBufferSource();
        source.buffer = sampleBank[CHUCK_SAMPLE];
        source.playbackRate.value = 1 + (Math.random() * 2 - 1) * 0.03;
        const gain = ctx.createGain();
        gain.gain.value = 0.5 * (1 + (Math.random() * 2 - 1) * 0.1);
        source.connect(gain);
        gain.connect(getDirectInput());
        source.start(startTime);
        return;
    }

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
                        duration: 2.0,
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
            duration: voice.isMelody ? 2.6 : 2.0,
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
    const { duration = 2.0, volume = 0.34 } = options;
    const ctx = await ensureAudioReady();

    const frequency = getNoteFrequency(stringIndex, fret);
    if (frequency === null) return;

    // A single note is a fingerpick, nearer the soundhole than a strum, and
    // it should land exactly in tune: the ear drill judges pitch on it.
    playPluck(frequency, ctx.currentTime, {
        duration,
        volume,
        stringIndex,
        pluckPosition: 0.33,
        humanize: 0,
    });
}
