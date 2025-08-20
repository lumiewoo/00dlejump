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
            width: 38,
            height: 38,
            vx: 0,
            vy: 0,
            onGround: false,
            isMoving: false
        };
        
        // Gender and emoji setup
        this.gender = localStorage.getItem('gender') || 'M';
        this.emojis = {
            M: { standing: '🧍‍♂️', running: '🏃‍♂️' },
            F: { standing: '🧍‍♀️', running: '🏃‍♀️' },
            NB: { standing: '🧍', running: '🏃' }
        };
        
        this.platforms = [];
        this.gravity = 0.3;
        this.jumpHeights = [-6, -8, -10, -12];
        this.moveSpeed = 3;
        this.cameraY = 0;
        this.isPaused = false;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.musicBuffer = [];
        this.gameStartTime = performance.now();
        
        this.selectedKey = 'C';
        this.selectedScale = 'major';
        this.octaveRange = 2;
        const instruments = ['sine', 'piano', 'supersaw', 'pad', 'brass', 'flute'];
        this.selectedSound = instruments[Math.floor(Math.random() * instruments.length)];
        this.selectedMode = 'single';
        this.arpEnabled = false;
        this.arpType = 'up';
        this.randomizeArpType = false;
        this.randomizeRhythm = false;
        this.arpChance = 100; // Percentage chance to play arp vs single note
        this.arpLength = 0.25; // Default to 1/4 note length
        this.fallingThrough = false; // Track if player is falling through platforms
        
        this.volumeLevels = [0.25, 0.5, 0.75, 1.0];
        this.arpTypes = ['up', 'down', 'updown', 'downup', 'random', 'chord'];
        this.rhythmPatterns = [40, 60, 80, 100, 120, 150];
        this.noteColors = {};
        this.recentHits = []; // Track recently hit notes for color system
        
        // Mobile detection and touch handling
        this.isMobile = this.detectMobile();
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isMoving = false;
        this.lastTapTime = 0;
        this.tapCount = 0;
        
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
        this.setupGenderSelector();
        this.initializePlatforms();
        this.bindEvents();
        this.setupMobileUI();
        this.gameLoop();
    }
    
    updateNotesForScale() {
        const baseNote = 60 + this.keyOffsets[this.selectedKey];
        const scale = this.scales[this.selectedScale];
        
        this.notes = [];
        this.noteFrequencies = {};
        this.noteColors = {};
        
        // Generate notes across the selected octave range
        for (let octave = 0; octave < this.octaveRange; octave++) {
            for (let i = 0; i < scale.length; i++) {
                const interval = scale[i];
                const midiNote = baseNote + interval + (octave * 12);
                const noteName = this.midiToNoteName(midiNote);
                const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
                
                this.notes.push(noteName);
                this.noteFrequencies[noteName] = frequency;
                
                // Set all notes to white by default
                this.noteColors[noteName] = '#ffffff';
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
        document.getElementById('soundSelect').value = this.selectedSound;
        
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
        
        document.getElementById('octaveRangeSelect').addEventListener('change', (e) => {
            this.octaveRange = parseInt(e.target.value);
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
            this.updateArpControls();
        });
        
        document.getElementById('arpTypeSelect').addEventListener('change', (e) => {
            this.arpType = e.target.value;
        });
        
        document.getElementById('randomizeArpTypeCheckbox').addEventListener('change', (e) => {
            this.randomizeArpType = e.target.checked;
        });
        
        document.getElementById('randomizeRhythmCheckbox').addEventListener('change', (e) => {
            this.randomizeRhythm = e.target.checked;
        });
        
        document.getElementById('arpChanceSlider').addEventListener('input', (e) => {
            this.arpChance = parseInt(e.target.value);
            document.getElementById('arpChanceValue').textContent = this.arpChance + '%';
        });
        
        document.getElementById('arpLengthSelect').addEventListener('change', (e) => {
            this.arpLength = parseFloat(e.target.value);
        });
    }
    
    updateArpControls() {
        const isArpEnabled = this.arpEnabled;
        document.getElementById('arpTypeSelect').disabled = !isArpEnabled;
        document.getElementById('randomizeArpTypeCheckbox').disabled = !isArpEnabled;
        document.getElementById('randomizeRhythmCheckbox').disabled = !isArpEnabled;
        document.getElementById('arpChanceSlider').disabled = !isArpEnabled;
        document.getElementById('arpLengthSelect').disabled = !isArpEnabled;
    }
    
    updatePlatformLabels() {
        for (let platform of this.platforms) {
            platform.note = this.notes[Math.floor(Math.random() * this.notes.length)];
            platform.color = this.noteColors[platform.note];
        }
    }
    
    initializePlatforms() {
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
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    setupMobileUI() {
        if (this.isMobile) {
            document.querySelector('.desktop-controls').style.display = 'none';
            document.querySelector('.mobile-controls').style.display = 'block';
            
            // Hide some controls on mobile for cleaner UI
            const controls = document.getElementById('controls');
            controls.style.fontSize = '10px';
        }
    }
    
    setupGenderSelector() {
        // Set initial active button based on saved preference
        document.querySelectorAll('#genderSelector button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`gender${this.gender}`).classList.add('active');
        
        // Add click handlers
        document.getElementById('genderM').addEventListener('click', () => {
            this.setGender('M');
        });
        
        document.getElementById('genderF').addEventListener('click', () => {
            this.setGender('F');
        });
        
        document.getElementById('genderNB').addEventListener('click', () => {
            this.setGender('NB');
        });
    }
    
    setGender(gender) {
        this.gender = gender;
        localStorage.setItem('gender', gender);
        
        // Update button states
        document.querySelectorAll('#genderSelector button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`gender${gender}`).classList.add('active');
    }
    
    bindEvents() {
        this.keys = {};
        
        // Desktop controls
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
            
            if (e.code === 'ArrowUp') {
                e.preventDefault();
                // Immediate max jump when pressing up arrow
                const maxJumpHeight = Math.min(...this.jumpHeights);
                this.player.vy = maxJumpHeight * 1.2;
            }
            
            if (e.code === 'ArrowDown') {
                e.preventDefault();
                // Enable falling through platforms
                this.fallingThrough = true;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            
            if (e.code === 'ArrowDown') {
                // Stop falling through when key is released
                this.fallingThrough = false;
            }
        });
        
        // Mobile touch controls
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.isMoving = true;
            
            // Handle tap/double tap
            const currentTime = Date.now();
            if (currentTime - this.lastTapTime < 300) {
                this.tapCount++;
                if (this.tapCount === 1) {
                    // Single tap - pause
                    this.togglePause();
                } else if (this.tapCount === 2) {
                    // Double tap - export MIDI
                    this.exportMIDI();
                    this.tapCount = 0;
                }
            } else {
                this.tapCount = 1;
            }
            this.lastTapTime = currentTime;
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.isMoving) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.touchStartX;
            
            // Convert touch movement to player velocity
            this.player.vx = Math.max(-this.moveSpeed, Math.min(this.moveSpeed, deltaX * 0.1));
            
            // Mark as moving if velocity is significant
            if (Math.abs(this.player.vx) > 0.5) {
                this.player.isMoving = true;
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isMoving = false;
            this.player.vx *= 0.8; // Gradual slowdown
            this.player.isMoving = false; // Stop running animation
        });
        
        // Prevent context menu on long press
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
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
    
    trackNoteHit(note) {
        // Remove if already in recent hits
        this.recentHits = this.recentHits.filter(hit => hit !== note);
        
        // Add to front of array
        this.recentHits.unshift(note);
        
        // Keep only last 3 hits
        if (this.recentHits.length > 3) {
            this.recentHits = this.recentHits.slice(0, 3);
        }
        
        // Update colors for all platforms
        this.updateNoteColors();
    }
    
    updateNoteColors() {
        // Reset all to white first
        for (let noteName of this.notes) {
            this.noteColors[noteName] = '#ffffff';
        }
        
        // Apply hit colors
        if (this.recentHits.length > 0) {
            this.noteColors[this.recentHits[0]] = '#ff1493'; // Vibrant pink
        }
        if (this.recentHits.length > 1) {
            this.noteColors[this.recentHits[1]] = '#ff69b4'; // Medium pink
        }
        if (this.recentHits.length > 2) {
            this.noteColors[this.recentHits[2]] = '#ffb6c1'; // Light pink
        }
        
        // Update platform colors
        for (let platform of this.platforms) {
            platform.color = this.noteColors[platform.note];
        }
    }
    
    playNote(note) {
        const volumeMultiplier = this.volumeLevels[Math.floor(Math.random() * this.volumeLevels.length)];
        
        // Check if we should play arp based on chance
        const shouldPlayArp = this.arpEnabled && (Math.random() * 100) < this.arpChance;
        
        if (shouldPlayArp) {
            this.playArpeggio(note, volumeMultiplier);
        } else if (this.selectedMode === 'chord') {
            this.playChord(note, volumeMultiplier);
        } else {
            this.playSingleNote(note, volumeMultiplier);
            const currentTime = performance.now();
            // Single notes use default duration
            this.recordNote(note, currentTime, volumeMultiplier, 0.25);
        }
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
        if (noteIndex === -1) return;
        
        const chordNotes = [];
        const currentTime = performance.now();
        
        // Build chord notes - root, 3rd, 5th
        chordNotes.push(this.notes[noteIndex]);
        if (noteIndex + 2 < this.notes.length) chordNotes.push(this.notes[noteIndex + 2]);
        if (noteIndex + 4 < this.notes.length) chordNotes.push(this.notes[noteIndex + 4]);
        
        console.log('Playing chord with notes:', chordNotes);
        
        for (let chordNote of chordNotes) {
            if (!chordNote) continue;
            
            const frequency = this.noteFrequencies[chordNote];
            const noteVelocity = 0.2 * volumeMultiplier;
            
            // Chords use default duration
            this.recordNote(chordNote, currentTime, noteVelocity, 0.25);
            console.log('Recorded chord note:', chordNote, 'velocity:', noteVelocity);
            
            if (this.selectedSound === 'piano') {
                this.playPiano(frequency, noteVelocity);
            } else if (this.selectedSound === 'supersaw') {
                this.playSupersaw(frequency, noteVelocity * 0.75);
            } else if (this.selectedSound === 'pad') {
                this.playPad(frequency, noteVelocity);
            } else if (this.selectedSound === 'brass') {
                this.playBrass(frequency, noteVelocity);
            } else if (this.selectedSound === 'flute') {
                this.playFlute(frequency, noteVelocity);
            } else {
                this.playSine(frequency, noteVelocity);
            }
        }
    }
    
    playArpeggio(note, volumeMultiplier = 1.0) {
        const noteIndex = this.notes.indexOf(note);
        let arpNotes = [];
        const baseTime = performance.now();
        
        // Build base chord notes
        const chordNotes = [this.notes[noteIndex]];
        if (this.notes[noteIndex + 2]) chordNotes.push(this.notes[noteIndex + 2]);
        if (this.notes[noteIndex + 4]) chordNotes.push(this.notes[noteIndex + 4]);
        if (this.notes[noteIndex + 7] || this.notes[0]) {
            chordNotes.push(this.notes[noteIndex + 7] || this.notes[0]);
        }
        
        // Select arp type
        let currentArpType = this.arpType;
        if (this.randomizeArpType) {
            currentArpType = this.arpTypes[Math.floor(Math.random() * this.arpTypes.length)];
        }
        
        // Generate arpeggio pattern based on type
        switch (currentArpType) {
            case 'up':
                arpNotes = [...chordNotes];
                break;
            case 'down':
                arpNotes = [...chordNotes].reverse();
                break;
            case 'updown':
                arpNotes = [...chordNotes, ...chordNotes.slice(1).reverse()];
                break;
            case 'downup':
                arpNotes = [...chordNotes].reverse();
                arpNotes = [...arpNotes, ...arpNotes.slice(1).reverse()];
                break;
            case 'random':
                arpNotes = [...chordNotes];
                for (let i = arpNotes.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arpNotes[i], arpNotes[j]] = [arpNotes[j], arpNotes[i]];
                }
                break;
            case 'chord':
            default:
                arpNotes = [...chordNotes];
                break;
        }
        
        // Select rhythm
        let arpSpeed = 60;
        if (this.randomizeRhythm) {
            arpSpeed = this.rhythmPatterns[Math.floor(Math.random() * this.rhythmPatterns.length)];
        }
        
        console.log('Playing arpeggio:', currentArpType, 'with notes:', arpNotes, 'speed:', arpSpeed);
        
        arpNotes.forEach((arpNote, index) => {
            setTimeout(() => {
                const frequency = this.noteFrequencies[arpNote];
                const noteVelocity = 0.25 * volumeMultiplier;
                const currentTime = performance.now(); // Get actual time when note plays
                
                // Record with arp length as duration
                this.recordNote(arpNote, currentTime, noteVelocity, this.arpLength);
                
                if (this.selectedSound === 'piano') {
                    this.playPiano(frequency, noteVelocity);
                } else if (this.selectedSound === 'supersaw') {
                    this.playSupersaw(frequency, noteVelocity);
                } else if (this.selectedSound === 'pad') {
                    this.playPad(frequency, noteVelocity * 0.6);
                } else if (this.selectedSound === 'brass') {
                    this.playBrass(frequency, noteVelocity);
                } else if (this.selectedSound === 'flute') {
                    this.playFlute(frequency, noteVelocity);
                } else {
                    this.playSine(frequency, noteVelocity);
                }
            }, index * arpSpeed);
        });
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
        
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(frequency * 0.99, this.audioContext.currentTime);
        
        osc3.type = 'square';
        osc3.frequency.setValueAtTime(frequency * 2, this.audioContext.currentTime);
        
        const osc3Gain = this.audioContext.createGain();
        osc3Gain.gain.value = 0.1;
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(frequency * 3, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(frequency * 6, this.audioContext.currentTime + 0.05);
        filter.frequency.exponentialRampToValueAtTime(frequency * 2, this.audioContext.currentTime + 0.3);
        filter.Q.value = 5;
        
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
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        noise.type = 'sawtooth';
        noise.frequency.setValueAtTime(frequency * 8, this.audioContext.currentTime);
        noiseGain.gain.value = 0.02;
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        filter.Q.value = 2;
        
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
    
    recordNote(note, timestamp, velocity = 0.5, duration = 0.25) {
        const relativeTime = (timestamp - this.gameStartTime) / 1000;
        
        this.musicBuffer.push({
            note: note,
            time: relativeTime,
            timestamp: timestamp,
            velocity: Math.round(velocity * 127),
            duration: duration // Store note duration
        });
    }
    
    update() {
        if (this.isPaused) return;
        
        // Check if player is moving for emoji animation
        this.player.isMoving = false;
        
        if (this.keys['ArrowLeft']) {
            this.player.vx = -this.moveSpeed;
            this.player.isMoving = true;
        } else if (this.keys['ArrowRight']) {
            this.player.vx = this.moveSpeed;
            this.player.isMoving = true;
        } else {
            this.player.vx *= 0.8;
        }
        
        // Check if mobile touch is moving
        if (Math.abs(this.player.vx) > 0.5) {
            this.player.isMoving = true;
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
                !this.fallingThrough && // Don't collide if falling through
                this.player.x + this.player.width > platform.x &&
                this.player.x < platform.x + platform.width &&
                this.player.y + this.player.height > platform.y &&
                this.player.y + this.player.height < platform.y + platform.height + 10) {
                
                this.player.y = platform.y - this.player.height;
                const randomJumpHeight = this.jumpHeights[Math.floor(Math.random() * this.jumpHeights.length)];
                this.player.vy = randomJumpHeight;
                this.player.onGround = true;
                
                if (!platform.hit) {
                    platform.hit = true;
                    this.playNote(platform.note);
                    this.trackNoteHit(platform.note);
                    setTimeout(() => platform.hit = false, 200);
                }
            }
        }
        
        this.generateMorePlatforms();
        
        // Bounce when hitting bottom of screen
        if (this.player.y > this.canvas.height - this.player.height) {
            this.player.y = this.canvas.height - this.player.height;
            // Use maximum jump height when hitting ground
            const maxJumpHeight = Math.min(...this.jumpHeights); // Most negative = highest jump
            this.player.vy = maxJumpHeight * 1.5;
        }
    }
    
    generateMorePlatforms() {
        const highestPlatform = Math.min(...this.platforms.map(p => p.y));
        const lowestPlatform = Math.max(...this.platforms.map(p => p.y));
        const platformsPerRow = Math.floor(this.canvas.width / 120);
        const verticalSpacing = 40;
        const horizontalSpacing = this.canvas.width / platformsPerRow;
        
        if (highestPlatform > -200) {
            let lastNote = null;
            for (let row = 0; row < 10; row++) {
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
                        y: highestPlatform - (row + 1) * verticalSpacing + yOffset,
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
        
        if (lowestPlatform < this.canvas.height + 200) {
            let lastNote = null;
            for (let row = 0; row < 10; row++) {
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
                        y: lowestPlatform + (row + 1) * verticalSpacing + yOffset,
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
        
        // Draw player emoji instead of rectangle
        this.ctx.save();
        this.ctx.font = '38px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const emoji = this.player.isMoving ? 
            this.emojis[this.gender].running : 
            this.emojis[this.gender].standing;
        
        // Flip emoji when moving right
        if (this.player.vx > 0.5) {
            this.ctx.translate(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
            this.ctx.scale(-1, 1);
            this.ctx.fillText(emoji, 0, 0);
        } else {
            this.ctx.fillText(emoji, this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
        }
        this.ctx.restore();
        
        for (let platform of this.platforms) {
            // Skip rendering if platform is above top 10% of viewport or completely out of view
            const topBoundary = this.canvas.height * 0.1;
            if (platform.y < topBoundary || platform.y > this.canvas.height) {
                continue;
            }
            
            this.ctx.fillStyle = platform.color || '#4caf50';
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
            
            this.ctx.fillStyle = '#000';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(platform.note, platform.x + platform.width / 2, platform.y - 2);
        }
        
        this.ctx.fillStyle = '#333';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Height: ${Math.max(0, Math.floor((500 - this.player.y) / 10))}m`, 10, 30);
        this.ctx.fillText(`Buffer: ${this.musicBuffer.length} notes`, 10, 50);
    }
    
    exportMIDI() {
        if (this.musicBuffer.length === 0) {
            alert('No notes recorded yet!');
            return;
        }
        
        console.log('Music buffer before export:', this.musicBuffer);
        console.log('Total notes in buffer:', this.musicBuffer.length);
        
        const midiData = this.createMIDIFile();
        this.downloadMIDI(midiData);
    }
    
    createMIDIFile() {
        const tracks = [];
        const ticksPerQuarter = 480;
        
        // Create separate arrays for note-on and note-off events
        let events = [];
        
        // First, collect all events
        for (let entry of this.musicBuffer) {
            const midiNote = this.noteNameToMIDI(entry.note);
            if (midiNote === null) continue;
            
            const timeInTicks = Math.floor(entry.time * ticksPerQuarter * 2);
            const velocity = entry.velocity || 64;
            const noteDuration = Math.floor(ticksPerQuarter * (entry.duration || 0.25));
            
            // Add note-on event
            events.push({
                time: timeInTicks,
                type: 'on',
                note: midiNote,
                velocity: velocity
            });
            
            // Add note-off event
            events.push({
                time: timeInTicks + noteDuration,
                type: 'off',
                note: midiNote,
                velocity: velocity
            });
        }
        
        // Sort events by time
        events.sort((a, b) => a.time - b.time);
        
        // Build track with properly calculated delta times
        let track = [];
        track.push([0, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08]);
        track.push([0, 0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20]);
        
        let lastTime = 0;
        for (let event of events) {
            const deltaTime = event.time - lastTime;
            
            if (event.type === 'on') {
                track.push([deltaTime, 0x90, event.note, event.velocity]);
            } else {
                track.push([deltaTime, 0x80, event.note, event.velocity]);
            }
            
            lastTime = event.time;
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
        
        const duration = Math.round(this.musicBuffer[this.musicBuffer.length - 1].time);
        alert(`MIDI file exported with ${this.musicBuffer.length} notes over ${duration} seconds!`);
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