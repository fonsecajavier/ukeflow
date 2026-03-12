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
    ├── estoy-aqui.json                # Shakira 90s, Minor key (Em)
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
    └── limon-y-sal.json               # Julieta Venegas (C)
```

### JavaScript Module Organization

The application JavaScript is split into modules for maintainability:

| Module | Purpose |
|--------|---------|
| `chords.js` | Chord definitions (CHORDS), scale degrees, transposition functions, chord variations |
| `state.js` | Application state object, slugify utility, getDisplayKey |
| `patterns.js` | PLAY_STYLES (strums/arpeggios), tempo (currentBPM), getPlayStyle |
| `audio.js` | AudioContext, Karplus-Strong synthesis, playChord, playStrum, playChunk |
| `analysis.js` | getRelativeKey, detectFamousProgressions, getHarmonicFunction, detectSecondaryDominant, getUsedChords, analyzeKeyConfidence |
| `ui.js` | DOM elements, createChordDiagram, createChordSVG, populatePlayStyleSelector, updatePatternDisplay |
| `app.js` | Main app: init, event handlers, rendering functions (displaySong, renderLyrics, etc.) |

Scripts are loaded in dependency order in `index.html`:
1. `chords.js` - Core data
2. `state.js` - App state (depends on nothing)
3. `patterns.js` - Play patterns (depends on nothing)
4. `audio.js` - Audio (depends on patterns.js globals)
5. `analysis.js` - Analysis (depends on state.js, chords.js)
6. `ui.js` - UI (depends on state.js, patterns.js, chords.js)
7. `app.js` - Main app (depends on all above)

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
