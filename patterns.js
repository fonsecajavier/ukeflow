/**
 * UkeFlow - Patterns Module
 * Play styles for ukulele - Strums and Arpeggios
 */

// Tempo settings
let currentBPM = 120;

/**
 * Get beat duration based on current tempo
 */
function getBeat() {
    return 60 / currentBPM;
}

/**
 * Play styles for ukulele - Strums and Arpeggios
 *
 * Strums: 'D' = down, 'U' = up, 'x' = muted chunk
 * Arpeggios: Array of string indices (0=G, 1=C, 2=E, 3=A) or arrays for simultaneous
 */
const PLAY_STYLES = {
    strums: {
        label: 'Strums',
        patterns: {
            'strum-down': {
                name: 'Down Strums',
                type: 'strum',
                // Simple quarter notes: 1, 2, 3, 4 (beat multipliers)
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'D', beat: 1 },
                    { dir: 'D', beat: 2 },
                    { dir: 'D', beat: 3 }
                ]
            },
            'strum-island': {
                name: 'Island Strum',
                type: 'strum',
                // D  D  U  U  D  U  pattern: 1, 2, 2+, 3+, 4, 4+
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'D', beat: 1 },
                    { dir: 'U', beat: 1.5 },
                    { dir: 'U', beat: 2.5 },
                    { dir: 'D', beat: 3 },
                    { dir: 'U', beat: 3.5 }
                ]
            },
            'strum-basic': {
                name: 'Basic (D-U-D-U)',
                type: 'strum',
                // Eighth notes
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'U', beat: 0.5 },
                    { dir: 'D', beat: 1 },
                    { dir: 'U', beat: 1.5 },
                    { dir: 'D', beat: 2 },
                    { dir: 'U', beat: 2.5 },
                    { dir: 'D', beat: 3 },
                    { dir: 'U', beat: 3.5 }
                ]
            },
            'strum-rock': {
                name: 'Rock (D-D-U-D)',
                type: 'strum',
                // Driving: 1, 2, 2+, 3, repeat
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'D', beat: 1 },
                    { dir: 'U', beat: 1.5 },
                    { dir: 'D', beat: 2 },
                    { dir: 'D', beat: 3 },
                    { dir: 'U', beat: 3.5 }
                ]
            },
            'strum-calypso': {
                name: 'Calypso',
                type: 'strum',
                // Syncopated: 1, 1+, 2+, 3, 3+, 4+
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'U', beat: 0.5 },
                    { dir: 'U', beat: 1.5 },
                    { dir: 'D', beat: 2 },
                    { dir: 'U', beat: 2.5 },
                    { dir: 'U', beat: 3.5 }
                ]
            },
            'strum-chunk': {
                name: 'Chunk (D-x-U-x)',
                type: 'strum',
                // Percussive with mutes
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'x', beat: 0.5 },
                    { dir: 'U', beat: 1 },
                    { dir: 'x', beat: 1.5 },
                    { dir: 'D', beat: 2 },
                    { dir: 'x', beat: 2.5 },
                    { dir: 'U', beat: 3 },
                    { dir: 'x', beat: 3.5 }
                ]
            },
            'strum-reggae-chunk': {
                name: 'Reggae Chunk',
                type: 'strum',
                // Off-beat emphasis with chunks: x-U-x-U
                pattern: [
                    { dir: 'x', beat: 0 },
                    { dir: 'U', beat: 0.5 },
                    { dir: 'x', beat: 1 },
                    { dir: 'U', beat: 1.5 },
                    { dir: 'x', beat: 2 },
                    { dir: 'U', beat: 2.5 },
                    { dir: 'x', beat: 3 },
                    { dir: 'U', beat: 3.5 }
                ]
            },
            'strum-ska': {
                name: 'Ska Upstroke',
                type: 'strum',
                // Ska style: x on beat, U on off-beat
                pattern: [
                    { dir: 'x', beat: 0 },
                    { dir: 'U', beat: 0.5 },
                    { dir: 'x', beat: 1 },
                    { dir: 'U', beat: 1.5 },
                    { dir: 'x', beat: 2 },
                    { dir: 'U', beat: 2.5 },
                    { dir: 'x', beat: 3 },
                    { dir: 'U', beat: 3.5 }
                ]
            },
            'strum-funky': {
                name: 'Funky Chunk',
                type: 'strum',
                // Syncopated funk: D-x-D-U-x-U
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'x', beat: 0.5 },
                    { dir: 'D', beat: 1 },
                    { dir: 'U', beat: 1.5 },
                    { dir: 'x', beat: 2 },
                    { dir: 'U', beat: 2.5 },
                    { dir: 'D', beat: 3 },
                    { dir: 'x', beat: 3.5 }
                ]
            },
            'strum-bossa': {
                name: 'Bossa Nova',
                type: 'strum',
                // Brazilian feel: D-x-D-U-D-x
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'x', beat: 0.75 },
                    { dir: 'D', beat: 1.5 },
                    { dir: 'U', beat: 2 },
                    { dir: 'D', beat: 2.5 },
                    { dir: 'x', beat: 3.25 }
                ]
            },
            'strum-shuffle': {
                name: 'Shuffle',
                type: 'strum',
                // Swing feel with chunks
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'x', beat: 0.67 },
                    { dir: 'D', beat: 1 },
                    { dir: 'x', beat: 1.67 },
                    { dir: 'D', beat: 2 },
                    { dir: 'x', beat: 2.67 },
                    { dir: 'D', beat: 3 },
                    { dir: 'x', beat: 3.67 }
                ]
            },
            'strum-latin': {
                name: 'Latin Fire',
                type: 'strum',
                // Energetic Latin: D-D-x-U-x-U-D-x
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'D', beat: 0.5 },
                    { dir: 'x', beat: 1 },
                    { dir: 'U', beat: 1.5 },
                    { dir: 'x', beat: 2 },
                    { dir: 'U', beat: 2.5 },
                    { dir: 'D', beat: 3 },
                    { dir: 'x', beat: 3.5 }
                ]
            },
            'strum-flamenco': {
                name: 'Flamenco',
                type: 'strum',
                // Passionate flamenco: D-x-x-U-D-U-x-D
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'x', beat: 0.33 },
                    { dir: 'x', beat: 0.67 },
                    { dir: 'U', beat: 1 },
                    { dir: 'D', beat: 1.5 },
                    { dir: 'U', beat: 2 },
                    { dir: 'x', beat: 2.5 },
                    { dir: 'D', beat: 3 }
                ]
            },
            'strum-waltz': {
                name: 'Waltz (3/4)',
                type: 'strum',
                // 3/4 time: strong 1, soft 2, soft 3
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'D', beat: 1 },
                    { dir: 'D', beat: 2 }
                ]
            },
            'strum-reggae': {
                name: 'Reggae Skank',
                type: 'strum',
                // Off-beat emphasis: +, 2+, +, 4+
                pattern: [
                    { dir: 'x', beat: 0.5 },
                    { dir: 'U', beat: 1.5 },
                    { dir: 'x', beat: 2.5 },
                    { dir: 'U', beat: 3.5 }
                ]
            },
            'strum-merengue': {
                name: 'Merengue',
                type: 'strum',
                // Fast 2/4 feel: D-U-x-U repeated, driving rhythm
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'U', beat: 0.25 },
                    { dir: 'x', beat: 0.5 },
                    { dir: 'U', beat: 0.75 },
                    { dir: 'D', beat: 1 },
                    { dir: 'U', beat: 1.25 },
                    { dir: 'x', beat: 1.5 },
                    { dir: 'U', beat: 1.75 },
                    { dir: 'D', beat: 2 },
                    { dir: 'U', beat: 2.25 },
                    { dir: 'x', beat: 2.5 },
                    { dir: 'U', beat: 2.75 },
                    { dir: 'D', beat: 3 },
                    { dir: 'U', beat: 3.25 },
                    { dir: 'x', beat: 3.5 },
                    { dir: 'U', beat: 3.75 }
                ]
            },
            'strum-salsa': {
                name: 'Salsa',
                type: 'strum',
                // Montuno-style: syncopated with clave feel
                pattern: [
                    { dir: 'D', beat: 0 },
                    { dir: 'x', beat: 0.5 },
                    { dir: 'U', beat: 1 },
                    { dir: 'D', beat: 1.5 },
                    { dir: 'x', beat: 2 },
                    { dir: 'U', beat: 2.5 },
                    { dir: 'x', beat: 3 },
                    { dir: 'D', beat: 3.5 }
                ]
            }
        }
    },
    arpeggios: {
        label: 'Arpeggios',
        patterns: {
            'arp-down': {
                name: 'Down Roll',
                type: 'arpeggio',
                pattern: [0, 1, 2, 3],
                delay: 0.08
            },
            'arp-up': {
                name: 'Up Roll',
                type: 'arpeggio',
                pattern: [3, 2, 1, 0],
                delay: 0.08
            },
            'arp-pinch': {
                name: 'Pinch & Roll',
                type: 'arpeggio',
                pattern: [[0, 3], 1, 2, 1],
                delay: 0.12
            },
            'arp-travis': {
                name: 'Travis Pick',
                type: 'arpeggio',
                pattern: [0, 2, 1, 3, 0, 2, 1, 2],
                delay: 0.1
            },
            'arp-pimi': {
                name: 'Fingerpick (p-i-m-i)',
                type: 'arpeggio',
                pattern: [0, 2, 3, 2],
                delay: 0.12
            },
            'arp-pima': {
                name: 'Fingerpick (p-i-m-a)',
                type: 'arpeggio',
                pattern: [0, 2, 3, 1],
                delay: 0.12
            },
            'arp-campanella': {
                name: 'Campanella',
                type: 'arpeggio',
                pattern: [0, 3, 1, 2, 0, 2, 1, 3],
                delay: 0.09
            },
            'arp-classical': {
                name: 'Classical',
                type: 'arpeggio',
                // p-i-m-a-m-i pattern
                pattern: [0, 2, 3, 1, 3, 2],
                delay: 0.1
            },
            'arp-waltz': {
                name: 'Waltz Arpeggio',
                type: 'arpeggio',
                // Bass then chord roll (3/4 feel)
                pattern: [0, [1, 2, 3], [1, 2, 3]],
                delay: 0.15
            },
            'arp-folk': {
                name: 'Folk Pattern',
                type: 'arpeggio',
                // Alternating bass with melody
                pattern: [0, 3, 1, 3, 0, 2, 1, 2],
                delay: 0.1
            },
            'arp-tremolo': {
                name: 'Tremolo',
                type: 'arpeggio',
                // Rapid repeated high string
                pattern: [0, 3, 3, 3, 0, 3, 3, 3],
                delay: 0.06
            },
            'arp-cascade': {
                name: 'Cascade',
                type: 'arpeggio',
                // Flowing waterfall pattern
                pattern: [0, 1, 2, 3, 2, 1, 0, 1],
                delay: 0.08
            },
            'arp-spanish': {
                name: 'Spanish Roll',
                type: 'arpeggio',
                // Rasgueado-inspired
                pattern: [3, 2, 1, 0, [0, 1, 2, 3]],
                delay: 0.07
            },
            'arp-jazz': {
                name: 'Jazz Comp',
                type: 'arpeggio',
                // Jazz comping style
                pattern: [[0, 3], 2, [1, 3], 2],
                delay: 0.12
            },
            'arp-island': {
                name: 'Island Roll',
                type: 'arpeggio',
                // Hawaiian style
                pattern: [0, 2, 3, 2, 1, 2, 3, 2],
                delay: 0.09
            },
            'arp-good-riddance': {
                name: 'Good Riddance',
                type: 'arpeggio',
                // Classic fingerpicking: G-E-C-A-C-E-C-A (thumb on G, then alternating)
                pattern: [0, 2, 1, 3, 1, 2, 1, 3],
                delay: 0.12
            }
        }
    }
};

// Current selected play style
let currentPlayStyle = 'arp-down';

/**
 * Get a play style config by key
 */
function getPlayStyle(key) {
    for (const group of Object.values(PLAY_STYLES)) {
        if (group.patterns[key]) {
            return group.patterns[key];
        }
    }
    return PLAY_STYLES.strums.patterns['strum-down'];
}
