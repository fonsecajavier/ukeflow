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
