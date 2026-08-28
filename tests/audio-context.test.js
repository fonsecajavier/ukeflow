// Tests for the audio context lifecycle: iOS suspend/interrupt handling.
// Run with: node tests/audio-context.test.js
//
// These pin the LOGIC only. They cannot reproduce a real WebKit 'interrupted'
// state - that needs an actual iOS/Safari device.
const fs = require('fs');

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
    if (cond) { pass++; console.log(`  ok   ${name}`); }
    else { fail++; console.log(`  FAIL ${name}${detail ? ' -- ' + detail : ''}`); }
}
function section(t) { console.log(`\n${t}`); }

const SRC = fs.readFileSync(__dirname + '/../audio.js', 'utf8');

/**
 * Load audio.js with a fake AudioContext in the given state.
 * Returns the module surface plus the spies.
 */
function load({ state = 'running', resumeBehaviour = 'resolve', audioSession = {} } = {}) {
    const calls = { resume: 0, listeners: [], warns: [] };

    function FakeContext() {
        this.state = state;
        this.sampleRate = 44100;
        this.resume = () => {
            calls.resume++;
            if (resumeBehaviour === 'resolve') { this.state = 'running'; return Promise.resolve(); }
            if (resumeBehaviour === 'reject') return Promise.reject(new Error('gesture refused'));
            return new Promise(() => {});           // never settles
        };
    }

    const win = { AudioContext: FakeContext };
    const doc = {
        visibilityState: 'visible',
        addEventListener: (ev, fn) => calls.listeners.push(ev),
    };
    const nav = audioSession === null ? {} : { audioSession };
    const mod = { exports: {} };

    new Function('window', 'document', 'navigator', 'console', 'module', 'setTimeout',
        SRC + ';module.exports={ensureAudioReady,getAudioContext,RESUMABLE_AUDIO_STATES,AUDIO_RESUME_TIMEOUT_MS};'
    )(win, doc, nav, { warn: (m) => calls.warns.push(m), log() {} }, mod, setTimeout);

    return { ...mod.exports, calls, nav };
}

// ------------------------------------------------- the bug being fixed
section('ensureAudioReady resumes from every recoverable state');

(async () => {
    const suspended = load({ state: 'suspended' });
    await suspended.ensureAudioReady();
    check('resumes a "suspended" context', suspended.calls.resume === 1,
        `resume called ${suspended.calls.resume}x`);

    // THE FIX: WebKit parks the context here after a screen lock, phone call or
    // backgrounding. The old code only checked 'suspended', so this was missed
    // and every later tap was silent until reload.
    const interrupted = load({ state: 'interrupted' });
    await interrupted.ensureAudioReady();
    check('resumes an "interrupted" context (WebKit-only state)',
        interrupted.calls.resume === 1, `resume called ${interrupted.calls.resume}x`);

    const running = load({ state: 'running' });
    await running.ensureAudioReady();
    check('does NOT resume an already-running context', running.calls.resume === 0);

    check('both recoverable states are declared',
        JSON.stringify(running.RESUMABLE_AUDIO_STATES) === JSON.stringify(['suspended', 'interrupted']),
        JSON.stringify(running.RESUMABLE_AUDIO_STATES));

    // ------------------------------------------------- cannot wedge
    section('A resume() that misbehaves cannot wedge playback');

    const hung = load({ state: 'suspended', resumeBehaviour: 'hang' });
    const t0 = Date.now();
    const ctx = await Promise.race([
        hung.ensureAudioReady().then(() => 'settled'),
        new Promise(r => setTimeout(() => r('STILL HANGING'), hung.AUDIO_RESUME_TIMEOUT_MS + 800)),
    ]);
    const ms = Date.now() - t0;
    check(`a never-settling resume() still returns (${ms}ms, timeout ${hung.AUDIO_RESUME_TIMEOUT_MS}ms)`,
        ctx === 'settled', `got ${ctx}`);
    check('and warns rather than failing silently', hung.calls.warns.length === 1,
        JSON.stringify(hung.calls.warns));

    const rejected = load({ state: 'suspended', resumeBehaviour: 'reject' });
    let threw = false;
    try { await rejected.ensureAudioReady(); } catch (e) { threw = true; }
    check('a rejecting resume() does not throw to the caller', !threw);

    // ------------------------------------------------- ringer switch
    section('iOS ringer switch (navigator.audioSession)');

    const withSession = load({ state: 'running' });
    withSession.getAudioContext();
    check('claims type "playback" so the silent switch does not mute Web Audio',
        withSession.nav.audioSession.type === 'playback',
        String(withSession.nav.audioSession.type));

    let noSessionThrew = false;
    try {
        const without = load({ state: 'running', audioSession: null });
        without.getAudioContext();
    } catch (e) { noSessionThrew = true; }
    check('absent navigator.audioSession is harmless (non-Safari)', !noSessionThrew);

    // The exclusive session is only claimed once audio is actually wanted, so a
    // visitor who only uses the Spotify embed never has it taken from them.
    const lazy = load({ state: 'running' });
    check('no session claimed before the first play', lazy.nav.audioSession.type === undefined,
        String(lazy.nav.audioSession.type));
    lazy.getAudioContext();
    check('claimed once the context is created', lazy.nav.audioSession.type === 'playback');

    // ------------------------------------------------- lifecycle
    section('Lifecycle');

    const lifecycle = load({ state: 'running' });
    lifecycle.getAudioContext();
    check('registers a visibilitychange listener',
        lifecycle.calls.listeners.includes('visibilitychange'),
        JSON.stringify(lifecycle.calls.listeners));

    const once = load({ state: 'running' });
    once.getAudioContext(); once.getAudioContext(); once.getAudioContext();
    check('context and listener are created only once',
        once.calls.listeners.filter(l => l === 'visibilitychange').length === 1);

    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})();
