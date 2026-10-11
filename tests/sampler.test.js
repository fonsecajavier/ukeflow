/**
 * Tests for the sampled ukulele notes in audio.js.
 * Plain node, no framework:  node tests/sampler.test.js
 *
 * The bank is recordings of a real concert ukulele (samples/*.m4a). These pin
 * the parts that are logic rather than listening: which clip a pitch gets and
 * how far it is shifted, that the files exist and stay small, and that the
 * synthesis fallback still carries a page where the clips never arrive.
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

function load({ fetchImpl = undefined } = {}) {
    const calls = { bufferSources: 0, warns: [] };
    function FakeContext() {
        this.state = 'running';
        this.sampleRate = 44100;
        this.currentTime = 0;
        this.destination = {};
        this.createBuffer = (channels, length, sr) => {
            const data = Array.from({ length: channels }, () => new Float32Array(length));
            return { length, sampleRate: sr, numberOfChannels: channels, getChannelData: c => data[c] };
        };
        const param = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
        const node = extra => ({ connect() {}, ...extra });
        this.createGain = () => node({ gain: param() });
        this.createBiquadFilter = () => node({ type: '', frequency: param(), Q: param(), gain: param() });
        this.createDynamicsCompressor = () => node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() });
        this.createConvolver = () => node({ normalize: true, buffer: null });
        this.createStereoPanner = () => node({ pan: param() });
        // Strict like a browser: stop() before start() and a second start()
        // are InvalidStateErrors
        this.createBufferSource = () => {
            calls.bufferSources++;
            const src = node({ buffer: null, playbackRate: param(), onended: null, started: false });
            src.start = () => { if (src.started) throw new Error('InvalidStateError: start() called twice'); src.started = true; };
            src.stop = () => { if (!src.started) throw new Error('InvalidStateError: stop() before start()'); };
            return src;
        };
        this.decodeAudioData = (arrayBuffer, ok) => { ok({ fake: true, name: arrayBuffer.name, length: 1, sampleRate: 48000 }); };
        this.resume = () => Promise.resolve();
    }
    const win = { AudioContext: FakeContext };
    const mod = { exports: {} };
    new Function('window', 'document', 'navigator', 'console', 'module', 'setTimeout', 'fetch',
        SRC + ';module.exports={chooseSample,UKULELE_SAMPLES,CHUCK_SAMPLE,loadUkuleleSamples,hasUkuleleSamples,playPluck,getAudioContext,getNoteFrequency,UKULELE_TUNING};'
    )(win, { visibilityState: 'visible', addEventListener() {} }, {}, { warn: m => calls.warns.push(m), log() {} }, mod, setTimeout, fetchImpl);
    return { ...mod.exports, calls };
}

// --------------------------------------------------------------------------
console.log('\nEvery note on the neck gets a nearby clip');
{
    const audio = load();
    const tunings = { 'high-G': [392.00, 261.63, 329.63, 440.00], 'low-G': [196.00, 261.63, 329.63, 440.00] };
    for (const [name, open] of Object.entries(tunings)) {
        let worst = 0, worstNote = '', worstHigh = 0;
        for (let s = 0; s < 4; s++) {
            for (let fret = 0; fret <= 15; fret++) {
                const f = open[s] * Math.pow(2, fret / 12);
                const { semitones, sample } = audio.chooseSample(f);
                if (sample.name === 'a4' && Math.abs(f - 440) > 1) check(`${name} string ${s} fret ${fret} avoids the open-A clip`, false, `${f.toFixed(1)} Hz -> a4`);
                if (f > 881) { worstHigh = Math.max(worstHigh, Math.abs(semitones)); continue; }   // nothing recorded above the 12th-fret A
                if (Math.abs(semitones) > worst) { worst = Math.abs(semitones); worstNote = `string ${s} fret ${fret}`; }
            }
        }
        check(`${name}: worst shift up to the 12th-fret A is 4 semitones or less (${worst.toFixed(2)} at ${worstNote})`, worst <= 4.01);
        check(`${name}: above it, at most 5 (${worstHigh.toFixed(2)})`, worstHigh <= 5.01);
    }
    const g4 = audio.chooseSample(392);
    check(`high-G open string uses the E clip shifted up, not the wolfy open A (${g4.sample.name})`, g4.sample.name === 'e4');
    check('the open A plays its own clip', audio.chooseSample(440).sample.name === 'a4');
    check('a note 1 semitone off the open A does NOT use the A clip', audio.chooseSample(466.16).sample.name !== 'a4');
    check('rate is the exact pitch ratio', Math.abs(audio.chooseSample(523.25).rate - 523.25 / 587.33) < 1e-9);
}

// --------------------------------------------------------------------------
console.log('\nThe clips exist and stay small');
{
    const audio = load();
    const names = [...audio.UKULELE_SAMPLES.map(s => s.name), audio.CHUCK_SAMPLE];
    let total = 0;
    for (const name of names) {
        const p = path.join(ROOT, 'samples', `${name}.m4a`);
        const exists = fs.existsSync(p);
        check(`samples/${name}.m4a exists`, exists);
        if (exists) {
            const size = fs.statSync(p).size;
            total += size;
            check(`samples/${name}.m4a under 60 KB (${(size / 1024).toFixed(0)} KB)`, size < 60 * 1024);
        }
    }
    check(`the whole bank is under 400 KB (${(total / 1024).toFixed(0)} KB)`, total < 400 * 1024);
    check('clip pitches ascend (the nearest-clip search assumes nothing, but a typo would show here)',
        audio.UKULELE_SAMPLES.every((s, i, a) => i === 0 || s.frequency > a[i - 1].frequency));
}

// --------------------------------------------------------------------------
console.log('\nA page without the clips still plays');
(async () => {
    const audio = load({ fetchImpl: async () => ({ ok: false, status: 404 }) });
    const bank = await audio.loadUkuleleSamples();
    check('a failed fetch resolves to null rather than throwing', bank === null);
    check('and reports it once', audio.calls.warns.length === 1);
    check('hasUkuleleSamples() is false', audio.hasUkuleleSamples() === false);
    let threw = null;
    try { audio.playPluck(261.63, 0, { stringIndex: 1 }); } catch (e) { threw = e; }
    check('playPluck() falls back to synthesis without throwing', threw === null, threw && threw.message);
    check('...and created a source', audio.calls.bufferSources === 1);

    const noFetch = load();
    const bank2 = await noFetch.loadUkuleleSamples();
    check('no fetch at all (file://, old engine) also degrades to null', bank2 === null);

    console.log('\nWith the bank in, notes play the clips');
    const good = load({ fetchImpl: async url => ({ ok: true, status: 200, arrayBuffer: async () => ({ name: url.replace(/^.*\/(\w+)\.m4a$/, '$1') }) }) });
    const bank3 = await good.loadUkuleleSamples();
    check('the bank holds every clip', bank3 && Object.keys(bank3).length === good.UKULELE_SAMPLES.length + 1);
    check('hasUkuleleSamples() is true', good.hasUkuleleSamples() === true);
    let hit = null, sampledThrew = null;
    try { hit = good.playPluck(392, 0, { stringIndex: 0, humanize: 0 }); } catch (e) { sampledThrew = e; }
    check('a sampled note schedules without an InvalidStateError', sampledThrew === null, sampledThrew && sampledThrew.message);
    check('a high-G open string plays the e4 clip', hit && hit.source.buffer && hit.source.buffer.name === 'e4');
    check('shifted by the exact ratio', Math.abs(hit.source.playbackRate.value - 392 / 329.63) < 1e-9);
    check('the open A plays its own clip at rate 1', good.playPluck(440, 0, { humanize: 0 }).source.playbackRate.value === 1);
    // re-plucking a string chokes the previous source: must not throw either
    let threw2 = null;
    try { good.playPluck(261.63, 0.5, { stringIndex: 1 }); good.playPluck(293.66, 1.0, { stringIndex: 1 }); } catch (e) { threw2 = e; }
    check('re-plucking a string with a clip ringing does not throw', threw2 === null, threw2 && threw2.message);

    console.log('\nBoth pages preload the bank');
    for (const page of ['app.js', 'practice.js']) {
        const src = fs.readFileSync(path.join(ROOT, page), 'utf8');
        check(`${page} calls preloadUkuleleSamples() at init`, /preloadUkuleleSamples\(\)/.test(src));
    }

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
})();
