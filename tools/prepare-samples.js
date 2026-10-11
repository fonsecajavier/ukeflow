#!/usr/bin/env node
/**
 * Turn raw recordings of single ukulele notes into the clips in samples/.
 *
 *   1. Convert each recording to 48 kHz 16-bit mono WAV, e.g. on macOS:
 *        afconvert -f WAVE -d LEI16@48000 "Uke C.m4a" wav/c4.wav
 *      (name the WAVs as the clip names in CLIPS below)
 *   2. node tools/prepare-samples.js wav/ out/
 *   3. Encode and drop into samples/:
 *        afconvert -f m4af -d aac -b 96000 -q 127 -s 3 out/c4.wav samples/c4.m4a
 *
 * Then set the clip's frequency and reach in UKULELE_SAMPLES (audio.js) and run
 * tests/sampler.test.js.
 *
 * What it does to each note:
 *   - SPECTRAL GATE: the recording's own lead-in room tone (its spectrum) is
 *     subtracted from every frame, 20 dB floor - the hiss/whoosh under the
 *     decay and in the tail, lifted by peak normalisation, was audible
 *   - finds the onset (first 2 ms window over 30% of the loudest), cuts 3 ms
 *     before it, 2 ms fade-in, a fade-out ending in the noise floor
 *   - ATTACK NORMALISATION, because the recordings were plucked unevenly: the
 *     low G was thumb-flesh (11 ms to peak, no transient) while the E and the
 *     fretted notes were nail (3-5 ms, a click), so walking up one string
 *     changed the pluck. Two steps, both measured against the fast clips:
 *       a) rise time - a gain curve lifts a slow attack to the reference
 *          envelope (capped at +8 dB); a clip that already rises as fast is
 *          left alone. Envelopes are measured over one period of the clip's
 *          pitch - see envelope()
 *       b) nail transient - a clip short of energy above 3 kHz in its first
 *          12 ms gets a scaled copy of the A5 clip's own nail tick (what is
 *          left of its first 15 ms above 3 kHz) layered on, just enough to
 *          reach the reference level; a clip with too much has its first
 *          15 ms crossfaded toward a lowpassed copy until it matches
 *   - peak-normalises to -1 dBFS
 *   - prints the level just before the fade-out so a cut that is not yet in
 *     the noise floor shows up, and the attack numbers before/after
 */
const fs = require('fs');
const [,, inDir, outDir] = process.argv;
if (!inDir || !outDir) { console.error('usage: prepare-samples.js <wav dir> <out dir>'); process.exit(1); }

const CLIPS = [
    ['g3', 3.2, 196.00], ['c4', 3.2, 261.63], ['e4', 3.2, 329.63], ['a4', 3.2, 440.00],
    ['d5', 3.2, 587.33], ['e5', 3.2, 659.26], ['a5', 2.6, 880.00],
    ['chuck', 0.45, 0],
];
const MAX_RISE_GAIN_DB = 8;
// Clips whose attack defines "the pluck". Notes only: the chuck is not a pluck.
const REFERENCE = ['e4', 'd5', 'e5', 'a5'];
// The tick comes from the 12th-fret A: its harmonics above 2.6 kHz are 30 dB
// down, so what survives a steep highpass is the nail, not the note. (The E5
// was tried first and leaked its own 2nd harmonic into every clip it was
// layered on.)
const TICK_SOURCE = 'a5';
const TICK_HZ = 3000;

function readWav(p) {
    const b = fs.readFileSync(p); const ch = b.readUInt16LE(22), sr = b.readUInt32LE(24);
    let off = 12;
    while (off < b.length) { const id = b.toString('ascii', off, off + 4), size = b.readUInt32LE(off + 4);
        if (id === 'data') { const n = size / 2 / ch; const d = new Float32Array(n); for (let i = 0; i < n; i++) d[i] = b.readInt16LE(off + 8 + i * ch * 2) / 32768; return { sr, d }; }
        off += 8 + size + (size & 1); }
    throw new Error('no data chunk in ' + p);
}
function writeWav(p, d, sr) {
    const buf = Buffer.alloc(44 + d.length * 2);
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + d.length * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24);
    buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(d.length * 2, 40);
    for (let i = 0; i < d.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, d[i])) * 32767), 44 + i * 2);
    fs.writeFileSync(p, buf);
}
function onset(d, sr) {
    const win = Math.round(0.002 * sr); let peak = 0, maxRms = 0; const r = [];
    for (let i = 0; i + win < d.length; i += win) { let s = 0; for (let k = 0; k < win; k++) { s += d[i + k] ** 2; peak = Math.max(peak, Math.abs(d[i + k])); } const v = Math.sqrt(s / win); r.push([i, v]); maxRms = Math.max(maxRms, v); }
    for (const [i, v] of r) if (v > maxRms * 0.3) { let j = i; while (j > 0 && Math.abs(d[j]) > peak * 0.01) j--; return j; }
    return 0;
}
const rms = (d, a, n) => { let s = 0; for (let i = 0; i < n; i++) s += (d[a + i] || 0) ** 2; return Math.sqrt(s / n); };
const dB = x => 20 * Math.log10(x + 1e-12);
const median = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/**
 * Four one-pole highpasses at fc (24 dB/oct): the nail transient lives up
 * here and the note's harmonics mostly do not. Two poles were not enough -
 * a 2nd harmonic one octave under fc passed at -6 dB.
 */
function highpass(d, sr, fc) {
    const alpha = 1 / (1 + 2 * Math.PI * fc / sr);
    let out = d;
    for (let pass = 0; pass < 4; pass++) {
        const y = new Float32Array(out.length); let yp = 0, xp = 0;
        for (let i = 0; i < out.length; i++) { yp = alpha * (yp + out[i] - xp); xp = out[i]; y[i] = yp; }
        out = y;
    }
    return out;
}

/**
 * The same highpass run forward then backward: zero phase. Needed when the
 * result is SUBTRACTED from the signal - the one-way filter is 180 degrees
 * out at its corner, so subtracting it there added energy instead.
 */
function highpassZeroPhase(d, sr, fc) {
    const fwd = highpass(d, sr, fc);
    const rev = new Float32Array(fwd.length); for (let i = 0; i < fwd.length; i++) rev[i] = fwd[fwd.length - 1 - i];
    const back = highpass(rev, sr, fc);
    const out = new Float32Array(back.length); for (let i = 0; i < back.length; i++) out[i] = back[back.length - 1 - i];
    return out;
}

/** Four one-pole lowpasses, forward then backward: zero phase, 48 dB/oct. */
function lowpassZeroPhase(d, sr, fc) {
    const a = Math.exp(-2 * Math.PI * fc / sr);
    const run = x => { let out = x; for (let pass = 0; pass < 4; pass++) { const y = new Float32Array(out.length); let yp = 0; for (let i = 0; i < out.length; i++) { yp = a * yp + (1 - a) * out[i]; y[i] = yp; } out = y; } return out; };
    const fwd = run(d);
    const rev = new Float32Array(fwd.length); for (let i = 0; i < fwd.length; i++) rev[i] = fwd[fwd.length - 1 - i];
    const back = run(rev);
    const out = new Float32Array(back.length); for (let i = 0; i < back.length; i++) out[i] = back[back.length - 1 - i];
    return out;
}

// ---- 0. spectral gate ----------------------------------------------------
function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) {
        const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
        for (let i = 0; i < n; i += len) { let cr = 1, ci = 0;
            for (let k = 0; k < len / 2; k++) {
                const ar = re[i + k], ai = im[i + k], br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
                re[i + k] = ar + br; im[i + k] = ai + bi; re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
                const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
    }
}
function ifft(re, im) { for (let i = 0; i < re.length; i++) im[i] = -im[i]; fft(re, im); const n = re.length; for (let i = 0; i < n; i++) { re[i] /= n; im[i] = -im[i] / n; } }

const GATE_N = 2048, GATE_HOP = 512;           // 43 ms frames, 75% overlap at 48 kHz
const GATE_OVERSUBTRACT = 3.0;                 // take out three times the measured noise power: room tone is not steady
const GATE_FLOOR = Math.pow(10, -28 / 20);     // never cut a bin by more than 28 dB (musical noise)

/**
 * Spectral subtraction. `noise` is a stretch of room tone from the same
 * recording; its average power spectrum is subtracted from every frame of
 * `d`, bin by bin, with a floor so the residue is a steady quiet hiss rather
 * than twinkling. Loud bins (the note) pass with gain ~1; the gain is also
 * smoothed over time. Returns a new array.
 */
function spectralGate(d, noise) {
    const win = new Float32Array(GATE_N); for (let i = 0; i < GATE_N; i++) win[i] = Math.sqrt(0.5 - 0.5 * Math.cos(2 * Math.PI * i / GATE_N));
    const re = new Float64Array(GATE_N), im = new Float64Array(GATE_N);
    // noise profile: mean power per bin
    const prof = new Float64Array(GATE_N / 2 + 1); let frames = 0;
    for (let a = 0; a + GATE_N <= noise.length; a += GATE_HOP) {
        for (let i = 0; i < GATE_N; i++) { re[i] = noise[a + i] * win[i]; im[i] = 0; }
        fft(re, im); frames++;
        for (let k = 0; k <= GATE_N / 2; k++) prof[k] += re[k] * re[k] + im[k] * im[k];
    }
    for (let k = 0; k <= GATE_N / 2; k++) prof[k] = frames ? prof[k] / frames : 0;
    // process
    const out = new Float32Array(d.length + GATE_N), norm = new Float32Array(d.length + GATE_N);
    let prevGain = new Float64Array(GATE_N / 2 + 1).fill(1);
    for (let a = 0; a < d.length; a += GATE_HOP) {
        for (let i = 0; i < GATE_N; i++) { re[i] = (d[a + i] || 0) * win[i]; im[i] = 0; }
        fft(re, im);
        for (let k = 0; k <= GATE_N / 2; k++) {
            const p = re[k] * re[k] + im[k] * im[k];
            let g = p > 0 ? Math.sqrt(Math.max(GATE_FLOOR * GATE_FLOOR, (p - GATE_OVERSUBTRACT * prof[k]) / p)) : 1;
            g = 0.6 * g + 0.4 * prevGain[k]; prevGain[k] = g;
            re[k] *= g; im[k] *= g;
            if (k > 0 && k < GATE_N / 2) { re[GATE_N - k] *= g; im[GATE_N - k] *= g; }
        }
        ifft(re, im);
        for (let i = 0; i < GATE_N; i++) { out[a + i] += re[i] * win[i]; norm[a + i] += win[i] * win[i]; }
    }
    const y = new Float32Array(d.length);
    for (let i = 0; i < d.length; i++) y[i] = norm[i] > 1e-6 ? out[i] / norm[i] : 0;
    return y;
}

// ---- 1. trim ---------------------------------------------------------------
const clips = {};
for (const [name, maxLen, f0] of CLIPS) {
    const { sr, d } = readWav(`${inDir}/${name}.wav`);
    const at = Math.max(0, onset(d, sr) - Math.round(0.003 * sr));
    const len = Math.min(d.length - at, Math.round(maxLen * sr));
    // Room tone for the gate: the lead-in from 250 ms to 50 ms before the note
    // (the files start with ~200 ms of digital silence, which is not noise)
    const noiseFrom = Math.round(0.25 * sr), noiseTo = at - Math.round(0.05 * sr);
    const noise = noiseTo - noiseFrom > GATE_N * 2 ? d.subarray(noiseFrom, noiseTo) : d.subarray(0, 0);
    const noiseDb = noise.length ? dB(rms(noise, 0, noise.length)) : NaN;
    const clean = noise.length ? spectralGate(d.subarray(at, at + len), noise) : d.subarray(at, at + len);
    if (process.env.DEBUG && noise.length) {
        // gate quality: the room tone gated by a profile from its other half; harmonics at 100 ms before/after
        const half = noise.length >> 1;
        const gatedNoise = spectralGate(noise.subarray(half), noise.subarray(0, half));
        const goertzel = (x, from, n, f) => { const w = 2 * Math.PI * f / sr, c = 2 * Math.cos(w); let s0 = 0, s1 = 0, s2 = 0; for (let i = 0; i < n; i++) { const v = (x[from + i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / n)); s0 = v + c * s1 - s2; s2 = s1; s1 = s0; } return Math.sqrt(s1 * s1 + s2 * s2 - c * s1 * s2) / n * 2; };
        const raw = d.subarray(at, at + len), N = Math.round(0.05 * sr), from = Math.round(0.1 * sr);
        const h = f0 ? [1, 2, 3, 4, 5].map(k => (dB(goertzel(clean, from, N, f0 * k)) - dB(goertzel(raw, from, N, f0 * k))).toFixed(1)) : [];
        console.log(`  ${name}: room tone ${noiseDb.toFixed(0)} dBFS -> gated ${dB(rms(gatedNoise, GATE_N, gatedNoise.length - 2 * GATE_N)).toFixed(0)} dBFS; harmonic change at 100 ms (dB): ${h.join(' ')}`);
    }
    const out = new Float32Array(len);
    const fadeIn = Math.round(0.002 * sr), fadeOut = Math.round((name === 'chuck' ? 0.08 : 0.35) * sr);
    for (let i = 0; i < len; i++) {
        let v = clean[i];
        if (i < fadeIn) v *= i / fadeIn;
        if (i > len - fadeOut) v *= 0.5 + 0.5 * Math.cos(Math.PI * (i - (len - fadeOut)) / fadeOut);
        out[i] = v;
    }
    clips[name] = { sr, d: out, f0, fadeOut, onsetSeconds: at / sr, noiseDb, rawTail: dB(rms(d, at + len - fadeOut - Math.round(0.05 * sr), Math.round(0.05 * sr))) };
}

// ---- 2. attack measurements ----------------------------------------------
/**
 * Envelope in 1 ms steps, each point the RMS over ONE PERIOD of the clip's own
 * pitch centred there. A fixed 1 ms window rode up and down the waveform of a
 * 262 Hz note (3.8 ms period) and turned the gain curve built on it into a
 * 3-7-8-7-4 dB wobble - amplitude modulation stamped onto the attack, heard
 * as a "whiplash" on the C chord.
 */
function envelope(d, sr, f0, ms) {
    const P = f0 > 0 ? Math.round(sr / f0) : Math.round(0.002 * sr);
    const out = [];
    for (let m = 0; m < ms; m++) { const c = Math.round(m * sr / 1000); out.push(rms(d, Math.max(0, c - (P >> 1)), P)); }
    return out;
}
function attackProfile(clip) {
    const { sr, d, f0 } = clip;
    const env = envelope(d, sr, f0, 100);
    const peak = Math.max(...env);
    const norm = env.slice(0, 40).map(v => v / peak);
    // rise time: first ms within 3 dB of the peak
    const riseMs = norm.findIndex(v => v >= 0.7);
    const hf = highpass(d.subarray(0, Math.round(0.012 * sr)), sr, TICK_HZ);
    const hfLevel = rms(hf, 0, hf.length) / peak;
    let pk = 0, pkAt = 0; for (let i = 0; i < sr * 0.05; i++) if (Math.abs(d[i]) > pk) { pk = Math.abs(d[i]); pkAt = i; }
    return { env: norm, peak, hfLevel, riseMs, timeToPeakMs: pkAt / sr * 1000, at1ms: dB(norm[4]) };
}
const before = {}; for (const name of Object.keys(clips)) before[name] = attackProfile(clips[name]);
// Reference rise: the median of the fast clips, made monotone (a target that
// dips would be chased with a gain that dips - another wobble)
const refEnv = []; { let top = 0; for (let m = 0; m < 40; m++) { top = Math.max(top, median(REFERENCE.map(n => before[n].env[m]))); refEnv.push(top); } }
const refRiseMs = refEnv.findIndex(v => v >= 0.7);
const refHf = median(REFERENCE.map(n => before[n].hfLevel));

// the tick: the reference clip's first 15 ms above 2.5 kHz, faded at the end
const tickSrc = clips[TICK_SOURCE];
const tickLen = Math.round(0.015 * tickSrc.sr);
const tick = highpass(tickSrc.d.subarray(0, tickLen), tickSrc.sr, TICK_HZ);
for (let i = 0; i < tickLen; i++) { const f = (tickLen - i) / Math.round(0.005 * tickSrc.sr); if (f < 1) tick[i] *= 0.5 - 0.5 * Math.cos(Math.PI * f); }
// Scale by the tick's energy AS THE MEASUREMENT SEES IT (through the same
// highpass again), so the level it is layered at is exactly the level the
// check below reads back; scaling by its raw energy fell 5 dB short.
const tickRms = rms(highpass(tick, tickSrc.sr, TICK_HZ), 0, Math.round(0.012 * tickSrc.sr));

// ---- 3. normalise the notes ------------------------------------------------
for (const [name] of CLIPS) {
    if (name === 'chuck') continue;
    const clip = clips[name], { sr, d } = clip, p = before[name];
    const win = Math.round(0.001 * sr);

    // a) rise time - only for a clip that rises later than the reference
    //    (a fast clip shaped against a median of fast clips just gets bumps).
    //    Gain = reference / this, where the reference has started, up to the
    //    clip's own peak, capped, smoothed twice, interpolated per sample.
    if (p.riseMs > refRiseMs + 1) {
        const peakMs = p.env.findIndex(v => v >= 0.95);
        const cap = Math.pow(10, MAX_RISE_GAIN_DB / 20);
        let g = refEnv.map((r, m) => (r < 0.05 || m > peakMs ? 1 : Math.min(cap, Math.max(1, r / Math.max(p.env[m], 1e-4)))));
        for (let m = Math.max(peakMs, 30); m < 40; m++) g[m] = 1;
        for (let k = 0; k < 2; k++) g = g.map((_, m) => (g[Math.max(0, m - 1)] + g[m] + g[Math.min(39, m + 1)]) / 3);
        for (let i = 0; i < 40 * win; i++) {
            const m = i / win, m0 = Math.floor(m), f = m - m0;
            d[i] *= g[m0] + f * ((g[Math.min(39, m0 + 1)]) - g[m0]);
        }
        if (process.env.DEBUG) console.log(`  ${name}: rise ${p.riseMs} ms vs ref ${refRiseMs}: gain (dB) ${g.slice(0, 24).map(v => dB(v).toFixed(0)).join(' ')}`);
    } else if (process.env.DEBUG) console.log(`  ${name}: rise ${p.riseMs} ms vs ref ${refRiseMs}: untouched`);

    // b) nail transient: top the first 12 ms up to the reference's HF level
    const nowHf = rms(highpass(d.subarray(0, Math.round(0.012 * sr)), sr, TICK_HZ), 0, Math.round(0.012 * sr)) / p.peak;
    if (nowHf < refHf) {
        const scale = Math.sqrt(refHf * refHf - nowHf * nowHf) * p.peak / tickRms;
        if (process.env.DEBUG) console.log(`  ${name}: peak ${p.peak.toFixed(4)} nowHf ${dB(nowHf).toFixed(1)} refHf ${dB(refHf).toFixed(1)} tickRms ${tickRms.toExponential(2)} tickLen ${tickLen} scale ${scale.toFixed(3)} tickPeak ${Math.max(...tick).toExponential(2)}`);
        if (process.env.DEBUG) {
            const N = Math.round(0.012 * sr);
            const scaled = new Float32Array(tickLen); for (let i = 0; i < tickLen; i++) scaled[i] = tick[i] * scale;
            console.log(`  ${name}: scaled tick rms ${rms(scaled, 0, N).toExponential(2)}, after HP ${rms(highpass(scaled, sr, TICK_HZ), 0, N).toExponential(2)}; clip HF before ${rms(highpass(d.subarray(0, N), sr, TICK_HZ), 0, N).toExponential(2)}; tick energy by ms: ${[0,2,4,6,8,10,12].map(ms => dB(rms(scaled, Math.round(ms*sr/1000), Math.round(sr/1000))).toFixed(0)).join(' ')}`);
        }
        for (let i = 0; i < tickLen; i++) d[i] += tick[i] * scale;
        if (process.env.DEBUG) console.log(`  ${name}: hf after add ${dB(rms(highpass(d.subarray(0, Math.round(0.012 * sr)), sr, TICK_HZ), 0, Math.round(0.012 * sr)) / p.peak).toFixed(1)}`);
    } else if (nowHf > refHf) {
        // c) too much nail: darken the first 15 ms (fading back to the
        //    untouched signal by 20 ms) by crossfading toward a zero-phase
        //    lowpassed copy, which is what a softer pluck does physically.
        //    Subtracting the content above 3 kHz was tried and stalled: the
        //    nail's brightness is also in the 2-3 kHz harmonics it excites,
        //    which a highpass at 3 kHz barely reaches. Without this step the
        //    normalisation only ever lifted, and a C chord still clicked
        //    harder than an Em because of this one clip.
        const cutLen = Math.round(0.040 * sr), holdLen = Math.round(0.015 * sr), N = Math.round(0.012 * sr);
        const measure = () => rms(highpass(d.subarray(0, N), sr, TICK_HZ), 0, N) / p.peak;
        const original = Float32Array.from(d.subarray(0, cutLen));
        const dark = lowpassZeroPhase(original, sr, 1800);
        let m = 0, now = nowHf;
        for (let pass = 0; pass < 12 && now > refHf * 1.06 && m < 0.97; pass++) {
            m = Math.min(0.97, m + 0.1);
            for (let i = 0; i < cutLen; i++) {
                const w = i < holdLen ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (i - holdLen) / (cutLen - holdLen));
                d[i] = original[i] + w * m * (dark[i] - original[i]);
            }
            now = measure();
        }
        if (process.env.DEBUG) console.log(`  ${name}: hf after darkening ${dB(now).toFixed(1)} (was ${dB(nowHf).toFixed(1)}, blend ${m.toFixed(2)})`);
    }
}

// ---- 4. normalise peak, write, report --------------------------------------
console.log('clip   rise(-3dB)   level@4ms  HF-share   (before -> after)');
for (const [name] of CLIPS) {
    const clip = clips[name], { sr, d, fadeOut } = clip;
    let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    for (let i = 0; i < d.length; i++) d[i] *= 0.9 / peak;
    const after = attackProfile(clip), b = before[name];
    let tail = 0; const tw = Math.round(0.05 * sr); for (let i = d.length - fadeOut - tw; i < d.length - fadeOut; i++) tail += d[i] ** 2;
    console.log(`${name.padEnd(6)} ${String(b.riseMs).padStart(5)} -> ${String(after.riseMs).padStart(5)} ms  ${b.at1ms.toFixed(0).padStart(4)} -> ${after.at1ms.toFixed(0).padStart(4)} dB  ${dB(b.hfLevel).toFixed(0).padStart(4)} -> ${dB(after.hfLevel).toFixed(0).padStart(4)} dB   | ${(d.length / sr).toFixed(2)} s, onset ${clip.onsetSeconds.toFixed(3)} s, tail before fade ${clip.rawTail.toFixed(0)} -> ${(10 * Math.log10(tail / tw)).toFixed(0)} dBFS (room tone was ${clip.noiseDb.toFixed(0)})`);
    writeWav(`${outDir}/${name}.wav`, d, sr);
}
console.log(`reference: HF ${dB(refHf).toFixed(0)} dB re peak; rise ${refEnv.slice(0, 12).map(v => dB(v).toFixed(0)).join(' ')} dB over the first 12 ms`);
