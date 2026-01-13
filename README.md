# UkeFlow

A simple HTML/JS app for learning ukulele chord progressions. View chord diagrams, see chords above lyrics, and toggle between chord names and scale degrees.

## Quick Start

The app needs to be served via a local web server (browser security prevents loading JSON files directly).

**Option 1: Python (recommended)**
```bash
cd /Users/javier.fonseca/dev/ukeflow
python3 -m http.server 8000
```
Open http://localhost:8000

**Option 2: Node.js**
```bash
npx serve .
```

**Option 3: PHP**
```bash
php -S localhost:8000
```

## Features

- **Chord diagrams** with finger positions (1-4) and barre indicators
- **Interactive chords** - click any chord in the lyrics to see its diagram
- **Progression toggle** - switch between chord names (C, Am, F) and scale degrees (I, vi, IV)
- **Key display** - shows the song's key at the top

## Adding Songs

1. Create a new JSON file in `songs/`:

```json
{
  "title": "Song Title",
  "artist": "Artist Name",
  "key": "C",
  "lines": [
    { "section": "Verse 1" },
    {
      "lyrics": "These are the lyrics",
      "chords": [
        { "chord": "C", "position": 0 },
        { "chord": "G", "position": 10 }
      ]
    }
  ]
}
```

2. Add the path to `songs.json`:

```json
{
  "songs": [
    "songs/existing-song.json",
    "songs/your-new-song.json"
  ]
}
```

### Song Format

- `title`, `artist`, `key` - Song metadata
- `lines` - Array of lyric lines or section markers
- `section` - Optional section label (Verse, Chorus, etc.)
- `lyrics` - The lyric text
- `chords` - Array of chord placements
  - `chord` - Chord name (must exist in `chords.js`)
  - `position` - Character position where chord appears above lyrics

## File Structure

```
ukeflow/
├── index.html      # Main page
├── styles.css      # Styling
├── chords.js       # Chord definitions (50+ chords)
├── app.js          # Application logic
├── songs.json      # Song index
└── songs/          # Individual song files
```
