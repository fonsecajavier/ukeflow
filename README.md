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

## Running Locally

The app must be served over HTTP — opening `index.html` as a `file://` URL fails,
because the browser blocks the `fetch()` calls that load `songs.json` and the
song files.

There is no build step. Nothing to compile, no dependencies to install for the
app itself; the only requirement is Python 3 (already present on macOS and most
Linux systems).

```bash
npm run dev
```

Then open:

| | |
|---|---|
| Main app | http://localhost:8899 |
| Practice mode | http://localhost:8899/practice.html |

`npm run dev` is a thin wrapper around `python3 serve.py 8899`, so you can run
that directly if you would rather not involve npm. Pass a different port as the
argument: `python3 serve.py 3000`. If something is already answering on that
port the server refuses to start and tells you how to find the culprit, rather
than starting up and quietly letting the other process handle your requests.

### Testing on a phone

Much of this app only really makes sense on a phone — the tap targets, the audio
lifecycle when the screen locks, playing chords with the ringer switch on silent.
The dev server listens on all interfaces, so a device on the same wifi can reach
it directly:

```bash
ipconfig getifaddr en0        # macOS: your LAN address, e.g. 192.168.1.42
```

Then open `http://192.168.1.42:8899/practice.html` on the phone.

Audio needs a real tap before it will play — that is browser autoplay policy, not
a bug. Tap a play button once and the rest of the session works.

### Why not `python3 -m http.server`?

Because it will serve you stale JavaScript and cost you an afternoon.

The stock handler sends no `Cache-Control` header, only `Last-Modified`. Chrome
is then free to apply its own heuristic freshness rules and re-serve a cached
`ui.js` from memory **without revalidating** — so you edit a file, reload, and
see the previous behaviour with no indication that anything is cached. This
happened during development and made a genuine bug fix look completely
ineffective, sending the debugging off in the wrong direction entirely.

`serve.py` exists to make that impossible. It sends
`Cache-Control: no-store` and strips `Last-Modified` and `ETag`, so there is
nothing for the browser to revalidate against and every request refetches.

If you do use another server, hard-reload (**Cmd/Ctrl + Shift + R**) after every
edit, and confirm you are running current code before you trust what you see.

Other servers work fine for a quick look, as long as you keep that caveat in mind:

```bash
npx serve . -l 8899        # Node
php -S localhost:8899      # PHP
```

## Tests

Plain Node scripts, no test framework, no dependencies:

```bash
npm test                          # everything
node tests/scales.test.js         # one file
```

Some suites import a module and exercise it (`scales`, `voicings`, `degrees`,
`respell`). Others read a source file as text and assert properties of it —
`fretboard-hitboxes` checks the fretboard's click-target geometry, `hover-styles`
checks that no `:hover` rule paints like a persistent state class, and
`audio-context` checks the iOS audio lifecycle handling. That is deliberate:
those three guard things that are easy to break and awkward to catch in a
browser.

`tests/voicings-crosscheck.js` is a reporting tool rather than a pass/fail
suite — it compares generated voicings against the stored chord shapes.

## Deploy to Production

```bash
git push
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

### Practice Mode (`practice.html`)
Three drill modes with a shared metronome:
- **Progressions** - practise 15 common progressions (Axis of Awesome, 50s
  Doo-Wop, 12-bar blues, Andalusian cadence...) in any key, with trivia and
  example songs
- **Random Chords** - a new chord every 4 beats, filtered by type and accidental
- **Scales & Melody** - learn to play melodies in a key. Shows the one hand
  position that plays an ascending octave, then drills it three ways: *Listen*
  (the scale over a held tonic drone), *Ear Drill* (a note sounds, you tap where
  it is — scored, with adjustable difficulty and a "walk up from the tonic"
  hint), and *Play Along* (the metronome names each note, you play it)

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
├── index.html        # Main app
├── styles.css        # Styling for the main app (and shared components)
├── serve.py          # No-cache local dev server (npm run dev)
│
├── songs.json        # Song index with metadata
├── songs/            # Individual song JSON files (66 songs)
│
├── chords.js         # Chord definitions, scale degrees, transposition
├── voicings.js       # Chord-melody voicing generator, note/MIDI helpers
├── scales.js         # Scale definitions and the "melody box" finder
├── state.js          # Application state management
├── patterns.js       # Play styles (strums, arpeggios) and tempo
├── audio.js          # Karplus-Strong synthesis, drone, playback
├── analysis.js       # Music theory analysis functions
├── ui.js             # DOM utilities, chord diagrams, interactive fretboard
├── app.js            # Main application logic and event handlers
│
├── practice.html     # Practice mode (separate page)
├── practice.css      # Practice mode styling
├── practice.js       # Metronome loop, chord/progression drills
├── melody.js         # Practice mode's Scales & Melody tab
├── progressions.json # 15 common chord progressions with metadata
│
└── tests/            # Plain Node test scripts (npm test)
```

Documentation lives in `PLAN.md` (features and implementation detail),
`PRACTICE_MODE.md` (practice mode specifically) and `CLAUDE.md` (conventions and
the non-obvious constraints worth knowing before editing).

## Technical Notes

- Pure vanilla JavaScript - no build tools or dependencies
- SVG-based chord diagrams (scalable, crisp)
- Web Audio API for sound synthesis
- Mobile-friendly responsive design

## License

MIT License - see [LICENSE](LICENSE) for details.
