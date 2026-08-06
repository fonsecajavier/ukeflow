# Ukulele Progression Learning App - Implementation Plan

## Overview
A single-page HTML/JS app that displays ukulele chord charts, lyrics with chords, and helps learn chord progressions.

## Core Features

### 1. Song Display
- Load songs from a `songs.json` file
- Display song title and key at the top
- Show lyrics with chord markers above the text
- Chords positioned inline above the corresponding lyrics
- Song selector with custom autocomplete dropdown (Safari-compatible)
  - Type to search by song title or artist
  - Highlights matching text in results
  - Keyboard navigation (Arrow Up/Down, Enter, Escape)
  - Works on all browsers (replaces native datalist)
- Home page displays clickable list of all songs when no song is selected
- Clicking the header title returns to home
- Songs filtered and sorted alphabetically as you type
- Clear button (×) to reset song selection
- Browser back/forward navigation support (pushState/popstate)
- URL-based song loading with slugified titles (accents normalized)

### 2. Chord Diagram Library
- Visual chord diagrams showing:
  - 4 strings (G, C, E, A)
  - Fret positions
  - Finger numbers (1, 2, 3, 4)
  - Barre indicators
- Common ukulele chords: C, Am, F, G, G7, D, Dm, Em, A, E, etc.

### 3. Chord Reference Section (Top of Page)
- Display all chords used in the current song
- Each chord shows a mini diagram with finger positions
- Chord name displayed with scale degree below (e.g., "Am" with "i" below)
- Located prominently at the top for quick reference
- Click any chord to see enlarged popup

### 3a. Scale Reference (Collapsible)
- Collapsible section showing all 7 diatonic chords in the current key
- Displays roman numeral above each chord name
- Click any chord to see its diagram popup
- Uses native HTML `<details>`/`<summary>` for expand/collapse
- Updates when transposing to show the new key's scale
- Shows warning for uncommon keys (e.g., A#m) with suggestion to use enharmonic equivalent (e.g., Bbm)

### 3b. Progression Summary (Collapsible)
- Collapsible section showing chord progressions used in the song
- Groups progressions by song section (Verse, Chorus, etc.)
- Displays roman numerals with chord names in parentheses
- Shows repeat count (×2, ×3) when same progression appears multiple times

### 3c. Music Trivia (Collapsible)
- Collapsible section with educational information about the song's chords
- **Key Information**: Displays whether song is in major or minor key
- **Relative Key**: Shows the relative major/minor key
- **Key Confidence Analysis**: Intelligent analysis to validate/suggest the correct key:
  - 🎯 Shows opening and closing chords
  - 📊 Identifies most frequent chord
  - 🔄 Detects V→I cadences and what key they resolve to
  - 🎹 Detects ii-V-I progressions (strongest key indicator) - requires minor ii chord
  - 🎵 Tracks section openings (stronger indicator than endings for key detection)
  - 🎭 Detects "tension pattern" when sections end on different chord than they start
  - 🚫 Warns if tonic chord is missing from the song
  - ⚠️ Warns if dominant (V) chord is missing
  - 💡 Suggests alternative key when evidence points elsewhere
  - ✅ Confirms when all chords are diatonic (belong to the scale)
  - **Candidate key validation**:
    - Requires candidate key's dominant (V) chord to exist in song
    - Penalizes keys with non-diatonic chords (-3 per chord, -10 if >25% chromatic)
  - Confidence levels: strong, ambiguous, likely different, weak
  - Analysis updates when switching to relative key view
- **Famous Progressions Detection**: Identifies well-known chord patterns:
  - I-V-vi-IV "Axis of Awesome" progression
  - vi-IV-I-V "Sensitive Female" progression
  - ii-V-I Jazz turnaround
  - I-IV-V Classic rock/blues progression
  - i-VII-VI-V Andalusian cadence (flamenco)
  - V-VI Phrygian flavor (Middle Eastern/Spanish)
  - i-iv-v Minor blues
  - I-vi-IV-V "50s Doo-Wop" progression
- **Borrowed Chords**: Identifies chords outside the diatonic scale (modal interchange)
- Only shows trivia items that are relevant to the current song

### 3d. Circle of Fifths (Collapsible)
- Interactive SVG circle (480px) showing all 12 major keys arranged clockwise (C at top)
- Inner ring displays relative minor keys
- **Ukulele-friendly notation**: Uses F# instead of Gb at 6 o'clock (sharps preferred)
  - Displays "F#/Gb" and "D#m/Ebm" (stacked on two lines) to show both options
- **Larger fonts**: Major keys 22px, minor keys 16px for better readability
- Current song's key highlighted with orange/blue glow effect
- **Suggested key highlighting**: When analysis suggests a different key:
  - Current key shown with dimmed highlight
  - Suggested key shown with green highlight
  - Note at bottom: "💡 Analysis suggests: [key]"
- Click any key to open modal showing:
  - Key name and relative minor
  - All 7 diatonic chords with roman numerals
  - **Play button** under each chord to hear it
  - **Keyboard shortcuts**: Press 1-7 to play corresponding diatonic chord
  - **Enharmonic chord support**: Chords like Cb display as "Cb/B" and are playable
  - Each chord clickable to view its diagram
  - "Transpose to this key" button to quickly transpose the song
- Updates when toggling relative key view
- Useful for understanding key relationships and planning transpositions

### 3e. Songwriter's Circle (Collapsible)
- Arc-shaped "chord wheel" showing diatonic chords and their relationships
- Structure (from left to right):
  - Inner ring: Relative minors (ii, vi, iii)
  - Middle ring: Primary chords (IV, I, V/V7)
  - Outer extensions: Secondary dominants (II7, VI7, III7)
- **Current key highlighting**: The actual selected key's chord is highlighted with orange dotted border
  - For minor keys (e.g., Em), highlights the vi position (not I) since that's where the minor key sits
- **Suggested key highlighting**: When analysis suggests a different key:
  - Current key shown with dimmed dotted border
  - Suggested key shown with green dotted border and fill
  - Note at bottom: "💡 Analysis suggests: [key]"
- Click any chord to see:
  - Chord diagram (V/V7 shows both options side by side)
  - Roman numeral function
  - Explanation of harmonic role (tonic, dominant, subdominant, etc.)
- Minor keys: Shows relative major with note at bottom (e.g., "Showing relative major: G" when in Em)
- Updates when toggling relative key view
- Useful for:
  - Understanding chord relationships within a key
  - Building progressions using common patterns
  - Adding secondary dominants for jazzy color
  - Visualizing why the analysis suggests a different key

### 3f. Chord Finder (Collapsible)
- Interactive fretboard tool to identify chords by clicking on fret positions
- **Visual fretboard**: 12 frets × 4 strings displayed horizontally
  - Default view: A-E-C-G (high to low, top to bottom)
  - Flip button toggles to G-C-E-A orientation
- **Click interactions**:
  - Click any fret position to place a finger dot (click again to remove)
  - Click on string near the nut to toggle: open (O) ↔ muted (X)
  - All strings default to **open** (green circles)
- **Notes display**:
  - Shows which note is playing on each string (e.g., "G: G  C: C  E: E  A: A")
  - Muted strings show × and appear dimmed
  - Updates in real-time as you click
- **Two-tier chord matching**:
  - **From Library**: Exact matches from the CHORDS database (clickable to open modal)
  - **Computed**: Music theory analysis identifying chords by interval patterns
    - Analyzes all possible roots and matches against chord patterns
    - Supports: major, minor, 7, m7, maj7, 6, m6, dim, aug, sus2, sus4, dim7, m7b5, add9
    - Prioritizes root position chords over inversions
    - Subsumption filtering: hides simpler chords when extended version matches (e.g., shows Am7, not Am)
- **Controls**:
  - **Flip** button (purple): Toggle string order between A-E-C-G and G-C-E-A
  - **Clear** button (red): Resets to all open strings
  - **Play** button (green): Hear the current fingering
- **Visual indicators**:
  - Orange filled dots for fretted positions (shows fret number inside)
  - Green filled circles for open strings
  - Red X for muted strings
  - Fret markers at positions 3, 5, 7, 9 (single dot) and 12 (double dot)
  - Fret numbers displayed below (1, 3, 5, 7, 9, 12)
- **Initial state**: All strings open (shows Am7 in computed, C6 in library)
- Uses same audio synthesis as other chord playback features

### 3h. Chord Library (Collapsible)
- Browsable library of all available chords in the app
- Grouped by type for easy navigation:
  - Major (C, D, E, F, G, A, B)
  - Minor (Cm, Dm, Em, etc.)
  - 7th (C7, D7, G7, etc.)
  - Major 7th (Cmaj7, Dmaj7, etc.)
  - Minor 7th (Cm7, Dm7, etc.)
  - Diminished, Augmented, Suspended, Other
- Click any chord to open modal with diagram and variations
- Useful for experimenting with alternative chords while playing a song
- Only renders once (cached) since library doesn't change per song

### 3i. Harmonic Analysis (Collapsible)
- Collapsible table showing detailed harmonic analysis of each chord in the song
- **Columns**:
  - Chord: Clickable chord name (opens diagram modal)
  - Degree: Roman numeral scale degree
  - Function: Harmonic function with color coding
- **Play button**: Small play button next to each chord to hear it
- **Function types** (color coded):
  - Tonic (green): I/i - home base
  - Dominant (red): V, VII - tension/resolution
  - Subdominant (purple): II, IV - pre-dominant
  - Mediant (blue): III, VI - color/transitions
  - Borrowed (orange): Chromatic/modal interchange
- **Extended chord detection**: Shows [maj7], [m7], [dom7], [diminished], [augmented], [suspended], [added tone]
- **Special annotations**:
  - Relative Major/Minor identification
  - Dorian IV in minor keys
  - Natural vs harmonic minor dominant
  - Borrowed chord sources (Mixolydian, Parallel Minor)
- **Secondary Dominant Detection**:
  - Identifies non-diatonic major chords functioning as V/x
  - Major keys: V/ii, V/iii, V/IV, V/V, V/vi, V/vii°
  - Minor keys: V/III, V/iv, V/v, V/VI, V/VII
  - Displayed in both Harmonic Analysis table and lyrics (when "Show as Numbers" enabled)
  - Example: E major in key of C shown as "V/vi (Secondary Dominant)"

### 3k. Chord Melody Voicing Generator (voicings.js)
Engine layer only - no UI yet. Given a chord and a melody note, produces the playable
voicings in which the melody note is the **highest-sounding** note of the chord. This is the
core technique of chord-melody playing: the tune must ring on top of the harmony.

**API**: `findMelodyVoicings(chordSymbol, melodyNote, options)` → array of voicings, best first
- `chordSymbol`: `"C"`, `"Am7"`, `"Cmaj7"`, `"Eb/G"` - the same vocabulary songs already use
- `melodyNote`: `"E5"` for an exact pitch, or `"E"` to search every reachable octave
- Each result carries `name`, `frets`, `fingers` (per-string 1-4), `barre`, `baseFret` -
  the same field shape as a CHORDS entry, so it can be passed to `createChordSVG()` -
  plus `fingerCount`, `notes`, `degrees` per string, `melodyString`, `melodyNote`,
  `melodyDegree`, `melodyIsChordTone`, `bassNote`, `span`, `openStrings`, `mutedStrings`,
  `clearance`, `score`, `warnings`
- Barre basis matches `chords.js`: `fromString`/`toString` are **0-indexed array
  positions**, and a barre may span under a string fretted higher (`Bb7 [1,2,1,1]`).
  Verified against all 63 stored barre shapes - 63 exact matches, 0 disagreements.
- **Rendering caveat**: `createChordSVG()` derives its own 5-fret window from `frets` and
  ignores `baseFret`. The `maxSpan` limit keeps fretted notes inside that window, but a
  high-position voicing that also has open strings renders as "7fr" plus open markers -
  readable, but worth eyeballing when the UI is built.

**Options**: `maxFret` (12), `maxSpan` (4), `minNotes` (3, or 2 in shell mode), `maxFingers`
(4), `allowMutes` (true), `allowNonChordMelody` (true), `allowRootless` (false), `shell`
(false), `limit` (8)

**Shell voicings (`shell: true`) - the two-finger escape hatch.** 47.5% of chord+melody pairs
in the song library have no voicing playable with two fingers, which is a real problem when a
four-finger shape lands in an awkward position. Shell mode strips the chord to
`CHORD_TYPES.characteristic` - the tones that define its quality - so the **root and 5th can
be dropped**. That is normal chord-melody practice: the harmony around you supplies the root.

The rule that matters: for a triad the characteristic tone is the 3rd; for a seventh chord it
is the **guide-tone pair (3rd + 7th)**. A looser rule that kept any one characteristic tone
reached 100% coverage but produced `A7 / E5 -> [9 9 9 0]`, which contains no G at all - an A
major triad labelled A7. Requiring both costs ~10% coverage and is worth it.

Results are tagged `isShell`, `shellTier` ('solid' for 3+ notes, 'fragment' for a two-note
double stop), `noteCount` and `hasRoot`. Shell ranking prefers fuller voicings and a present
root, so a shape only degrades as far as it must.

**`findEasiestVoicing(chordSymbol, melodyNote, options)`** escalates only as far as needed and
tags the result `easyTier`:
1. `'normal'` - a full voicing already fits the finger limit (default 2)
2. `'solid'` - a shell with 3+ notes; the root may be gone but it stands on its own
3. `'fragment'` - a two-note double stop; honest, but needs the harmony around it

Measured over all 89 library chords x every reachable melody pitch (997 valid pairs):
523 `normal`, 335 `solid`, 94 `fragment`, 45 with no two-finger option at all - so **90.5% of
the hard cases get a two-finger version**, and no easy option ever loses a defining tone.
Escalating solid-before-fragment matters: it cut fragments from 162 to 94.

**Re-entrant tuning drives the design.** G4 (MIDI 67) is the second-highest string, not the
lowest, so all comparisons are on absolute pitch rather than string index. This means the
melody sometimes belongs on the G string (E5 at fret 9), muting the G string is often the
correct answer, and some melody notes are genuinely impossible as a top note.

**Ranking** (`scoreVoicing()`, lower is better): fret span, finger count (barres counted as
one), position on the neck, open strings, mute difficulty (interior C/E strings are heavily
penalized, the outer G lightly), melody clearance above the next-highest note, root or
slash-bass in the bass, chord-tone melody over passing tone.

**Tests**: `node tests/voicings.test.js` - 72 assertions covering pitch math, symbol parsing,
the melody-on-top invariant, re-entrant G behavior, passing tones, 7th chords, slash chords,
options, barre/fingering rules, the `createChordSVG()` field contract, and a
1134-combination invariant sweep.
`node tests/voicings-crosscheck.js` replays all 230 hand-authored CHORDS shapes through the
generator; it rediscovers 84.8%, and the remainder are stored shapes whose frets do not match
their names (confirmed independently by `computeChordFromFrets`) - see below.

**Known CHORDS naming mismatches** surfaced by the cross-check (unfixed, pre-existing):
`Am7b5` `[2 0 0 0]` is really Am; `Fm7b5`, `F#m7b5`/`Gbm7b5` are augmented shapes;
`Ebsus2`/`D#sus2` and `Ebsus4`/`Ebsus`/`D#sus4` are voiced in the wrong root; `Dadd9` is
plain D; `Gadd9`/`Gadd2` are G6; several `9` and all `11` entries omit the b7 or the extension.

**Next step (engine)**: a `melody` array in song JSON, so a whole line can be walked
note-by-note with a voicing per chord change (see 3l for the UI that exists today).

### 3l. Chord Melody UI (Collapsible)
Collapsible section below Chord Finder. Two steps: pick a chord chip, tap a melody note on
the fretboard, get the voicings. Renders lazily on first open, like Chord Finder.

- **Chord chips**: the chords actually used in the current song, from `getUsedChords()`, so
  they follow the current transpose. First chip auto-selected.
- **Fretboard**: reuses `createFretboardSVG()`. Only the tapped note is marked (all other
  strings passed as `null`), so the board reads as "choose a note" rather than "build a
  shape". Tapping the same spot again clears it. Flip button matches Chord Finder.
- **Result cards**: one per voicing, `createChordSVG()` with the melody note ringed in
  orange, notes listed **in pitch order** (not string order - the re-entrant G makes those
  differ), which string carries the melody, and honest cost badges: finger count, barre,
  3+ fret stretch, muted strings (interior C/E flagged as a warning), melody doubled in
  unison, and the degree when the melody is a passing tone.
- **Teaching line**: names what the melody note is doing - "E5 is the major 3rd of C", or
  "D5 is not in C - it sounds as the 9th, a passing tone".
- **Empty state**: uses `explainNoVoicings()` rather than showing "no results". Real
  examples: "C4 is too low to carry the melody: only 1 of the four strings can sound at or
  below it... C4 is the lowest pitch on a ukulele, so nothing can sit under it." / "G needs
  a B, and it cannot be played at or below A4."
- **Playback**: `playChordMelody()` in `audio.js` plucks in ascending pitch order, 20ms
  apart, melody louder (0.42 vs 0.2) with a longer tail (2.2s vs 1.4s) so the tune sings
  on top. Calls `stopAllSources()` first, like `playChord()`.

**Easy versions (2 fingers).** Two ways in, because three or four fingers in an awkward
position is the main thing that stops a shape being playable:
- **Appended card**: when nothing in the normal list is holdable with two fingers, one extra
  card is appended via `findEasiestVoicing()`. A `'solid'` tier gets a green "Easiest way to
  play it:" heading and says what it dropped ("Same chord, 2 fingers - drops the root (F),
  keeps what makes it F"). A `'fragment'` is demoted: orange "Last resort - needs the harmony
  around it:" heading, dashed border, reduced opacity, and `2 notes only` / `no root` badges.
  Nothing is appended when the normal list already has a two-finger option.
- **Easy mode toggle**: restricts the whole list to `{maxFingers: 2, shell: true}` so a full
  song can be practised in easy mode. If even a shell is impossible (the 45 pairs), it does
  **not** claim the note is unplayable - it explains and falls back to the full shapes.

Shell cards carry honest badges wherever they appear (`no root`, `2 notes only`), so an easy
version is never mistaken for a complete voicing.

**State**: `chordMelodyChord`, `chordMelodyPick` ({stringIndex, fret}), `chordMelodyFlipped`,
`chordMelodyRendered`, `chordMelodySongTitle` in `app.js`. The melody pick survives a
transpose (the pitch you tapped is still that pitch) but resets when the song changes.

**Supporting changes to `createChordSVG()`**. Checked against all 252 stored shapes (`CHORDS`
plus `CHORD_VARIATIONS`): 246 render byte-identically, and the other 6 are all
`CHORD_VARIATIONS` entries that render **better** than before - the changes fixed
pre-existing bugs rather than introducing any:
- `F (bar) [5,5,5,8]`, `F (alt) [5,5,6,5]` and `D (alt) [7,7,7,5]` were drawing dots
  *outside* the diagram (the old rule left the window at fret 1, so `F (bar)`'s 8th-fret dot
  computed to cy=204 in a 160px canvas and simply vanished). They now show a "5fr" label with
  every dot inside the canvas.
- `G (bar) [7,7,7,10]`, `Em (bar) [7,7,7,7]` and `A#m (6th) [6,6,6,6]` were already
  high-position but had their fret label clipped and colliding with the first dot; they now
  get the left padding.
- The one shape with `baseFret: 5` (`A (bar) [4,4,4,4]`) renders unchanged. Note that
  `createChordSVG()` ignores `baseFret` and derives the window from `frets`.

The changes themselves:
1. The fret window now keys off **maxFret**, not minFret - `[0,0,3,7]` has minFret 3 but
   still needs the window moved or the 7th-fret dot lands off-canvas. The diagram also grows
   its height for shapes spanning more than 5 frets, so no caller can draw outside the area.
2. Open-string markers are drawn in high position too. They were suppressed, which left a
   voicing like `[0,0,0,7]` showing a single dot and three blank strings.
3. High-position diagrams get left padding via a negative `viewBox` origin, and the "12fr"
   label is right-anchored - previously it clipped at the edge and collided with the first dot.
4. A voicing carrying `melodyString` gets that note ringed in `#f39c12`. Done as a pass over
   the finished diagram so it works whether the note is fretted, open, or inside a barre.

### 3j. Spotify Integration
- Embedded Spotify player for songs with a `spotify` field
- Displays above "Chords Used" section when available
- Supports various Spotify URL formats (open.spotify.com, spotify: URI)
- 152px height compact player with playback controls

### 4. Interactive Chord Popups
- Click any chord in the lyrics section
- Shows a popup/modal with the chord diagram
- Displays finger positions clearly
- Easy to dismiss (click outside, X button, or Escape key)

### 4a. Chord Audio Playback
- Play button on each chord diagram to hear the chord
- Uses Karplus-Strong synthesis for realistic plucked ukulele sound
- Based on standard ukulele tuning (G4-C4-E4-A4)
- No external audio files required - generated in real-time
- Visual feedback when playing (button pulses)
- **Ukulele-specific sound design**:
  - Nylon string character with harmonic-rich initial pluck
  - Body resonance simulation at ~420Hz and ~520Hz
  - Warm sustain with two-sample averaging
  - Quadratic attack/release envelopes for natural feel
  - Subtle high-frequency roll-off for woody tone

- **Play Style Selector** with grouped options:

  **Strums** (D=down, U=up, x=muted chunk):
  - Down Strums (D D D D) - simple down strums
  - Island Strum (D D U U D U) - classic Hawaiian feel
  - Basic (D U D U) - alternating pattern
  - Rock (D D U D) - driving rhythm
  - Calypso (D U U D U) - Caribbean feel
  - Chunk/Muted (D x U x) - percussive with muted hits
    - Soft, subtle palm-mute sound
    - Mutes currently ringing strings (realistic palm behavior)
    - Gentle body thump and woody resonance
  - Reggae Chunk (x U x U) - off-beat with chunks
  - Ska Upstroke (x U x U) - ska style
  - Funky Chunk (D x D U x U) - syncopated funk
  - Bossa Nova (D x D U D x) - Brazilian feel
  - Shuffle (D x D x) - swing feel with chunks
  - Latin Fire (D D x U x U D x) - energetic Latin
  - Flamenco (D x x U D U x D) - passionate style
  - Waltz (D D D) - 3/4 time
  - Reggae Skank (x U x U) - off-beat style
  - Merengue (D U x U) - fast Dominican 2/4 feel
  - Salsa (D x U D x U x D) - montuno-style with clave feel

  **Arpeggios** (fingerpicking patterns):
  - Down Roll - G→C→E→A (default)
  - Up Roll - A→E→C→G
  - Pinch & Roll - bass+treble pinch then roll
  - Travis Pick - alternating bass fingerpicking
  - Fingerpick (p-i-m-i) - thumb, index, middle, index
  - Fingerpick (p-i-m-a) - thumb, index, middle, ring
  - Campanella - bell-like cascading pattern
  - Classical - p-i-m-a-m-i pattern
  - Waltz Arpeggio - bass then chord (3/4 feel)
  - Folk Pattern - alternating bass with melody
  - Tremolo - rapid repeated high string
  - Cascade - flowing waterfall pattern
  - Spanish Roll - rasgueado-inspired
  - Jazz Comp - jazz comping style
  - Island Roll - Hawaiian style
  - Good Riddance - classic fingerpicking (G-E-C-A-C-E-C-A)

- **Tempo Selector** (80-160 BPM):
  - Controls timing for both strums and arpeggios
  - Strums use beat-based timing for authentic rhythm feel
  - Arpeggios scale proportionally (120 BPM = base speed)
  - Default: 120 BPM

- **Pattern Display**:
  - Shows visual representation of selected pattern
  - Strums: ↓ ↑ ✕ arrows (down, up, muted)
  - Arpeggios: G → C → E → A string sequence

### 4b. Alternative Chord Voicings
- Chords with multiple voicings show a "+N" indicator badge
- Click chord to open modal showing all available voicings side-by-side
- Default voicing highlighted with green border
- Each voicing has its own play button
- High position chords (fret > 5) show fret number indicator (e.g., "6fr")
- Voicings include descriptions (e.g., "Barre chord shape", "Higher position")
- Currently supported: C, Am, F, G, D, A, E, Em, Dm, Bm, A#m, F#, G#, C7, G7

### 5. Progression Toggle
- Button to switch between:
  - **Chord Names**: C, Am, F, G
  - **Scale Degrees**: I, vi, IV, V (major keys) or i, ii°, III, iv, v, VI, VII (minor keys)
- Based on the song's key
- Supports both major and minor keys with appropriate roman numeral notation
- Minor keys include borrowed chords: major IV (from Dorian) and major V (from harmonic minor)

### 6. Transpose Feature
- Dropdown to transpose song up or down by semitones (-5 to +6)
- Updates key display, chord reference, and all chords in lyrics
- Resets to original when switching songs

### 6a. Relative Key Toggle
- Button (↔) next to key display to switch between original key and relative major/minor
- Example: C major ↔ Am (relative minor), or Em ↔ G (relative major)
- Updates all harmonic analysis (roman numerals, functions) without changing chord names
- Useful for songs that could be analyzed in either key
- Visual indicator when viewing relative key
- Resets when switching songs

### 7. URL Bookmarking
- URL updates when selecting a song (e.g., `?song=somewhere-over-the-rainbow`)
- Transpose value included in URL when not 0 (e.g., `?song=riptide&transpose=2`)
- Opening a bookmarked URL loads the song and transpose automatically
- Song titles converted to URL-friendly slugs

## File Structure

```
ukeflow/
├── index.html      # Main HTML structure
├── styles.css      # Styling for chord diagrams, layout
├── chords.js       # Chord definitions, music theory data (scales, transposition)
├── state.js        # Application state management
├── patterns.js     # Play styles (strums, arpeggios) and tempo settings
├── audio.js        # Audio synthesis (Karplus-Strong) and playback
├── analysis.js     # Music theory analysis (progressions, harmonic functions)
├── ui.js           # UI utilities, DOM elements, chord diagram rendering
├── app.js          # Main application logic, event handlers, rendering
├── songs.json      # Index file pointing to individual song files
└── songs/          # Individual song JSON files
    ├── somewhere-over-the-rainbow.json
    ├── riptide.json
    ├── im-yours.json
    ├── stand-by-me.json
    ├── house-of-the-rising-sun.json  # Minor key (Am)
    ├── mad-world.json                 # Minor key (Fm)
    ├── la-bamba.json                  # Latin American (C)
    ├── guantanamera.json              # Latin American (C)
    ├── cielito-lindo.json             # Latin American (C)
    ├── besame-mucho.json              # Latin American, Minor key (Fm)
    ├── waka-waka.json                 # Shakira (G)
    ├── hips-dont-lie.json             # Shakira, Minor key (A#m)
    ├── whenever-wherever.json         # Shakira, Minor key (G#m)
    ├── la-tortura.json                # Shakira, Minor key (Am)
    ├── ojos-asi.json                  # Shakira 90s, Minor key (F#m)
    ├── bamboleo.json                  # Gipsy Kings, Flamenco (Em)
    ├── estoy-aqui.json                # Shakira 90s (D)
    ├── ciega-sordomuda.json           # Shakira 90s, Minor key (Am)
    ├── antologia.json                 # Shakira 90s (C)
    ├── andar-conmigo.json             # Julieta Venegas (C)
    ├── i-really-want-to-stay-at-your-house.json  # Cyberpunk 2077 (B)
    ├── a-la-nanita-nana.json          # Traditional Spanish lullaby (A)
    ├── good-riddance.json             # Green Day (G)
    ├── en-el-muelle-de-san-blas.json  # Maná (D)
    ├── cant-help-falling-in-love.json # Elvis Presley (D)
    ├── whats-up.json                  # 4 Non Blondes (A)
    ├── ill-be-there-for-you.json      # The Rembrandts (C)
    ├── salvame.json                   # RBD
    ├── vuelve.json                    # Latin Dreams (B)
    ├── happy-birthday.json            # Traditional (G)
    ├── despacito.json                 # Luis Fonsi ft. Daddy Yankee (Bm)
    ├── titanium.json                  # David Guetta ft. Sia (Eb)
    ├── wonderwall.json                # Oasis (Em)
    ├── stan.json                      # Eminem ft. Dido (Am)
    ├── vivir-lo-nuestro.json          # La India & Marc Anthony (Am)
    ├── youseebiggirl.json             # Hiroyuki Sawano - Attack on Titan (Em)
    ├── stairway-to-heaven.json        # Led Zeppelin (Am)
    ├── basket-case.json               # Green Day (Eb)
    ├── sweet-child-o-mine.json        # Guns N' Roses (C#)
    ├── la-bilirrubina.json            # Juan Luis Guerra (C#)
    ├── el-niagara-en-bicicleta.json   # Juan Luis Guerra (A#)
    ├── dia-de-enero.json              # Shakira (A#)
    ├── mi-corazon-encantado.json      # Ricardo Silva - Dragon Ball GT (C)
    ├── limon-y-sal.json               # Julieta Venegas (B)
    ├── chala-head-chala.json          # Ricardo Silva - Dragon Ball Z (E)
    ├── chala-head-chala-jp.json       # Hironobu Kageyama - Dragon Ball Z (G#)
    ├── chala-head-chala-en.json       # Dragon Ball Z English version (E)
    ├── whistle.json                   # Flo Rida (Am)
    ├── la-flaca.json                  # Jarabe de Palo (Am)
    ├── sola-nunca-estaras.json        # Ricardo Silva - Dragon Ball GT (Am)
    ├── we-gotta-power.json            # Hironobu Kageyama - Dragon Ball Z (Em)
    ├── vivir-sin-aire.json            # Maná (G)
    ├── the-sound-of-silence.json      # Simon & Garfunkel (D#m)
    ├── piel-canela.json               # Bobby Capó (Ab)
    ├── te-quiero-tanto.json           # Onda Vaselina (Ab)
    ├── bajo-del-mar.json              # La Sirenita - Disney (C)
    ├── tu-cumpleanos.json             # Diomedes Díaz (G)
    ├── me-dedique-a-perderte.json     # Alejandro Fernández (Ab)
    ├── estoy-enamorado.json           # Thalía & Pedro Capó (D)
    ├── te-amo.json                    # Franco de Vita (C)
    ├── sin-miedo-a-nada.json          # Alex Ubago feat. Amaia Montero (Bm)
    ├── mientes-tan-bien.json          # Sin Bandera (G)
    └── donde-estan-los-ladrones.json  # Shakira 90s (A)
```

### JavaScript Module Organization

The application JavaScript is split into modules for maintainability:

| Module | Purpose |
|--------|---------|
| `chords.js` | Chord definitions (CHORDS), scale degrees, transposition functions, chord variations |
| `voicings.js` | Chord-melody voicing generator: findMelodyVoicings, parseChordSymbol, note/MIDI helpers |
| `state.js` | Application state object, slugify utility, getDisplayKey |
| `patterns.js` | PLAY_STYLES (strums/arpeggios), tempo (currentBPM), getPlayStyle |
| `audio.js` | AudioContext, Karplus-Strong synthesis, playChord, playStrum, playChunk |
| `analysis.js` | getRelativeKey, detectFamousProgressions, getHarmonicFunction, detectSecondaryDominant, getUsedChords, analyzeKeyConfidence |
| `ui.js` | DOM elements, createChordDiagram, createChordSVG, populatePlayStyleSelector, updatePatternDisplay |
| `app.js` | Main app: init, event handlers, rendering functions (displaySong, renderLyrics, etc.) |

Scripts are loaded in dependency order in `index.html`:
1. `chords.js` - Core data
2. `voicings.js` - Chord-melody voicing generator (self-contained, no dependencies)
3. `state.js` - App state (depends on nothing)
4. `patterns.js` - Play patterns (depends on nothing)
5. `audio.js` - Audio (depends on patterns.js globals)
6. `analysis.js` - Analysis (depends on state.js, chords.js)
7. `ui.js` - UI (depends on state.js, patterns.js, chords.js)
8. `app.js` - Main app (depends on all above)

## Data Structures

### songs.json (Index File with Metadata)
```json
{
  "songs": [
    { "path": "songs/somewhere-over-the-rainbow.json", "title": "Somewhere Over the Rainbow", "artist": "Israel Kamakawiwo'ole" },
    { "path": "songs/riptide.json", "title": "Riptide", "artist": "Vance Joy" }
  ]
}
```
- Title and artist in index enables lazy loading (songs fetched only when selected)
- Song data cached after first load to avoid re-fetching

### Individual Song File Format
```json
{
  "title": "Song Name",
  "artist": "Artist Name",
  "key": "C",
  "spotify": "https://open.spotify.com/track/TRACK_ID",
  "lines": [
    { "section": "Verse 1" },
    {
      "lyrics": "Somewhere over the rainbow",
      "chords": [
        { "chord": "C", "position": 0 },
        { "chord": "Em", "position": 15 }
      ]
    }
  ]
}
```
- `spotify`: Optional Spotify track URL for embedded player

### Chord Definition Format
```javascript
{
  "C": {
    "name": "C",
    "frets": [0, 0, 0, 3],  // G, C, E, A strings
    "fingers": [0, 0, 0, 3], // 0 = open, 1-4 = finger number
    "barre": null
  },
  "Bm": {
    "name": "Bm",
    "frets": [2, 2, 2, 2],
    "fingers": [1, 1, 1, 1],
    "barre": { "fret": 2, "strings": [0, 1, 2, 3] }
  }
}
```

### Chord Variations Format
```javascript
const CHORD_VARIATIONS = {
  "C": [
    {
      "name": "C (high)",
      "description": "Higher position",
      "frets": [5, 4, 3, 3],
      "fingers": [4, 3, 1, 1],
      "barre": { "fret": 3, "fromString": 2, "toString": 3 }
    }
  ]
}
```

## Implementation Steps

### Step 1: Create HTML Structure
- Header with song selector and key display
- Chord reference section
- Lyrics container with chord overlay
- Progression toggle button
- Modal for chord popups

### Step 2: Build CSS Styling
- Chord diagram grid (4 strings × 5 frets)
- Finger position indicators (circles with numbers)
- Barre chord visualization
- Popup/modal styling
- Responsive layout

### Step 3: Implement Chord Definitions (chords.js)
- Define all common ukulele chords
- Include finger positions
- Include barre chord information

### Step 4: Build Core App Logic (app.js)
- Load songs from JSON
- Render chord diagrams (SVG-based)
- Position chords above lyrics
- Handle chord click events
- Implement progression toggle (chord ↔ numbers)

### Step 5: Create Sample Songs (songs.json)
- Include 2-3 sample songs with different keys
- Common progressions (I-V-vi-IV, etc.)

## Progression Number Mapping

For converting chords to scale degrees based on key:

### Major Keys
| Key | I | ii | iii | IV | V | vi | vii° |
|-----|---|-----|-----|----|----|-----|------|
| C   | C | Dm  | Em  | F  | G  | Am  | Bdim |
| G   | G | Am  | Bm  | C  | D  | Em  | F#dim|
| D   | D | Em  | F#m | G  | A  | Bm  | C#dim|
| A   | A | Bm  | C#m | D  | E  | F#m | G#dim|
| E   | E | F#m | G#m | A  | B  | C#m | D#dim|
| F   | F | Gm  | Am  | Bb | C  | Dm  | Edim |

### Minor Keys (Natural Minor + Borrowed Chords)
| Key | i | ii° | III | iv | v | VI | VII | IV | V |
|-----|---|-----|-----|----|----|-----|-----|----|----|
| Am  | Am | Bdim | C  | Dm | Em | F   | G   | D  | E  |
| Em  | Em | F#dim| G  | Am | Bm | C   | D   | A  | B  |
| Dm  | Dm | Edim | F  | Gm | Am | Bb  | C   | G  | A  |
| Bm  | Bm | C#dim| D  | Em | F#m| G   | A   | E  | F# |

*IV and V are borrowed chords commonly used in minor keys*

### Enharmonic Keys
Uncommon keys are supported but display a notice suggesting the common equivalent:
- A# → Bb, D# → Eb, G# → Ab
- A#m → Bbm, D#m → Ebm, G#m → Abm
- Cb → B, Fb → E

## UI Mockup

```
┌─────────────────────────────────────────────────┐
│  🎸 UkeFlow         [Song Selector ▼]           │
│                                                 │
│  Key: C           [Show as Numbers] [Toggle]    │
│                                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│  │  C  │ │ Am  │ │  F  │ │  G  │  ← Used chords│
│  │ ○○○ │ │ ○○○ │ │ ○●○ │ │ ○●● │               │
│  │ ○○○ │ │ ○○○ │ │ ●○○ │ │ ○●○ │               │
│  │ ○○○ │ │ ●○○ │ │ ○○○ │ │ ○○○ │               │
│  │ ○○○③│ │ ○○○ │ │ ○○○ │ │ ○○○ │               │
│  └─────┘ └─────┘ └─────┘ └─────┘               │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│       C              Em                         │
│  Somewhere over the rainbow                     │
│                                                 │
│       C        G          Am        F           │
│  Way up high, there's a land that I             │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Technical Notes

- Use SVG for chord diagrams (scalable, crisp)
- No external dependencies (vanilla JS)
- Mobile-friendly design
- Local file loading (fetch API for JSON)
