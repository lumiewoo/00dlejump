class MusicalDoodleJump {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.statusElement = document.getElementById('status');
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
        
        this.player = {
            x: window.innerWidth / 2,
            y: window.innerHeight - 100,
            width: 20,
            height: 20,
            vx: 0,
            vy: 0,
            onGround: false
        };
        
        this.platforms = [];
        this.gravity = 0.3;
        this.jumpPower = -8;
        this.moveSpeed = 3;
        
        // 4 different jump heights
        this.jumpHeights = [-6, -8, -10, -12];
        this.cameraY = 0;
        this.isPaused = false;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.musicBuffer = [];
        this.bufferStartTime = 0;
        this.gameStartTime = performance.now();
        
        this.selectedKey = 'C';
        this.selectedScale = 'major';
        // Select random instrument on load
        const instruments = ['sine', 'piano', 'supersaw', 'pad', 'brass', 'flute'];
        this.selectedSound = instruments[Math.floor(Math.random() * instruments.length)];
        this.selectedMode = 'single';
        this.arpEnabled = false;
        this.selectedPattern = 'random';
        this.bpm = 120;
        this.quantizeEnabled = true; // Default to enabled
        this.lastQuantizedBeat = 0;
        
        // Random volume levels
        this.volumeLevels = [0.25, 0.5, 0.75, 1.0];
        
        // Platform colors by note function
        this.noteColors = {};
        
        this.scales = {
            major: [0, 2, 4, 5, 7, 9, 11, 12],
            minor: [0, 2, 3, 5, 7, 8, 10, 12],
            pentatonic: [0, 2, 4, 7, 9, 12],
            blues: [0, 3, 5, 6, 7, 10, 12],
            chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        };
        
        this.keyOffsets = {
            'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
            'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
        };
        
        this.updateNotesForScale();
        this.setupControls();
        
        this.initializePlatforms();
        this.bindEvents();
        this.gameLoop();
    }
    
    initializePlatforms() {
        this.platforms = [];
        
        if (this.selectedPattern === 'ascending') {
            this.createAscendingPattern();
        } else if (this.selectedPattern === 'descending') {
            this.createDescendingPattern();
        } else if (this.selectedPattern === 'chords') {
            this.createChordPattern();
        } else if (this.selectedPattern === 'pentatonic') {
            this.createPentatonicPattern();
        } else {
            this.createRandomPattern();
        }
    }
    
    createRandomPattern() {
        const platformsPerRow = Math.floor(this.canvas.width / 120);
        const verticalSpacing = 40;
        const horizontalSpacing = this.canvas.width / platformsPerRow;
        const rows = Math.ceil(this.canvas.height / verticalSpacing) + 10;
        
        let lastNote = null;
        
        for (let row = -5; row < rows; row++) {
            for (let col = 0; col < platformsPerRow; col++) {
                if (Math.random() > 0.2) continue;
                
                const xOffset = (Math.random() - 0.5) * 30;
                const yOffset = (Math.random() - 0.5) * 10;
                
                let note;
                do {
                    note = this.notes[Math.floor(Math.random() * this.notes.length)];
                } while (note === lastNote && this.notes.length > 1);
                
                this.platforms.push({
                    x: col * horizontalSpacing + xOffset + 10,
                    y: row * verticalSpacing + yOffset,
                    width: 60,
                    height: 10,
                    note: note,
                    color: this.noteColors[note],
                    hit: false
                });
                lastNote = note;
            }
        }
    }
    
    createAscendingPattern() {
        const verticalSpacing = 35;
        const rows = Math.ceil(this.canvas.height / verticalSpacing) + 20;
        let noteIndex = 0;
        
        for (let row = -10; row < rows; row++) {
            const x = (Math.sin(row * 0.3) * 0.3 + 0.5) * (this.canvas.width - 60);
            const note = this.notes[noteIndex % this.notes.length];
            
            this.platforms.push({
                x: x,
                y: row * verticalSpacing,
                width: 60,
                height: 10,
                note: note,
                color: this.noteColors[note],
                hit: false
            });
            
            if (row % 2 === 0) noteIndex++;
        }
    }
    
    createDescendingPattern() {
        const verticalSpacing = 35;
        const rows = Math.ceil(this.canvas.height / verticalSpacing) + 20;
        let noteIndex = this.notes.length - 1;
        
        for (let row = -10; row < rows; row++) {
            const x = (Math.cos(row * 0.3) * 0.3 + 0.5) * (this.canvas.width - 60);
            const note = this.notes[Math.abs(noteIndex) % this.notes.length];
            
            this.platforms.push({
                x: x,
                y: row * verticalSpacing,
                width: 60,
                height: 10,
                note: note,
                color: this.noteColors[note],
                hit: false
            });
            
            if (row % 2 === 0) noteIndex--;
        }
    }
    
    createChordPattern() {
        const verticalSpacing = 30;
        const horizontalSpacing = this.canvas.width / 3;
        const rows = Math.ceil(this.canvas.height / verticalSpacing) + 20;
        
        // Create triads (1-3-5)
        const chordIndices = [0, 2, 4];
        
        for (let row = -10; row < rows; row++) {
            for (let i = 0; i < chordIndices.length; i++) {
                const noteIndex = chordIndices[i];
                if (noteIndex >= this.notes.length) continue;
                
                const note = this.notes[noteIndex];
                const x = i * horizontalSpacing + (Math.random() - 0.5) * 20 + 30;
                
                this.platforms.push({
                    x: x,
                    y: row * verticalSpacing + i * 5,
                    width: 60,
                    height: 10,
                    note: note,
                    color: this.noteColors[note],
                    hit: false
                });
            }
        }
    }
    
    createPentatonicPattern() {
        // Use only pentatonic notes (usually indices 0, 1, 2, 4, 5)
        const pentatonicIndices = [0, 1, 2, 4, 5];
        const pentatonicNotes = pentatonicIndices
            .filter(i => i < this.notes.length)
            .map(i => this.notes[i]);
        
        const platformsPerRow = Math.floor(this.canvas.width / 100);
        const verticalSpacing = 35;
        const horizontalSpacing = this.canvas.width / platformsPerRow;
        const rows = Math.ceil(this.canvas.height / verticalSpacing) + 20;
        
        for (let row = -10; row < rows; row++) {
            for (let col = 0; col < platformsPerRow; col++) {
                if (Math.random() > 0.3) continue;
                
                const note = pentatonicNotes[Math.floor(Math.random() * pentatonicNotes.length)];
                const x = col * horizontalSpacing + (Math.random() - 0.5) * 20 + 10;
                const y = row * verticalSpacing + (Math.random() - 0.5) * 10;
                
                this.platforms.push({
                    x: x,
                    y: y,
                    width: 60,
                    height: 10,
                    note: note,
                    color: this.noteColors[note],
                    hit: false
                });
            }
        }
    }
    
    regeneratePlatforms() {
        this.platforms = [];
        this.initializePlatforms();
    }
    
    bindEvents() {
        this.keys = {};
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePause();
            }
            
            if (e.code === 'Enter') {
                e.preventDefault();
                this.exportMIDI();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        this.statusElement.textContent = this.isPaused ? 'Status: Paused' : 'Status: Playing';
        
        if (this.isPaused) {
            this.audioContext.suspend();
        } else {
            this.audioContext.resume();
        }
    }
    
    updateNotesForScale() {
        const baseNote = 60 + this.keyOffsets[this.selectedKey];
        const scale = this.scales[this.selectedScale];
        
        this.notes = [];
        this.noteFrequencies = {};
        this.noteColors = {};
        
        for (let i = 0; i < scale.length; i++) {
            const interval = scale[i];
            const midiNote = baseNote + interval;
            const noteName = this.midiToNoteName(midiNote);
            const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
            
            this.notes.push(noteName);
            this.noteFrequencies[noteName] = frequency;
            
            // Color based on scale degree
            if (i === 0 || i === 7) {
                this.noteColors[noteName] = '#4169E1'; // Root - Royal Blue
            } else if (i === 2 || i === 4) {
                this.noteColors[noteName] = '#32CD32'; // 3rd & 5th - Lime Green  
            } else if (i === 1 || i === 5) {
                this.noteColors[noteName] = '#FFD700'; // 2nd & 6th - Gold
            } else {
                this.noteColors[noteName] = '#FF6347'; // 7th & tensions - Tomato
            }
        }
    }
    
    midiToNoteName(midi) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midi / 12) - 1;
        const noteName = noteNames[midi % 12];
        return noteName + octave;
    }
    
    noteNameToMIDI(noteName) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
        if (!match) return null;
        
        const note = match[1];
        const octave = parseInt(match[2]);
        const noteIndex = noteNames.indexOf(note);
        
        if (noteIndex === -1) return null;
        
        return (octave + 1) * 12 + noteIndex;
    }
    
    setupControls() {
        // Set the sound dropdown to the randomly selected sound
        document.getElementById('soundSelect').value = this.selectedSound;
        // Set quantize checkbox to checked by default
        document.getElementById('quantizeCheckbox').checked = true;
        
        document.getElementById('keySelect').addEventListener('change', (e) => {
            this.selectedKey = e.target.value;
            this.updateNotesForScale();
            this.updatePlatformLabels();
        });
        
        document.getElementById('scaleSelect').addEventListener('change', (e) => {
            this.selectedScale = e.target.value;
            this.updateNotesForScale();
            this.updatePlatformLabels();
        });
        
        document.getElementById('soundSelect').addEventListener('change', (e) => {
            this.selectedSound = e.target.value;
        });
        
        document.getElementById('modeSelect').addEventListener('change', (e) => {
            this.selectedMode = e.target.value;
        });
        
        document.getElementById('arpCheckbox').addEventListener('change', (e) => {
            this.arpEnabled = e.target.checked;
        });
        
        document.getElementById('patternSelect').addEventListener('change', (e) => {
            this.selectedPattern = e.target.value;
            this.regeneratePlatforms();
        });
        
        document.getElementById('bpmInput').addEventListener('input', (e) => {
            this.bpm = parseInt(e.target.value) || 120;
        });
        
        document.getElementById('quantizeCheckbox').addEventListener('change', (e) => {
            this.quantizeEnabled = e.target.checked;
        });
    }
    
    updatePlatformLabels() {
        // Update all platform notes to use new scale
        for (let platform of this.platforms) {
            platform.note = this.notes[Math.floor(Math.random() * this.notes.length)];
        }
    }
    
    playNote(note) {
        // Select random volume level
        const volumeMultiplier = this.volumeLevels[Math.floor(Math.random() * this.volumeLevels.length)];
        
        if (this.arpEnabled) {
            this.playArpeggio(note, volumeMultiplier);
        } else if (this.selectedMode === 'chord') {
            this.playChord(note, volumeMultiplier);
        } else {
            this.playSingleNote(note, volumeMultiplier);
        }
        
        const currentTime = performance.now();
        this.recordNote(note, currentTime);
    }
    
    playQuantizedNote(note) {
        const beatLength = 60000 / this.bpm; // milliseconds per beat
        const currentTime = performance.now();
        const timeSinceLastBeat = currentTime - this.lastQuantizedBeat;
        
        // Quantize to nearest 16th note
        const sixteenthNote = beatLength / 4;
        const delay = sixteenthNote - (timeSinceLastBeat % sixteenthNote);
        
        // Only quantize if delay is reasonable
        if (delay < sixteenthNote * 0.8) {
            setTimeout(() => {
                this.playNote(note);
                this.lastQuantizedBeat = currentTime + delay;
            }, delay);
        } else {
            this.playNote(note);
            this.lastQuantizedBeat = currentTime;
        }
    }
    
    playArpeggio(note, volumeMultiplier = 1.0) {
        const noteIndex = this.notes.indexOf(note);
        const arpNotes = [];
        
        // Build arpeggio pattern (root, 3rd, 5th, octave)
        arpNotes.push(this.notes[noteIndex]);
        if (this.notes[noteIndex + 2]) arpNotes.push(this.notes[noteIndex + 2]);
        if (this.notes[noteIndex + 4]) arpNotes.push(this.notes[noteIndex + 4]);
        if (this.notes[noteIndex + 7] || this.notes[0]) {
            arpNotes.push(this.notes[noteIndex + 7] || this.notes[0]);
        }
        
        // Play notes in sequence
        const arpSpeed = 60; // milliseconds between notes
        arpNotes.forEach((arpNote, index) => {
            setTimeout(() => {
                const frequency = this.noteFrequencies[arpNote];
                if (this.selectedSound === 'piano') {
                    this.playPiano(frequency, 0.25 * volumeMultiplier);
                } else if (this.selectedSound === 'supersaw') {
                    this.playSupersaw(frequency, 0.25 * volumeMultiplier);
                } else if (this.selectedSound === 'pad') {
                    this.playPad(frequency, 0.15 * volumeMultiplier);
                } else if (this.selectedSound === 'brass') {
                    this.playBrass(frequency, 0.25 * volumeMultiplier);
                } else if (this.selectedSound === 'flute') {
                    this.playFlute(frequency, 0.25 * volumeMultiplier);
                } else {
                    this.playSine(frequency, 0.25 * volumeMultiplier);
                }
            }, index * arpSpeed);
        });
    }
    
    playSingleNote(note, volumeMultiplier = 1.0) {
        const frequency = this.noteFrequencies[note];
        
        if (this.selectedSound === 'piano') {
            this.playPiano(frequency, 0.3 * volumeMultiplier);
        } else if (this.selectedSound === 'supersaw') {
            this.playSupersaw(frequency, 0.3 * volumeMultiplier);
        } else if (this.selectedSound === 'pad') {
            this.playPad(frequency, 0.2 * volumeMultiplier);
        } else if (this.selectedSound === 'brass') {
            this.playBrass(frequency, 0.3 * volumeMultiplier);
        } else if (this.selectedSound === 'flute') {
            this.playFlute(frequency, 0.3 * volumeMultiplier);
        } else {
            this.playSine(frequency, 0.3 * volumeMultiplier);
        }
    }
    
    playChord(note, volumeMultiplier = 1.0) {
        const noteIndex = this.notes.indexOf(note);
        const chordNotes = [];
        
        chordNotes.push(this.notes[noteIndex]);
        if (this.notes[noteIndex + 2]) chordNotes.push(this.notes[noteIndex + 2]);
        if (this.notes[noteIndex + 4]) chordNotes.push(this.notes[noteIndex + 4]);
        
        for (let chordNote of chordNotes) {
            const frequency = this.noteFrequencies[chordNote];
            if (this.selectedSound === 'piano') {
                this.playPiano(frequency, 0.2 * volumeMultiplier);
            } else if (this.selectedSound === 'supersaw') {
                this.playSupersaw(frequency, 0.15 * volumeMultiplier);
            } else if (this.selectedSound === 'pad') {
                this.playPad(frequency, 0.2 * volumeMultiplier);
            } else if (this.selectedSound === 'brass') {
                this.playBrass(frequency, 0.2 * volumeMultiplier);
            } else if (this.selectedSound === 'flute') {
                this.playFlute(frequency, 0.2 * volumeMultiplier);
            } else {
                this.playSine(frequency, 0.2 * volumeMultiplier);
            }
        }
    }
    
    playSine(frequency, volume = 0.3) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }
    
    playPiano(frequency, volume = 0.3) {
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(frequency * 2, this.audioContext.currentTime);
        
        const osc2Gain = this.audioContext.createGain();
        osc2Gain.gain.value = 0.3;
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.5);
        
        osc1.connect(gainNode);
        osc2.connect(osc2Gain);
        osc2Gain.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(this.audioContext.currentTime + 1.5);
        osc2.stop(this.audioContext.currentTime + 1.5);
    }
    
    playSupersaw(frequency, volume = 0.3) {
        const voices = 7;
        const detune = 10;
        const gainNode = this.audioContext.createGain();
        
        for (let i = 0; i < voices; i++) {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            osc.detune.setValueAtTime((i - voices/2) * detune, this.audioContext.currentTime);
            
            const voiceGain = this.audioContext.createGain();
            voiceGain.gain.value = 1 / voices;
            
            osc.connect(voiceGain);
            voiceGain.connect(gainNode);
            
            osc.start();
            osc.stop(this.audioContext.currentTime + 0.8);
        }
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
        gainNode.connect(this.audioContext.destination);
    }
    
    playPad(frequency, volume = 0.2) {
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const filter = this.audioContext.createBiquadFilter();
        const gainNode = this.audioContext.createGain();
        
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(frequency * 1.01, this.audioContext.currentTime);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 2);
        filter.Q.value = 2;
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.3);
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime + 1.5);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 3);
        
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(this.audioContext.currentTime + 3);
        osc2.stop(this.audioContext.currentTime + 3);
    }
    
    playBrass(frequency, volume = 0.3) {
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const osc3 = this.audioContext.createOscillator();
        const filter = this.audioContext.createBiquadFilter();
        const gainNode = this.audioContext.createGain();
        
        // Brass-like sound using sawtooth waves
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(frequency * 0.99, this.audioContext.currentTime);
        
        osc3.type = 'square';
        osc3.frequency.setValueAtTime(frequency * 2, this.audioContext.currentTime);
        
        const osc3Gain = this.audioContext.createGain();
        osc3Gain.gain.value = 0.1;
        
        // Brass-like filter
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(frequency * 3, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(frequency * 6, this.audioContext.currentTime + 0.05);
        filter.frequency.exponentialRampToValueAtTime(frequency * 2, this.audioContext.currentTime + 0.3);
        filter.Q.value = 5;
        
        // Brass envelope
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.7, this.audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
        
        osc1.connect(filter);
        osc2.connect(filter);
        osc3.connect(osc3Gain);
        osc3Gain.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc1.start();
        osc2.start();
        osc3.start();
        osc1.stop(this.audioContext.currentTime + 0.8);
        osc2.stop(this.audioContext.currentTime + 0.8);
        osc3.stop(this.audioContext.currentTime + 0.8);
    }
    
    playFlute(frequency, volume = 0.3) {
        const osc = this.audioContext.createOscillator();
        const noise = this.audioContext.createOscillator();
        const filter = this.audioContext.createBiquadFilter();
        const gainNode = this.audioContext.createGain();
        const noiseGain = this.audioContext.createGain();
        
        // Flute uses triangle wave
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        // Add slight noise for breathiness
        noise.type = 'sawtooth';
        noise.frequency.setValueAtTime(frequency * 8, this.audioContext.currentTime);
        noiseGain.gain.value = 0.02;
        
        // Flute-like filter
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        filter.Q.value = 2;
        
        // Flute envelope with breath attack
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.3, this.audioContext.currentTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.6);
        
        osc.connect(filter);
        noise.connect(noiseGain);
        noiseGain.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc.start();
        noise.start();
        osc.stop(this.audioContext.currentTime + 0.6);
        noise.stop(this.audioContext.currentTime + 0.6);
    }
    
    recordNote(note, timestamp, velocity = 0.5) {
        const relativeTime = (timestamp - this.gameStartTime) / 1000;
        
        this.musicBuffer.push({
            note: note,
            time: relativeTime,
            timestamp: timestamp,
            velocity: Math.round(velocity * 127) // Convert to MIDI velocity (0-127)
        });
        // No more buffer cleaning - keep all notes!
    }
    
    update() {
        if (this.isPaused) return;
        
        if (this.keys['ArrowLeft']) {
            this.player.vx = -this.moveSpeed;
        } else if (this.keys['ArrowRight']) {
            this.player.vx = this.moveSpeed;
        } else {
            this.player.vx *= 0.8;
        }
        
        this.player.vy += this.gravity;
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;
        
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > this.canvas.width) {
            this.player.x = this.canvas.width - this.player.width;
        }
        
        this.player.onGround = false;
        
        for (let platform of this.platforms) {
            if (this.player.vy > 0 &&
                this.player.x + this.player.width > platform.x &&
                this.player.x < platform.x + platform.width &&
                this.player.y + this.player.height > platform.y &&
                this.player.y + this.player.height < platform.y + platform.height + 10) {
                
                this.player.y = platform.y - this.player.height;
                // Randomly select one of 4 jump heights
                const randomJumpHeight = this.jumpHeights[Math.floor(Math.random() * this.jumpHeights.length)];
                this.player.vy = randomJumpHeight;
                this.player.onGround = true;
                
                if (!platform.hit) {
                    platform.hit = true;
                    
                    if (this.quantizeEnabled) {
                        this.playQuantizedNote(platform.note);
                    } else {
                        this.playNote(platform.note);
                    }
                    
                    setTimeout(() => platform.hit = false, 200);
                }
            }
        }
        
        // Camera stays fixed - no movement
        
        this.generateMorePlatforms();
        
        // Keep player bouncing when they fall off screen
        if (this.player.y > this.canvas.height - 50) {
            this.player.y = this.canvas.height - 50;
            // Random bounce height when hitting bottom
            const randomJumpHeight = this.jumpHeights[Math.floor(Math.random() * this.jumpHeights.length)];
            this.player.vy = randomJumpHeight * 1.5;
        }
    }
    
    generateMorePlatforms() {
        const highestPlatform = Math.min(...this.platforms.map(p => p.y));
        const lowestPlatform = Math.max(...this.platforms.map(p => p.y));
        const platformsPerRow = Math.floor(this.canvas.width / 120);
        const verticalSpacing = 40;
        const horizontalSpacing = this.canvas.width / platformsPerRow;
        
        // Add platforms above
        if (highestPlatform > -200) {
            let lastNote = null;
            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < platformsPerRow; col++) {
                    // Only create platform 20% of the time
                    if (Math.random() > 0.2) continue;
                    
                    const xOffset = (Math.random() - 0.5) * 30;
                    const yOffset = (Math.random() - 0.5) * 10;
                    
                    let note;
                    do {
                        note = this.notes[Math.floor(Math.random() * this.notes.length)];
                    } while (note === lastNote && this.notes.length > 1);
                    
                    this.platforms.push({
                        x: col * horizontalSpacing + xOffset + 10,
                        y: highestPlatform - (row + 1) * verticalSpacing + yOffset,
                        width: 60,
                        height: 10,
                        note: note,
                        hit: false
                    });
                    lastNote = note;
                }
            }
        }
        
        // Add platforms below
        if (lowestPlatform < this.canvas.height + 200) {
            let lastNote = null;
            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < platformsPerRow; col++) {
                    // Only create platform 20% of the time
                    if (Math.random() > 0.2) continue;
                    
                    const xOffset = (Math.random() - 0.5) * 30;
                    const yOffset = (Math.random() - 0.5) * 10;
                    
                    let note;
                    do {
                        note = this.notes[Math.floor(Math.random() * this.notes.length)];
                    } while (note === lastNote && this.notes.length > 1);
                    
                    this.platforms.push({
                        x: col * horizontalSpacing + xOffset + 10,
                        y: lowestPlatform + (row + 1) * verticalSpacing + yOffset,
                        width: 60,
                        height: 10,
                        note: note,
                        hit: false
                    });
                    lastNote = note;
                }
            }
        }
        
        // Keep only platforms that are reasonably close to the viewport
        this.platforms = this.platforms.filter(p => p.y > -500 && p.y < this.canvas.height + 500);
    }
    
    resetGame() {
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height - 100;
        this.player.vx = 0;
        this.player.vy = 0;
        this.cameraY = 0;
        this.platforms = [];
        this.initializePlatforms();
        this.gameStartTime = performance.now();
        this.musicBuffer = [];
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // No camera translation - everything stays in place
        
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        for (let platform of this.platforms) {
            // Use color-coding for platforms
            this.ctx.fillStyle = platform.color || '#4caf50';
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            
            // Add border for better visibility
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
            
            this.ctx.fillStyle = '#000';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(platform.note, platform.x + platform.width / 2, platform.y - 2);
        }
        
        // No restore needed without save/translate
        
        this.ctx.fillStyle = '#333';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Height: ${Math.max(0, Math.floor((500 - this.player.y) / 10))}m`, 10, 30);
        this.ctx.fillText(`Buffer: ${this.musicBuffer.length} notes`, 10, 50);
    }
    
    exportMIDI() {
        if (this.musicBuffer.length === 0) {
            alert('No notes recorded in the last 10 seconds!');
            return;
        }
        
        const midiData = this.createMIDIFile();
        this.downloadMIDI(midiData);
    }
    
    createMIDIFile() {
        const tracks = [];
        const ticksPerQuarter = 480;
        
        let track = [];
        
        track.push([0, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08]);
        track.push([0, 0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20]);
        
        let lastTime = 0;
        
        for (let entry of this.musicBuffer) {
            // Convert note name to MIDI number
            const midiNote = this.noteNameToMIDI(entry.note);
            if (midiNote === null) continue; // Skip invalid notes
            
            const timeInTicks = Math.floor(entry.time * ticksPerQuarter * 2);
            const deltaTime = timeInTicks - lastTime;
            const velocity = entry.velocity || 64; // Use recorded velocity or default
            
            track.push([deltaTime, 0x90, midiNote, velocity]);
            track.push([ticksPerQuarter / 4, 0x80, midiNote, velocity]);
            
            lastTime = timeInTicks + ticksPerQuarter / 4;
        }
        
        track.push([0, 0xFF, 0x2F, 0x00]);
        
        tracks.push(track);
        
        return this.encodeMIDI(tracks, ticksPerQuarter);
    }
    
    encodeMIDI(tracks, ticksPerQuarter) {
        const header = [
            0x4D, 0x54, 0x68, 0x64,
            0x00, 0x00, 0x00, 0x06,
            0x00, 0x01,
            (tracks.length >> 8) & 0xFF, tracks.length & 0xFF,
            (ticksPerQuarter >> 8) & 0xFF, ticksPerQuarter & 0xFF
        ];
        
        let data = header;
        
        for (let track of tracks) {
            const trackData = [];
            
            for (let event of track) {
                const deltaTime = this.encodeVariableLength(event[0]);
                trackData.push(...deltaTime);
                trackData.push(...event.slice(1));
            }
            
            const trackHeader = [
                0x4D, 0x54, 0x72, 0x6B,
                (trackData.length >> 24) & 0xFF,
                (trackData.length >> 16) & 0xFF,
                (trackData.length >> 8) & 0xFF,
                trackData.length & 0xFF
            ];
            
            data.push(...trackHeader);
            data.push(...trackData);
        }
        
        return new Uint8Array(data);
    }
    
    encodeVariableLength(value) {
        const result = [];
        let temp = value;
        
        result.unshift(temp & 0x7F);
        temp >>= 7;
        
        while (temp > 0) {
            result.unshift((temp & 0x7F) | 0x80);
            temp >>= 7;
        }
        
        return result;
    }
    
    downloadMIDI(midiData) {
        const blob = new Blob([midiData], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `musical_jump_${Date.now()}.mid`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`MIDI file exported with ${this.musicBuffer.length} notes!`);
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.addEventListener('load', () => {
    new MusicalDoodleJump();
});