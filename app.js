/**
 * UkeFlow - Main Application
 * Ukulele Chord Progression Learning App
 *
 * Dependencies (loaded via script tags before this file):
 * - chords.js: Chord definitions and music theory data
 * - state.js: Application state
 * - patterns.js: Play styles and tempo
 * - audio.js: Audio synthesis and playback
 * - analysis.js: Music analysis functions
 * - ui.js: UI utilities and DOM elements
 */

/**
 * Initialize the application
 */
async function init() {
    await loadSongs();
    populatePlayStyleSelector();
    updatePatternDisplay();
    setupEventListeners();
    await loadFromURL();
}

/**
 * Load song from URL parameters
 */
async function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const songParam = params.get('song');
    const transposeParam = params.get('transpose');

    if (songParam) {
        // Find song metadata by slug
        const songMeta = state.songIndex.find(s => slugify(s.title) === songParam);
        if (songMeta) {
            elements.songSelector.value = `${songMeta.title} - ${songMeta.artist}`;
            updateClearButtonVisibility();

            // Load full song data
            const songData = await loadSongData(songMeta);
            state.currentSong = songData;

            // Apply transpose if specified
            if (transposeParam) {
                const transpose = parseInt(transposeParam, 10);
                if (!isNaN(transpose) && transpose >= -5 && transpose <= 6) {
                    state.transpose = transpose;
                    elements.transposeSelect.value = transpose.toString();
                }
            }

            displaySong();
        }
    } else {
        // No song selected - show home
        state.currentSong = null;
        state.transpose = 0;
        elements.songSelector.value = '';
        elements.transposeSelect.value = '0';
        updateClearButtonVisibility();
        hideSong();
    }
}

/**
 * Handle browser back/forward navigation
 */
async function handlePopState() {
    await loadFromURL();
}

/**
 * Update URL with current song state
 */
function updateURL(usePushState = true) {
    const params = new URLSearchParams();

    if (state.currentSong) {
        params.set('song', slugify(state.currentSong.title));
        if (state.transpose !== 0) {
            params.set('transpose', state.transpose.toString());
        }
    }

    const newURL = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;

    // Only push if URL actually changed
    if (newURL !== window.location.pathname + window.location.search) {
        if (usePushState) {
            window.history.pushState({}, '', newURL);
        } else {
            window.history.replaceState({}, '', newURL);
        }
    }
}

/**
 * Load songs from JSON files
 * First loads songs.json which contains paths to individual song files
 */
async function loadSongs() {
    try {
        // Load only the index file with metadata (no individual song files yet)
        const indexResponse = await fetch('songs.json');
        const indexData = await indexResponse.json();
        state.songIndex = indexData.songs;
        displaySongList();
    } catch (error) {
        console.error('Error loading songs:', error);
        elements.welcomeMessage.innerHTML = '<p>Error loading songs. Make sure songs.json exists.</p>';
    }
}

/**
 * Display all songs as a clickable list on the home page
 */
function displaySongList() {
    const sortedSongs = [...state.songIndex].sort((a, b) =>
        a.title.localeCompare(b.title)
    );

    const html = `
        <p>Select a song to start learning ukulele progressions!</p>
        <ul class="song-list-home">
            ${sortedSongs.map(song => `
                <li data-path="${song.path}">
                    <span class="song-title">${song.title}</span>
                    <span class="song-artist">— ${song.artist}</span>
                </li>
            `).join('')}
        </ul>
    `;

    elements.welcomeMessage.innerHTML = html;

    // Add click handlers
    elements.welcomeMessage.querySelectorAll('.song-list-home li').forEach(li => {
        li.addEventListener('click', () => {
            const songMeta = state.songIndex.find(s => s.path === li.dataset.path);
            if (songMeta) {
                selectSongFromDropdown(songMeta);
            }
        });
    });
}

/**
 * Load a song's full data (lazy loading with cache)
 */
async function loadSongData(songMeta) {
    // Return from cache if already loaded
    if (state.songCache[songMeta.path]) {
        return state.songCache[songMeta.path];
    }

    // Fetch and cache the song data
    const response = await fetch(songMeta.path);
    const songData = await response.json();
    state.songCache[songMeta.path] = songData;
    return songData;
}

/**
 * Filter and display matching songs in dropdown
 */
function filterSongDropdown(query) {
    const dropdown = elements.songDropdown;
    dropdown.innerHTML = '';
    state.highlightedIndex = -1;

    if (!query.trim()) {
        dropdown.classList.remove('active');
        return;
    }

    const lowerQuery = query.toLowerCase();
    const matches = state.songIndex
        .filter(song =>
            song.title.toLowerCase().includes(lowerQuery) ||
            song.artist.toLowerCase().includes(lowerQuery)
        )
        .sort((a, b) => a.title.localeCompare(b.title))
        .slice(0, 10);

    if (matches.length === 0) {
        dropdown.classList.remove('active');
        return;
    }

    matches.forEach((song, index) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.dataset.index = index;
        li.dataset.path = song.path;

        const titleHtml = highlightMatch(song.title, lowerQuery);
        const artistHtml = highlightMatch(song.artist, lowerQuery);

        li.innerHTML = `<span class="song-title">${titleHtml}</span><span class="song-artist">— ${artistHtml}</span>`;

        li.addEventListener('click', () => selectSongFromDropdown(song));
        li.addEventListener('mouseenter', () => {
            setHighlightedItem(index);
        });

        dropdown.appendChild(li);
    });

    dropdown.classList.add('active');
}

/**
 * Select a song from the dropdown
 */
async function selectSongFromDropdown(songMeta) {
    elements.songSelector.value = `${songMeta.title} - ${songMeta.artist}`;
    elements.songDropdown.classList.remove('active');
    updateClearButtonVisibility();

    // Reset transpose and relative key when switching songs
    state.transpose = 0;
    state.useRelativeKey = false;
    elements.transposeSelect.value = '0';
    elements.toggleRelativeKey.classList.remove('active');

    // Load full song data (lazy load with cache)
    const songData = await loadSongData(songMeta);
    state.currentSong = songData;
    displaySong();
    updateURL();
}

/**
 * Handle keyboard navigation in dropdown
 */
function handleDropdownKeyboard(e) {
    const dropdown = elements.songDropdown;
    if (!dropdown.classList.contains('active')) return;

    const items = dropdown.querySelectorAll('li');
    if (items.length === 0) return;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            setHighlightedItem(Math.min(state.highlightedIndex + 1, items.length - 1));
            break;
        case 'ArrowUp':
            e.preventDefault();
            setHighlightedItem(Math.max(state.highlightedIndex - 1, 0));
            break;
        case 'Enter':
            e.preventDefault();
            if (state.highlightedIndex >= 0 && items[state.highlightedIndex]) {
                items[state.highlightedIndex].click();
            }
            break;
        case 'Escape':
            dropdown.classList.remove('active');
            break;
    }
}

/**
 * Close dropdown when clicking outside
 */
function handleClickOutside(e) {
    if (!elements.songSelectorWrapper.contains(e.target)) {
        elements.songDropdown.classList.remove('active');
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    elements.appTitle.addEventListener('click', goHome);
    elements.songSelector.addEventListener('input', handleSongInput);
    elements.songSelector.addEventListener('keydown', handleDropdownKeyboard);
    elements.songSelector.addEventListener('focus', () => {
        if (elements.songSelector.value.trim()) {
            filterSongDropdown(elements.songSelector.value);
        }
    });
    elements.songSelectorClear.addEventListener('click', clearSongSelector);
    elements.transposeSelect.addEventListener('change', handleTranspose);
    elements.arpeggioSelect.addEventListener('change', handleArpeggioChange);
    elements.tempoSelect.addEventListener('change', handleTempoChange);
    elements.toggleBtn.addEventListener('click', handleToggleProgression);
    elements.toggleTapToPlay.addEventListener('click', handleToggleTapToPlay);
    elements.toggleRelativeKey.addEventListener('click', handleToggleRelativeKey);
    elements.easyKeySuggestion.addEventListener('click', handleEasyKeyClick);
    elements.modalOverlay.addEventListener('click', handleModalClose);
    elements.modalClose.addEventListener('click', closeModal);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('popstate', handlePopState);

    // Setup chord finder
    setupChordFinderListeners();
    setupChordMelodyListeners();
}

/**
 * Handle play style change
 */
function handleArpeggioChange(e) {
    currentPlayStyle = e.target.value;
    updatePatternDisplay();
}

/**
 * Handle tempo change
 */
function handleTempoChange(e) {
    currentBPM = parseInt(e.target.value, 10);
}

/**
 * Handle keyboard events
 */
function handleKeyDown(e) {
    if (e.key === 'Escape' && elements.modalOverlay.classList.contains('active')) {
        closeModal();
    }
}

/**
 * Clear the song selector input
 */
function clearSongSelector() {
    elements.songSelector.value = '';
    elements.songDropdown.classList.remove('active');
    updateClearButtonVisibility();
    hideSong();
    updateURL();
    elements.songSelector.focus();
}

/**
 * Go back to home (no song selected)
 */
function goHome() {
    elements.songSelector.value = '';
    elements.songDropdown.classList.remove('active');
    updateClearButtonVisibility();
    hideSong();
    updateURL();
}

/**
 * Handle song input (typing in search box)
 */
function handleSongInput(e) {
    const inputValue = e.target.value;
    updateClearButtonVisibility();

    if (inputValue.trim() === '') {
        elements.songDropdown.classList.remove('active');
        hideSong();
        updateURL();
        return;
    }

    filterSongDropdown(inputValue);
}

/**
 * Hide song display
 */
function hideSong() {
    state.currentSong = null;
    elements.songInfo.style.display = 'none';
    elements.chordReference.style.display = 'none';
    elements.lyricsSection.style.display = 'none';
    elements.welcomeMessage.style.display = 'block';
}

/**
 * Display the current song
 */
function displaySong() {
    if (!state.currentSong) return;

    // Update song info
    elements.songTitle.textContent = state.currentSong.title;
    elements.songArtist.textContent = state.currentSong.artist;

    // Show transposed key
    updateKeyDisplay();

    // Show sections
    elements.songInfo.style.display = 'flex';
    elements.chordReference.style.display = 'block';
    elements.lyricsSection.style.display = 'block';
    elements.welcomeMessage.style.display = 'none';

    // Render scale reference, progression summary, trivia, harmonic analysis, circle of fifths, Spotify, chord reference and lyrics
    renderScaleReference();
    renderProgressionSummary();
    renderMusicTrivia();
    renderHarmonicAnalysis();
    renderCircleOfFifths();
    renderDominant7thCircle();
    renderChordLibrary();
    renderSpotifyEmbed();
    renderChordReference();
    renderLyrics();

    // Chord Melody chips come from getUsedChords(), which applies the current
    // transpose - so it has to re-render here or it would list chords the song no
    // longer contains. Only if the section has been opened at least once.
    if (chordMelodyRendered) {
        renderChordMelody();
    }
}

/**
 * Render the Spotify embed if the song has a spotify field
 * Only re-renders if the URL has changed to avoid interrupting playback
 */
let currentSpotifyUrl = null;

function renderSpotifyEmbed() {
    if (!state.currentSong.spotify) {
        elements.spotifySection.style.display = 'none';
        currentSpotifyUrl = null;
        return;
    }

    // Skip re-render if URL hasn't changed (e.g., during transpose)
    if (state.currentSong.spotify === currentSpotifyUrl) {
        return;
    }
    currentSpotifyUrl = state.currentSong.spotify;

    // Extract track ID from various Spotify URL formats
    const spotifyUrl = state.currentSong.spotify;
    let embedUrl = '';

    if (spotifyUrl.includes('open.spotify.com')) {
        // Convert open.spotify.com URL to embed URL
        embedUrl = spotifyUrl.replace('open.spotify.com', 'open.spotify.com/embed');
    } else if (spotifyUrl.startsWith('spotify:')) {
        // Convert URI format (spotify:track:ID) to embed URL
        const parts = spotifyUrl.split(':');
        if (parts.length >= 3) {
            embedUrl = `https://open.spotify.com/embed/${parts[1]}/${parts[2]}`;
        }
    } else {
        // Assume it's already an embed URL or just the track ID
        embedUrl = spotifyUrl;
    }

    elements.spotifyEmbed.innerHTML = `
        <iframe
            src="${embedUrl}"
            width="100%"
            height="152"
            frameborder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy">
        </iframe>
    `;
    elements.spotifySection.style.display = 'block';
}

/**
 * Render the scale reference (all chords in the key)
 */
function renderScaleReference() {
    const transposedKey = getDisplayKey();
    const isMinor = isMinorKey(transposedKey);
    const scale = isMinor ? SCALE_DEGREES_MINOR[transposedKey] : SCALE_DEGREES_MAJOR[transposedKey];
    const romanNumerals = isMinor ? ROMAN_NUMERALS_MINOR : ROMAN_NUMERALS_MAJOR;

    elements.scaleGrid.innerHTML = '';

    if (!scale) return;

    // Check if this is an uncommon key with an enharmonic equivalent
    const enharmonic = getEnharmonicEquivalent(transposedKey);
    if (enharmonic) {
        const notice = document.createElement('div');
        notice.className = 'enharmonic-notice';
        notice.textContent = `Uncommon key. Consider using ${enharmonic} instead.`;
        elements.scaleGrid.appendChild(notice);
    }

    // Only show the 7 diatonic chords (not borrowed chords at indices 7+)
    for (let i = 0; i < 7; i++) {
        const chord = scale[i];
        const numeral = romanNumerals[i];

        const item = document.createElement('div');
        item.className = 'scale-item';

        const chordData = resolveChord(chord);

        // Make clickable if chord exists in library
        if (chordData) {
            item.classList.add('clickable');
            item.addEventListener('click', () => {
                openChordModal(chord);
            });
        }

        const degree = document.createElement('span');
        degree.className = 'scale-degree';
        degree.textContent = numeral;
        item.appendChild(degree);

        const chordName = document.createElement('span');
        chordName.className = 'scale-chord';
        chordName.textContent = chord;
        item.appendChild(chordName);

        // Add play button if chord exists
        if (chordData) {
            const playBtn = document.createElement('button');
            playBtn.className = 'scale-play-btn';
            playBtn.innerHTML = '&#9654;';
            playBtn.title = 'Play chord';
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playChord(chordData);
                playBtn.classList.add('playing');
                setTimeout(() => playBtn.classList.remove('playing'), 400);
            });
            item.appendChild(playBtn);
        }

        elements.scaleGrid.appendChild(item);
    }
}

/**
 * Render the progression summary (chord sequences used in the song)
 */
function renderProgressionSummary() {
    const transposedKey = getDisplayKey();
    elements.progressionContent.innerHTML = '';

    // Extract chord sequences from each section
    const sectionProgressions = {};
    let currentSection = 'Intro';

    state.currentSong.lines.forEach(line => {
        if (line.section) {
            currentSection = line.section;
        } else if (line.chords && line.chords.length > 0) {
            if (!sectionProgressions[currentSection]) {
                sectionProgressions[currentSection] = [];
            }
            // Get chords in order for this line
            const lineChords = line.chords
                .sort((a, b) => a.position - b.position)
                .map(c => transposeChord(c.chord, state.transpose));
            sectionProgressions[currentSection].push(lineChords);
        }
    });

    // Analyze progressions by section
    for (const [section, lines] of Object.entries(sectionProgressions)) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'progression-section';

        const title = document.createElement('div');
        title.className = 'progression-section-title';
        title.textContent = section;
        sectionDiv.appendChild(title);

        const list = document.createElement('div');
        list.className = 'progression-list';

        // Count unique progressions in this section
        const progressionCounts = {};
        lines.forEach(chords => {
            const key = chords.join(' → ');
            const degrees = chords.map(c => getScaleDegree(c, transposedKey)).join(' → ');
            const id = degrees;
            if (!progressionCounts[id]) {
                progressionCounts[id] = { chords: key, degrees, count: 0 };
            }
            progressionCounts[id].count++;
        });

        // Display each unique progression
        for (const prog of Object.values(progressionCounts)) {
            const item = document.createElement('div');
            item.className = 'progression-item';

            const degrees = document.createElement('span');
            degrees.className = 'prog-degrees';
            degrees.textContent = prog.degrees;
            item.appendChild(degrees);

            const chords = document.createElement('span');
            chords.className = 'prog-chords';
            chords.textContent = `(${prog.chords})`;
            item.appendChild(chords);

            if (prog.count > 1) {
                const count = document.createElement('span');
                count.className = 'prog-count';
                count.textContent = `×${prog.count}`;
                item.appendChild(count);
            }

            list.appendChild(item);
        }

        sectionDiv.appendChild(list);
        elements.progressionContent.appendChild(sectionDiv);
    }
}

/**
 * Render music trivia section
 */
function renderMusicTrivia() {
    const transposedKey = getDisplayKey();
    const isMinor = isMinorKey(transposedKey);
    const usedChords = getUsedChords();

    elements.triviaContent.innerHTML = '';
    const trivia = [];

    // Key information
    const keyType = isMinor ? 'minor' : 'major';
    const relativeKey = getRelativeKey(transposedKey);
    trivia.push({
        icon: '🎵',
        text: `This song is in <strong>${transposedKey}</strong> (${keyType}). Its relative ${isMinor ? 'major' : 'minor'} is <strong>${relativeKey}</strong>.`
    });

    // Key confidence analysis - analyze the displayed key (accounts for relative toggle)
    const keyToAnalyze = state.useRelativeKey
        ? getRelativeKey(state.currentSong.key)
        : state.currentSong.key;
    const keyAnalysis = analyzeKeyConfidence(keyToAnalyze);

    // Show key indicators
    if (keyAnalysis.firstChord && keyAnalysis.lastChord) {
        const indicators = [];
        if (keyAnalysis.firstChord === keyAnalysis.lastChord) {
            indicators.push(`Opens and closes on <strong>${keyAnalysis.firstChord}</strong>`);
        } else {
            indicators.push(`Opens on <strong>${keyAnalysis.firstChord}</strong>, closes on <strong>${keyAnalysis.lastChord}</strong>`);
        }
        trivia.push({
            icon: '🎯',
            text: indicators.join('. ') + '.'
        });
    }

    // Most frequent chord
    if (keyAnalysis.mostFrequent) {
        trivia.push({
            icon: '📊',
            text: `Most frequent chord: <strong>${keyAnalysis.mostFrequent}</strong> (appears ${keyAnalysis.mostFrequentCount}×).`
        });
    }

    // Cadences
    if (keyAnalysis.cadences.length > 0) {
        const cadenceTargets = [...new Set(keyAnalysis.cadences.map(c => c.target))];
        trivia.push({
            icon: '🔄',
            text: `V→I cadence${keyAnalysis.cadences.length > 1 ? 's' : ''} detected resolving to: <strong>${cadenceTargets.join(', ')}</strong>.`
        });
    }

    // ii-V-I progressions (strong key indicator)
    if (keyAnalysis.iiVI && keyAnalysis.iiVI.length > 0) {
        const iiViTargets = [...new Set(keyAnalysis.iiVI.map(c => c.target))];
        trivia.push({
            icon: '🎹',
            text: `<strong>ii-V-I progression</strong> detected to: <strong>${iiViTargets.join(', ')}</strong>. This is a very strong key indicator!`
        });
    }

    // Missing tonic chord warning (major red flag!)
    if (keyAnalysis.missingTonic) {
        trivia.push({
            icon: '🚫',
            text: `No <strong>${keyAnalysis.missingTonicChord}</strong> (tonic) chord found! The key's main chord doesn't appear in the song.`
        });
    }

    // Missing dominant chord warning
    if (keyAnalysis.missingDominant) {
        trivia.push({
            icon: '⚠️',
            text: `No <strong>${keyAnalysis.missingDominantChord}</strong> (V chord) found. Songs typically use their dominant chord to establish the key.`
        });
    }

    // Key confidence
    if (keyAnalysis.confidence === 'ambiguous' && keyAnalysis.alternativeKey) {
        trivia.push({
            icon: '🤔',
            text: `<strong>Ambiguous key</strong>: Could be interpreted as <strong>${transposedKey}</strong> or <strong>${keyAnalysis.alternativeKey}</strong>.`
        });
    } else if (keyAnalysis.confidence === 'likely different' && keyAnalysis.alternativeKey) {
        trivia.push({
            icon: '💡',
            text: `<strong>Suggested key: ${keyAnalysis.alternativeKey}</strong> — ${keyAnalysis.alternativeReasons.slice(0, 3).join(', ')}.`
        });
    } else if (keyAnalysis.confidence === 'likely relative' && keyAnalysis.alternativeKey) {
        trivia.push({
            icon: '💡',
            text: `This might actually be in <strong>${keyAnalysis.alternativeKey}</strong>: ${keyAnalysis.alternativeReasons.join(', ')}.`
        });
    }

    // Chord count
    trivia.push({
        icon: '🎸',
        text: `Uses <strong>${usedChords.length}</strong> unique chord${usedChords.length > 1 ? 's' : ''}: <span class="highlight">${usedChords.join(', ')}</span>.`
    });

    // Check for famous progressions
    const progressions = detectFamousProgressions(transposedKey);
    if (progressions.length > 0) {
        progressions.forEach(prog => {
            trivia.push({
                icon: '⭐',
                text: prog
            });
        });
    }

    // Check for borrowed chords
    const borrowedChords = detectBorrowedChords(transposedKey, usedChords);
    if (borrowedChords.length > 0) {
        trivia.push({
            icon: '🎭',
            text: `Uses borrowed chord${borrowedChords.length > 1 ? 's' : ''}: <strong>${borrowedChords.join(', ')}</strong>. These add color by borrowing from ${isMinor ? 'major modes' : 'minor modes'}.`
        });
    } else if (usedChords.length >= 3 && keyAnalysis.confidence === 'strong') {
        // All chords are diatonic - strong key confirmation
        trivia.push({
            icon: '✅',
            text: `All ${usedChords.length} chords are diatonic (belong to the scale) to <strong>${transposedKey}</strong> — the key fits perfectly!`
        });
    }

    // Chord variety assessment
    if (usedChords.length <= 3) {
        trivia.push({
            icon: '✨',
            text: 'A simple song with few chords - great for beginners!'
        });
    } else if (usedChords.length >= 6) {
        trivia.push({
            icon: '🎓',
            text: 'A harmonically rich song with many chord changes.'
        });
    }

    // Render trivia items
    trivia.forEach(item => {
        const div = document.createElement('div');
        div.className = 'trivia-item';

        const icon = document.createElement('span');
        icon.className = 'trivia-icon';
        icon.textContent = item.icon;
        div.appendChild(icon);

        const text = document.createElement('span');
        text.className = 'trivia-text';
        text.innerHTML = item.text;
        div.appendChild(text);

        elements.triviaContent.appendChild(div);
    });
}

/**
 * Render harmonic analysis table showing chord, scale degree, and function
 */
function renderHarmonicAnalysis() {
    const transposedKey = getDisplayKey();
    const isMinor = isMinorKey(transposedKey);
    const usedChords = getUsedChords();

    elements.harmonicContent.innerHTML = '';

    // Create table
    const table = document.createElement('table');
    table.className = 'harmonic-table';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Chord', 'Degree', 'Function'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');

    usedChords.forEach(chord => {
        const row = document.createElement('tr');

        // Chord name (clickable) with play button
        const chordCell = document.createElement('td');
        chordCell.className = 'chord-cell';

        const chordData = resolveChord(chord);
        if (chordData) {
            // Play button
            const playBtn = document.createElement('button');
            playBtn.className = 'harmonic-play-btn';
            playBtn.innerHTML = '&#9654;';
            playBtn.title = 'Play chord';
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playChord(chordData);
                playBtn.classList.add('playing');
                setTimeout(() => playBtn.classList.remove('playing'), 400);
            });
            chordCell.appendChild(playBtn);
        }

        const chordName = document.createElement('span');
        chordName.textContent = chord;
        if (chordData) {
            chordName.style.cursor = 'pointer';
            chordName.addEventListener('click', () => openChordModal(chord));
        }
        chordCell.appendChild(chordName);
        row.appendChild(chordCell);

        // Scale degree
        const degreeCell = document.createElement('td');
        degreeCell.className = 'degree-cell';
        let degree = getScaleDegree(chord, transposedKey);

        // Check for secondary dominant if degree is unknown
        if (degree === '?') {
            const secondaryDom = detectSecondaryDominant(chord, transposedKey, isMinor);
            if (secondaryDom) {
                // Extract just the Roman numeral part (e.g., "V/vi" from "V/vi (Secondary Dominant)")
                degree = secondaryDom.split(' ')[0];
            }
        }
        degreeCell.textContent = degree;
        row.appendChild(degreeCell);

        // Harmonic function
        const functionCell = document.createElement('td');
        functionCell.className = 'function-cell';
        const func = getHarmonicFunction(chord, getScaleDegree(chord, transposedKey), transposedKey, isMinor);
        functionCell.textContent = func.name;
        functionCell.classList.add(func.class);
        row.appendChild(functionCell);

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    elements.harmonicContent.appendChild(table);
}

/**
 * Render Circle of Fifths
 */
function renderCircleOfFifths() {
    const transposedKey = getDisplayKey();
    elements.circleContainer.innerHTML = '';

    // Get suggested tonic from key analysis (if different from displayed key)
    const keyToAnalyze = state.useRelativeKey
        ? getRelativeKey(state.currentSong.key)
        : state.currentSong.key;
    const keyAnalysis = analyzeKeyConfidence(keyToAnalyze);
    const suggestedTonic = (keyAnalysis.confidence === 'likely different' && keyAnalysis.alternativeKey)
        ? keyAnalysis.alternativeKey
        : null;

    const svg = createCircleOfFifthsSVG(transposedKey, (majorKey, minorKey) => {
        openKeyModal(majorKey, minorKey);
    }, suggestedTonic);

    elements.circleContainer.appendChild(svg);
}

/**
 * Render Dominant 7th Circle
 */
function renderDominant7thCircle() {
    const transposedKey = getDisplayKey();
    elements.dom7CircleContainer.innerHTML = '';

    // Get suggested tonic from key analysis (if different from displayed key)
    const keyToAnalyze = state.useRelativeKey
        ? getRelativeKey(state.currentSong.key)
        : state.currentSong.key;
    const keyAnalysis = analyzeKeyConfidence(keyToAnalyze);
    const suggestedTonic = (keyAnalysis.confidence === 'likely different' && keyAnalysis.alternativeKey)
        ? keyAnalysis.alternativeKey
        : null;

    const svg = createDominant7thCircleSVG(transposedKey, (chord, chord7OrRoman, romanOrUndefined) => {
        // Handle both signatures:
        // - Dual chord: (chord, chord7, roman) - e.g., ('G', 'G7', 'V / V7')
        // - Single chord: (chord, null, roman) - e.g., ('C', null, 'I')
        // - Secondary dominant: (chord, roman) - e.g., ('D7', 'II(7)')
        if (romanOrUndefined !== undefined) {
            // 3-argument call: (chord, chord7, roman)
            openDom7Modal(chord, chord7OrRoman, romanOrUndefined);
        } else {
            // 2-argument call: (chord, roman)
            openDom7Modal(chord, null, chord7OrRoman);
        }
    }, suggestedTonic);

    elements.dom7CircleContainer.appendChild(svg);
}

/**
 * Render chord library - all available chords grouped by type
 */
let chordLibraryRendered = false;

function renderChordLibrary() {
    // Only render once since it doesn't change
    if (chordLibraryRendered) return;
    chordLibraryRendered = true;

    elements.chordLibraryContent.innerHTML = '';

    // Group chords by type
    const groups = {
        'Major': [],
        'Minor': [],
        '7th': [],
        'Major 7th': [],
        'Minor 7th': [],
        'Diminished': [],
        'Augmented': [],
        'Suspended': [],
        'Other': []
    };

    // Categorize each chord
    Object.keys(CHORDS).sort().forEach(chordName => {
        if (chordName.includes('dim')) {
            groups['Diminished'].push(chordName);
        } else if (chordName.includes('aug')) {
            groups['Augmented'].push(chordName);
        } else if (chordName.includes('sus')) {
            groups['Suspended'].push(chordName);
        } else if (chordName.includes('maj7')) {
            groups['Major 7th'].push(chordName);
        } else if (chordName.includes('m7')) {
            groups['Minor 7th'].push(chordName);
        } else if (chordName.includes('7')) {
            groups['7th'].push(chordName);
        } else if (chordName.includes('m') && !chordName.includes('maj')) {
            groups['Minor'].push(chordName);
        } else if (/^[A-G][#b]?$/.test(chordName)) {
            groups['Major'].push(chordName);
        } else {
            groups['Other'].push(chordName);
        }
    });

    // Render each group
    Object.entries(groups).forEach(([groupName, chords]) => {
        if (chords.length === 0) return;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'chord-library-group';

        const title = document.createElement('div');
        title.className = 'chord-library-group-title';
        title.textContent = groupName;
        groupDiv.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'chord-library-grid';

        chords.forEach(chordName => {
            const chordData = CHORDS[chordName];
            const item = document.createElement('div');
            item.className = 'chord-library-item';
            item.textContent = chordName;
            item.addEventListener('click', () => openChordModal(chordName));
            grid.appendChild(item);
        });

        groupDiv.appendChild(grid);
        elements.chordLibraryContent.appendChild(groupDiv);
    });
}

/**
 * Open modal showing chord from songwriter's circle
 * @param {string} chordName - Primary chord name (e.g., 'G')
 * @param {string|null} chord7Name - Secondary chord name for dual display (e.g., 'G7'), or null
 * @param {string} romanNumeral - Roman numeral label (e.g., 'V / V7' or 'I')
 */
function openDom7Modal(chordName, chord7Name, romanNumeral) {
    elements.modalChord.innerHTML = '';

    const content = document.createElement('div');
    content.className = 'key-modal-content';

    // Title - show both chords for dual display
    const title = document.createElement('div');
    title.className = 'key-modal-title';
    title.textContent = chord7Name ? `${chordName} / ${chord7Name}` : chordName;
    content.appendChild(title);

    // Subtitle with roman numeral
    const subtitle = document.createElement('div');
    subtitle.className = 'key-modal-subtitle';
    subtitle.textContent = romanNumeral;
    content.appendChild(subtitle);

    // Chord diagrams container
    const chordsContainer = document.createElement('div');
    chordsContainer.className = 'key-modal-chords';
    chordsContainer.style.justifyContent = 'center';

    // Helper function to create chord item
    const createChordItem = (name) => {
        const chordData = CHORDS[name];
        if (!chordData) return null;

        const chordItem = document.createElement('div');
        chordItem.className = 'key-modal-chord';
        chordItem.style.cursor = 'pointer';
        chordItem.addEventListener('click', () => openChordModal(name));

        // Add chord name label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'chord-degree';
        labelDiv.style.marginBottom = '5px';
        labelDiv.style.color = '#f39c12';
        labelDiv.textContent = name;
        chordItem.appendChild(labelDiv);

        const chordSvg = createChordSVG(chordData, true);
        chordItem.appendChild(chordSvg);

        return chordItem;
    };

    if (chord7Name) {
        // Dual display: show both chords with their names
        const chord1Item = createChordItem(chordName);
        const chord2Item = createChordItem(chord7Name);

        if (chord1Item) chordsContainer.appendChild(chord1Item);
        if (chord2Item) chordsContainer.appendChild(chord2Item);

        if (!chord1Item && !chord2Item) {
            const noChord = document.createElement('div');
            noChord.style.color = '#888';
            noChord.textContent = 'No diagrams available';
            chordsContainer.appendChild(noChord);
        }
    } else {
        // Single chord display
        const chordData = CHORDS[chordName];
        if (chordData) {
            const chordItem = document.createElement('div');
            chordItem.className = 'key-modal-chord';
            chordItem.style.cursor = 'pointer';
            chordItem.addEventListener('click', () => openChordModal(chordName));

            const chordSvg = createChordSVG(chordData, true);
            chordItem.appendChild(chordSvg);

            chordsContainer.appendChild(chordItem);
        } else {
            const noChord = document.createElement('div');
            noChord.style.color = '#888';
            noChord.textContent = 'No diagram available';
            chordsContainer.appendChild(noChord);
        }
    }

    content.appendChild(chordsContainer);

    // Explanation based on function
    const explanation = document.createElement('div');
    explanation.style.marginTop = '15px';
    explanation.style.fontSize = '0.85rem';
    explanation.style.color = '#888';
    explanation.style.lineHeight = '1.5';

    const explanations = {
        'I': 'The <strong>tonic</strong> - home base, the key center. Songs typically start and end here.',
        'IV': 'The <strong>subdominant</strong> - creates movement away from tonic. Common in verse progressions.',
        'V': 'The <strong>dominant</strong> - creates tension that wants to resolve to I. Use the triad for a softer resolution.',
        'V7': 'The <strong>dominant 7th</strong> - maximum tension! The added 7th creates a stronger pull to resolve to I.',
        'V / V7': 'The <strong>dominant</strong> - creates tension that resolves to I. Use the triad (V) for a softer feel, or the 7th (V7) for maximum pull!',
        'ii': 'The <strong>supertonic</strong> - often precedes V in the classic ii-V-I progression.',
        'vi': 'The <strong>submediant</strong> - relative minor, creates a melancholic feel. Start of I-vi-ii-V.',
        'iii': 'The <strong>mediant</strong> - bridges tonic and dominant families.',
        'II(7)': '<strong>Secondary dominant</strong> (V/V) - leads strongly to V. Creates the classic turnaround.',
        'VI(7)': '<strong>Secondary dominant</strong> (V/ii) - leads to ii. Adds chromatic color.',
        'III(7)': '<strong>Secondary dominant</strong> (V/vi) - leads to vi. Common in jazz and soul.',
    };

    explanation.innerHTML = explanations[romanNumeral] || `${romanNumeral} chord in the current key.`;
    content.appendChild(explanation);

    elements.modalChord.appendChild(content);
    elements.modalOverlay.classList.add('active');

    // In tap-to-play mode, play the chord shown right away (first one if a pair)
    if (state.tapToPlayMode) {
        const firstChordData = CHORDS[chordName] || (chord7Name ? CHORDS[chord7Name] : null);
        if (firstChordData) playChordArpeggio(firstChordData);
    }
}

// Store current key modal chords for keyboard playback
let keyModalChords = null;
let keyModalKeyboardHandler = null;

/**
 * Open a modal showing all chords in a key with option to transpose
 */
function openKeyModal(majorKey, minorKey) {
    elements.modalChord.innerHTML = '';

    const currentKey = getDisplayKey();
    const isCurrentKeyMinor = isMinorKey(currentKey);

    // Enharmonic equivalents for keyboard playback
    const enharmonicForKeyboard = {
        'Cb': 'B', 'Cbm': 'Bm', 'Cbdim': 'Bdim',
        'Fb': 'E', 'Fbm': 'Em', 'Fbdim': 'Edim',
        'B#': 'C', 'B#m': 'Cm', 'B#dim': 'Cdim',
        'E#': 'F', 'E#m': 'Fm', 'E#dim': 'Fdim',
        'Db': 'C#', 'Dbm': 'C#m', 'Dbdim': 'C#dim',
        'Gb': 'F#', 'Gbm': 'F#m', 'Gbdim': 'F#dim',
        'Ab': 'G#', 'Abm': 'G#m', 'Abdim': 'G#dim'
    };

    // Store chords for keyboard access
    const majorScale = SCALE_DEGREES_MAJOR[majorKey];
    keyModalChords = majorScale ? majorScale.map(chord => {
        const actualChord = CHORDS[chord] ? chord : (enharmonicForKeyboard[chord] || chord);
        return CHORDS[actualChord];
    }) : null;

    // Add keyboard listener for 1-7 keys
    if (keyModalKeyboardHandler) {
        document.removeEventListener('keydown', keyModalKeyboardHandler);
    }
    keyModalKeyboardHandler = (e) => {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 7 && keyModalChords) {
            const chordData = keyModalChords[num - 1];
            if (chordData) {
                playChord(chordData);
                // Visual feedback on the corresponding button
                const buttons = document.querySelectorAll('.key-modal-play-btn');
                if (buttons[num - 1]) {
                    buttons[num - 1].classList.add('playing');
                    setTimeout(() => buttons[num - 1].classList.remove('playing'), 400);
                }
            }
        }
    };
    document.addEventListener('keydown', keyModalKeyboardHandler);

    // Create modal content
    const content = document.createElement('div');
    content.className = 'key-modal-content';

    // Title (major key)
    const title = document.createElement('div');
    title.className = 'key-modal-title';
    title.textContent = `Key of ${majorKey}`;
    content.appendChild(title);

    // Subtitle (relative minor)
    const subtitle = document.createElement('div');
    subtitle.className = 'key-modal-subtitle';
    subtitle.textContent = `Relative minor: ${minorKey}`;
    content.appendChild(subtitle);

    // Diatonic chords for major key
    const chordsContainer = document.createElement('div');
    chordsContainer.className = 'key-modal-chords';

    const romanNumerals = ROMAN_NUMERALS_MAJOR;

    // Enharmonic equivalents for chords that don't exist in library
    const enharmonicMap = {
        'Cb': 'B', 'Cbm': 'Bm', 'Cbdim': 'Bdim',
        'Fb': 'E', 'Fbm': 'Em', 'Fbdim': 'Edim',
        'B#': 'C', 'B#m': 'Cm', 'B#dim': 'Cdim',
        'E#': 'F', 'E#m': 'Fm', 'E#dim': 'Fdim',
        'Db': 'C#', 'Dbm': 'C#m', 'Dbdim': 'C#dim',
        'Gb': 'F#', 'Gbm': 'F#m', 'Gbdim': 'F#dim',
        'Ab': 'G#', 'Abm': 'G#m', 'Abdim': 'G#dim'
    };

    if (majorScale) {
        for (let i = 0; i < 7; i++) {
            const chord = majorScale[i];
            const numeral = romanNumerals[i];

            const chordItem = document.createElement('div');
            chordItem.className = 'key-modal-chord';

            // Check if chord exists in library, or use enharmonic equivalent
            let chordData = CHORDS[chord];
            let actualChord = chord;
            let displayName = chord;

            if (!chordData && enharmonicMap[chord]) {
                actualChord = enharmonicMap[chord];
                chordData = CHORDS[actualChord];
                displayName = `${chord}/${actualChord}`;
            }

            const degree = document.createElement('span');
            degree.className = 'chord-degree';
            degree.textContent = numeral;
            chordItem.appendChild(degree);

            const name = document.createElement('span');
            name.className = 'chord-name';
            name.textContent = displayName;
            chordItem.appendChild(name);

            // Add play button if chord exists
            if (chordData) {
                chordItem.addEventListener('click', () => {
                    openChordModal(actualChord);
                });

                const playBtn = document.createElement('button');
                playBtn.className = 'key-modal-play-btn';
                playBtn.innerHTML = '&#9654;';
                playBtn.title = `Play ${actualChord}`;
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    playChord(chordData);
                    playBtn.classList.add('playing');
                    setTimeout(() => playBtn.classList.remove('playing'), 400);
                });
                chordItem.appendChild(playBtn);
            }

            chordsContainer.appendChild(chordItem);
        }
    }

    content.appendChild(chordsContainer);

    // Keyboard hint
    const keyboardHint = document.createElement('div');
    keyboardHint.className = 'key-modal-hint';
    keyboardHint.innerHTML = '⌨️ Press <kbd>1</kbd>-<kbd>7</kbd> to play chords';
    content.appendChild(keyboardHint);

    // Transpose button (only show if a song is loaded)
    if (state.currentSong) {
        const transposeBtn = document.createElement('button');
        transposeBtn.className = 'key-modal-transpose-btn';

        // Calculate semitone difference
        const originalKey = transposeKey(state.currentSong.key, state.transpose);
        const targetKey = isCurrentKeyMinor ? minorKey : majorKey;

        // Get the root note for comparison
        const getNoteIndex = (key) => {
            const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const altNotes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
            const root = key.replace('m', '').replace('dim', '').replace('aug', '').replace('7', '').replace('maj', '');
            let idx = notes.indexOf(root);
            if (idx === -1) idx = altNotes.indexOf(root);
            return idx;
        };

        const currentNoteIdx = getNoteIndex(originalKey);
        const targetNoteIdx = getNoteIndex(targetKey);

        let semitones = targetNoteIdx - currentNoteIdx;
        if (semitones > 6) semitones -= 12;
        if (semitones < -5) semitones += 12;

        // Calculate total transpose from original
        const newTranspose = state.transpose + semitones;

        // Normalize to -5 to +6 range
        let normalizedTranspose = newTranspose;
        while (normalizedTranspose > 6) normalizedTranspose -= 12;
        while (normalizedTranspose < -5) normalizedTranspose += 12;

        if (semitones === 0) {
            transposeBtn.textContent = 'Already in this key';
            transposeBtn.disabled = true;
        } else {
            transposeBtn.textContent = `Transpose to ${targetKey}`;
            transposeBtn.addEventListener('click', () => {
                // Set transpose
                state.transpose = normalizedTranspose;
                elements.transposeSelect.value = normalizedTranspose.toString();

                // Close modal and update display
                closeModal();
                displaySong();
                updateURL(false);
            });
        }

        content.appendChild(transposeBtn);
    }

    elements.modalChord.appendChild(content);
    elements.modalOverlay.classList.add('active');

    // In tap-to-play mode, play the tonic (first diatonic chord) right away
    if (state.tapToPlayMode && keyModalChords && keyModalChords[0]) {
        playChord(keyModalChords[0]);
        const firstBtn = document.querySelector('.key-modal-play-btn');
        if (firstBtn) {
            firstBtn.classList.add('playing');
            setTimeout(() => firstBtn.classList.remove('playing'), 400);
        }
    }
}

/**
 * Render chord reference section at the top
 */
function renderChordReference() {
    const usedChords = getUsedChords();
    elements.chordGrid.innerHTML = '';

    usedChords.forEach(chordName => {
        const chordData = resolveChord(chordName);
        if (chordData) {
            const diagram = createChordDiagram(chordData, false, chordName);
            diagram.style.cursor = 'pointer';
            diagram.addEventListener('click', () => {
                openChordModal(chordName);
            });
            elements.chordGrid.appendChild(diagram);
        } else {
            // Chord not in library, show name only
            const placeholder = document.createElement('div');
            placeholder.className = 'chord-diagram';
            placeholder.innerHTML = `<div class="chord-name">${chordName}</div><div style="color:#666;font-size:0.8rem;">No diagram</div>`;
            elements.chordGrid.appendChild(placeholder);
        }
    });
}

/**
 * Render lyrics with chords
 */
function renderLyrics() {
    elements.lyricsContainer.innerHTML = '';

    state.currentSong.lines.forEach(line => {
        if (line.section) {
            // Section marker (verse, chorus, etc.)
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'section-break';
            sectionDiv.textContent = `[${line.section}]`;
            elements.lyricsContainer.appendChild(sectionDiv);
        } else {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'lyric-line';

            // Chord row
            const chordRow = document.createElement('div');
            chordRow.className = 'chord-row';

            if (line.chords && line.chords.length > 0) {
                // Build chord row with proper spacing
                let chordText = '';

                // Sort chords by position
                const sortedChords = [...line.chords].sort((a, b) => a.position - b.position);

                // Get transposed key for scale degree calculation
                const transposedKey = getDisplayKey();

                sortedChords.forEach(c => {
                    // Add spaces to reach the chord position
                    while (chordText.length < c.position) {
                        chordText += ' ';
                    }

                    // Transpose the chord
                    const transposedChord = transposeChord(c.chord, state.transpose);

                    let displayChord;
                    if (state.showAsNumbers) {
                        let degree = getScaleDegree(transposedChord, transposedKey);
                        // Check for secondary dominant if degree is unknown
                        if (degree === '?') {
                            const isMinor = isMinorKey(transposedKey);
                            const secondaryDom = detectSecondaryDominant(transposedChord, transposedKey, isMinor);
                            if (secondaryDom) {
                                degree = secondaryDom.split(' ')[0]; // Extract "V/vi" from "V/vi (Secondary Dominant)"
                            }
                        }
                        displayChord = degree;
                    } else {
                        displayChord = transposedChord;
                    }

                    // Create a placeholder for the chord marker
                    const markerPlaceholder = `{{CHORD:${transposedChord}:${displayChord}}}`;
                    chordText += markerPlaceholder;
                });

                // Replace placeholders with actual chord markers
                chordRow.innerHTML = chordText.replace(
                    /\{\{CHORD:([^:]+):([^}]+)\}\}/g,
                    (match, chordName, displayChord) => {
                        return `<span class="chord-marker" data-chord="${chordName}">${displayChord}</span>`;
                    }
                );

                // Add click and hover handlers to chord markers
                chordRow.querySelectorAll('.chord-marker').forEach(marker => {
                    marker.addEventListener('click', () => {
                        const chordName = marker.dataset.chord;
                        if (state.tapToPlayMode) {
                            // Play the chord immediately
                            const chordData = resolveChord(chordName);
                            if (chordData) {
                                playChord(chordData);
                                // Visual feedback
                                marker.classList.add('playing');
                                setTimeout(() => marker.classList.remove('playing'), 300);
                            }
                        } else {
                            // Open the chord modal
                            openChordModal(chordName);
                        }
                    });
                    // Show tooltip on hover
                    marker.addEventListener('mouseenter', (e) => {
                        showChordTooltip(marker.dataset.chord, e);
                    });
                    marker.addEventListener('mouseleave', () => {
                        hideChordTooltip();
                    });
                });
            }

            lineDiv.appendChild(chordRow);

            // Lyrics row
            const lyricsRow = document.createElement('div');
            lyricsRow.className = 'lyric-text';
            lyricsRow.textContent = line.lyrics || '';
            lineDiv.appendChild(lyricsRow);

            elements.lyricsContainer.appendChild(lineDiv);
        }
    });
}

/**
 * Handle transpose selection
 */
function handleTranspose(e) {
    state.transpose = parseInt(e.target.value, 10);
    displaySong();
    updateURL(false); // Use replaceState for transpose changes
}

/**
 * Handle toggle between chord names and progression numbers
 */
function handleToggleProgression() {
    state.showAsNumbers = !state.showAsNumbers;
    elements.toggleBtn.textContent = state.showAsNumbers ? 'Show as Chords' : 'Show as Numbers';
    elements.toggleBtn.classList.toggle('active', state.showAsNumbers);

    // Re-render chord reference and lyrics
    renderChordReference();
    renderLyrics();
}

/**
 * Handle toggle for tap-to-play mode
 */
function handleToggleTapToPlay() {
    state.tapToPlayMode = !state.tapToPlayMode;
    elements.toggleTapToPlay.classList.toggle('active', state.tapToPlayMode);
}

/**
 * Handle toggle between original key and relative key
 */
function handleToggleRelativeKey() {
    if (!state.currentSong) return;

    state.useRelativeKey = !state.useRelativeKey;
    elements.toggleRelativeKey.classList.toggle('active', state.useRelativeKey);

    // Update key display
    updateKeyDisplay();

    // Re-render all sections that depend on key
    renderScaleReference();
    renderProgressionSummary();
    renderMusicTrivia();
    renderHarmonicAnalysis();
    renderChordReference();
    renderLyrics();
    renderCircleOfFifths();
    renderDominant7thCircle();
}

/**
 * Handle click on easy key suggestion
 */
function handleEasyKeyClick() {
    const semitones = parseInt(elements.easyKeySuggestion.dataset.semitones, 10);
    if (isNaN(semitones)) return;
    state.transpose = semitones;
    elements.transposeSelect.value = semitones.toString();
    displaySong();
    updateURL(false);
}

/**
 * Update the key display in the UI
 */
function updateKeyDisplay() {
    if (!state.currentSong) return;
    const transposedKey = transposeKey(state.currentSong.key, state.transpose);
    const displayKey = getDisplayKey();

    // Get key confidence
    const keyAnalysis = analyzeKeyConfidence(state.currentSong.key);
    let confidenceIndicator = '';
    if (keyAnalysis.confidence === 'ambiguous') {
        confidenceIndicator = ' ⚖️';
    } else if (keyAnalysis.confidence === 'likely relative') {
        confidenceIndicator = ' 🔀';
    } else if (keyAnalysis.confidence === 'likely different') {
        confidenceIndicator = ` 💡→${keyAnalysis.alternativeKey}?`;
    } else if (keyAnalysis.confidence === 'weak') {
        confidenceIndicator = ' ❓';
    }

    if (state.useRelativeKey) {
        const originalType = isMinorKey(transposedKey) ? 'minor' : 'major';
        const relativeType = isMinorKey(displayKey) ? 'minor' : 'major';
        elements.songKey.textContent = `${displayKey} (rel. ${relativeType})${confidenceIndicator}`;
        elements.toggleRelativeKey.title = `Switch back to ${transposedKey}`;
    } else {
        elements.songKey.textContent = displayKey + confidenceIndicator;
        const relativeKey = getRelativeKey(transposedKey);
        elements.toggleRelativeKey.title = `Switch to relative key (${relativeKey})`;
    }

    // Show easy key suggestion
    const easyKey = findEasyKey(state.currentSong);
    if (easyKey && easyKey.semitones !== state.transpose) {
        elements.easyKeySuggestion.textContent = `Easy key: ${easyKey.key}`;
        elements.easyKeySuggestion.title = `Transpose to ${easyKey.key} for easier chords`;
        elements.easyKeySuggestion.style.display = 'inline-flex';
        elements.easyKeySuggestion.dataset.semitones = easyKey.semitones;
    } else {
        elements.easyKeySuggestion.style.display = 'none';
    }
}

/**
 * Open chord modal with all variations
 */
function openChordModal(chordName) {
    const chordData = resolveChord(chordName);
    if (!chordData) return;

    elements.modalChord.innerHTML = '';

    // Get all variations for this chord (resolve slash chords to parent for variations)
    const lookupName = chordName.includes('/') && !CHORDS[chordName] ? chordName.split('/')[0] : chordName;
    const variations = getChordVariations(lookupName);
    const hasVariations = variations.length > 1;

    // Title with chord name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'chord-name modal-chord-title';
    const transposedKey = getDisplayKey();
    let modalDegree = getScaleDegree(chordName, transposedKey);
    if (modalDegree === '?' && state.showAsNumbers) {
        const isMinor = isMinorKey(transposedKey);
        const secondaryDom = detectSecondaryDominant(chordName, transposedKey, isMinor);
        if (secondaryDom) {
            modalDegree = secondaryDom.split(' ')[0];
        }
    }
    nameDiv.textContent = state.showAsNumbers
        ? `${modalDegree} (${chordName})`
        : chordName;
    elements.modalChord.appendChild(nameDiv);

    // First variation's play button, captured so tap-to-play can auto-trigger it
    let firstPlayBtn = null;

    if (hasVariations) {
        // Create a container for all variations
        const variationsContainer = document.createElement('div');
        variationsContainer.className = 'variations-container';

        variations.forEach((variation, index) => {
            const variationItem = document.createElement('div');
            variationItem.className = 'variation-item';
            if (index === 0) variationItem.classList.add('default');

            // Variation label
            const label = document.createElement('div');
            label.className = 'variation-label';
            label.textContent = variation.description || (index === 0 ? 'Default' : `Variation ${index}`);
            variationItem.appendChild(label);

            // SVG diagram
            const svg = createChordSVG(variation, true);
            variationItem.appendChild(svg);

            // Play button for this variation
            const playBtn = document.createElement('button');
            playBtn.className = 'chord-play-btn variation-play-btn';
            playBtn.innerHTML = '&#9654;';
            playBtn.title = 'Play this voicing';
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playChordArpeggio(variation);
                playBtn.classList.add('playing');
                setTimeout(() => playBtn.classList.remove('playing'), 400);
            });
            variationItem.appendChild(playBtn);
            if (index === 0) firstPlayBtn = playBtn;

            variationsContainer.appendChild(variationItem);
        });

        elements.modalChord.appendChild(variationsContainer);
    } else {
        // Single chord (no variations) - show as before
        const svg = createChordSVG(chordData, true);
        elements.modalChord.appendChild(svg);

        // Add play button for modal
        const playBtn = document.createElement('button');
        playBtn.className = 'chord-play-btn modal-play-btn';
        playBtn.innerHTML = '&#9654; Play';
        playBtn.title = 'Play chord';
        playBtn.addEventListener('click', () => {
            playChordArpeggio(chordData);
            playBtn.classList.add('playing');
            setTimeout(() => playBtn.classList.remove('playing'), 400);
        });
        elements.modalChord.appendChild(playBtn);
        firstPlayBtn = playBtn;
    }

    elements.modalOverlay.classList.add('active');

    // In tap-to-play mode, auto-play the first variation right away
    if (state.tapToPlayMode && firstPlayBtn) {
        firstPlayBtn.click();
    }
}

/**
 * Handle modal overlay click (close if clicking outside)
 */
function handleModalClose(e) {
    if (e.target === elements.modalOverlay) {
        closeModal();
    }
}

// ============================================
// Chord Finder Feature
// ============================================

// State for chord finder: [G, C, E, A] - null means unset, 0 = open, -1 = muted, 1-12 = fret
// Default to all open strings (shows C6 chord initially)
let chordFinderState = [0, 0, 0, 0];
let chordFinderFlipped = true; // true = A-E-C-G (high to low), false = G-C-E-A
let chordFinderRendered = false;

/**
 * Initialize and render the chord finder fretboard
 */
function renderChordFinder() {
    if (!elements.fretboardWrapper) return;

    elements.fretboardWrapper.innerHTML = '';

    const svg = createFretboardSVG(chordFinderState, {
        onFretClick: handleChordFinderFretClick,
        onOpenClick: handleChordFinderOpenClick
    }, chordFinderFlipped);

    elements.fretboardWrapper.appendChild(svg);

    // Update result display
    updateChordFinderResult();

    // Update play button state
    updateChordFinderPlayButton();
}

/**
 * Handle fret click in chord finder
 * @param {number} stringIndex - String index (0=G, 1=C, 2=E, 3=A)
 * @param {number} fret - Fret number (1-12)
 */
function handleChordFinderFretClick(stringIndex, fret) {
    // Toggle: if same fret is clicked, set to open; otherwise set the fret
    if (chordFinderState[stringIndex] === fret) {
        chordFinderState[stringIndex] = 0; // Back to open
    } else {
        chordFinderState[stringIndex] = fret;
    }
    renderChordFinder();
}

/**
 * Handle open/muted click in chord finder
 * Cycles through: 0 (open) <-> -1 (muted)
 * @param {number} stringIndex - String index (0=G, 1=C, 2=E, 3=A)
 */
function handleChordFinderOpenClick(stringIndex) {
    const current = chordFinderState[stringIndex];
    if (current === -1) {
        // Muted -> Open
        chordFinderState[stringIndex] = 0;
    } else {
        // Open or fretted -> Muted
        chordFinderState[stringIndex] = -1;
    }
    renderChordFinder();
}

/**
 * Clear all chord finder selections (reset to all open)
 */
function clearChordFinder() {
    chordFinderState = [0, 0, 0, 0];
    renderChordFinder();
}

/**
 * Update the chord finder result display
 */
function updateChordFinderResult() {
    if (!elements.chordFinderResult) return;

    elements.chordFinderResult.innerHTML = '';

    // Check if any fret is set
    const hasInput = chordFinderState.some(f => f !== null);
    if (!hasInput) {
        const text = document.createElement('span');
        text.className = 'chord-finder-result-text';
        text.textContent = 'Click on the fretboard to find a chord';
        elements.chordFinderResult.appendChild(text);
        return;
    }

    // Calculate and display notes being played
    const openStrings = [7, 0, 4, 9]; // G, C, E, A in semitones from C
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const stringNames = ['G', 'C', 'E', 'A'];

    const notesSection = document.createElement('div');
    notesSection.className = 'chord-finder-section chord-finder-notes';

    const notesLabel = document.createElement('span');
    notesLabel.className = 'chord-finder-section-label';
    notesLabel.textContent = 'Notes:';
    notesSection.appendChild(notesLabel);

    const notesDisplay = document.createElement('div');
    notesDisplay.className = 'chord-finder-notes-display';

    for (let i = 0; i < 4; i++) {
        const fret = chordFinderState[i];
        const noteSpan = document.createElement('span');
        noteSpan.className = 'chord-finder-note';

        if (fret === null || fret === -1) {
            noteSpan.textContent = `${stringNames[i]}: ×`;
            noteSpan.classList.add('muted');
        } else {
            const semitone = (openStrings[i] + fret) % 12;
            const noteName = noteNames[semitone];
            noteSpan.textContent = `${stringNames[i]}: ${noteName}`;
        }
        notesDisplay.appendChild(noteSpan);
    }
    notesSection.appendChild(notesDisplay);
    elements.chordFinderResult.appendChild(notesSection);

    // Find matching chords from library
    const libraryMatches = findChordByFrets(chordFinderState);

    // Compute chords from music theory (show all computed matches)
    const computedMatches = computeChordFromFrets(chordFinderState);

    // Show library matches
    if (libraryMatches.length > 0) {
        const librarySection = document.createElement('div');
        librarySection.className = 'chord-finder-section';

        const libraryLabel = document.createElement('span');
        libraryLabel.className = 'chord-finder-section-label';
        libraryLabel.textContent = 'From Library:';
        librarySection.appendChild(libraryLabel);

        const libraryChips = document.createElement('div');
        libraryChips.className = 'chord-finder-chips';
        libraryMatches.forEach(chordName => {
            const chip = document.createElement('button');
            chip.className = 'chord-finder-match';
            chip.textContent = chordName;
            chip.addEventListener('click', () => {
                openChordModal(chordName);
            });
            libraryChips.appendChild(chip);
        });
        librarySection.appendChild(libraryChips);
        elements.chordFinderResult.appendChild(librarySection);
    }

    // Show computed matches (all of them, even if also in library)
    if (computedMatches.length > 0) {
        const computedSection = document.createElement('div');
        computedSection.className = 'chord-finder-section';

        const computedLabel = document.createElement('span');
        computedLabel.className = 'chord-finder-section-label';
        computedLabel.textContent = 'Computed:';
        computedSection.appendChild(computedLabel);

        const computedChips = document.createElement('div');
        computedChips.className = 'chord-finder-chips';
        computedMatches.forEach(chordName => {
            const chip = document.createElement('button');
            chip.className = 'chord-finder-match chord-finder-match-computed';
            chip.textContent = chordName;
            // Try to open modal for base chord (without slash)
            const baseChord = chordName.split('/')[0];
            if (CHORDS[baseChord]) {
                chip.addEventListener('click', () => {
                    openChordModal(baseChord);
                });
            } else {
                chip.classList.add('no-diagram');
            }
            computedChips.appendChild(chip);
        });
        computedSection.appendChild(computedChips);
        elements.chordFinderResult.appendChild(computedSection);
    }

    // No matches at all
    if (libraryMatches.length === 0 && computedMatches.length === 0) {
        const text = document.createElement('span');
        text.className = 'chord-finder-no-match';
        text.textContent = 'No matching chord found';
        elements.chordFinderResult.appendChild(text);
    }
}

/**
 * Update play button enabled state
 */
function updateChordFinderPlayButton() {
    if (!elements.chordFinderPlay) return;

    // Enable play button only if at least one string has a value
    const hasInput = chordFinderState.some(f => f !== null && f >= 0);
    elements.chordFinderPlay.disabled = !hasInput;
}

/**
 * Play the current chord finder fingering
 */
function playChordFinderChord() {
    // Create a temporary chord data object for playback
    const frets = chordFinderState.map(f => f === null ? -1 : f);

    // Check if we have at least one playable string
    const hasPlayableString = frets.some(f => f >= 0);
    if (!hasPlayableString) return;

    // Create chord data structure for audio playback
    const tempChord = {
        name: 'Custom',
        frets: frets,
        fingers: [0, 0, 0, 0], // Not needed for playback
        barre: null,
        baseFret: 1
    };

    playChordArpeggio(tempChord);

    // Visual feedback
    elements.chordFinderPlay.classList.add('playing');
    setTimeout(() => elements.chordFinderPlay.classList.remove('playing'), 400);
}

/**
 * Flip the fretboard string order (A-E-C-G ↔ G-C-E-A)
 */
function flipChordFinder() {
    chordFinderFlipped = !chordFinderFlipped;
    renderChordFinder();
}

/**
 * Setup chord finder event listeners
 */
function setupChordFinderListeners() {
    if (elements.chordFinderClear) {
        elements.chordFinderClear.addEventListener('click', clearChordFinder);
    }
    if (elements.chordFinderPlay) {
        elements.chordFinderPlay.addEventListener('click', playChordFinderChord);
    }
    if (elements.chordFinderFlip) {
        elements.chordFinderFlip.addEventListener('click', flipChordFinder);
    }

    // Render chord finder when the details element is opened
    const chordFinderDetails = document.getElementById('chord-finder');
    if (chordFinderDetails) {
        chordFinderDetails.addEventListener('toggle', () => {
            if (chordFinderDetails.open && !chordFinderRendered) {
                renderChordFinder();
                chordFinderRendered = true;
            }
        });
    }
}

// ============================================
// Chord Melody
// ============================================

// Which chord the voicings are built on, and which melody note sits on top.
// melodyPick is {stringIndex, fret} - the spot the player tapped, which resolves
// to one exact pitch. null means nothing picked yet.
let chordMelodyChord = null;
let chordMelodyPick = null;
let chordMelodyFlipped = true;   // true = A-E-C-G (high to low), matching Chord Finder
let chordMelodyRendered = false;
let chordMelodySongTitle = null;
let chordMelodyEasyMode = false;

/**
 * Render the whole Chord Melody section: chord chips, fretboard, results.
 */
function renderChordMelody() {
    if (!elements.chordMelodyChords) return;

    // A melody note picked for one song means nothing in the next one. Transposing
    // is different - the pitch you tapped is still that pitch - so the pick only
    // resets when the song itself changes.
    const title = state.currentSong ? state.currentSong.title : null;
    if (title !== chordMelodySongTitle) {
        chordMelodySongTitle = title;
        chordMelodyPick = null;
        chordMelodyChord = null;
    }

    renderChordMelodyChords();
    renderChordMelodyFretboard();
    renderChordMelodyResult();
}

/**
 * Chord chips - the chords actually used in the current song, in the current key.
 */
function renderChordMelodyChords() {
    elements.chordMelodyChords.innerHTML = '';
    if (!state.currentSong) return;

    const chords = getUsedChords();

    // Keep the selection across transposes/song changes only if it still applies
    if (chordMelodyChord && !chords.includes(chordMelodyChord)) {
        chordMelodyChord = null;
    }
    if (!chordMelodyChord && chords.length > 0) {
        chordMelodyChord = chords[0];
    }

    chords.forEach(chord => {
        const chip = document.createElement('button');
        chip.className = 'chord-melody-chip';
        chip.textContent = chord;
        if (chord === chordMelodyChord) chip.classList.add('selected');
        chip.addEventListener('click', () => {
            chordMelodyChord = chord;
            renderChordMelody();
        });
        elements.chordMelodyChords.appendChild(chip);
    });
}

/**
 * The pick fretboard. Only the tapped note is marked, so the board reads as
 * "choose a note" rather than "build a shape" like the Chord Finder does.
 */
function renderChordMelodyFretboard() {
    elements.chordMelodyFretboard.innerHTML = '';

    const fretState = [null, null, null, null];
    if (chordMelodyPick) {
        fretState[chordMelodyPick.stringIndex] = chordMelodyPick.fret;
    }

    const svg = createFretboardSVG(fretState, {
        onFretClick: (stringIndex, fret) => selectChordMelodyNote(stringIndex, fret),
        onOpenClick: (stringIndex) => selectChordMelodyNote(stringIndex, 0)
    }, chordMelodyFlipped);

    elements.chordMelodyFretboard.appendChild(svg);
}

/**
 * Pick a melody note. Tapping the same spot again clears it.
 */
function selectChordMelodyNote(stringIndex, fret) {
    if (chordMelodyPick && chordMelodyPick.stringIndex === stringIndex && chordMelodyPick.fret === fret) {
        chordMelodyPick = null;
    } else {
        chordMelodyPick = { stringIndex, fret };
    }
    renderChordMelody();
}

function clearChordMelodyNote() {
    chordMelodyPick = null;
    renderChordMelody();
}

function flipChordMelody() {
    chordMelodyFlipped = !chordMelodyFlipped;
    renderChordMelodyFretboard();
}

function toggleChordMelodyEasyMode() {
    chordMelodyEasyMode = elements.chordMelodyEasy.checked;
    renderChordMelodyResult();
}

/**
 * Render the voicings for the current chord + melody note, or explain why there
 * are none. The explanation is the teaching moment, so it gets real prose rather
 * than an empty-results shrug.
 */
function renderChordMelodyResult() {
    const container = elements.chordMelodyResult;
    container.innerHTML = '';

    if (!state.currentSong) {
        container.appendChild(chordMelodyMessage('Pick a song first, then come back to build melody voicings from its chords.'));
        return;
    }
    if (!chordMelodyChord) {
        container.appendChild(chordMelodyMessage('This song has no chords to work with yet.'));
        return;
    }
    if (!chordMelodyPick) {
        container.appendChild(chordMelodyMessage(
            `Tap a note on the fretboard above to see how to play it on top of ${chordMelodyChord}.`
        ));
        return;
    }

    // Spell the note to match the song: flat keys get flats, sharp keys get sharps
    const useFlats = chordMelodyChord.includes('b') || getDisplayKey().includes('b');
    const melodyMidi = fretToMidi(chordMelodyPick.stringIndex, chordMelodyPick.fret);
    const melodyName = midiToNoteName(melodyMidi, useFlats);
    const stringNames = ['G', 'C', 'E', 'A'];
    const pickedWhere = chordMelodyPick.fret === 0
        ? `the open ${stringNames[chordMelodyPick.stringIndex]} string`
        : `${stringNames[chordMelodyPick.stringIndex]} string, fret ${chordMelodyPick.fret}`;

    // In easy mode the whole list is restricted to shapes two fingers can hold,
    // which means allowing shells - see the Easy versions section below.
    const voicings = chordMelodyEasyMode
        ? findMelodyVoicings(chordMelodyChord, melodyName, { limit: 6, maxFingers: 2, shell: true })
        : findMelodyVoicings(chordMelodyChord, melodyName, { limit: 6 });

    // Heading: what was asked for
    const heading = document.createElement('div');
    heading.className = 'chord-melody-heading';
    heading.innerHTML = `<strong>${escapeHtml(chordMelodyChord)}</strong> with ` +
        `<strong class="chord-melody-note">${escapeHtml(melodyName)}</strong> on top ` +
        `<span class="chord-melody-picked">(you tapped ${escapeHtml(pickedWhere)})</span>`;
    container.appendChild(heading);

    if (voicings.length === 0) {
        // Easy mode finding nothing is different from the chord being impossible:
        // fall back to the full shapes rather than implying there is no way to play it
        if (chordMelodyEasyMode) {
            const full = findMelodyVoicings(chordMelodyChord, melodyName, { limit: 6 });
            if (full.length > 0) {
                const note = document.createElement('div');
                note.className = 'chord-melody-empty';
                note.textContent = `There is no two-finger way to put ${melodyName} on top of ` +
                    `${chordMelodyChord} - not even a stripped-down one. Showing the full shapes instead.`;
                container.appendChild(note);
                renderChordMelodyVoicingList(container, full, melodyName,
                    full.length === 1 ? '1 full voicing:' : `${full.length} full voicings, easiest first:`);
                return;
            }
        }
        const why = explainNoVoicings(chordMelodyChord, melodyName);
        const box = document.createElement('div');
        box.className = 'chord-melody-empty';
        box.textContent = why.message || 'No playable voicing for this combination.';
        container.appendChild(box);
        return;
    }

    // What the melody note is doing in this chord - chord tone or colour
    const first = voicings[0];
    const role = document.createElement('div');
    role.className = 'chord-melody-role';
    role.textContent = first.melodyIsChordTone
        ? `${melodyName} is the ${chordMelodyDegreeName(first.melodyDegree)} of ${chordMelodyChord}.`
        : `${melodyName} is not in ${chordMelodyChord} - it sounds as the ${chordMelodyDegreeName(first.melodyDegree)}, ` +
          `a passing tone. The rest of the shape stays on chord tones.`;
    container.appendChild(role);

    const label = chordMelodyEasyMode
        ? (voicings.length === 1 ? '1 two-finger voicing:' : `${voicings.length} two-finger voicings, easiest first:`)
        : (voicings.length === 1 ? '1 playable voicing:' : `${voicings.length} playable voicings, easiest first:`);
    renderChordMelodyVoicingList(container, voicings, melodyName, label);

    // Outside easy mode, if nothing in the list is holdable with two fingers, offer
    // one that is. This is the answer to "three or four fingers is a stretch in
    // weird positions" - it strips the chord to its defining tones rather than
    // giving up, and says plainly what it dropped.
    if (!chordMelodyEasyMode && !voicings.some(v => v.fingerCount <= 2)) {
        const easy = findEasiestVoicing(chordMelodyChord, melodyName);
        if (easy) renderChordMelodyEasyOption(container, easy, melodyName);
    }
}

/**
 * A labelled grid of voicing cards.
 */
function renderChordMelodyVoicingList(container, voicings, melodyName, label) {
    const count = document.createElement('div');
    count.className = 'chord-melody-count';
    count.textContent = label;
    container.appendChild(count);

    const grid = document.createElement('div');
    grid.className = 'chord-melody-voicings';
    voicings.forEach(voicing => grid.appendChild(createChordMelodyCard(voicing, melodyName)));
    container.appendChild(grid);
}

/**
 * The appended easy option. A 'solid' shell still stands on its own, so it is
 * presented as a normal alternative; a 'fragment' is a two-note double stop that
 * needs the surrounding harmony, so it is visually demoted and says so.
 */
function renderChordMelodyEasyOption(container, easy, melodyName) {
    const isFragment = easy.easyTier === 'fragment';

    const heading = document.createElement('div');
    heading.className = 'chord-melody-count chord-melody-easy-heading';
    if (isFragment) heading.classList.add('is-fragment');
    heading.textContent = isFragment
        ? 'Last resort - needs the harmony around it:'
        : 'Easiest way to play it:';
    container.appendChild(heading);

    const why = document.createElement('div');
    why.className = 'chord-melody-easy-why';
    const dropped = [];
    if (!easy.hasRoot) dropped.push(`the root (${easy.chord.match(/^[A-G][#b]?/)[0]})`);
    if (easy.noteCount < 4) dropped.push(`${4 - easy.noteCount} note${easy.noteCount === 3 ? '' : 's'}`);
    why.textContent = isFragment
        ? `Only two notes: the melody plus the one tone that says ${easy.chord}. Fine while the ` +
          `rest of the harmony is sounding around you, ambiguous on its own.`
        : `Same chord, ${easy.fingerCount} finger${easy.fingerCount === 1 ? '' : 's'}` +
          (dropped.length ? ` - drops ${dropped.join(' and ')}, keeps what makes it ${easy.chord}.` : '.');
    container.appendChild(why);

    const grid = document.createElement('div');
    grid.className = 'chord-melody-voicings';
    const card = createChordMelodyCard(easy, melodyName);
    card.classList.add('is-easy-option');
    if (isFragment) card.classList.add('is-fragment');
    grid.appendChild(card);
    container.appendChild(grid);
}

/**
 * One voicing: diagram with the melody note ringed, the notes low to high, what
 * makes it easy or awkward, and a play button that emphasises the top note.
 */
function createChordMelodyCard(voicing, melodyName) {
    const card = document.createElement('div');
    card.className = 'chord-melody-card';

    const svg = createChordSVG(voicing, true);
    card.appendChild(svg);

    // Notes in pitch order, melody last and highlighted - reading the chord the way
    // it actually sounds, which on a re-entrant uke is not left-to-right
    const order = voicing.midis
        .map((midi, stringIndex) => ({ midi, stringIndex }))
        .filter(n => n.midi !== null)
        .sort((a, b) => a.midi - b.midi);

    const notes = document.createElement('div');
    notes.className = 'chord-melody-card-notes';
    order.forEach(({ stringIndex }) => {
        const span = document.createElement('span');
        span.className = 'chord-melody-card-note';
        if (stringIndex === voicing.melodyString) span.classList.add('is-melody');
        span.textContent = voicing.notes[stringIndex];
        span.title = `${['G', 'C', 'E', 'A'][stringIndex]} string - ${voicing.degrees[stringIndex]}`;
        notes.appendChild(span);
    });
    card.appendChild(notes);

    const melodyOn = document.createElement('div');
    melodyOn.className = 'chord-melody-card-melody';
    melodyOn.textContent = `${melodyName} on the ${['G', 'C', 'E', 'A'][voicing.melodyString]} string`;
    card.appendChild(melodyOn);

    // Badges: the honest cost of the shape
    const badges = document.createElement('div');
    badges.className = 'chord-melody-badges';
    chordMelodyBadges(voicing).forEach(({ text, kind }) => {
        const badge = document.createElement('span');
        badge.className = `chord-melody-badge chord-melody-badge-${kind}`;
        badge.textContent = text;
        badges.appendChild(badge);
    });
    card.appendChild(badges);

    const play = document.createElement('button');
    play.className = 'chord-melody-play';
    play.innerHTML = '&#9654; Play melody';
    play.title = 'Hear the chord with the melody note on top';
    play.addEventListener('click', () => {
        playChordMelody(voicing);
        play.classList.add('playing');
        setTimeout(() => play.classList.remove('playing'), 500);
    });
    card.appendChild(play);

    return card;
}

/**
 * Short, honest labels for what a voicing costs to play.
 */
function chordMelodyBadges(voicing) {
    const badges = [];

    if (voicing.fingerCount === 0) {
        badges.push({ text: 'all open', kind: 'good' });
    } else {
        badges.push({ text: `${voicing.fingerCount} finger${voicing.fingerCount === 1 ? '' : 's'}`, kind: 'neutral' });
    }
    if (voicing.barre) badges.push({ text: 'barre', kind: 'neutral' });
    if (voicing.span >= 3) badges.push({ text: `${voicing.span}-fret stretch`, kind: 'warn' });

    voicing.mutedStrings.forEach(stringIndex => {
        const name = ['G', 'C', 'E', 'A'][stringIndex];
        const kind = (stringIndex === 1 || stringIndex === 2) ? 'warn' : 'neutral';
        badges.push({ text: `mute ${name}`, kind });
    });

    if (voicing.warnings.includes('melody-doubled-in-unison')) {
        badges.push({ text: 'melody doubled', kind: 'warn' });
    }
    if (!voicing.melodyIsChordTone) {
        badges.push({ text: `melody is the ${voicing.melodyDegree}`, kind: 'neutral' });
    }

    // Shell voicings: be explicit about what was given up to make it easy
    if (voicing.isShell) {
        if (voicing.noteCount === 2) {
            badges.push({ text: '2 notes only', kind: 'warn' });
        }
        if (!voicing.hasRoot) {
            badges.push({ text: 'no root', kind: 'warn' });
        }
    }

    return badges;
}

/**
 * Spell a degree label as words a learner can read.
 */
function chordMelodyDegreeName(degree) {
    const names = {
        'R': 'root', 'b3': 'minor 3rd', '3': 'major 3rd', '5': '5th', 'b5': 'flat 5th',
        '#5': 'sharp 5th', '6': '6th', 'b7': 'flat 7th', '7': 'major 7th',
        '9': '9th', 'b9': 'flat 9th', '11': '11th', '4': '4th', 'bb7': 'diminished 7th'
    };
    return names[degree] || degree;
}

function chordMelodyMessage(text) {
    const div = document.createElement('div');
    div.className = 'chord-melody-hint';
    div.textContent = text;
    return div;
}

/**
 * Setup chord melody event listeners
 */
function setupChordMelodyListeners() {
    if (elements.chordMelodyClear) {
        elements.chordMelodyClear.addEventListener('click', clearChordMelodyNote);
    }
    if (elements.chordMelodyFlip) {
        elements.chordMelodyFlip.addEventListener('click', flipChordMelody);
    }
    if (elements.chordMelodyEasy) {
        elements.chordMelodyEasy.addEventListener('change', toggleChordMelodyEasyMode);
    }

    // Render lazily, the same way the Chord Finder does
    if (elements.chordMelodySection) {
        elements.chordMelodySection.addEventListener('toggle', () => {
            if (elements.chordMelodySection.open && !chordMelodyRendered) {
                renderChordMelody();
                chordMelodyRendered = true;
            }
        });
    }
}

// ============================================
// Chord Hover Tooltip
// ============================================

/**
 * Show chord tooltip on hover
 * @param {string} chordName - The chord name to display
 * @param {MouseEvent} event - The mouse event for positioning
 */
function showChordTooltip(chordName, event) {
    const tooltip = document.getElementById('chord-tooltip');
    const chordData = resolveChord(chordName);

    if (!chordData || !tooltip) return;

    // Build tooltip content
    tooltip.innerHTML = `
        <div class="tooltip-chord-name">${chordName}</div>
        ${createChordSVG(chordData, false).outerHTML}
    `;

    // Position near the chord marker
    const rect = event.target.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 8;

    // Tooltip dimensions (approximate, will be corrected after render)
    const tooltipWidth = 86; // 70px SVG + 16px padding
    const tooltipHeight = 130; // 100px SVG + label + padding

    // Ensure tooltip stays within viewport horizontally
    if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 10;
    }
    if (left < 10) {
        left = 10;
    }

    // If tooltip would go below viewport, show it above the chord instead
    if (top + tooltipHeight > window.innerHeight) {
        top = rect.top - tooltipHeight - 8;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    tooltip.classList.add('visible');
}

/**
 * Hide the chord tooltip
 */
function hideChordTooltip() {
    const tooltip = document.getElementById('chord-tooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
