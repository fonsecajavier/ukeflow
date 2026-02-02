# UkeFlow

A single-page HTML/JS app for learning ukulele chord progressions. View chord diagrams, see chords above lyrics, play chords with realistic ukulele sounds, and learn music theory.

---

## ⚠️ VIBE-CODED PROJECT DISCLAIMER ⚠️

**This entire application has been vibe-coded.** Almost no care has been put into performance, code quality, or security. This project is **not representative of the author's professional code quality**.

This is a toy project created to:
1. Quickly achieve a personal goal (learning to play ukulele)
2. Explore the capabilities and limits of vibe-coding with AI assistance

If you're here to evaluate code quality, architecture, or best practices — this is not the repo you're looking for. Move along.

**Fun fact:** It might, however, be somewhat representative of the author's prompting skills. 🤖

---

## Disclaimer

All songs included in this project are the property of their respective authors, composers, and copyright holders. The chord progressions and lyrics are provided for educational and personal practice purposes only. This project does not claim ownership of any musical compositions.

## Quick Start

The app needs to be served via a local web server (browser security prevents loading JSON files directly).

**Option 1: Python (recommended)**
```bash
python3 -m http.server 8000
```
Open http://localhost:8000

**Option 2: Node.js**
```bash
npx serve . -l 8000
```
Open http://localhost:8000

**Option 3: PHP**
```bash
php -S localhost:8000
```

## Deploy to Production

```bash
npx vercel --prod
```

## Features

### Chord Display
- **Chord diagrams** with finger positions (1-4) and barre indicators
- **Interactive chords** - click any chord in the lyrics to see its diagram
- **Alternative voicings** - chords with multiple voicings show a "+N" badge; click to see all positions
- **High position indicator** - shows fret number for positions above fret 5

### Audio Playback
- **Play any chord** - click the play button to hear realistic ukulele sound
- **Karplus-Strong synthesis** - no audio files, generated in real-time
- **Multiple play styles**:
  - **Strums**: Down, Island, Basic, Rock, Calypso, Chunk/Muted, Reggae, Ska, Funk, Bossa Nova, Waltz, and more
  - **Arpeggios**: Down/Up Roll, Travis Pick, Fingerpicking patterns, Tremolo, and more
- **Tempo control** - adjustable BPM (80-160)

### Music Theory Tools
- **Progression toggle** - switch between chord names (C, Am, F) and scale degrees (I, vi, IV)
- **Transpose** - shift song key up or down by semitones
- **Relative key toggle** - analyze in relative major/minor
- **Scale reference** - shows all 7 diatonic chords in the current key
- **Harmonic analysis** - color-coded table showing chord functions (Tonic, Dominant, Subdominant)
- **Secondary dominant detection** - identifies V/x relationships
- **Famous progression detection** - recognizes patterns like I-V-vi-IV, ii-V-I, Andalusian cadence

### Song Features
- **Embedded Spotify player** - listen along with the original track
- **URL bookmarking** - shareable links with song and transpose settings
- **Browser navigation** - back/forward buttons work naturally
- **Song search** - type to filter by title or artist

## Adding Songs

1. Create a new JSON file in `songs/`:

```json
{
  "title": "Song Title",
  "artist": "Artist Name",
  "key": "C",
  "spotify": "https://open.spotify.com/track/TRACK_ID",
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

2. Add the entry to `songs.json`:

```json
{
  "songs": [
    { "path": "songs/your-song.json", "title": "Song Title", "artist": "Artist Name" }
  ]
}
```

### Song Format

- `title`, `artist`, `key` - Song metadata
- `spotify` - Optional Spotify track URL for embedded player
- `lines` - Array of lyric lines or section markers
- `section` - Optional section label (Verse, Chorus, etc.)
- `lyrics` - The lyric text
- `chords` - Array of chord placements
  - `chord` - Chord name (must exist in `chords.js`)
  - `position` - Character position where chord appears above lyrics

## File Structure

```
ukeflow/
├── index.html      # Main HTML structure
├── styles.css      # All styling
├── songs.json      # Song index with metadata
├── songs/          # Individual song JSON files (23 songs)
├── chords.js       # Chord definitions, scale degrees, transposition
├── state.js        # Application state management
├── patterns.js     # Play styles (strums, arpeggios) and tempo
├── audio.js        # Karplus-Strong synthesis and playback
├── analysis.js     # Music theory analysis functions
├── ui.js           # DOM utilities and chord diagram rendering
└── app.js          # Main application logic and event handlers
```

## Technical Notes

- Pure vanilla JavaScript - no build tools or dependencies
- SVG-based chord diagrams (scalable, crisp)
- Web Audio API for sound synthesis
- Mobile-friendly responsive design

## License

MIT License - see [LICENSE](LICENSE) for details.
