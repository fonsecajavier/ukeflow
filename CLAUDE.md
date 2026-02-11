# UkeFlow - Claude Code Guidelines

## Project Overview
UkeFlow is a single-page HTML/JS app for learning ukulele chord progressions. No build tools or dependencies - vanilla JS only.

## File Structure

### Core Files
- `index.html` - Main HTML structure
- `styles.css` - All styling
- `songs.json` - Index of song files
- `songs/*.json` - Individual song files
- `PLAN.md` - Feature documentation and implementation details

### JavaScript Modules (loaded in this order)
| File | Contents |
|------|----------|
| `chords.js` | CHORDS definitions, SCALE_DEGREES_MAJOR/MINOR, CHORD_VARIATIONS, transposeChord(), transposeKey(), getScaleDegree(), isMinorKey(), getChordVariations() |
| `state.js` | `state` object (songIndex, songCache, currentSong, transpose, etc.), slugify(), getDisplayKey() |
| `patterns.js` | PLAY_STYLES (strums/arpeggios), currentBPM, currentPlayStyle, getBeat(), getPlayStyle() |
| `audio.js` | audioContext, UKULELE_TUNING, pluckString(), playStrum(), playChunk(), playChord(), playChordArpeggio() |
| `analysis.js` | getRelativeKey(), detectFamousProgressions(), detectBorrowedChords(), getUsedChords(), getHarmonicFunction(), detectSecondaryDominant() |
| `ui.js` | `elements` object (DOM refs), createChordDiagram(), createChordSVG(), populatePlayStyleSelector(), updatePatternDisplay(), highlightMatch(), escapeHtml(), closeModal() |
| `app.js` | init(), setupEventListeners(), displaySong(), renderLyrics(), renderChordReference(), renderScaleReference(), openChordModal(), all event handlers |

### Where to Find Things
- **Add a new chord**: `chords.js` → CHORDS object
- **Add chord variations**: `chords.js` → CHORD_VARIATIONS object
- **Modify audio/synthesis**: `audio.js` → pluckString(), playChunk()
- **Add strum/arpeggio pattern**: `patterns.js` → PLAY_STYLES
- **Modify song rendering**: `app.js` → renderLyrics(), displaySong()
- **Modify chord diagrams**: `ui.js` → createChordSVG()
- **Add harmonic analysis**: `analysis.js` → getHarmonicFunction()
- **Modify UI elements**: `ui.js` → elements object, then `app.js` for logic

## Song File Format
```json
{
  "title": "Song Name",
  "artist": "Artist",
  "key": "Am",
  "spotify": "https://open.spotify.com/track/TRACK_ID",
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
2. Add entry to `songs.json` array with path, title, artist
3. Update `PLAN.md` file structure section
4. **Always search the web** for the correct Spotify track URL and add it to the song JSON as `"spotify": "https://open.spotify.com/track/TRACK_ID"`. Prefer original studio versions over live/remix versions.

## Modifying Songs
When making any changes to existing songs (transposing, editing lyrics, fixing chords, etc.):
1. Make the changes to the song JSON file
2. Update `PLAN.md` to reflect the current state of the song (e.g., update the key if transposed)

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
- Audio code is in `audio.js`

## Music Theory
- Minor keys use lowercase roman numerals (i, iv, v)
- Major keys use uppercase (I, IV, V)
- Support for borrowed chords and extended chords (7, maj7, m7, dim, aug)
- Scale/theory data in `chords.js`, analysis functions in `analysis.js`

## When Adding Features
1. Update `PLAN.md` with feature documentation
2. Add code to the appropriate module (see table above)
3. Commit with descriptive message

## Common Tasks
- **Add chord**: Edit `chords.js`, add to CHORDS object with frets/fingers/barre
- **Add chord variation**: Edit `chords.js`, add to CHORD_VARIATIONS object
- **Add song**: Create JSON file in songs/, add to `songs.json`
- **Add play style**: Edit `patterns.js`, add to PLAY_STYLES.strums or .arpeggios
- **Add collapsible section**: Follow pattern in index.html (details/summary), add matching CSS
- **Add Spotify link**: Add `"spotify": "https://open.spotify.com/track/TRACK_ID"` to song JSON. **Always search the web** to find the correct Spotify track URL - do not guess or make up track IDs.

## Deployment
1. Push to git: `git push`
2. Deploy to Vercel: `npx vercel --prod`

## Adding Songs to Progressions (Practice Mode)
When adding songs to `progressions.json`:
1. **ALWAYS verify the chord progression** by searching the web for the song's actual chords
2. **Do NOT guess** based on memory or assumptions - chord progressions are often misremembered
3. Convert the chords to roman numerals in the song's key to confirm they match the progression
4. Example: For "Axis of Awesome" (I-V-vi-IV), a song in C with chords C-G-Am-F is correct, but Am-F-C-G would be "Sensitive Female" (vi-IV-I-V)
5. Be especially careful with rotations - the same 4 chords in different orders are different progressions

## Reading Chord Diagrams
When the user provides a chord diagram image:
1. The diagram has 4 vertical lines (strings: G-C-E-A from left to right)
2. Horizontal lines are frets (top line is nut/fret 0, then frets 1, 2, 3, 4 going down)
3. Dots indicate where to press
4. Read column by column (left to right), counting which row each dot is on
5. Output as [G, C, E, A] fret numbers
6. Open strings (fret 0) may show an "O" above the nut, or nothing at all - if no dot in a column, it's open (0)
7. Muted strings show an "X" above the nut - record as -1
8. A barre is shown as a thick horizontal line or curved bar spanning multiple strings on the same fret - record as `barre: { fret: N, fromString: X, toString: Y }`
9. Do NOT guess or confirm - follow this method systematically
