/**
 * Tests for the plucked-string synthesis in audio.js.
 * Plain node, no framework:  node tests/pluck-synthesis.test.js
 *
 * Renders real buffers through pluckString() with a fake AudioContext that
 * only knows createBuffer(), then measures them. These pin the things that
 * are properties of the model rather than taste:
 *
 * - PITCH. The old delay line was rounded to whole samples, so every note up
 *   the neck was sharp (A5 by 4 cents, C6 by 6). The fractional line must put
 *   every note within a couple of cents at any sample rate.
 * - DECAY. Loss is set per pitch (a T60 in seconds), so a high note must not
 *   die several times faster than a low one the way a per-sample loss makes it.
 * - SAFETY. Unit peak, no NaN, no DC, deterministic cache.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let passed = 0, failed = 0;
const check = (label, cond, detail) => {
    if (cond) { passed++; console.log('  ok   ' + label); }
    else { failed++; console.log('  FAIL ' + label + (detail ? ' - ' + detail : '')); }
};

const SRC = fs.readFileSync(path.join(ROOT, 'audio.js'), 'utf8');

function load(sampleRate = 44100) {
    function FakeContext() {
        this.state = 'running';
        this.sampleRate = sampleRate;
        this.createBuffer = (channels, length, sr) => {
            const data = Array.from({ length: channels }, () => new Float32Array(length));
            return { length, sampleRate: sr, numberOfChannels: channels, getChannelData: c => data[c] };
        };
        this.resume = () => Promise.resolve();
    }
    const mod = { exports: {} };
    new Function('window', 'document', 'navigator', 'console', 'module', 'setTimeout',
        SRC + ';module.exports={pluckString,decayTimeFor,createBodyImpulse,getAudioContext,UKULELE_TUNING,getNoteFrequency};'
    )({ AudioContext: FakeContext }, { visibilityState: 'visible', addEventListener() {} }, {},
        { warn() {}, log() {} }, mod, setTimeout);
    return mod.exports;
}

/** Fundamental via autocorrelation with parabolic peak interpolation, in Hz. */
function measurePitch(data, sampleRate, expected, from = 0.3, to = 0.8) {
    const start = Math.round(from * sampleRate);
    const end = Math.min(data.length, Math.round(to * sampleRate));
    const lag0 = sampleRate / expected;
    const lo = Math.floor(lag0 * 0.97), hi = Math.ceil(lag0 * 1.03);
    const corr = [];
    for (let lag = lo; lag <= hi; lag++) {
        let sum = 0;
        for (let i = start; i < end - lag; i++) sum += data[i] * data[i + lag];
        corr.push(sum);
    }
    let best = 0;
    for (let k = 1; k < corr.length; k++) if (corr[k] > corr[best]) best = k;
    let lag = lo + best;
    if (best > 0 && best < corr.length - 1) {
        const a = corr[best - 1], b = corr[best], c = corr[best + 1];
        lag += 0.5 * (a - c) / (a - 2 * b + c);
    }
    return sampleRate / lag;
}

const cents = (f, ref) => 1200 * Math.log2(f / ref);

function rms(data, from, to, sampleRate) {
    const a = Math.round(from * sampleRate), b = Math.min(data.length, Math.round(to * sampleRate));
    let s = 0;
    for (let i = a; i < b; i++) s += data[i] * data[i];
    return Math.sqrt(s / (b - a));
}

// --------------------------------------------------------------------------
console.log('\nPitch is exact up the neck (fractional delay line)');
{
    const audio = load(44100);
    // Open strings, the top of the neck, and the two notes the old integer
    // delay line got most wrong (A5 at fret 12: +4 cents; C6 at fret 15: +6).
    const notes = [
        ['G3 (low-G open)', 196.00], ['C4 (open C)', 261.63], ['E4', 329.63], ['G4', 392.00],
        ['A4', 440.00], ['E5', 659.26], ['A5 (fret 12)', 880.00], ['C6 (A fret 15)', 1046.50],
    ];
    for (const [name, f] of notes) {
        const data = audio.pluckString(f, 1.2).getChannelData(0);
        const err = cents(measurePitch(data, 44100, f), f);
        check(`${name} within 3 cents (${err.toFixed(2)})`, Math.abs(err) < 3);
    }
}

console.log('\n...and at 48 kHz, where the rounding error falls differently');
{
    const audio = load(48000);
    for (const f of [440, 880, 1046.5]) {
        const data = audio.pluckString(f, 1.2).getChannelData(0);
        const err = cents(measurePitch(data, 48000, f), f);
        check(`${f} Hz within 3 cents (${err.toFixed(2)})`, Math.abs(err) < 3);
    }
}

console.log('\nThe attack bends sharp and settles');
{
    const audio = load(44100);
    const data = audio.pluckString(261.63, 1.2).getChannelData(0);
    const early = cents(measurePitch(data, 44100, 261.63, 0.005, 0.045), 261.63);
    const settled = cents(measurePitch(data, 44100, 261.63, 0.3, 0.8), 261.63);
    check(`first 40 ms is sharp (${early.toFixed(1)} cents)`, early > 1 && early < 15);
    check(`steady state is in tune (${settled.toFixed(2)} cents)`, Math.abs(settled) < 3);
}

// --------------------------------------------------------------------------
console.log('\nDecay is set in seconds, per pitch');
{
    const audio = load(44100);
    check('T60 is longer for low notes than high', audio.decayTimeFor(196) > audio.decayTimeFor(880));
    check('T60 stays in a playable range', audio.decayTimeFor(100) <= 3.5 && audio.decayTimeFor(2000) >= 1.0);

    const low = audio.pluckString(261.63, 2.0).getChannelData(0);
    const high = audio.pluckString(880, 2.0).getChannelData(0);
    const dropLow = 20 * Math.log10(rms(low, 0.9, 1.0, 44100) / rms(low, 0.1, 0.2, 44100));
    const dropHigh = 20 * Math.log10(rms(high, 0.9, 1.0, 44100) / rms(high, 0.1, 0.2, 44100));
    check(`C4 has decayed by 1 s (${dropLow.toFixed(1)} dB)`, dropLow < -6 && dropLow > -40);
    check(`A5 has decayed by 1 s (${dropHigh.toFixed(1)} dB)`, dropHigh < -6 && dropHigh > -40);
    // The old per-sample damping made the high note fall ~6x faster. The
    // tolerance is wide: high notes SHOULD go a bit quicker, just not that much.
    check(`A5 decays at most 2.5x faster than C4 (${(dropHigh / dropLow).toFixed(2)}x)`,
        dropHigh / dropLow < 2.5);
    check('the note is still audible at 1 s', rms(low, 0.9, 1.0, 44100) > 0.01);
}

// --------------------------------------------------------------------------
console.log('\nBuffers are safe to sum');
{
    const audio = load(44100);
    for (const f of [196, 440, 1174.66]) {
        const data = audio.pluckString(f, 1.0).getChannelData(0);
        let peak = 0, sum = 0, nan = false;
        for (let i = 0; i < data.length; i++) {
            if (Number.isNaN(data[i])) nan = true;
            peak = Math.max(peak, Math.abs(data[i]));
            sum += data[i];
        }
        check(`${f} Hz: no NaN`, !nan);
        check(`${f} Hz: peak-normalised to 0.95 (${peak.toFixed(3)})`, Math.abs(peak - 0.95) < 0.01);
        check(`${f} Hz: no DC offset (${(sum / data.length).toExponential(1)})`, Math.abs(sum / data.length) < 0.002);
        check(`${f} Hz: ends at silence`, Math.abs(data[data.length - 1]) < 1e-3);
    }

    const a = audio.pluckString(440, 1.0);
    const b = audio.pluckString(440, 1.0);
    const c = audio.pluckString(440, 1.0, { pluckPosition: 0.2 });
    check('same note and length comes from the cache', a === b);
    check('a different pluck position is a different buffer', a !== c);
}

// --------------------------------------------------------------------------
console.log('\nBody impulse response');
{
    const audio = load(44100);
    const ir = audio.createBodyImpulse(audio.getAudioContext());
    check('stereo', ir.numberOfChannels === 2);
    check('short - a body rings for tens of ms, not a hall', ir.length < 0.15 * 44100);
    const l = ir.getChannelData(0), r = ir.getChannelData(1);
    let same = true;
    for (let i = 0; i < l.length; i += 97) if (l[i] !== r[i]) { same = false; break; }
    check('channels differ, so the body adds width', !same);
    check('tail dies out', Math.abs(l[l.length - 1]) < 0.01);
}

// --------------------------------------------------------------------------
console.log('\nPerformance');
{
    const audio = load(44100);
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < 8; i++) audio.pluckString(200 + i * 37.1, 1.5);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 8;
    check(`one 1.5 s pluck renders in under 25 ms (${ms.toFixed(1)} ms)`, ms < 25);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
