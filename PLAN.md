# Ukulele Progression Learning App - Implementation Plan

## Overview
A single-page HTML/JS app that displays ukulele chord charts, lyrics with chords, and helps learn chord progressions.

## Core Features

### 1. Song Display
- Load songs from a `songs.json` file
- Display song title and key at the top
- Show lyrics with chord markers above the text
- Chords positioned inline above the corresponding lyrics

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
- Located prominently at the top for quick reference
- Click any chord to see enlarged popup

### 4. Interactive Chord Popups
- Click any chord in the lyrics section
- Shows a popup/modal with the chord diagram
- Displays finger positions clearly
- Easy to dismiss (click outside or X button)

### 5. Progression Toggle
- Button to switch between:
  - **Chord Names**: C, Am, F, G
  - **Scale Degrees**: I, vi, IV, V
- Based on the song's key

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
    └── stand-by-me.json
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

| Key | I | ii | iii | IV | V | vi | vii° |
|-----|---|-----|-----|----|----|-----|------|
| C   | C | Dm  | Em  | F  | G  | Am  | Bdim |
| G   | G | Am  | Bm  | C  | D  | Em  | F#dim|
| D   | D | Em  | F#m | G  | A  | Bm  | C#dim|
| A   | A | Bm  | C#m | D  | E  | F#m | G#dim|
| E   | E | F#m | G#m | A  | B  | C#m | D#dim|
| F   | F | Gm  | Am  | Bb | C  | Dm  | Edim |

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
