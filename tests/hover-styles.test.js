// Guards against sticky-:hover bugs on touch devices.
// Run with: node tests/hover-styles.test.js
//
// On iOS, :hover sticks to the last-tapped element until you tap elsewhere.
// If a :hover rule paints the same as a persistent state class (.active,
// .highlighted, ...), an untoggled control keeps LOOKING toggled - the state is
// correct, the pixels lie. The fix is to gate the :hover rule behind
// @media (hover: hover). This test fails if a new collision is introduced.
const fs = require('fs');

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
    if (cond) { pass++; console.log(`  ok   ${name}`); }
    else { fail++; console.log(`  FAIL ${name}${detail ? '\n       ' + detail : ''}`); }
}

const CSS = fs.readFileSync(__dirname + '/../styles.css', 'utf8');
const STATE_CLASSES = ['.active', '.playing', '.selected', '.highlighted'];
// Cosmetic/animation properties can safely coincide; only paint matters here.
const IGNORED = new Set(['transition', 'cursor', 'transform', 'box-shadow']);

function declarations(body) {
    const out = {};
    for (const decl of body.split(';')) {
        const i = decl.indexOf(':');
        if (i === -1) continue;
        const k = decl.slice(0, i).trim();
        if (k && !IGNORED.has(k)) out[k] = decl.slice(i + 1).trim();
    }
    return out;
}

/** Strip comments, then remove every @media (hover: hover) block. */
function ungated(css) {
    const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    let out = '', i = 0;
    while (i < noComments.length) {
        const at = noComments.indexOf('@media (hover: hover)', i);
        if (at === -1) { out += noComments.slice(i); break; }
        out += noComments.slice(i, at);
        // walk braces to find the end of this block
        let depth = 0, j = noComments.indexOf('{', at);
        for (; j < noComments.length; j++) {
            if (noComments[j] === '{') depth++;
            else if (noComments[j] === '}' && --depth === 0) break;
        }
        i = j + 1;
    }
    return out;
}

function collect(css) {
    const hovers = {}, states = {};
    for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const s = sel.trim();
        if (s.startsWith('@')) continue;
        for (let part of s.split(',')) {
            part = part.trim();
            if (part.endsWith(':hover')) {
                Object.assign(hovers[part.slice(0, -6).trim()] ??= {}, declarations(body));
            }
            for (const st of STATE_CLASSES) {
                if (part.endsWith(st)) {
                    Object.assign(states[part.slice(0, -st.length).trim()] ??= {}, declarations(body));
                }
            }
        }
    }
    return { hovers, states };
}

console.log('Sticky-hover collisions (ungated :hover painting like a state class)');
const { hovers, states } = collect(ungated(CSS));
const collisions = [];
for (const [base, h] of Object.entries(hovers)) {
    const s = states[base];
    if (!s) continue;
    const shared = Object.keys(h).filter(k => s[k] === h[k]);
    if (shared.length) collisions.push(`${base}  shares [${shared.join(', ')}] with its state class`);
}
check('no ungated :hover rule paints like a persistent state class',
    collisions.length === 0, collisions.join('\n       '));

console.log('\nThe three known offenders stay gated');
const gatedSelectors = [...ungated.toString() && CSS.matchAll(/@media \(hover: hover\)\s*\{([\s\S]*?)\n\}/g)]
    .flatMap(m => [...m[1].matchAll(/([^{}]+?):hover\s*\{/g)].map(x => x[1].trim().split('\n').pop().trim()));
for (const sel of ['.toggle-btn', '.tap-to-play-btn', '.song-dropdown li']) {
    check(`${sel}:hover is inside @media (hover: hover)`, gatedSelectors.includes(sel),
        `gated: ${JSON.stringify(gatedSelectors)}`);
}

console.log('\nSanity');
check('the state classes themselves are NOT gated (they must always apply)',
    /\.toggle-btn\.active\s*\{/.test(ungated(CSS)) &&
    /\.tap-to-play-btn\.active\s*\{/.test(ungated(CSS)) &&
    /\.song-dropdown li\.highlighted\s*\{/.test(ungated(CSS)));
check('braces are balanced', (CSS.match(/\{/g) || []).length === (CSS.match(/\}/g) || []).length);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
