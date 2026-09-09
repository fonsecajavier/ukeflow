# Practice Mode

A practice tool with metronome: chord transitions (random chords or structured
progressions) and scale/melody drills for learning a key.

## Three Practice Modes

### Progression Mode (Default)
Practice common chord progressions used in popular songs.

**Features:**
- **Progression search**: Search by name or roman numerals
- **15 common progressions**: Axis of Awesome, 50s Doo-Wop, Blues, Jazz, and more
- **Trivia & description**: Learn about each progression's history and style
- **Popular songs**: 5 example songs for each progression
- **Key selector**: Transpose to any key (C, G, D, A, E, B, F, Bb, Eb, Ab, Am, Em, Bm, F#m, C#m, Dm, Gm)
- **Chord diagrams**: Visual display of all chords in the progression
- **Progression sequence**: Shows chord flow below diagrams (e.g., "C → G → Am → F")
- **Loop playback**: Cycles through progression chords with metronome
- **Count-in**: 4-beat preparation showing "Get Ready!" before first chord
- **Bookmarkable URLs**: Progression, key, and tempo saved in URL for sharing
- **Chord sound**: Toggle to play chord as downroll strum on each change (on by default, press "p" to toggle)

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
- **Chord sound**: Toggle to play chord as downroll strum on each change (on by default, press "p" to toggle)

### Scales & Melody Mode
Learn to play melodies in a key, so songs written in that key come naturally.
Notes on the fretboard, as opposed to the chord-based modes above.

**The melody box:** one hand position per key, computed by `getMelodyBox()` in
`scales.js`. It is the narrowest fret window that plays an ascending octave with
no *backward string jumps* - no point where the pitch rises but the fingering has
to move back toward the G string.

**What the instrument turns out to dictate** (measured across all 12 roots and 12
scale types, asserted in `tests/scales.test.js`):
- The box **never uses the G string** - melody lives on C-E-A. The G string is
  G4, higher than the C and E strings, so using it forces a backward jump. Guitar
  scale charts do not transfer for exactly this reason, and the UI says so.
- Major scales fit **4 frets**; natural minor needs a **5-fret stretch**.
- **Two octaves never fit**: the range is C4 to A5, 21 semitones.
- **Bb and B keys cannot complete an octave** - they get a 7-note run and an
  explanation instead of a broken diagram.

**Three drills:**

| Drill | Trains | Behaviour |
|-------|--------|-----------|
| 1. Listen | Ear | Plays the box over a held tonic drone, lighting each note as it sounds |
| 2. Ear Drill | Ear to fretboard | Sounds one degree; tap where it is. Scored with a streak |
| 3. Play Along | Hand | Metronome names the next note but plays nothing - you play it |

**Features:**
- **Key selector**: all 12 roots
- **12 scale types**: major, natural/harmonic/melodic minor, major & minor
  pentatonic, blues, and the modes
- **Tonic drone**: a held tonic and fifth (no third, so it suits major and minor
  alike). This is what makes each degree sound like a *function* rather than a
  pitch, and is the difference between ear training and finger drilling
- **Patterns**: ascending, descending, up-then-down, in thirds, random degrees
- **Degrees or note names** on the dots, spelled for the key (G minor shows Bb,
  never A#)
- **Tap any dot** to hear that note
- **Flip** string order, as elsewhere in the app
- **Bookmarkable URLs**: `practice.html?mode=scales&root=G&scale=minor&drill=ear`
  (plus `&level=core|all` and `&hideshape=1` for the ear drill's difficulty)

**Ear-drill answers are judged on pitch, not position.** On a re-entrant ukulele
the same note exists in more than one place (G4 is both the open G string and
C-string fret 7), so finding it somewhere else is correct, and the app says so.

#### Ear drill scaffolding

Eight notes on a blank neck is an expert-level task, and it teaches nothing if
you have no way in - you cannot count up to a note you cannot place at all. So
the drill starts easy and has training wheels:

- **Hear it again** - replay the note as often as you like. It is not a memory
  test.
- **Walk up from the tonic** - plays 1, 2, b3, 4, 5... up to the target, naming
  each degree as it sounds, so you *hear* the counting method being used.
  Positions are never highlighted during the walk, only degrees named, so it
  gives away the answer without giving away where the answer lives. Questions
  answered this way are counted separately and kept out of the score, since they
  say nothing about unaided ability.
- **Ask about** - the pool of degrees. Defaults to **Anchors (1, 3, 5)**: the
  tonic sounds identical to the drone, the 5 nearly vanishes into it, and the 3
  carries the major or minor colour, so all three are told apart by feel rather
  than by measurement. Then **Core** adds the 2 and the 7, and **Every note**
  opens it up.
- **Show the shape** (on by default) - leaves the dots on screen, so the question
  is "which of these did you hear" rather than "where is this on the neck".
  Turning it off blanks the neck for the hard version. With it on you are only
  being tested on your ear; with it off you are also being tested on recall of
  the shape, which is a separate skill.

**The method the drill is teaching:** don't try to name the pitch. Hum the drone,
step your voice up the scale until it matches the note, and count where you
stopped - that is the degree. Then find that degree on the shape. You are
measuring an interval from a reference you can always hear, not identifying an
absolute pitch.

## Files

| File | Purpose |
|------|---------|
| `practice.html` | Page structure with tabs for all three modes |
| `practice.css` | Layout, animations, responsive styles |
| `practice.js` | Metronome loop, chord selection, progression logic |
| `progressions.json` | Library of 15 common progressions with metadata |
| `scales.js` | SCALE_TYPES, EAR_LEVELS, getMelodyBox(), getScalePositions(), filterPathByLevel(), explainScaleRange() - no DOM |
| `melody.js` | The Scales tab: the three drills, drone control, fretboard rendering |

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

### Scales & Melody Mode
1. User switches to the Scales & Melody tab (defaults to G Natural Minor)
2. Picks a key and scale type; `getMelodyBox()` computes the one hand position
3. The fretboard shows that box with the tonic highlighted, degrees on the dots
4. An explanation appears if the instrument cannot give a full octave in that key
5. User picks a drill:
   - **Listen**: Start plays the box over the drone, lighting each note; the
     status line names the note, its degree, and where it is
   - **Ear Drill**: a note sounds, the user taps their answer, and the app
     confirms or reveals the right position. Streak is tracked. "Hear it again"
     replays; "Walk up from the tonic" counts up to the note out loud; the degree
     pool and whether the shape stays visible are both adjustable
   - **Play Along**: the beat indicator appears and the metronome names each next
     note without sounding it
6. Tapping any visible dot plays that note at any time
7. URL updates for bookmarking (e.g. `?mode=scales&root=G&scale=minor&drill=ear`)

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
- `playChord()` (audio.js) - for chord sound playback
- Color scheme and chord diagram styles (styles.css)
- `createFretboardSVG()` (ui.js) - with its new `markers` argument, for the scale view
- `startDrone()` / `stopDrone()` / `playFretNote()` (audio.js)
- `getMelodyBox()` and friends (scales.js), which in turn borrow the MIDI/tuning
  helpers from voicings.js so GCEA is defined in exactly one place
- `playMetronomeTick()` and the tempo slider from practice.js
