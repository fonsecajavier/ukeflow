# Practice Mode

A chord transition practice tool with metronome.

## Features

- **Metronome**: Plays tick on each beat (accent on beat 1)
- **Random chords**: Displays a new chord every 4 beats
- **Next chord preview**: Shows upcoming chord in corner
- **Tempo control**: 60-180 BPM slider (default: 60)
- **Chord type filters**: Major, Minor, 7th (Major & Minor on by default)
- **Accidental filters**: Sharps (#), Flats (b) (both off by default for natural chords only)
- **Beat indicator**: 4 dots showing current beat
- **Transition animation**: Subtle pulse on chord change

## Files

| File | Purpose |
|------|---------|
| `practice.html` | Page structure, loads shared scripts + practice.js |
| `practice.css` | Layout, animations, responsive styles |
| `practice.js` | Metronome loop, chord selection, UI updates |

## How It Works

1. User clicks Start
2. Metronome begins at selected tempo
3. Random chord from filtered pool displayed
4. After 4 beats, advances to next chord with subtle animation
5. Next chord always shown in preview corner
6. Filters update chord pool in real-time

## Reused Components

From main app:
- `CHORDS` object (chords.js)
- `createChordSVG()` (ui.js)
- `getAudioContext()` (audio.js)
- Color scheme and chord diagram styles (styles.css)
