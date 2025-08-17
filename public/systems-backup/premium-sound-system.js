/* ===== SISTEMA DE SONIDOS PREMIUM v3.0 ===== */
/* Sonidos inmersivos para experiencia premium de bingo */

class PremiumSoundSystem {
    constructor(bingoGame) {
        this.bingoGame = bingoGame;
        this.audioContext = null;
        this.sounds = new Map();
        this.soundEffects = new Map();
        this.ambientSounds = new Map();
        this.musicTracks = new Map();
        
        // Configuración de audio
        this.config = {
            masterVolume: 0.7,
            effectsVolume: 0.8,
            ambientVolume: 0.3,
            musicVolume: 0.5,
            voiceVolume: 0.9,
            enabled: true,
            ambientEnabled: true,
            voiceEnabled: true,
            musicEnabled: false
        };
        
        // Estado de reproducción
        this.currentAmbient = null;
        this.currentMusic = null;
        this.isInitialized = false;
        
        console.log('🔊 Premium Sound System inicializando...');
        this.initializeAudioContext();
        this.loadSoundDefinitions();
        this.createInterface();
    }

    /**
     * Inicializar contexto de audio
     */
    async initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Reanudar contexto si está suspendido
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.isInitialized = true;
            console.log('✅ AudioContext inicializado');
            
            // Cargar configuración guardada
            this.loadSettings();
            
        } catch (error) {
            console.error('❌ Error inicializando AudioContext:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Definir todos los sonidos del juego
     */
    loadSoundDefinitions() {
        // Efectos de números
        this.soundDefinitions = {
            // Números llamados
            numberCall: {
                type: 'generated',
                frequencies: [800, 1000, 1200],
                duration: 0.3,
                volume: 0.6
            },
            
            numberMark: {
                type: 'generated',
                frequencies: [600, 800],
                duration: 0.2,
                volume: 0.5
            },
            
            // Efectos de juego
            cardPurchase: {
                type: 'generated',
                frequencies: [400, 600, 800, 1000],
                duration: 0.5,
                volume: 0.7
            },
            
            roomChange: {
                type: 'generated',
                frequencies: [300, 500, 700],
                duration: 0.4,
                volume: 0.6
            },
            
            // Efectos de victoria
            lineWin: {
                type: 'melody',
                notes: [261.63, 329.63, 392.00, 523.25], // C-E-G-C
                duration: 1.0,
                volume: 0.8
            },
            
            twoLinesWin: {
                type: 'melody',
                notes: [261.63, 329.63, 392.00, 523.25, 659.25], // C-E-G-C-E
                duration: 1.5,
                volume: 0.9
            },
            
            bingoWin: {
                type: 'celebration',
                frequencies: [523.25, 659.25, 783.99, 1046.50],
                duration: 3.0,
                volume: 1.0
            },
            
            jackpotWin: {
                type: 'fanfare',
                frequencies: [261.63, 329.63, 392.00, 523.25, 659.25, 783.99],
                duration: 5.0,
                volume: 1.0
            },
            
            // Efectos de interfaz
            buttonClick: {
                type: 'generated',
                frequencies: [800],
                duration: 0.1,
                volume: 0.3
            },
            
            buttonHover: {
                type: 'generated',
                frequencies: [600],
                duration: 0.05,
                volume: 0.2
            },
            
            notification: {
                type: 'generated',
                frequencies: [800, 1200],
                duration: 0.6,
                volume: 0.5
            },
            
            error: {
                type: 'generated',
                frequencies: [200, 150],
                duration: 0.8,
                volume: 0.6
            },
            
            // Sonidos ambientales
            casinoAmbient: {
                type: 'ambient',
                baseFrequency: 100,
                variation: 50,
                duration: 'loop',
                volume: 0.1
            },
            
            // Efectos de chat
            messageReceived: {
                type: 'generated',
                frequencies: [400, 600],
                duration: 0.2,
                volume: 0.4
            },
            
            emojiSent: {
                type: 'generated',
                frequencies: [800, 1000],
                duration: 0.3,
                volume: 0.3
            },
            
            // Efectos de auto-daub
            autoDaubMark: {
                type: 'generated',
                frequencies: [1000, 1200],
                duration: 0.15,
                volume: 0.4
            },
            
            // Countdown
            countdownTick: {
                type: 'generated',
                frequencies: [800],
                duration: 0.1,
                volume: 0.5
            },
            
            countdownFinal: {
                type: 'generated',
                frequencies: [1200, 1000],
                duration: 0.5,
                volume: 0.8
            },
            
            // Efectos de nivel
            levelUp: {
                type: 'level',
                frequencies: [523.25, 659.25, 783.99, 1046.50, 1318.51],
                duration: 2.5,
                volume: 0.9
            },
            
            vipUnlock: {
                type: 'royal',
                frequencies: [261.63, 329.63, 392.00, 523.25, 659.25],
                duration: 3.0,
                volume: 1.0
            }
        };
    }

    /**
     * Generar sonido sintético
     */
    async generateSound(definition) {
        if (!this.isInitialized || !this.config.enabled) return null;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filterNode = this.audioContext.createBiquadFilter();
            
            // Configurar filtro
            filterNode.type = 'lowpass';
            filterNode.frequency.value = 2000;
            
            // Conectar nodos
            oscillator.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Configurar según tipo
            switch (definition.type) {
                case 'generated':
                    return this.generateSimpleSound(oscillator, gainNode, definition);
                    
                case 'melody':
                    return this.generateMelody(definition);
                    
                case 'celebration':
                    return this.generateCelebration(definition);
                    
                case 'fanfare':
                    return this.generateFanfare(definition);
                    
                case 'level':
                    return this.generateLevelUpSound(definition);
                    
                case 'royal':
                    return this.generateRoyalSound(definition);
                    
                default:
                    return this.generateSimpleSound(oscillator, gainNode, definition);
            }
            
        } catch (error) {
            console.error('Error generando sonido:', error);
            return null;
        }
    }

    /**
     * Generar sonido simple
     */
    generateSimpleSound(oscillator, gainNode, definition) {
        const now = this.audioContext.currentTime;
        const volume = definition.volume * this.config.effectsVolume * this.config.masterVolume;
        
        // Configurar frecuencia
        if (definition.frequencies.length === 1) {
            oscillator.frequency.setValueAtTime(definition.frequencies[0], now);
        } else {
            oscillator.frequency.setValueAtTime(definition.frequencies[0], now);
            definition.frequencies.forEach((freq, index) => {
                const time = now + (definition.duration / definition.frequencies.length) * index;
                oscillator.frequency.exponentialRampToValueAtTime(freq, time);
            });
        }
        
        // Configurar envolvente
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + definition.duration);
        
        // Reproducir
        oscillator.start(now);
        oscillator.stop(now + definition.duration);
        
        return oscillator;
    }

    /**
     * Generar melodía
     */
    async generateMelody(definition) {
        const noteDelay = definition.duration / definition.notes.length;
        const promises = [];
        
        definition.notes.forEach((frequency, index) => {
            const promise = new Promise((resolve) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    const now = this.audioContext.currentTime;
                    const volume = definition.volume * this.config.effectsVolume * this.config.masterVolume;
                    
                    oscillator.frequency.setValueAtTime(frequency, now);
                    gainNode.gain.setValueAtTime(0, now);
                    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, now + noteDelay - 0.01);
                    
                    oscillator.start(now);
                    oscillator.stop(now + noteDelay);
                    
                    resolve();
                }, index * noteDelay * 1000);
            });
            promises.push(promise);
        });
        
        return Promise.all(promises);
    }

    /**
     * Generar sonido de celebración
     */
    async generateCelebration(definition) {
        const duration = definition.duration;
        const volume = definition.volume * this.config.effectsVolume * this.config.masterVolume;
        
        // Crear múltiples osciladores para efecto de celebración
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                definition.frequencies.forEach((freq, index) => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    const now = this.audioContext.currentTime;
                    const randomOffset = Math.random() * 0.1;
                    
                    oscillator.frequency.setValueAtTime(freq + (Math.random() * 100 - 50), now);
                    gainNode.gain.setValueAtTime(0, now);
                    gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + 0.01 + randomOffset);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + randomOffset);
                    
                    oscillator.start(now + randomOffset);
                    oscillator.stop(now + 0.5 + randomOffset);
                });
            }, i * 200);
        }
    }

    /**
     * Generar fanfare
     */
    async generateFanfare(definition) {
        const trumpet = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const pattern = [0, 0, 1, 1, 2, 2, 3, 3, 2, 1, 0];
        
        pattern.forEach((noteIndex, patternIndex) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                const now = this.audioContext.currentTime;
                const volume = definition.volume * this.config.effectsVolume * this.config.masterVolume;
                
                oscillator.frequency.setValueAtTime(trumpet[noteIndex], now);
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                
                oscillator.start(now);
                oscillator.stop(now + 0.3);
            }, patternIndex * 200);
        });
    }

    /**
     * Generar sonido de subida de nivel
     */
    async generateLevelUpSound(definition) {
        // Efecto ascendente con reverb
        definition.frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                const filterNode = this.audioContext.createBiquadFilter();
                
                oscillator.connect(filterNode);
                filterNode.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                filterNode.type = 'lowpass';
                filterNode.frequency.setValueAtTime(freq * 2, this.audioContext.currentTime);
                
                const now = this.audioContext.currentTime;
                const volume = definition.volume * this.config.effectsVolume * this.config.masterVolume;
                
                oscillator.frequency.setValueAtTime(freq, now);
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(volume, now + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
                
                oscillator.start(now);
                oscillator.stop(now + 0.8);
            }, index * 300);
        });
    }

    /**
     * Generar sonido real/VIP
     */
    async generateRoyalSound(definition) {
        // Acorde real con harmónicos
        const baseFreq = 261.63; // C4
        const harmony = [1, 1.25, 1.5, 2, 2.5]; // Ratios harmónicos
        
        harmony.forEach((ratio, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            const now = this.audioContext.currentTime;
            const volume = (definition.volume * this.config.effectsVolume * this.config.masterVolume) / harmony.length;
            
            oscillator.frequency.setValueAtTime(baseFreq * ratio, now);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(volume, now + 0.5);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + definition.duration);
            
            oscillator.start(now);
            oscillator.stop(now + definition.duration);
        });
    }

    /**
     * Reproducir sonido por nombre
     */
    async playSound(soundName, options = {}) {
        if (!this.isInitialized || !this.config.enabled) return;
        
        const definition = this.soundDefinitions[soundName];
        if (!definition) {
            console.warn(`Sonido no encontrado: ${soundName}`);
            return;
        }
        
        // Aplicar opciones
        const finalDefinition = {
            ...definition,
            volume: (options.volume || definition.volume) * (options.volumeMultiplier || 1)
        };
        
        try {
            await this.generateSound(finalDefinition);
        } catch (error) {
            console.error(`Error reproduciendo sonido ${soundName}:`, error);
        }
    }

    /**
     * Crear interfaz de configuración
     */
    createInterface() {
        const soundPanel = document.createElement('div');
        soundPanel.id = 'premiumSoundPanel';
        soundPanel.className = 'premium-sound-panel card-premium';
        
        soundPanel.innerHTML = `
            <div class="sound-header">
                <h4><i class="fas fa-volume-up"></i> Sistema de Audio Premium</h4>
                <div class="sound-toggle">
                    <button class="sound-btn ${this.config.enabled ? 'active' : ''}" id="toggleSound">
                        <i class="fas fa-${this.config.enabled ? 'volume-up' : 'volume-mute'}"></i>
                    </button>
                </div>
            </div>
            
            <div class="sound-controls" ${this.config.enabled ? '' : 'style="display: none;"'}>
                <div class="volume-control">
                    <label>Volumen General</label>
                    <input type="range" id="masterVolume" min="0" max="100" value="${this.config.masterVolume * 100}">
                    <span class="volume-value">${Math.round(this.config.masterVolume * 100)}%</span>
                </div>
                
                <div class="volume-control">
                    <label>Efectos de Juego</label>
                    <input type="range" id="effectsVolume" min="0" max="100" value="${this.config.effectsVolume * 100}">
                    <span class="volume-value">${Math.round(this.config.effectsVolume * 100)}%</span>
                </div>
                
                <div class="volume-control">
                    <label>Ambiente</label>
                    <input type="range" id="ambientVolume" min="0" max="100" value="${this.config.ambientVolume * 100}">
                    <span class="volume-value">${Math.round(this.config.ambientVolume * 100)}%</span>
                </div>
                
                <div class="sound-options">
                    <label class="sound-option">
                        <input type="checkbox" id="ambientEnabled" ${this.config.ambientEnabled ? 'checked' : ''}>
                        <span>Sonidos ambientales</span>
                    </label>
                    
                    <label class="sound-option">
                        <input type="checkbox" id="voiceEnabled" ${this.config.voiceEnabled ? 'checked' : ''}>
                        <span>Voz del cantador</span>
                    </label>
                    
                    <label class="sound-option">
                        <input type="checkbox" id="musicEnabled" ${this.config.musicEnabled ? 'checked' : ''}>
                        <span>Música de fondo</span>
                    </label>
                </div>
                
                <div class="sound-test">
                    <h5>Probar Sonidos:</h5>
                    <div class="test-buttons">
                        <button class="test-btn" data-sound="numberCall">Número</button>
                        <button class="test-btn" data-sound="lineWin">Línea</button>
                        <button class="test-btn" data-sound="bingoWin">Bingo</button>
                        <button class="test-btn" data-sound="levelUp">Nivel</button>
                    </div>
                </div>
            </div>
        `;
        
        // Insertar en el DOM
        const sidebar = document.querySelector('.game-sidebar');
        if (sidebar) {
            sidebar.appendChild(soundPanel);
        } else {
            document.body.appendChild(soundPanel);
        }
        
        this.bindSoundEvents();
    }

    /**
     * Vincular eventos de la interfaz
     */
    bindSoundEvents() {
        // Toggle principal
        document.getElementById('toggleSound')?.addEventListener('click', () => {
            this.config.enabled = !this.config.enabled;
            this.updateSoundInterface();
            this.saveSettings();
        });
        
        // Controles de volumen
        ['masterVolume', 'effectsVolume', 'ambientVolume'].forEach(id => {
            const slider = document.getElementById(id);
            slider?.addEventListener('input', (e) => {
                const value = e.target.value / 100;
                this.config[id] = value;
                this.updateVolumeDisplay(id, value);
                this.saveSettings();
            });
        });
        
        // Opciones de sonido
        ['ambientEnabled', 'voiceEnabled', 'musicEnabled'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', (e) => {
                this.config[id] = e.target.checked;
                this.saveSettings();
            });
        });
        
        // Botones de prueba
        document.querySelectorAll('.test-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const soundName = e.target.dataset.sound;
                this.playSound(soundName);
            });
        });
    }

    /**
     * Actualizar interfaz de sonido
     */
    updateSoundInterface() {
        const toggleBtn = document.getElementById('toggleSound');
        const controls = document.querySelector('.sound-controls');
        
        if (toggleBtn) {
            toggleBtn.className = `sound-btn ${this.config.enabled ? 'active' : ''}`;
            toggleBtn.innerHTML = `<i class="fas fa-${this.config.enabled ? 'volume-up' : 'volume-mute'}"></i>`;
        }
        
        if (controls) {
            controls.style.display = this.config.enabled ? 'block' : 'none';
        }
    }

    /**
     * Actualizar display de volumen
     */
    updateVolumeDisplay(id, value) {
        const slider = document.getElementById(id);
        if (slider) {
            const valueSpan = slider.parentElement.querySelector('.volume-value');
            if (valueSpan) {
                valueSpan.textContent = `${Math.round(value * 100)}%`;
            }
        }
    }

    /**
     * Métodos públicos para integración con el juego
     */
    
    // Llamada de número
    onNumberCalled(number) {
        this.playSound('numberCall');
    }
    
    // Marcado de número
    onNumberMarked(number, isAutoDaub = false) {
        if (isAutoDaub) {
            this.playSound('autoDaubMark');
        } else {
            this.playSound('numberMark');
        }
    }
    
    // Compra de cartón
    onCardPurchased() {
        this.playSound('cardPurchase');
    }
    
    // Cambio de sala
    onRoomChanged(newRoom) {
        this.playSound('roomChange');
    }
    
    // Victorias
    onLineWin() {
        this.playSound('lineWin');
    }
    
    onTwoLinesWin() {
        this.playSound('twoLinesWin');
    }
    
    onBingoWin() {
        this.playSound('bingoWin');
    }
    
    onJackpotWin() {
        this.playSound('jackpotWin');
    }
    
    // Eventos de nivel
    onLevelUp(newLevel) {
        this.playSound('levelUp');
    }
    
    onVipUnlock() {
        this.playSound('vipUnlock');
    }
    
    // Eventos de chat
    onMessageReceived() {
        this.playSound('messageReceived', { volume: 0.3 });
    }
    
    onEmojiSent() {
        this.playSound('emojiSent', { volume: 0.2 });
    }
    
    // Eventos de interfaz
    onButtonClick() {
        this.playSound('buttonClick', { volume: 0.3 });
    }
    
    onButtonHover() {
        this.playSound('buttonHover', { volume: 0.2 });
    }
    
    onNotification() {
        this.playSound('notification');
    }
    
    onError() {
        this.playSound('error');
    }

    /**
     * Cargar configuración
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('premiumSoundSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.config = { ...this.config, ...settings };
                this.updateSoundInterface();
            }
        } catch (error) {
            console.log('⚠️ Error cargando configuración de sonido:', error);
        }
    }

    /**
     * Guardar configuración
     */
    saveSettings() {
        try {
            localStorage.setItem('premiumSoundSettings', JSON.stringify(this.config));
        } catch (error) {
            console.log('⚠️ Error guardando configuración de sonido:', error);
        }
    }

    /**
     * Destruir sistema
     */
    destroy() {
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        document.getElementById('premiumSoundPanel')?.remove();
        console.log('🔊 Premium Sound System destruido');
    }
}

// CSS para el sistema de sonidos
const premiumSoundCSS = `
.premium-sound-panel {
    margin-bottom: var(--spacing-lg);
    animation: slideInRight 0.8s ease-out;
}

.sound-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--glass-border);
}

.sound-header h4 {
    color: var(--premium-gold);
    font-size: 1.1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.sound-toggle .sound-btn {
    width: 40px;
    height: 40px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-round);
    color: white;
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
}

.sound-btn:hover, .sound-btn.active {
    background: var(--gradient-gold);
    color: var(--premium-royal-blue-dark);
    border-color: var(--premium-gold);
}

.sound-controls {
    animation: fadeInUp 0.6s ease-out;
}

.volume-control {
    margin-bottom: var(--spacing-md);
}

.volume-control label {
    display: block;
    color: white;
    font-weight: 500;
    margin-bottom: var(--spacing-xs);
    font-size: 0.9rem;
}

.volume-control input[type="range"] {
    width: 100%;
    height: 6px;
    background: var(--glass-bg);
    border-radius: 3px;
    outline: none;
    margin-bottom: var(--spacing-xs);
}

.volume-control input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    background: var(--gradient-gold);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--premium-royal-blue-dark);
}

.volume-control input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: var(--gradient-gold);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--premium-royal-blue-dark);
}

.volume-value {
    color: var(--premium-gold);
    font-weight: 600;
    font-size: 0.8rem;
    float: right;
}

.sound-options {
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin: var(--spacing-md) 0;
}

.sound-option {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    cursor: pointer;
    color: white;
    font-size: 0.9rem;
}

.sound-option:last-child {
    margin-bottom: 0;
}

.sound-option input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--premium-gold);
}

.sound-test {
    margin-top: var(--spacing-md);
}

.sound-test h5 {
    color: var(--premium-gold);
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
}

.test-buttons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);
}

.test-btn {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: white;
    padding: var(--spacing-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: 0.8rem;
}

.test-btn:hover {
    background: var(--premium-gold);
    color: var(--premium-royal-blue-dark);
    border-color: var(--premium-gold);
    transform: translateY(-2px);
}

@media (max-width: 768px) {
    .test-buttons {
        grid-template-columns: 1fr;
    }
    
    .volume-control input[type="range"] {
        height: 8px;
    }
    
    .volume-control input[type="range"]::-webkit-slider-thumb {
        width: 24px;
        height: 24px;
    }
}
`;

// Inyectar CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = premiumSoundCSS;
document.head.appendChild(styleSheet);

// Exportar clase
window.PremiumSoundSystem = PremiumSoundSystem; 