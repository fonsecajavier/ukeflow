# UkeFlow - Claude Code Guidelines

## Project Overview
UkeFlow is a single-page HTML/JS app for learning ukulele chord progressions. No build tools or dependencies - vanilla JS only.

## File Structure
- `index.html` - Main HTML structure
- `app.js` - Core application logic, audio synthesis, rendering
- `styles.css` - All styling
- `chords.js` - Chord definitions (frets, fingers, barre positions)
- `songs.json` - Index of song files
- `songs/*.json` - Individual song files
- `PLAN.md` - Feature documentation and implementation details

## Song File Format
```json
{
  "title": "Song Name",
  "artist": "Artist",
  "key": "Am",
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
2. Add path to `songs.json` array
3. Update `PLAN.md` file structure section

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

## Music Theory
- Minor keys use lowercase roman numerals (i, iv, v)
- Major keys use uppercase (I, IV, V)
- Support for borrowed chords and extended chords (7, maj7, m7, dim, aug)

## When Adding Features
1. Update `PLAN.md` with feature documentation
2. Commit with descriptive message

## Common Tasks
- **Add chord**: Edit `chords.js`, add frets/fingers/barre definition
- **Add song**: Create JSON file, add to `songs.json`
- **Add collapsible section**: Follow pattern in index.html (details/summary), add matching CSS
