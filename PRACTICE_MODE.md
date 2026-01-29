# Practice Mode

A chord transition practice tool with metronome supporting both random chords and structured progressions.

## Two Practice Modes

### Progression Mode (Default)
Practice common chord progressions used in popular songs.

**Features:**
- **Progression search**: Search by name or roman numerals
- **15 common progressions**: Axis of Awesome, 50s Doo-Wop, Blues, Jazz, and more
- **Trivia & description**: Learn about each progression's history and style
- **Popular songs**: 5 example songs for each progression
- **Key selector**: Transpose to any key (C, G, D, A, E, F, Bb, Am, Em, Dm, Bm)
- **Chord diagrams**: Visual display of all chords in the progression
- **Progression sequence**: Shows chord flow below diagrams (e.g., "C → G → Am → F")
- **Loop playback**: Cycles through progression chords with metronome
- **Count-in**: 4-beat preparation showing "Get Ready!" before first chord
- **Bookmarkable URLs**: Progression, key, and tempo saved in URL for sharing

### Random Chords Mode
Practice with randomly selected chords based on filters.

**Features:**
- **Metronome**: Plays tick on each beat (accent on beat 1)
- **Random chords**: Displays a new chord every 4 beats
- **Next chord preview**: Shows upcoming chord in corner
- **Tempo control**: 60-180 BPM slider (default: 120)
- **Chord type filters**: Major, Minor, 7th (Major & Minor on by default)
- **Accidental filters**: Sharps (#), Flats (b) (both off by default for natural chords only)
- **Cycle same root**: When enabled, cycles through all selected chord types for the same root (e.g., A → Am → A7) before moving to a new root
- **Beat indicator**: 4 dots showing current beat
- **Transition animation**: Subtle pulse on chord change
- **Count-in**: 4-beat preparation showing "Get Ready!" before first chord

## Files

| File | Purpose |
|------|---------|
| `practice.html` | Page structure with tabs for both modes |
| `practice.css` | Layout, animations, responsive styles |
| `practice.js` | Metronome loop, chord selection, progression logic |
| `progressions.json` | Library of 15 common progressions with metadata |

## How It Works

### Progression Mode
1. User searches and selects a progression
2. Info panel shows description and example songs
3. User selects key (default: C) and tempo
4. All chord diagrams displayed with roman numerals
5. Progression sequence shown below (e.g., "C → G → Am → F")
6. URL updates for bookmarking (e.g., `?progression=axis&key=G&tempo=90`)
7. User clicks Start
8. "Get Ready!" displays with first chord in preview
9. After 4-beat count-in, first chord appears on beat 1
10. Metronome cycles through progression chords in order
11. Loops back to first chord after completing progression

### Random Mode
1. User switches to Random Chords tab
2. User clicks Start
3. "Get Ready!" displays with first chord in preview corner
4. Metronome plays 4-beat count-in
5. On beat 1 of next measure, first chord appears
6. After 4 beats, advances to next chord with subtle animation
7. Next chord always shown in preview corner
8. Filters update chord pool in real-time

## Progressions Library

| ID | Name | Numerals |
|----|------|----------|
| axis | Axis of Awesome | I - V - vi - IV |
| 50s | 50s Doo-Wop | I - vi - IV - V |
| sensitive | Sensitive Female | vi - IV - I - V |
| andalusian | Andalusian Cadence | i - VII - VI - V |
| blues | 12-Bar Blues | I - I - I - I - IV - IV - I - I - V - IV - I - V |
| jazz-turnaround | Jazz Turnaround | ii - V - I |
| pachelbel | Pachelbel's Canon | I - V - vi - iii - IV - I - IV - V |
| minor-blues | Minor Blues | i - iv - i - V |
| classic-rock | Classic Rock | I - IV - V |
| creep | Creep Progression | I - III - IV - iv |
| pop-punk | Pop-Punk | I - V - vi - iii - IV |
| royal-road | Royal Road | IV - V - iii - vi |
| reggae | Reggae | I - IV - V - IV |
| minor-descending | Minor Descending | i - VII - VI - VII |
| emotional | Emotional Pop | vi - V - IV - V |

## Reused Components

From main app:
- `CHORDS` object (chords.js)
- `createChordSVG()` (ui.js)
- `createChordDiagram()` (ui.js)
- `getAudioContext()` (audio.js)
- Color scheme and chord diagram styles (styles.css)
