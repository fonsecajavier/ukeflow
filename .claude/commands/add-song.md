# Add Song to UkeFlow

You are helping the user add a new song to the UkeFlow ukulele chord app.

## Step 1: Gather Song Information

Ask the user for:
1. **Song name** and **Artist name**
2. **Lyrics with chords** - Ask them to paste the lyrics with chords positioned above the lyrics

Use the AskUserQuestion tool to gather this information.

## Step 2: Parse and Validate Chords

Once you have the lyrics:

1. **Parse the chord/lyrics format**:
   - Odd lines typically contain chord names (positioned above lyrics)
   - Even lines contain lyrics
   - Section markers like `[Verse]`, `[Chorus]`, `Intro:`, etc. should become section objects

2. **Extract all unique chords** from the input

3. **Check each chord against the library** in `chords.js`:
   - Read the CHORDS object in chords.js
   - For each chord used in the song, verify it exists in the library
   - List any missing chords

4. **If chords are missing**:
   - Search the web for ukulele fingerings for each missing chord
   - Add them to chords.js in the appropriate section (Major, Minor, 7th, etc.)
   - Show the user what chords were added

5. **CRITICAL: Validate chord fingerings musically**:
   - Before adding any new chord, think carefully about whether the finger positions make musical sense
   - Verify the notes produced by the fingering actually form the chord (e.g., a C chord needs C-E-G notes)
   - Cross-reference multiple sources when possible - web sources often contain errors
   - Be skeptical of unusual fingerings - if it looks wrong, it probably is
   - For complex chords (7ths, diminished, etc.), mentally trace through the intervals
   - Do NOT blindly copy fingerings from search results - hallucinations and bad sources are common

## Step 3: Determine the Key

Analyze the chords to determine the song's key automatically:
- Look for the first chord of the song (often the key)
- Consider the last chord of the chorus or song
- Look for common progressions (I-IV-V, i-iv-v, etc.)
- If the song uses mostly minor chords, it's likely a minor key

## Step 4: Find Spotify Link

Search the web for the song's Spotify track URL:
- Search for "{song name} {artist} Spotify track"
- Find the original studio version (not live/remix)
- Extract the track URL in format: `https://open.spotify.com/track/TRACK_ID`

## Step 5: Create the Song File

Create the song JSON file in `songs/` directory:

```json
{
  "title": "Song Name",
  "artist": "Artist Name",
  "key": "C",
  "spotify": "https://open.spotify.com/track/...",
  "lines": [
    { "section": "Verse 1" },
    {
      "lyrics": "Lyrics here",
      "chords": [
        { "chord": "C", "position": 0 },
        { "chord": "G", "position": 15 }
      ]
    }
  ]
}
```

**Important parsing rules**:
- `position` is the character index where the chord appears above the lyrics
- Parse lyrics EXACTLY as provided - do not modify or "correct" them
- Section markers become `{ "section": "Section Name" }` objects
- Convert `[Verse 1]` or `Verse 1:` formats to just `"Verse 1"`

## Step 6: Update songs.json

Add the new song entry to `songs.json`:
```json
{ "path": "songs/song-name.json", "title": "Song Name", "artist": "Artist Name" }
```

## Step 7: Update PLAN.md

Add the song to the file structure section in PLAN.md with the format:
```
├── song-name.json                 # Artist Name (Key)
```

## Step 8: Summary

Show the user:
- Song details (title, artist, key)
- Chords used
- Any new chords that were added to the library
- Spotify link found
- Confirmation that files were created/updated

Ask if they want to commit and deploy.
