/* ===== SISTEMA AUTO-DAUB INTELIGENTE v3.0 ===== */
/* Sistema obligatorio en bingos premium españoles */

class AutoDaubSystem {
    constructor(bingoGame) {
        this.bingoGame = bingoGame;
        this.enabled = true;
        this.speed = 'medium'; // 'instant', 'fast', 'medium', 'slow'
        this.soundEnabled = true;
        this.effectsEnabled = true;
        this.manualOverride = false;
        
        // Configuraciones de velocidad (ms)
        this.speeds = {
            instant: 0,
            fast: 200,
            medium: 500,
            slow: 1000
        };
        
        // Cola de números a marcar
        this.markingQueue = [];
        this.isProcessingQueue = false;
        
        // Estadísticas
        this.stats = {
            numbersMarked: 0,
            lastMarkTime: null,
            averageMarkTime: 0
        };
        
        console.log('🎯 Auto-Daub System inicializado');
        this.initializeUI();
    }

    /**
     * Inicializar interfaz de configuración
     */
    initializeUI() {
        this.createConfigPanel();
        this.createStatusIndicator();
        this.bindEvents();
    }

    /**
     * Crear panel de configuración
     */
    createConfigPanel() {
        const configPanel = document.createElement('div');
        configPanel.id = 'autoDaubConfig';
        configPanel.className = 'auto-daub-config card-premium';
        configPanel.innerHTML = `
            <div class="config-header">
                <h4><i class="fas fa-magic"></i> Auto-Daub Inteligente</h4>
                <div class="status-indicator ${this.enabled ? 'active' : 'inactive'}">
                    <i class="fas fa-circle"></i>
                    <span>${this.enabled ? 'ACTIVO' : 'INACTIVO'}</span>
                </div>
            </div>
            
            <div class="config-content">
                <div class="config-row">
                    <label class="config-label">
                        <input type="checkbox" id="enableAutoDaub" ${this.enabled ? 'checked' : ''}>
                        <span class="config-text">Activar marcado automático</span>
                        <div class="config-description">Marca automáticamente los números cuando son cantados</div>
                    </label>
                </div>
                
                <div class="config-row">
                    <label class="config-label">Velocidad de marcado:</label>
                    <div class="speed-selector">
                        <button class="speed-btn ${this.speed === 'instant' ? 'active' : ''}" data-speed="instant">
                            <i class="fas fa-bolt"></i> Instantáneo
                        </button>
                        <button class="speed-btn ${this.speed === 'fast' ? 'active' : ''}" data-speed="fast">
                            <i class="fas fa-tachometer-alt"></i> Rápido
                        </button>
                        <button class="speed-btn ${this.speed === 'medium' ? 'active' : ''}" data-speed="medium">
                            <i class="fas fa-clock"></i> Medio
                        </button>
                        <button class="speed-btn ${this.speed === 'slow' ? 'active' : ''}" data-speed="slow">
                            <i class="fas fa-snail"></i> Lento
                        </button>
                    </div>
                </div>
                
                <div class="config-row">
                    <label class="config-label">
                        <input type="checkbox" id="enableSounds" ${this.soundEnabled ? 'checked' : ''}>
                        <span class="config-text">Sonidos de marcado</span>
                    </label>
                </div>
                
                <div class="config-row">
                    <label class="config-label">
                        <input type="checkbox" id="enableEffects" ${this.effectsEnabled ? 'checked' : ''}>
                        <span class="config-text">Efectos visuales</span>
                    </label>
                </div>
                
                <div class="config-row">
                    <label class="config-label">
                        <input type="checkbox" id="manualOverride" ${this.manualOverride ? 'checked' : ''}>
                        <span class="config-text">Permitir marcado manual</span>
                        <div class="config-description">Permite marcar números manualmente incluso con auto-daub activo</div>
                    </label>
                </div>
                
                <div class="config-stats">
                    <div class="stat-item">
                        <span class="stat-label">Números marcados:</span>
                        <span class="stat-value" id="numbersMarkedStat">${this.stats.numbersMarked}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Tiempo promedio:</span>
                        <span class="stat-value" id="avgMarkTimeStat">${this.stats.averageMarkTime}ms</span>
                    </div>
                </div>
            </div>
        `;
        
        // Insertar en el DOM
        const sidebar = document.querySelector('.game-sidebar') || document.querySelector('.chat-section');
        if (sidebar) {
            sidebar.insertBefore(configPanel, sidebar.firstChild);
        } else {
            document.body.appendChild(configPanel);
        }
    }

    /**
     * Crear indicador de estado flotante
     */
    createStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'autoDaubIndicator';
        indicator.className = `auto-daub-indicator ${this.enabled ? 'active' : 'inactive'}`;
        indicator.innerHTML = `
            <div class="indicator-icon">
                <i class="fas fa-magic"></i>
            </div>
            <div class="indicator-text">
                <div class="indicator-title">Auto-Daub</div>
                <div class="indicator-status">${this.enabled ? 'ACTIVO' : 'INACTIVO'}</div>
            </div>
            <div class="indicator-queue">
                <span id="queueCount">0</span>
            </div>
        `;
        
        document.body.appendChild(indicator);
    }

    /**
     * Vincular eventos
     */
    bindEvents() {
        // Toggle principal
        document.getElementById('enableAutoDaub')?.addEventListener('change', (e) => {
            this.setEnabled(e.target.checked);
        });
        
        // Velocidad
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const speed = e.currentTarget.dataset.speed;
                this.setSpeed(speed);
            });
        });
        
        // Sonidos
        document.getElementById('enableSounds')?.addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
            this.saveSettings();
        });
        
        // Efectos
        document.getElementById('enableEffects')?.addEventListener('change', (e) => {
            this.effectsEnabled = e.target.checked;
            this.saveSettings();
        });
        
        // Override manual
        document.getElementById('manualOverride')?.addEventListener('change', (e) => {
            this.manualOverride = e.target.checked;
            this.saveSettings();
        });
        
        // Interceptar números llamados del juego principal
        this.interceptNumberCalls();
    }

    /**
     * Interceptar llamadas de números del juego
     */
    interceptNumberCalls() {
        // Hook en el método de número llamado del juego principal
        if (this.bingoGame && this.bingoGame.callNumber) {
            const originalCallNumber = this.bingoGame.callNumber.bind(this.bingoGame);
            this.bingoGame.callNumber = (number) => {
                const result = originalCallNumber(number);
                if (result && this.enabled) {
                    this.processCalledNumber(number);
                }
                return result;
            };
        }
        
        // También escuchar eventos de WebSocket para números del servidor
        this.listenForServerNumbers();
    }

    /**
     * Escuchar números del servidor
     */
    listenForServerNumbers() {
        // Si hay WebSocket o EventSource activo
        if (window.eventSource) {
            window.eventSource.addEventListener('numberCalled', (event) => {
                const data = JSON.parse(event.data);
                if (data.number && this.enabled) {
                    this.processCalledNumber(data.number);
                }
            });
        }
    }

    /**
     * Procesar número llamado
     */
    async processCalledNumber(number) {
        if (!this.enabled) return;
        
        console.log(`🎯 Auto-Daub procesando número: ${number}`);
        
        // Agregar a la cola
        this.markingQueue.push({
            number: number,
            timestamp: Date.now(),
            processed: false
        });
        
        this.updateQueueIndicator();
        
        // Procesar cola si no está en progreso
        if (!this.isProcessingQueue) {
            await this.processMarkingQueue();
        }
    }

    /**
     * Procesar cola de marcado
     */
    async processMarkingQueue() {
        if (this.isProcessingQueue || this.markingQueue.length === 0) return;
        
        this.isProcessingQueue = true;
        
        while (this.markingQueue.length > 0) {
            const item = this.markingQueue.shift();
            if (!item.processed) {
                await this.markNumberOnCards(item.number);
                item.processed = true;
                this.updateStats(item.timestamp);
            }
        }
        
        this.isProcessingQueue = false;
        this.updateQueueIndicator();
    }

    /**
     * Marcar número en todos los cartones
     */
    async markNumberOnCards(number) {
        if (!this.bingoGame || !this.bingoGame.userCards) return;
        
        const startTime = performance.now();
        let markedCount = 0;
        
        // Buscar el número en todos los cartones del usuario
        for (const card of this.bingoGame.userCards) {
            if (this.bingoGame.selectedCards.includes(card.id)) {
                const marked = await this.markNumberOnCard(card, number);
                if (marked) markedCount++;
            }
        }
        
        const endTime = performance.now();
        console.log(`✅ Auto-Daub marcó ${markedCount} cartones en ${(endTime - startTime).toFixed(2)}ms`);
        
        // Efectos si se marcó algo
        if (markedCount > 0) {
            this.playMarkSound();
            this.showMarkNotification(number, markedCount);
        }
    }

    /**
     * Marcar número en un cartón específico
     */
    async markNumberOnCard(card, number) {
        // Verificar si el número está en el cartón
        let found = false;
        let cellElement = null;
        
        for (let row = 0; row < card.numbers.length; row++) {
            for (let col = 0; col < card.numbers[row].length; col++) {
                if (card.numbers[row][col] === number) {
                    found = true;
                    
                    // Encontrar el elemento DOM
                    cellElement = document.querySelector(
                        `[data-card-id="${card.id}"][data-row="${row}"][data-col="${col}"]`
                    );
                    break;
                }
            }
            if (found) break;
        }
        
        if (!found || !cellElement) return false;
        
        // Verificar si ya está marcado
        if (card.markedNumbers.includes(number)) return false;
        
        // Aplicar delay basado en la velocidad
        const delay = this.speeds[this.speed];
        if (delay > 0) {
            await this.sleep(delay);
        }
        
        // Marcar en los datos del cartón
        card.markedNumbers.push(number);
        
        // Aplicar efectos visuales
        await this.applyMarkingEffects(cellElement, number);
        
        // Actualizar clase CSS
        cellElement.classList.add('marked');
        
        // Verificar condiciones de victoria
        this.bingoGame.checkVictoryConditions?.(card);
        
        return true;
    }

    /**
     * Aplicar efectos visuales de marcado
     */
    async applyMarkingEffects(element, number) {
        if (!this.effectsEnabled) return;
        
        // Efecto de pulsación
        element.style.transform = 'scale(1.2)';
        element.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        
        // Efecto de partículas
        this.createParticleEffect(element);
        
        // Restaurar después del efecto
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 300);
        
        // Efecto de brillo
        element.classList.add('auto-marked-glow');
        setTimeout(() => {
            element.classList.remove('auto-marked-glow');
        }, 1000);
    }

    /**
     * Crear efecto de partículas
     */
    createParticleEffect(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.className = 'auto-daub-particle';
            particle.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                width: 4px;
                height: 4px;
                background: var(--premium-gold);
                border-radius: 50%;
                pointer-events: none;
                z-index: 10000;
                animation: particleExplode 0.8s ease-out forwards;
                animation-delay: ${i * 0.1}s;
            `;
            
            document.body.appendChild(particle);
            
            setTimeout(() => {
                particle.remove();
            }, 1000);
        }
    }

    /**
     * Reproducir sonido de marcado
     */
    playMarkSound() {
        if (!this.soundEnabled) return;
        
        try {
            // Crear sonido sintético
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('⚠️ Error reproduciendo sonido de auto-daub:', error);
        }
    }

    /**
     * Mostrar notificación de marcado
     */
    showMarkNotification(number, cardCount) {
        const notification = document.createElement('div');
        notification.className = 'auto-daub-notification';
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">Auto-Daub</div>
                <div class="notification-message">Número ${number} marcado en ${cardCount} cartón${cardCount > 1 ? 'es' : ''}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animación de entrada
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Actualizar estadísticas
     */
    updateStats(timestamp) {
        this.stats.numbersMarked++;
        this.stats.lastMarkTime = timestamp;
        
        // Calcular tiempo promedio
        const processingTime = Date.now() - timestamp;
        this.stats.averageMarkTime = Math.round(
            (this.stats.averageMarkTime + processingTime) / 2
        );
        
        // Actualizar UI
        document.getElementById('numbersMarkedStat').textContent = this.stats.numbersMarked;
        document.getElementById('avgMarkTimeStat').textContent = `${this.stats.averageMarkTime}ms`;
    }

    /**
     * Actualizar indicador de cola
     */
    updateQueueIndicator() {
        const queueCount = document.getElementById('queueCount');
        if (queueCount) {
            queueCount.textContent = this.markingQueue.length;
        }
    }

    /**
     * Configurar estado habilitado/deshabilitado
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.updateUI();
        this.saveSettings();
        
        console.log(`🎯 Auto-Daub ${enabled ? 'activado' : 'desactivado'}`);
    }

    /**
     * Configurar velocidad
     */
    setSpeed(speed) {
        this.speed = speed;
        this.updateSpeedUI();
        this.saveSettings();
        
        console.log(`🎯 Auto-Daub velocidad: ${speed} (${this.speeds[speed]}ms)`);
    }

    /**
     * Actualizar UI
     */
    updateUI() {
        const indicator = document.getElementById('autoDaubIndicator');
        const statusElement = document.querySelector('.status-indicator');
        
        if (indicator) {
            indicator.className = `auto-daub-indicator ${this.enabled ? 'active' : 'inactive'}`;
            indicator.querySelector('.indicator-status').textContent = this.enabled ? 'ACTIVO' : 'INACTIVO';
        }
        
        if (statusElement) {
            statusElement.className = `status-indicator ${this.enabled ? 'active' : 'inactive'}`;
            statusElement.querySelector('span').textContent = this.enabled ? 'ACTIVO' : 'INACTIVO';
        }
    }

    /**
     * Actualizar UI de velocidad
     */
    updateSpeedUI() {
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.speed === this.speed);
        });
    }

    /**
     * Guardar configuración
     */
    saveSettings() {
        const settings = {
            enabled: this.enabled,
            speed: this.speed,
            soundEnabled: this.soundEnabled,
            effectsEnabled: this.effectsEnabled,
            manualOverride: this.manualOverride
        };
        
        localStorage.setItem('autoDaubSettings', JSON.stringify(settings));
    }

    /**
     * Cargar configuración
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('autoDaubSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.enabled = settings.enabled ?? true;
                this.speed = settings.speed ?? 'medium';
                this.soundEnabled = settings.soundEnabled ?? true;
                this.effectsEnabled = settings.effectsEnabled ?? true;
                this.manualOverride = settings.manualOverride ?? false;
            }
        } catch (error) {
            console.log('⚠️ Error cargando configuración auto-daub:', error);
        }
    }

    /**
     * Utilidad sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obtener estadísticas
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Resetear estadísticas
     */
    resetStats() {
        this.stats = {
            numbersMarked: 0,
            lastMarkTime: null,
            averageMarkTime: 0
        };
        this.updateStats(Date.now());
    }

    /**
     * Destruir sistema
     */
    destroy() {
        // Limpiar intervalos y event listeners
        this.markingQueue = [];
        this.isProcessingQueue = false;
        
        // Remover elementos del DOM
        document.getElementById('autoDaubConfig')?.remove();
        document.getElementById('autoDaubIndicator')?.remove();
        
        console.log('🎯 Auto-Daub System destruido');
    }
}

// CSS adicional para auto-daub
const autoDaubCSS = `
.auto-daub-config {
    margin-bottom: var(--spacing-lg);
    animation: fadeInUp 0.6s ease-out;
}

.config-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--glass-border);
}

.config-header h4 {
    color: var(--premium-gold);
    font-size: 1.1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.status-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-md);
    font-size: 0.8rem;
    font-weight: 600;
}

.status-indicator.active {
    background: linear-gradient(135deg, rgba(0, 255, 0, 0.2), rgba(0, 255, 0, 0.1));
    color: #00ff00;
}

.status-indicator.inactive {
    background: linear-gradient(135deg, rgba(255, 0, 0, 0.2), rgba(255, 0, 0, 0.1));
    color: #ff6b6b;
}

.config-row {
    margin-bottom: var(--spacing-md);
}

.config-label {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    cursor: pointer;
    color: white;
}

.config-text {
    font-weight: 500;
}

.config-description {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
    margin-top: var(--spacing-xs);
}

.speed-selector {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);
    margin-top: var(--spacing-sm);
}

.speed-btn {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: white;
    padding: var(--spacing-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
}

.speed-btn:hover {
    background: var(--glass-bg-strong);
    transform: translateY(-2px);
}

.speed-btn.active {
    background: var(--gradient-gold);
    color: var(--premium-royal-blue-dark);
    border-color: var(--premium-gold);
}

.config-stats {
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-sm);
    padding: var(--spacing-sm);
    margin-top: var(--spacing-md);
}

.stat-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-xs);
    font-size: 0.85rem;
}

.stat-label {
    color: rgba(255, 255, 255, 0.8);
}

.stat-value {
    color: var(--premium-gold);
    font-weight: 600;
}

.auto-daub-indicator {
    position: fixed;
    top: 100px;
    right: 20px;
    background: var(--glass-bg-strong);
    backdrop-filter: var(--glass-backdrop);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-sm);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    z-index: 1000;
    min-width: 140px;
    transition: all var(--transition-medium);
}

.auto-daub-indicator:hover {
    transform: translateX(-5px);
}

.indicator-icon {
    width: 32px;
    height: 32px;
    background: var(--gradient-gold);
    border-radius: var(--radius-round);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--premium-royal-blue-dark);
}

.indicator-text {
    flex-grow: 1;
}

.indicator-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: white;
}

.indicator-status {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.8);
}

.indicator-queue {
    width: 24px;
    height: 24px;
    background: var(--gradient-royal);
    border-radius: var(--radius-round);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.7rem;
    font-weight: 600;
}

.auto-daub-notification {
    position: fixed;
    top: 150px;
    right: 20px;
    background: var(--glass-bg-strong);
    backdrop-filter: var(--glass-backdrop);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    z-index: 10000;
    transform: translateX(100%);
    opacity: 0;
    transition: all var(--transition-medium);
    min-width: 250px;
}

.auto-daub-notification.show {
    transform: translateX(0);
    opacity: 1;
}

.notification-icon {
    width: 32px;
    height: 32px;
    background: var(--gradient-gold);
    border-radius: var(--radius-round);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--premium-royal-blue-dark);
}

.notification-title {
    font-weight: 600;
    color: var(--premium-gold);
    font-size: 0.9rem;
}

.notification-message {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.9);
}

.auto-marked-glow {
    animation: autoMarkGlow 1s ease-in-out;
}

@keyframes autoMarkGlow {
    0%, 100% { box-shadow: none; }
    50% { box-shadow: 0 0 20px var(--premium-gold); }
}

@keyframes particleExplode {
    0% {
        transform: scale(1) translate(0, 0);
        opacity: 1;
    }
    100% {
        transform: scale(0) translate(var(--random-x, 30px), var(--random-y, -30px));
        opacity: 0;
    }
}

@media (max-width: 768px) {
    .auto-daub-indicator {
        top: 80px;
        right: 10px;
        min-width: 120px;
    }
    
    .auto-daub-notification {
        top: 130px;
        right: 10px;
        min-width: 200px;
    }
    
    .speed-selector {
        grid-template-columns: 1fr;
    }
}
`;

// Inyectar CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = autoDaubCSS;
document.head.appendChild(styleSheet);

// Exportar clase para uso global
window.AutoDaubSystem = AutoDaubSystem; 