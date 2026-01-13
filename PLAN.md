# Ukulele Progression Learning App - Implementation Plan

## Overview
A single-page HTML/JS app that displays ukulele chord charts, lyrics with chords, and helps learn chord progressions.

## Core Features

### 1. Song Display
- Load songs from a `songs.json` file
- Display song title and key at the top
- Show lyrics with chord markers above the text
- Chords positioned inline above the corresponding lyrics
- Song selector with autocomplete (type to search)
- Songs sorted alphabetically in the dropdown
- Clear button (×) to reset song selection

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
- **Famous Progressions Detection**: Identifies well-known chord patterns:
  - I-V-vi-IV "Axis of Awesome" progression
  - vi-IV-I-V "Sensitive Female" progression
  - ii-V-I Jazz turnaround
  - I-IV-V Classic rock/blues progression
  - 12-bar blues patterns
  - i-iv-v Minor blues
  - I-vi-IV-V "50s Doo-Wop" progression
- **Borrowed Chords**: Identifies chords outside the diatonic scale (modal interchange)
- Only shows trivia items that are relevant to the current song

### 4. Interactive Chord Popups
- Click any chord in the lyrics section
- Shows a popup/modal with the chord diagram
- Displays finger positions clearly
- Easy to dismiss (click outside, X button, or Escape key)

### 4a. Chord Audio Playback
- Play button on each chord diagram to hear the chord
- Uses Karplus-Strong synthesis for realistic plucked ukulele sound
- Plays notes as arpeggio (strings plucked sequentially)
- Based on standard ukulele tuning (G4-C4-E4-A4)
- No external audio files required - generated in real-time
- Visual feedback when playing (button pulses)

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
├── app.js          # Core application logic
├── chords.js       # Chord definitions (fingerings, positions)
├── songs.json      # Index file pointing to individual song files
└── songs/          # Individual song JSON files
    ├── somewhere-over-the-rainbow.json
    ├── riptide.json
    ├── im-yours.json
    ├── stand-by-me.json
    ├── house-of-the-rising-sun.json  # Minor key (Am)
    ├── mad-world.json                 # Minor key (Em)
    ├── la-bamba.json                  # Latin American (C)
    ├── guantanamera.json              # Latin American (C)
    ├── cielito-lindo.json             # Latin American (C)
    ├── besame-mucho.json              # Latin American, Minor key (Dm)
    ├── waka-waka.json                 # Shakira (G)
    ├── hips-dont-lie.json             # Shakira, Minor key (Am)
    ├── whenever-wherever.json         # Shakira, Minor key (Bm)
    ├── la-tortura.json                # Shakira, Minor key (Am)
    ├── ojos-asi.json                  # Shakira 90s, Minor key (Dm)
    ├── estoy-aqui.json                # Shakira 90s, Minor key (Em)
    ├── ciega-sordomuda.json           # Shakira 90s, Minor key (Am)
    └── antologia.json                 # Shakira 90s (G)
```

## Data Structures

### songs.json (Index File)
```json
{
  "songs": [
    "songs/somewhere-over-the-rainbow.json",
    "songs/riptide.json"
  ]
}
```

### Individual Song File Format
```json
{
  "title": "Song Name",
  "artist": "Artist Name",
  "key": "C",
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
