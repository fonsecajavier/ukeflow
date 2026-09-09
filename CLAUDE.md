# UkeFlow - Claude Code Guidelines

## Project Overview
UkeFlow is a single-page HTML/JS app for learning ukulele chord progressions. No build tools or dependencies - vanilla JS only.

## File Structure

### Core Files
- `index.html` - Main HTML structure
- `styles.css` - All styling
- `songs.json` - Index of song files
- `songs/*.json` - Individual song files
- `PLAN.md` - Feature documentation and implementation details
- `practice.html` / `practice.js` / `practice.css` - Practice Mode (a separate page)
- `melody.js` - the Scales & Melody tab of Practice Mode (loaded by practice.html only)
- `tests/*.js` - Plain node scripts, no framework. Run with `node tests/voicings.test.js`
  (some read source files rather than importing them - see `fretboard-hitboxes.test.js`, `hover-styles.test.js`)

### JavaScript Modules (loaded in this order)
| File | Contents |
|------|----------|
| `chords.js` | CHORDS definitions, SCALE_DEGREES_MAJOR/MINOR, CHORD_VARIATIONS, transposeChord(), transposeKey(), getScaleDegree(), isMinorKey(), getChordVariations(), resolveChord(), computeChordFromFrets(), respellChord(), canonicalRoot(), chordBaseName() |
| `voicings.js` | Chord-melody voicing generator. UKULELE_MIDI, CHORD_TYPES, findMelodyVoicings(), findEasiestVoicing(), explainNoVoicings(), parseChordSymbol(), parseNoteName(), midiToNoteName(), fretToMidi(), countFingers(), degreeLabel() |
| `scales.js` | Scale theory and the melody box finder. SCALE_TYPES, SCALE_DEGREE_LABELS, SCALE_PATTERNS, EAR_LEVELS, getScaleNotes(), getScalePositions(), getMelodyBox(), filterPathByLevel(), explainScaleRange(), scaleNoteName(). Borrows the MIDI/tuning helpers from voicings.js. No DOM. Loaded by practice.html only |
| `state.js` | `state` object (songIndex, songCache, currentSong, transpose, etc.), slugify(), getDisplayKey(), displayChordName(), detectAccidentalStyle() |
| `patterns.js` | PLAY_STYLES (strums/arpeggios), currentBPM, currentPlayStyle, getBeat(), getPlayStyle() |
| `audio.js` | audioContext, UKULELE_TUNING, pluckString(), playStrum(), playChunk(), playChord(), playChordArpeggio(), playChordMelody(), playFretNote(), startDrone(), stopDrone(), isDroneRunning(), restartDroneIfRunning() |
| `analysis.js` | getRelativeKey(), detectFamousProgressions(), detectBorrowedChords(), getUsedChords(), getHarmonicFunction(), detectSecondaryDominant() |
| `ui.js` | `elements` object (DOM refs), createChordDiagram(), createChordSVG(), populatePlayStyleSelector(), updatePatternDisplay(), highlightMatch(), escapeHtml(), closeModal() |
| `app.js` | init(), setupEventListeners(), displaySong(), renderLyrics(), renderChordReference(), renderScaleReference(), openChordModal(), all event handlers |

### Where to Find Things
- **Add a new chord**: `chords.js` → CHORDS object
- **Add chord variations**: `chords.js` → CHORD_VARIATIONS object
- **Modify audio/synthesis**: `audio.js` → pluckString(), playChunk()
- **Add strum/arpeggio pattern**: `patterns.js` → PLAY_STYLES
- **Modify song rendering**: `app.js` → renderLyrics(), displaySong()
- **Modify chord diagrams**: `ui.js` → createChordSVG()
- **Add harmonic analysis**: `analysis.js` → getHarmonicFunction()
- **Chord name spelling vs. scale degrees**: `chords.js` → canonicalRoot(); getScaleDegree() compares canonical roots, so a chord resolves whatever spelling it arrives in. See PLAN.md "Chord Spelling and Scale Degrees"
- **Change how a chord name is spelled on screen**: `chords.js` → respellChord(); call it via displayChordName() at the point the text enters the DOM, never before a CHORDS/getScaleDegree lookup
- **Modify UI elements**: `ui.js` → elements object, then `app.js` for logic
- **Chord-melody voicings**: `voicings.js` → findMelodyVoicings(); add a chord suffix to CHORD_TYPES, tune ranking in scoreVoicing()
- **Chord Melody UI**: `app.js` → renderChordMelody() and createChordMelodyCard(); playback in `audio.js` → playChordMelody()
- **Add a scale type**: `scales.js` → SCALE_TYPES (set `minorish` so the note spelling picks flats correctly)
- **Change the scale fingering chosen**: `scales.js` → bestPathInWindow() cost function, or MIN_BOX_WIDTH/MAX_BOX_WIDTH
- **Scales & Melody UI**: `melody.js`; markup in `practice.html` (`#scales-section`), styles in `practice.css`
- **Add a scale practice pattern**: `scales.js` → SCALE_PATTERNS
- **Change ear-drill difficulty**: `scales.js` → EAR_LEVELS and filterPathByLevel() (selection is by SEMITONE, so one level works for every scale type)
- **Scale note dots on the fretboard**: `ui.js` → createFretboardSVG()'s `markers` argument; colours in `styles.css` (`.fretboard-note*`)
- **Fretboard click targets / hit boxes**: `ui.js` → createFretboardSVG() geometry constants (`openColumnLeft`, `openColumnRight`, `openColumnCenter`, `labelX`); guarded by `tests/fretboard-hitboxes.test.js`
- **Drone / single notes**: `audio.js` → startDrone(), stopDrone(), playFretNote()

## Chord Melody (voicings.js)
`findMelodyVoicings(chordSymbol, melodyNote, options)` returns playable voicings where the
melody note is the **highest-sounding** note of the chord, best first.

**Re-entrant tuning is the whole difficulty.** Standard GCEA has G4 (MIDI 67) as the
*second-highest* string, not the lowest, so "melody on the A string" is wrong on ukulele -
an open G sings over a melody note fretted low on the A or E string. Every comparison in
`voicings.js` is on absolute pitch (MIDI), never string index. Consequences to preserve:
- The melody legitimately lands on the G string sometimes (e.g. E5 at G-string fret 9)
- Muting or re-fretting the G string is a normal, correct outcome - not a bug
- Low melody notes are genuinely impossible as a top note (C4 is the lowest pitch on the
  instrument, so nothing can sit under it) - an empty result is often the right answer

Other behaviors worth knowing:
- The melody note may be a non-chord tone (passing tone); it is flagged `melodyIsChordTone:
  false` and labelled by degree (`9`, `11`, ...). Other strings stay chord tones.
- 7th and extended chords may drop the 5th; triads may not drop anything
- A bare `dim` may be voiced as a dim7 (uke convention, matches the CHORDS shapes)
- `allowRootless: true` permits rootless extended-chord voicings (jazz practice, off by default)
- `shell: true` strips the chord to `CHORD_TYPES.characteristic` so the root and 5th can be
  dropped - this is what makes a two-finger version possible when a full shape needs four.
  **The characteristic set is deliberately strict**: a triad must keep its 3rd, and a seventh
  chord must keep the guide-tone PAIR (3rd + 7th). Keeping only one of them silently turns
  `A7` into an A major triad or a sus chord, which is worse than offering nothing. Use
  `findEasiestVoicing()` rather than calling shell mode directly - it escalates
  normal -> solid shell -> two-note fragment and tags the result `easyTier`.
- Slash chords: the bass note is a scoring preference, not a requirement (see Slash Chords below)
- `CHORD_TYPES` is strict music theory, so a generated voicing for a loosely-named stored
  shape (e.g. `C9` in CHORDS is really an add9 shape) will not match the stored diagram
- An empty result is often the correct answer. Use `explainNoVoicings()` to say why rather
  than reporting "no results" - it distinguishes a note below the instrument's range, a
  chord tone that cannot be reached under the melody, and a shape that only needs a wider
  stretch. The UI shows that text verbatim.

A voicing is shaped like a CHORDS entry (`name`/`frets`/`fingers`/`barre`/`baseFret`) so it
can go straight to `createChordSVG()`, which rings the note named by `melodyString`. Note
that `createChordSVG()` derives its own fret window from `frets` and ignores `baseFret`.

## Scales & Melody (scales.js, melody.js)
`getMelodyBox(chordRoot, scaleType)` returns ONE hand position that plays an
ascending octave of the scale with no *backward string jumps* - no point where the
pitch rises but the fingering must move back toward the G string. It widens the
fret window until such a fingering exists.

**Four measured facts, asserted in `tests/scales.test.js`.** They are properties of
the instrument, not choices in the code, so if an assertion starts failing the UI
copy needs rewriting rather than the test:
- **The box never uses the G string** - true for all 144 combinations of 12 roots
  and 12 scale types. Melody lives on C-E-A. The G string is G4, *higher* than the
  C and E strings, so including it is what forces a backward jump. This is why
  guitar scale charts mislead on ukulele, and `melody.js` states it to the user
  rather than hiding it.
- Major scales fit a **4-fret** hand position; natural minor needs a **5-fret**
  stretch. That follows from the interval pattern.
- **Two octaves never fit, in any key.** The range is C4 (MIDI 60, the open C
  string - not the open G) to A5 (MIDI 81 at fret 12), a span of 21 semitones.
- **Bb and B roots cannot complete one octave** (a tonic octave needs the tonic at
  or below A4). They get a truncated 7-note run plus text from
  `explainScaleRange()`, which the UI prints verbatim in the manner of
  `explainNoVoicings()`.

Other things to preserve:
- Ear-drill answers are judged on **pitch, not fret position** - the same note
  genuinely exists in several places on a re-entrant uke (G4 is both the open G
  string and C-string fret 7), so finding it elsewhere is correct.
- The ear drill is **scaffolded, and the defaults are the easy end**: the shape
  stays visible (so it tests the ear, not recall of the shape) and the pool is
  the three anchors. Eight notes on a blank neck teaches nothing to someone who
  cannot place any of them yet. Keep "Hear it again" unlimited - it is not a
  memory test - and keep `walkUpFromTonic()` naming degrees WITHOUT highlighting
  positions, so it reveals the answer but not its location. Assisted answers are
  counted in `score.assisted` and kept out of the score proper.
- `emptyScore()` is the single definition of a fresh scoreboard. A second
  initialiser that forgot a counter is how `assisted` once incremented from
  undefined into NaN.
- Scale note names are spelled **for the key**: G minor shows Bb, never A#. See
  `scaleUsesFlats()`.
- `SCALE_DEGREE_LABELS` is deliberately NOT `DEGREE_LABELS` from `voicings.js`:
  a scale learner wants "2" and "4", where a chord wants "9" and "11".
- The **drone must stay out of `activeSources`** - every pluck calls
  `stopAllSources()`, which would otherwise cut it off - and must be rebuilt, not
  resumed, after an iOS interruption (see `restartDroneIfRunning()`), or you get a
  silent drone under a toggle that still reads ON.
- `createFretboardSVG()`'s `markers` argument exists because `fretState` holds one
  value per string and so can only ever describe a chord shape. Markers are
  `pointer-events: none` so they do not swallow taps meant for the fret beneath.
- **The open string owns a column left of the nut, and it must not overlap fret
  1.** The fret hit areas are appended after the open ones, so any overlap is won
  by the fret and the open string becomes unclickable there. The original layout
  drew the open marker at `leftPadding`, which is fret 1's first pixel, so
  clicking the middle of the "O" selected fret 1 - reported from real use as
  misclicking near the nut. Keep the marker drawn at `openColumnCenter`, keep the
  open hit area `stringSpacing` tall rather than a fixed 20, and keep a gap
  before the nut. `tests/fretboard-hitboxes.test.js` fails if any of that
  regresses.

## Song File Format
```json
{
  "title": "Song Name",
  "artist": "Artist",
  "key": "Am",
  "spotify": "https://open.spotify.com/track/TRACK_ID",
  "lines": [
    { "section": "Verse 1" },
    {
      "lyrics": "Lyrics here",
      "chords": [
        { "chord": "Am", "position": 0 },
        { "chord": "G", "position": 15 }
      ]
    }
  ]
}
```
- `key`: Use minor keys with "m" suffix (e.g., "Am", "F#m")
- `position`: Character position where chord appears above lyrics

## Adding Songs
1. Create `songs/song-name.json` with correct format
2. Add entry to `songs.json` array with path, title, artist
3. Update `PLAN.md` file structure section
4. **Always search the web** for the correct Spotify track URL and add it to the song JSON as `"spotify": "https://open.spotify.com/track/TRACK_ID"`. Prefer original studio versions over live/remix versions.

## Modifying Songs
When making any changes to existing songs (transposing, editing lyrics, fixing chords, etc.):
1. Make the changes to the song JSON file
2. Update `PLAN.md` to reflect the current state of the song (e.g., update the key if transposed)

## Parsing Lyrics from User Input
When the user provides lyrics with chords, the format is typically:
- **Odd lines**: Chord names (positioned above lyrics)
- **Even lines**: Lyrics

The input may also contain:
- Section markers: `Intro:`, `Verse:`, `Chorus:`, `Bridge:`, `Outro:`, `[Intro]`, `[Verse 1]`, etc.
- Key information: `Key: Am`, `Tom: C`, or chords listed after section names like `Intro: C Am F G`

Example input:
```
Intro: Em

Verse:
Em              B7         Em
Este amor llega asi esta manera
            B7
No tiene la culpa

Chorus:
     Em        Am
Bamboleo, bambolea
```

**IMPORTANT**:
- Parse lyrics EXACTLY as provided by the user
- Do NOT substitute, "correct", or modify lyrics based on prior knowledge
- Use only what is explicitly in the user's prompt
- Match chord positions to character indices in the lyrics line below

## Audio
- Uses Karplus-Strong synthesis (no external audio files)
- Standard ukulele tuning: G4-C4-E4-A4
- Audio code is in `audio.js`
- **iOS/Safari lifecycle**: `ensureAudioReady()` must wake the context from BOTH `'suspended'`
  and `'interrupted'`. `'interrupted'` is a WebKit-only state that Safari parks the context in
  after a screen lock, phone call, or the tab being backgrounded — checking only `'suspended'`
  leaves it dead and every later tap silent until reload. See `RESUMABLE_AUDIO_STATES`.
- **Ringer switch**: `configureAudioSession()` sets `navigator.audioSession.type = 'playback'`
  (Safari 16.4+) so chords are audible with the iPhone on silent — without it Web Audio is
  muted by the hardware switch with no visible cause. Accepted trade-off: `'playback'` is an
  *exclusive* type that per spec pauses other playback audio, possibly the song's Spotify
  embed. It is claimed lazily at context creation, so someone who only uses Spotify never
  triggers it. `'ambient'` would mix but stays muted by the switch, so it is not an option.
- **Testing gotcha**: `ctx.resume()` never settles until the page has had a real user gesture,
  so calling `playChord()` / `playChordMelody()` programmatically on a fresh page used to hang
  the renderer. `ensureAudioReady()` now races it against `AUDIO_RESUME_TIMEOUT_MS`, so such a
  call returns (silently producing nothing) instead of hanging. Click a play button first for
  actual sound — that part is correct browser-autoplay behaviour, not a bug to fix.

## Music Theory
- Minor keys use lowercase roman numerals (i, iv, v)
- Major keys use uppercase (I, IV, V)
- Support for borrowed chords and extended chords (7, maj7, m7, dim, aug)
- Scale/theory data in `chords.js`, analysis functions in `analysis.js`

## When Adding Features
1. Update `PLAN.md` with feature documentation
2. Add code to the appropriate module (see table above)
3. Commit with descriptive message

## Common Tasks
- **Add chord**: Edit `chords.js`, add to CHORDS object with frets/fingers/barre. **Always check both enharmonic spellings** (e.g., C# AND Db, D#m AND Ebm) before adding — the library may already have the chord under its flat/sharp equivalent.
- **Add chord variation**: Edit `chords.js`, add to CHORD_VARIATIONS object
- **Add song**: Create JSON file in songs/, add to `songs.json`
- **Add play style**: Edit `patterns.js`, add to PLAY_STYLES.strums or .arpeggios
- **Add collapsible section**: Follow pattern in index.html (details/summary), add matching CSS
- **Add Spotify link**: Add `"spotify": "https://open.spotify.com/track/TRACK_ID"` to song JSON. **Always search the web** to find the correct Spotify track URL - do not guess or make up track IDs.

## Deployment
1. Push to git: `git push`
2. Deploy to Vercel: `npx vercel --prod`

## Adding Songs to Progressions (Practice Mode)
When adding songs to `progressions.json`:
1. **ALWAYS verify the chord progression** by searching the web for the song's actual chords
2. **Do NOT guess** based on memory or assumptions - chord progressions are often misremembered
3. Convert the chords to roman numerals in the song's key to confirm they match the progression
4. Example: For "Axis of Awesome" (I-V-vi-IV), a song in C with chords C-G-Am-F is correct, but Am-F-C-G would be "Sensitive Female" (vi-IV-I-V)
5. Be especially careful with rotations - the same 4 chords in different orders are different progressions

## Slash Chords
On a re-entrant GCEA ukulele the bass note often can't physically sit below the chord (the lowest note is middle C on the open C string), so voice the bass where it's reachable, otherwise just play the parent triad. This is the standard uke convention — the slash bass is really for a bassist/guitarist.

When adding songs, **keep slash chord names as-is** in the song JSON (e.g., `"chord": "Eb/G"`) for display/notational purposes. The app's `resolveChord()` function handles lookup: if the exact slash chord has a voicing in `chords.js`, it uses that; otherwise it falls back to the parent chord (the part before `/`).

- If a slash chord has a meaningful ukulele voicing, add it to `chords.js` (some already exist: `D/F#`, `G/B`, `Am/G`, `Db/Eb`, etc.) and add the parent triad as a variation in `CHORD_VARIATIONS` so players have a simpler fallback
- If not, no action needed — `resolveChord()` handles the fallback automatically
- Shorthand sus chords (e.g., F4, Eb4) should be written as `Fsus4`, `Ebsus4`

## Reading Chord Diagrams
When the user provides a chord diagram image:
1. The diagram has 4 vertical lines (strings: G-C-E-A from left to right)
2. Horizontal lines are frets (top line is nut/fret 0, then frets 1, 2, 3, 4 going down)
3. Dots indicate where to press
4. Read column by column (left to right), counting which row each dot is on
5. Output as [G, C, E, A] fret numbers
6. Open strings (fret 0) may show an "O" above the nut, or nothing at all - if no dot in a column, it's open (0)
7. Muted strings show an "X" above the nut - record as -1
8. A barre is shown as a thick horizontal line or curved bar spanning multiple strings on the same fret - record as `barre: { fret: N, fromString: X, toString: Y }`
9. Do NOT guess or confirm - follow this method systematically
