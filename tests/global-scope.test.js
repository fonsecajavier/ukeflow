/**
 * Guards against two scripts on the SAME page declaring the same top-level name.
 * Plain node, no framework:  node tests/global-scope.test.js
 *
 * This is not a style rule. Classic <script> tags share one global lexical
 * environment, so two files that both say `function foo` / `const foo` at top
 * level are a SyntaxError that kills the ENTIRE page - every script after it
 * never runs, and the app loads to a blank screen. It is not shadowing and
 * there is no warning.
 *
 * It really happened: chords.js gained a `currentTuning()` helper while
 * voicings.js already had a `currentTuning` binding for the tuning state. Node's
 * require() gives each file its own module scope, so every unit test passed;
 * only loading the two together in one scope surfaced it. That is exactly what
 * this file does.
 *
 * Only LEXICAL declarations collide fatally. Two `function` declarations (or
 * two `var`s) with the same name are legal - the later one simply wins, which
 * is how practice.js deliberately overrides ui.js's closeModal on the practice
 * page. But `let`/`const`/`class` against anything throws. That is the exact
 * shape of the bug: `let currentTuning` in voicings.js versus
 * `function currentTuning()` in chords.js.
 *
 * Names are read per PAGE, because app.js and practice.js legitimately share
 * names and are never loaded together.
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let passed = 0, failed = 0;
function check(label, cond, detail) {
    if (cond) { passed++; console.log(`  ok   ${label}`); }
    else { failed++; console.log(`  FAIL ${label}${detail ? ` - ${detail}` : ''}`); }
}

// Scripts a page loads, in order, from its <script src="..."> tags.
function scriptsOf(page) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    return [...html.matchAll(/<script\s+src="([^"]+\.js)"/g)].map(m => m[1]);
}

// Top-level declarations only: a line that starts at column 0 with a binding
// keyword. Anything indented is inside a function or block and cannot collide.
function topLevelDecls(file) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const decls = new Map(); // name -> kind
    for (const m of src.matchAll(/^(function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) {
        // keep the strictest kind seen for a name within one file
        const kind = m[1];
        if (!decls.has(m[2]) || LEXICAL.has(kind)) decls.set(m[2], kind);
    }
    return decls;
}

// These throw on redeclaration; function/var merely shadow.
const LEXICAL = new Set(['let', 'const', 'class']);
const topLevelNames = file => new Set(topLevelDecls(file).keys());

for (const page of ['index.html', 'practice.html']) {
    console.log(`\n${page}`);
    const scripts = scriptsOf(page);
    check(`${page}: loads scripts`, scripts.length > 0, `${scripts.length}`);

    const owner = {};   // name -> { file, kind }
    const fatal = [], benign = [];
    for (const file of scripts) {
        for (const [name, kind] of topLevelDecls(file)) {
            const prev = owner[name];
            if (!prev) { owner[name] = { file, kind }; continue; }
            const desc = `${name} (${prev.kind} in ${prev.file} + ${kind} in ${file})`;
            if (LEXICAL.has(kind) || LEXICAL.has(prev.kind)) fatal.push(desc);
            else benign.push(desc);
        }
    }
    check(`${page}: no FATAL top-level redeclaration`, fatal.length === 0, fatal.join(', '));
    console.log(`       ${scripts.length} scripts, ${Object.keys(owner).length} top-level names`);
    if (benign.length) console.log(`       benign function/var overrides: ${benign.join(', ')}`);
}

// The specific pair that caused the outage, pinned by name so a rename back
// fails loudly rather than silently.
console.log('\nRegression: the currentTuning collision');
const voicings = topLevelNames('voicings.js');
const chords = topLevelNames('chords.js');
check('voicings.js still owns `currentTuning`', voicings.has('currentTuning'));
check('chords.js does NOT redeclare `currentTuning`', !chords.has('currentTuning'));
check('chords.js uses activeTuningName() instead', chords.has('activeTuningName'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
