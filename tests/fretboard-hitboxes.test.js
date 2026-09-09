// Guards the fretboard click targets in ui.js -> createFretboardSVG().
// Run with: node tests/fretboard-hitboxes.test.js
//
// The bug this exists to prevent: the open-string hit area used to span
// x 23-47 while fret 1's spanned x 35-70, and the fret areas are appended to
// the SVG *after* the open ones, so in hit-test order fret 1 sat on top and won
// every click in the 12px overlap. Worse, the open marker itself was drawn at
// x 35 - fret 1's very first pixel - so clicking the visual centre of the "O"
// selected fret 1. Reported from real use as misclicking between open and the
// first frets.
//
// Geometry is read out of the source rather than by rendering, in the same
// spirit as audio-context.test.js and hover-styles.test.js.
const fs = require('fs');

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
    if (cond) { pass++; console.log(`  ok   ${name}`); }
    else { fail++; console.log(`  FAIL ${name}${detail ? '\n       ' + detail : ''}`); }
}

const SOURCE = fs.readFileSync(__dirname + '/../ui.js', 'utf8');

/**
 * Just the body of createFretboardSVG. Scoping matters: createChordSVG and the
 * circle-of-fifths renderer declare their own `width`/`height`, and an unscoped
 * regex picks up whichever comes first in the file - which is how the first
 * version of this test ended up asserting against width 420.
 */
function fretboardSource() {
    const start = SOURCE.indexOf('function createFretboardSVG(');
    if (start === -1) throw new Error('createFretboardSVG not found in ui.js');
    let depth = 0, i = SOURCE.indexOf('{', start);
    for (let j = i; j < SOURCE.length; j++) {
        if (SOURCE[j] === '{') depth++;
        else if (SOURCE[j] === '}' && --depth === 0) return SOURCE.slice(start, j + 1);
    }
    throw new Error('createFretboardSVG body is unbalanced');
}

const UI = fretboardSource();

function num(pattern, label) {
    const match = UI.match(pattern);
    if (!match) {
        fail++;
        console.log(`  FAIL could not read ${label} from ui.js`);
        return NaN;
    }
    return Number(match[1]);
}

console.log('Fretboard geometry');

const width         = num(/const width = (\d+);/, 'width');
const height        = num(/const height = (\d+);/, 'height');
const leftPadding   = num(/const leftPadding = (\d+);/, 'leftPadding');
const topPadding    = num(/const topPadding = (\d+);/, 'topPadding');
const rightPadding  = num(/const rightPadding = (\d+);/, 'rightPadding');
const bottomPadding = num(/const bottomPadding = (\d+);/, 'bottomPadding');
const openLeft      = num(/const openColumnLeft = (\d+);/, 'openColumnLeft');
const openInset     = num(/const openColumnRight = leftPadding - (\d+);/, 'openColumnRight');
const labelX        = num(/const labelX = (\d+);/, 'labelX');

const openRight = leftPadding - openInset;
const openCenter = (openLeft + openRight) / 2;
const numFrets = 12, numStrings = 4;
const fretSpacing = (width - leftPadding - rightPadding) / numFrets;
const stringSpacing = (height - topPadding - bottomPadding) / (numStrings - 1);

// fret f occupies [leftPadding + (f-1)*fretSpacing, ... + fretSpacing]
const fret1Left = leftPadding;
const fret1Right = leftPadding + fretSpacing;

console.log(`       open column ${openLeft}-${openRight}, fret 1 ${fret1Left}-${fret1Right.toFixed(1)}`);

// THE regression: these two must not overlap, in either direction
check('the open column ends before fret 1 begins',
    openRight <= fret1Left, `open ends at ${openRight}, fret 1 starts at ${fret1Left}`);
check('there is dead space between the open column and the nut',
    fret1Left - openRight > 0, `gap is ${fret1Left - openRight}px`);
check('the open marker centre is inside the open column',
    openCenter > openLeft && openCenter < openRight, `centre ${openCenter}`);
check('the open marker centre is NOT inside fret 1',
    openCenter < fret1Left, `centre ${openCenter} vs fret 1 from ${fret1Left}`);

// Size: an open note must be no harder to hit than a fretted one
const openWidth = openRight - openLeft;
check('the open column is a usable width (>= 20px)', openWidth >= 20, `${openWidth}px`);
check('the open hit area is as tall as a fret cell',
    /openArea\.setAttribute\('height', stringSpacing\)/.test(UI),
    'height must be stringSpacing, not a fixed 20');
check('the open hit area is vertically centred on its string',
    /openArea\.setAttribute\('y', y - stringSpacing \/ 2\)/.test(UI));
check('the open hit area is at least half the area of a fret cell',
    openWidth * stringSpacing >= 0.5 * fretSpacing * stringSpacing,
    `${(openWidth * stringSpacing).toFixed(0)} vs fret cell ${(fretSpacing * stringSpacing).toFixed(0)}`);

// The marker must be drawn where the tap is, not at the nut
check('the open circle is drawn at the open column centre',
    /openCircle\.setAttribute\('cx', openColumnCenter\)/.test(UI),
    'drawing it at leftPadding puts it on fret 1\'s first pixel');
check('the muted X is drawn at the open column centre',
    (UI.match(/openColumnCenter [-+] 5/g) || []).length === 4,
    'all four X endpoints must be relative to openColumnCenter');
check('an open-string scale marker sits in the open column',
    /marker\.fret === 0\s*\n\s*\? openColumnCenter/.test(UI));

// Nothing may collide with the string label
check('the string label sits clear of the open column',
    labelX + 6 < openLeft, `label at ${labelX}, column starts ${openLeft}`);
check('the string label is inside the canvas', labelX - 6 > 0, `label at ${labelX}`);

// Sanity on the board itself
check('the last fret fits inside the canvas',
    leftPadding + numFrets * fretSpacing <= width - rightPadding + 0.01);
check('fret cells stay wide enough to tap (>= 30px)',
    fretSpacing >= 30, `${fretSpacing.toFixed(1)}px`);
check('the open hit area carries a class so it can be styled',
    /openArea\.setAttribute\('class', 'fretboard-open-position'\)/.test(UI));

console.log('\nStyling of the open hit area');
const CSS = fs.readFileSync(__dirname + '/../styles.css', 'utf8');
check('.fretboard-open-position is styled', /\.fretboard-open-position\s*\{/.test(CSS));
check('.fretboard-open-position shows a pointer cursor',
    /\.fretboard-open-position\s*\{[^}]*cursor:\s*pointer/.test(CSS));
check('.fretboard-open-position has hover feedback',
    /\.fretboard-open-position:hover\s*\{/.test(CSS));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
