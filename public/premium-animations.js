/* ===== SISTEMA DE ANIMACIONES PREMIUM v3.0 ===== */
/* Animaciones cinematográficas para experiencia inmersiva */

class PremiumAnimationSystem {
    constructor(bingoGame) {
        this.bingoGame = bingoGame;
        this.activeAnimations = new Map();
        this.animationQueue = [];
        this.isProcessing = false;
        
        // Configuración de animaciones
        this.config = {
            enabled: true,
            quality: 'high', // 'low', 'medium', 'high', 'ultra'
            particlesEnabled: true,
            glowEffects: true,
            screenShake: true,
            cinematicMode: false
        };
        
        // Elementos de efectos
        this.particleContainer = null;
        this.overlayContainer = null;
        this.cinematicContainer = null;
        
        console.log('✨ Premium Animation System inicializando...');
        this.initializeContainers();
        this.createInterface();
        this.loadSettings();
    }

    /**
     * Inicializar contenedores de efectos
     */
    initializeContainers() {
        // Contenedor de partículas
        this.particleContainer = document.createElement('div');
        this.particleContainer.id = 'particleContainer';
        this.particleContainer.className = 'particle-container';
        this.particleContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9998;
            overflow: hidden;
        `;
        document.body.appendChild(this.particleContainer);
        
        // Contenedor de overlays
        this.overlayContainer = document.createElement('div');
        this.overlayContainer.id = 'overlayContainer';
        this.overlayContainer.className = 'overlay-container';
        this.overlayContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            overflow: hidden;
        `;
        document.body.appendChild(this.overlayContainer);
        
        // Contenedor cinemático
        this.cinematicContainer = document.createElement('div');
        this.cinematicContainer.id = 'cinematicContainer';
        this.cinematicContainer.className = 'cinematic-container';
        this.cinematicContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10000;
            overflow: hidden;
            display: none;
        `;
        document.body.appendChild(this.cinematicContainer);
    }

    /**
     * Crear interfaz de configuración
     */
    createInterface() {
        const animationPanel = document.createElement('div');
        animationPanel.id = 'premiumAnimationPanel';
        animationPanel.className = 'premium-animation-panel card-premium';
        
        animationPanel.innerHTML = `
            <div class="animation-header">
                <h4><i class="fas fa-magic"></i> Efectos Visuales Premium</h4>
                <div class="animation-toggle">
                    <button class="animation-btn ${this.config.enabled ? 'active' : ''}" id="toggleAnimations">
                        <i class="fas fa-${this.config.enabled ? 'eye' : 'eye-slash'}"></i>
                    </button>
                </div>
            </div>
            
            <div class="animation-controls" ${this.config.enabled ? '' : 'style="display: none;"'}>
                <div class="quality-control">
                    <label>Calidad de Efectos</label>
                    <select id="animationQuality">
                        <option value="low" ${this.config.quality === 'low' ? 'selected' : ''}>Básica</option>
                        <option value="medium" ${this.config.quality === 'medium' ? 'selected' : ''}>Media</option>
                        <option value="high" ${this.config.quality === 'high' ? 'selected' : ''}>Alta</option>
                        <option value="ultra" ${this.config.quality === 'ultra' ? 'selected' : ''}>Ultra</option>
                    </select>
                </div>
                
                <div class="effect-options">
                    <label class="effect-option">
                        <input type="checkbox" id="particlesEnabled" ${this.config.particlesEnabled ? 'checked' : ''}>
                        <span>Efectos de partículas</span>
                    </label>
                    
                    <label class="effect-option">
                        <input type="checkbox" id="glowEffects" ${this.config.glowEffects ? 'checked' : ''}>
                        <span>Efectos de brillo</span>
                    </label>
                    
                    <label class="effect-option">
                        <input type="checkbox" id="screenShake" ${this.config.screenShake ? 'checked' : ''}>
                        <span>Vibración de pantalla</span>
                    </label>
                    
                    <label class="effect-option">
                        <input type="checkbox" id="cinematicMode" ${this.config.cinematicMode ? 'checked' : ''}>
                        <span>Modo cinemático</span>
                    </label>
                </div>
                
                <div class="animation-test">
                    <h5>Probar Efectos:</h5>
                    <div class="test-buttons">
                        <button class="test-anim-btn" data-effect="numberCall">Número</button>
                        <button class="test-anim-btn" data-effect="victory">Victoria</button>
                        <button class="test-anim-btn" data-effect="levelUp">Nivel</button>
                        <button class="test-anim-btn" data-effect="jackpot">Jackpot</button>
                    </div>
                </div>
            </div>
        `;
        
        // Insertar en el DOM
        const sidebar = document.querySelector('.game-sidebar');
        if (sidebar) {
            sidebar.appendChild(animationPanel);
        } else {
            document.body.appendChild(animationPanel);
        }
        
        this.bindAnimationEvents();
    }

    /**
     * Vincular eventos de la interfaz
     */
    bindAnimationEvents() {
        // Toggle principal
        document.getElementById('toggleAnimations')?.addEventListener('click', () => {
            this.config.enabled = !this.config.enabled;
            this.updateAnimationInterface();
            this.saveSettings();
        });
        
        // Calidad de animaciones
        document.getElementById('animationQuality')?.addEventListener('change', (e) => {
            this.config.quality = e.target.value;
            this.updateQualitySettings();
            this.saveSettings();
        });
        
        // Opciones de efectos
        ['particlesEnabled', 'glowEffects', 'screenShake', 'cinematicMode'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', (e) => {
                this.config[id] = e.target.checked;
                this.saveSettings();
            });
        });
        
        // Botones de prueba
        document.querySelectorAll('.test-anim-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const effect = e.target.dataset.effect;
                this.testAnimation(effect);
            });
        });
    }

    /**
     * Actualizar interfaz de animaciones
     */
    updateAnimationInterface() {
        const toggleBtn = document.getElementById('toggleAnimations');
        const controls = document.querySelector('.animation-controls');
        
        if (toggleBtn) {
            toggleBtn.className = `animation-btn ${this.config.enabled ? 'active' : ''}`;
            toggleBtn.innerHTML = `<i class="fas fa-${this.config.enabled ? 'eye' : 'eye-slash'}"></i>`;
        }
        
        if (controls) {
            controls.style.display = this.config.enabled ? 'block' : 'none';
        }
    }

    /**
     * Actualizar configuración de calidad
     */
    updateQualitySettings() {
        const qualitySettings = {
            low: { maxParticles: 20, animationDuration: 0.5, complexity: 1 },
            medium: { maxParticles: 50, animationDuration: 1, complexity: 2 },
            high: { maxParticles: 100, animationDuration: 1.5, complexity: 3 },
            ultra: { maxParticles: 200, animationDuration: 2, complexity: 4 }
        };
        
        this.qualitySettings = qualitySettings[this.config.quality];
    }

    /**
     * Animación de número llamado
     */
    animateNumberCall(number, element) {
        if (!this.config.enabled) return;
        
        const animation = {
            id: `numberCall_${number}_${Date.now()}`,
            type: 'numberCall',
            element: element,
            number: number
        };
        
        this.queueAnimation(animation);
    }

    /**
     * Ejecutar animación de número llamado
     */
    executeNumberCallAnimation(animation) {
        const { element, number } = animation;
        
        // Efecto de aparición dramática
        if (element) {
            element.style.transform = 'scale(0) rotate(180deg)';
            element.style.opacity = '0';
            
            // Animación de entrada
            setTimeout(() => {
                element.style.transition = 'all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                element.style.transform = 'scale(1.2) rotate(0deg)';
                element.style.opacity = '1';
                
                if (this.config.glowEffects) {
                    element.style.boxShadow = '0 0 30px var(--premium-gold)';
                }
            }, 100);
            
            // Stabilización
            setTimeout(() => {
                element.style.transform = 'scale(1) rotate(0deg)';
                element.style.boxShadow = '';
            }, 900);
        }
        
        // Crear partículas si están habilitadas
        if (this.config.particlesEnabled) {
            this.createNumberParticles(element, number);
        }
        
        // Vibración de pantalla para números especiales
        if (this.config.screenShake && this.isSpecialNumber(number)) {
            this.screenShake(200);
        }
    }

    /**
     * Crear partículas para número
     */
    createNumberParticles(element, number) {
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const particleCount = Math.min(this.qualitySettings.maxParticles / 4, 15);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'number-particle';
            particle.textContent = number;
            
            const angle = (360 / particleCount) * i;
            const distance = 100 + Math.random() * 100;
            const endX = centerX + Math.cos(angle * Math.PI / 180) * distance;
            const endY = centerY + Math.sin(angle * Math.PI / 180) * distance;
            
            particle.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                color: var(--premium-gold);
                font-weight: bold;
                font-size: 1.2rem;
                pointer-events: none;
                z-index: 9999;
                opacity: 1;
                transform: scale(0);
                transition: all 1.5s ease-out;
            `;
            
            this.particleContainer.appendChild(particle);
            
            // Animar partícula
            setTimeout(() => {
                particle.style.left = `${endX}px`;
                particle.style.top = `${endY}px`;
                particle.style.transform = 'scale(1)';
                particle.style.opacity = '0';
            }, 50);
            
            // Limpiar partícula
            setTimeout(() => {
                particle.remove();
            }, 1600);
        }
    }

    /**
     * Animación de victoria
     */
    animateVictory(type, element, prize) {
        if (!this.config.enabled) return;
        
        const animation = {
            id: `victory_${type}_${Date.now()}`,
            type: 'victory',
            victoryType: type,
            element: element,
            prize: prize
        };
        
        this.queueAnimation(animation);
    }

    /**
     * Ejecutar animación de victoria
     */
    executeVictoryAnimation(animation) {
        const { victoryType, element, prize } = animation;
        
        // Diferentes efectos según tipo de victoria
        switch (victoryType) {
            case 'line':
                this.animateLine(element, prize);
                break;
            case 'twoLines':
                this.animateTwoLines(element, prize);
                break;
            case 'bingo':
                this.animateBingo(element, prize);
                break;
            case 'jackpot':
                this.animateJackpot(element, prize);
                break;
        }
        
        // Efecto general de celebración
        this.createCelebrationEffect(victoryType);
    }

    /**
     * Animación de línea
     */
    animateLine(element, prize) {
        if (element) {
            element.style.animation = 'lineWinPulse 2s ease-in-out';
        }
        
        this.showPrizeNotification('¡LÍNEA!', prize, 'var(--premium-gold)');
        
        if (this.config.particlesEnabled) {
            this.createLineParticles();
        }
    }

    /**
     * Animación de dos líneas
     */
    animateTwoLines(element, prize) {
        if (element) {
            element.style.animation = 'twoLinesWinGlow 3s ease-in-out';
        }
        
        this.showPrizeNotification('¡DOS LÍNEAS!', prize, 'var(--premium-silver)');
        
        if (this.config.particlesEnabled) {
            this.createTwoLinesParticles();
        }
        
        if (this.config.screenShake) {
            this.screenShake(500);
        }
    }

    /**
     * Animación de bingo
     */
    animateBingo(element, prize) {
        if (element) {
            element.style.animation = 'bingoWinExplosion 4s ease-in-out';
        }
        
        this.showPrizeNotification('¡BINGO!', prize, 'var(--premium-royal-blue)');
        
        if (this.config.particlesEnabled) {
            this.createBingoParticles();
        }
        
        if (this.config.screenShake) {
            this.screenShake(1000);
        }
        
        // Modo cinemático para bingo
        if (this.config.cinematicMode) {
            this.enterCinematicMode('bingo');
        }
    }

    /**
     * Animación de jackpot
     */
    animateJackpot(element, prize) {
        if (element) {
            element.style.animation = 'jackpotWinSpectacular 6s ease-in-out';
        }
        
        this.showPrizeNotification('¡JACKPOT!', prize, 'var(--premium-gold)', 'ultra');
        
        if (this.config.particlesEnabled) {
            this.createJackpotParticles();
        }
        
        if (this.config.screenShake) {
            this.screenShake(2000);
        }
        
        // Modo cinemático obligatorio para jackpot
        this.enterCinematicMode('jackpot');
    }

    /**
     * Mostrar notificación de premio
     */
    showPrizeNotification(title, prize, color, size = 'normal') {
        const notification = document.createElement('div');
        notification.className = `prize-notification ${size}`;
        notification.innerHTML = `
            <div class="prize-title" style="color: ${color}">${title}</div>
            <div class="prize-amount">€${prize.toFixed(2)}</div>
            <div class="prize-effects"></div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0);
            background: var(--glass-bg-strong);
            backdrop-filter: var(--glass-backdrop);
            border: 2px solid ${color};
            border-radius: var(--radius-xl);
            padding: var(--spacing-2xl);
            text-align: center;
            z-index: 10001;
            opacity: 0;
            transition: all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            box-shadow: 0 0 50px ${color};
        `;
        
        this.overlayContainer.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.style.transform = 'translate(-50%, -50%) scale(1)';
            notification.style.opacity = '1';
        }, 100);
        
        // Animar salida
        setTimeout(() => {
            notification.style.transform = 'translate(-50%, -50%) scale(0)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 800);
        }, size === 'ultra' ? 5000 : 3000);
    }

    /**
     * Crear efecto de celebración general
     */
    createCelebrationEffect(type) {
        if (!this.config.particlesEnabled) return;
        
        const intensity = {
            line: 50,
            twoLines: 100,
            bingo: 200,
            jackpot: 400
        };
        
        const particleCount = Math.min(intensity[type], this.qualitySettings.maxParticles);
        
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                this.createCelebrationParticle(type);
            }, i * 10);
        }
    }

    /**
     * Crear partícula de celebración
     */
    createCelebrationParticle(type) {
        const particle = document.createElement('div');
        particle.className = `celebration-particle ${type}`;
        
        const symbols = {
            line: ['⭐', '✨', '💫'],
            twoLines: ['🎉', '🎊', '⭐', '✨'],
            bingo: ['🏆', '👑', '💎', '🎯', '🔥'],
            jackpot: ['💰', '💎', '👑', '🏆', '⚡', '🌟']
        };
        
        particle.textContent = symbols[type][Math.floor(Math.random() * symbols[type].length)];
        
        const startX = Math.random() * window.innerWidth;
        const startY = window.innerHeight + 50;
        const endX = startX + (Math.random() - 0.5) * 300;
        const endY = Math.random() * window.innerHeight;
        
        particle.style.cssText = `
            position: fixed;
            left: ${startX}px;
            top: ${startY}px;
            font-size: ${1 + Math.random() * 2}rem;
            pointer-events: none;
            z-index: 9999;
            opacity: 1;
            transition: all ${2 + Math.random() * 2}s ease-out;
            transform: rotate(0deg);
        `;
        
        this.particleContainer.appendChild(particle);
        
        // Animar partícula
        setTimeout(() => {
            particle.style.left = `${endX}px`;
            particle.style.top = `${endY}px`;
            particle.style.opacity = '0';
            particle.style.transform = `rotate(${Math.random() * 720}deg)`;
        }, 50);
        
        // Limpiar partícula
        setTimeout(() => {
            particle.remove();
        }, 4000);
    }

    /**
     * Vibración de pantalla
     */
    screenShake(duration = 500) {
        if (!this.config.screenShake) return;
        
        const intensity = 10;
        const body = document.body;
        const originalTransform = body.style.transform;
        
        const shake = () => {
            const x = (Math.random() - 0.5) * intensity;
            const y = (Math.random() - 0.5) * intensity;
            body.style.transform = `translate(${x}px, ${y}px)`;
        };
        
        const interval = setInterval(shake, 50);
        
        setTimeout(() => {
            clearInterval(interval);
            body.style.transform = originalTransform;
        }, duration);
    }

    /**
     * Entrar en modo cinemático
     */
    enterCinematicMode(type) {
        this.cinematicContainer.style.display = 'block';
        this.cinematicContainer.innerHTML = `
            <div class="cinematic-overlay">
                <div class="cinematic-bars">
                    <div class="cinematic-bar top"></div>
                    <div class="cinematic-bar bottom"></div>
                </div>
                <div class="cinematic-content">
                    <div class="cinematic-title">${type === 'jackpot' ? '🎰 JACKPOT REAL 🎰' : '🏆 BINGO REAL 🏆'}</div>
                    <div class="cinematic-subtitle">¡Momentos épicos de BingoRoyal!</div>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            this.cinematicContainer.style.display = 'none';
        }, type === 'jackpot' ? 8000 : 5000);
    }

    /**
     * Animación de subida de nivel
     */
    animateLevelUp(newLevel, element) {
        if (!this.config.enabled) return;
        
        const animation = {
            id: `levelUp_${newLevel}_${Date.now()}`,
            type: 'levelUp',
            level: newLevel,
            element: element
        };
        
        this.queueAnimation(animation);
    }

    /**
     * Ejecutar animación de subida de nivel
     */
    executeLevelUpAnimation(animation) {
        const { level, element } = animation;
        
        // Efecto de resplandor en el elemento de nivel
        if (element) {
            element.style.animation = 'levelUpGlow 2s ease-in-out';
        }
        
        // Mostrar notificación de nivel
        this.showLevelUpNotification(level);
        
        // Crear efecto de partículas de nivel
        if (this.config.particlesEnabled) {
            this.createLevelUpParticles(level);
        }
        
        // Vibración suave
        if (this.config.screenShake) {
            this.screenShake(300);
        }
    }

    /**
     * Mostrar notificación de nivel
     */
    showLevelUpNotification(level) {
        const levelInfo = this.bingoGame.userProgression.levels[level];
        
        const notification = document.createElement('div');
        notification.className = 'level-up-notification';
        notification.innerHTML = `
            <div class="level-up-icon">
                <i class="fas ${levelInfo.icon}"></i>
            </div>
            <div class="level-up-content">
                <div class="level-up-title">¡NIVEL SUPERIOR!</div>
                <div class="level-up-level" style="color: ${levelInfo.color}">
                    ${levelInfo.name}
                </div>
                <div class="level-up-benefits">
                    ${levelInfo.benefits.join(' • ')}
                </div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0);
            background: var(--glass-bg-strong);
            backdrop-filter: var(--glass-backdrop);
            border: 2px solid ${levelInfo.color};
            border-radius: var(--radius-xl);
            padding: var(--spacing-xl);
            text-align: center;
            z-index: 10001;
            opacity: 0;
            transition: all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            box-shadow: 0 0 30px ${levelInfo.color};
            min-width: 300px;
        `;
        
        this.overlayContainer.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.style.transform = 'translate(-50%, -50%) scale(1)';
            notification.style.opacity = '1';
        }, 100);
        
        // Animar salida
        setTimeout(() => {
            notification.style.transform = 'translate(-50%, -50%) scale(0)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 800);
        }, 4000);
    }

    /**
     * Crear partículas de subida de nivel
     */
    createLevelUpParticles(level) {
        const colors = ['var(--premium-gold)', 'var(--premium-silver)', 'var(--premium-royal-blue)'];
        const particleCount = Math.min(30, this.qualitySettings.maxParticles / 3);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'level-up-particle';
            particle.textContent = '⭐';
            
            const startX = window.innerWidth / 2 + (Math.random() - 0.5) * 100;
            const startY = window.innerHeight / 2;
            const endX = startX + (Math.random() - 0.5) * 400;
            const endY = startY - 200 - Math.random() * 200;
            
            particle.style.cssText = `
                position: fixed;
                left: ${startX}px;
                top: ${startY}px;
                color: ${colors[Math.floor(Math.random() * colors.length)]};
                font-size: 1.5rem;
                pointer-events: none;
                z-index: 9999;
                opacity: 1;
                transition: all 3s ease-out;
                transform: scale(0);
            `;
            
            this.particleContainer.appendChild(particle);
            
            // Animar partícula
            setTimeout(() => {
                particle.style.left = `${endX}px`;
                particle.style.top = `${endY}px`;
                particle.style.opacity = '0';
                particle.style.transform = 'scale(1.5)';
            }, i * 100);
            
            // Limpiar partícula
            setTimeout(() => {
                particle.remove();
            }, 3500);
        }
    }

    /**
     * Gestión de cola de animaciones
     */
    queueAnimation(animation) {
        this.animationQueue.push(animation);
        this.processAnimationQueue();
    }

    /**
     * Procesar cola de animaciones
     */
    async processAnimationQueue() {
        if (this.isProcessing || this.animationQueue.length === 0) return;
        
        this.isProcessing = true;
        
        while (this.animationQueue.length > 0) {
            const animation = this.animationQueue.shift();
            await this.executeAnimation(animation);
            await this.delay(100); // Pequeña pausa entre animaciones
        }
        
        this.isProcessing = false;
    }

    /**
     * Ejecutar animación
     */
    async executeAnimation(animation) {
        this.activeAnimations.set(animation.id, animation);
        
        try {
            switch (animation.type) {
                case 'numberCall':
                    this.executeNumberCallAnimation(animation);
                    break;
                case 'victory':
                    this.executeVictoryAnimation(animation);
                    break;
                case 'levelUp':
                    this.executeLevelUpAnimation(animation);
                    break;
            }
        } catch (error) {
            console.error('Error ejecutando animación:', error);
        }
        
        // Limpiar animación después de un tiempo
        setTimeout(() => {
            this.activeAnimations.delete(animation.id);
        }, 5000);
    }

    /**
     * Métodos de prueba
     */
    testAnimation(effect) {
        switch (effect) {
            case 'numberCall':
                this.animateNumberCall(75, document.querySelector('.bingo-cell'));
                break;
            case 'victory':
                this.animateVictory('bingo', null, 150);
                break;
            case 'levelUp':
                this.animateLevelUp(5, null);
                break;
            case 'jackpot':
                this.animateVictory('jackpot', null, 10000);
                break;
        }
    }

    /**
     * Verificar si un número es especial
     */
    isSpecialNumber(number) {
        return number % 10 === 0 || number === 77 || number === 88 || number === 99;
    }

    /**
     * Utilidad de delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cargar configuración
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('premiumAnimationSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.config = { ...this.config, ...settings };
                this.updateQualitySettings();
                this.updateAnimationInterface();
            } else {
                this.updateQualitySettings();
            }
        } catch (error) {
            console.log('⚠️ Error cargando configuración de animaciones:', error);
            this.updateQualitySettings();
        }
    }

    /**
     * Guardar configuración
     */
    saveSettings() {
        try {
            localStorage.setItem('premiumAnimationSettings', JSON.stringify(this.config));
        } catch (error) {
            console.log('⚠️ Error guardando configuración de animaciones:', error);
        }
    }

    /**
     * Destruir sistema
     */
    destroy() {
        // Limpiar contenedores
        this.particleContainer?.remove();
        this.overlayContainer?.remove();
        this.cinematicContainer?.remove();
        
        // Limpiar animaciones activas
        this.activeAnimations.clear();
        this.animationQueue = [];
        
        // Remover panel
        document.getElementById('premiumAnimationPanel')?.remove();
        
        console.log('✨ Premium Animation System destruido');
    }
}

// CSS para animaciones (parte del sistema completo)
const premiumAnimationCSS = `
.premium-animation-panel {
    margin-bottom: var(--spacing-lg);
    animation: fadeInUp 0.8s ease-out;
}

.animation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--glass-border);
}

.animation-header h4 {
    color: var(--premium-gold);
    font-size: 1.1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.animation-toggle .animation-btn {
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

.animation-btn:hover, .animation-btn.active {
    background: var(--gradient-gold);
    color: var(--premium-royal-blue-dark);
    border-color: var(--premium-gold);
}

.quality-control {
    margin-bottom: var(--spacing-md);
}

.quality-control label {
    display: block;
    color: white;
    font-weight: 500;
    margin-bottom: var(--spacing-xs);
    font-size: 0.9rem;
}

.quality-control select {
    width: 100%;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: white;
    padding: var(--spacing-sm);
    font-size: 0.9rem;
}

.effect-options {
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin: var(--spacing-md) 0;
}

.effect-option {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    cursor: pointer;
    color: white;
    font-size: 0.9rem;
}

.effect-option:last-child {
    margin-bottom: 0;
}

.effect-option input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--premium-gold);
}

.test-anim-btn {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: white;
    padding: var(--spacing-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: 0.8rem;
}

.test-anim-btn:hover {
    background: var(--premium-gold);
    color: var(--premium-royal-blue-dark);
    border-color: var(--premium-gold);
    transform: translateY(-2px);
}

/* Animaciones específicas */
@keyframes lineWinPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); box-shadow: 0 0 20px var(--premium-gold); }
}

@keyframes twoLinesWinGlow {
    0%, 100% { transform: scale(1); filter: brightness(1); }
    50% { transform: scale(1.05); filter: brightness(1.5); box-shadow: 0 0 30px var(--premium-silver); }
}

@keyframes bingoWinExplosion {
    0% { transform: scale(1); }
    25% { transform: scale(1.2); }
    50% { transform: scale(0.9); }
    75% { transform: scale(1.1); }
    100% { transform: scale(1); }
}

@keyframes jackpotWinSpectacular {
    0% { transform: scale(1) rotate(0deg); }
    25% { transform: scale(1.3) rotate(5deg); }
    50% { transform: scale(0.8) rotate(-5deg); }
    75% { transform: scale(1.2) rotate(3deg); }
    100% { transform: scale(1) rotate(0deg); }
}

@keyframes levelUpGlow {
    0%, 100% { box-shadow: 0 0 10px var(--premium-gold); }
    50% { box-shadow: 0 0 40px var(--premium-gold); }
}

.cinematic-overlay {
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative;
}

.cinematic-bars {
    position: absolute;
    width: 100%;
    height: 100%;
}

.cinematic-bar {
    position: absolute;
    width: 100%;
    height: 100px;
    background: black;
    animation: cinematicBars 1s ease-in-out;
}

.cinematic-bar.top {
    top: 0;
}

.cinematic-bar.bottom {
    bottom: 0;
}

@keyframes cinematicBars {
    from { height: 0; }
    to { height: 100px; }
}

.cinematic-content {
    text-align: center;
    z-index: 10002;
    animation: cinematicContent 2s ease-in-out;
}

.cinematic-title {
    font-size: 4rem;
    font-weight: bold;
    color: var(--premium-gold);
    text-shadow: 0 0 20px var(--premium-gold);
    margin-bottom: var(--spacing-lg);
}

.cinematic-subtitle {
    font-size: 1.5rem;
    color: white;
    opacity: 0.8;
}

@keyframes cinematicContent {
    0% { opacity: 0; transform: scale(0.5); }
    50% { opacity: 1; transform: scale(1.1); }
    100% { opacity: 1; transform: scale(1); }
}

@media (max-width: 768px) {
    .cinematic-title {
        font-size: 2.5rem;
    }
    
    .cinematic-subtitle {
        font-size: 1.2rem;
    }
    
    .test-buttons {
        grid-template-columns: 1fr;
    }
}
`;

// Inyectar CSS
const premiumAnimationsStyleSheet = document.createElement('style');
premiumAnimationsStyleSheet.textContent = premiumAnimationCSS;
document.head.appendChild(premiumAnimationsStyleSheet);

// Exportar clase
window.PremiumAnimationSystem = PremiumAnimationSystem; 