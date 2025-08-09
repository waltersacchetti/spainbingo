// Polyfill para requestIdleCallback para mejor compatibilidad
if (!window.requestIdleCallback) {
    window.requestIdleCallback = function(callback) {
        return setTimeout(() => {
            callback({
                didTimeout: false,
                timeRemaining: () => Math.max(0, 50.0)
            });
        }, 1);
    };
}

if (!window.cancelIdleCallback) {
    window.cancelIdleCallback = function(id) {
        clearTimeout(id);
    };
}

// Clase principal del juego
class BingoPro {
    constructor() {
        console.log('Inicializando BingoPro...');
        this.calledNumbers = new Set();
        this.userCards = [];
        this.userBalance = 50.00;
        this.autoPlayInterval = null;
        this.isAutoPlaying = false;
        this.gameHistory = [];
        this.sounds = {};
        this.gameState = 'waiting'; // waiting, playing, paused, finished
        this.currentGameId = null;
        this.gameStartTime = null;
        this.lastNumberCalled = null;
        this.callHistory = [];
        
        // Nuevas variables para el sistema de partidas
        this.currentGame = null;
        this.gameQueue = [];
        this.nextGameStartTime = null;
        this.gameCountdown = null;
        this.isPlayerJoined = false;
        this.selectedCards = [];
        this.cardPrice = 1.00; // 1 euro por cartón
        
        // Variables para juego global
        this.globalGameState = {
            gameId: null,
            startTime: null,
            endTime: null,
            totalPlayers: 0,
            totalCards: 0,
            calledNumbers: new Set(),
            winners: {
                line: null,
                twoLines: null,
                bingo: null
            },
            prizes: {
                line: 0,
                twoLines: 0,
                bingo: 0
            },
            isActive: false
        };
        
        // Variables para bote global
        this.globalJackpot = 67152.10; // Bote global acumulado
        this.jackpotUpdateInterval = null;
        
        // ===== MODOS DE JUEGO =====
        this.gameModes = {
            CLASSIC: {
                id: 'CLASSIC',
                name: 'Bingo Clásico',
                description: 'El bingo tradicional con partidas de 2 minutos',
                duration: 2 * 60 * 1000, // 2 minutos
                numberCallInterval: 3000, // 3 segundos
                cardPrice: 1.00,
                minPlayers: 1,
                maxCards: 30,
                requirements: {
                    level: 0,
                    balance: 0,
                    timeOfDay: 'any'
                },
                prizes: {
                    line: 10,
                    twoLines: 25,
                    bingo: 100
                },
                features: ['Números del 1-90', 'Partidas automáticas', 'Bote compartido'],
                isActive: true
            },
            RAPID: {
                id: 'RAPID',
                name: 'Bingo Rápido',
                description: 'Partidas aceleradas de 1 minuto para jugadores experimentados',
                duration: 1 * 60 * 1000, // 1 minuto
                numberCallInterval: 1500, // 1.5 segundos
                cardPrice: 1.50,
                minPlayers: 3,
                maxCards: 20,
                requirements: {
                    level: 5,
                    balance: 10,
                    timeOfDay: 'any'
                },
                prizes: {
                    line: 15,
                    twoLines: 40,
                    bingo: 150
                },
                features: ['Partidas rápidas', 'Premios aumentados', 'Números más frecuentes'],
                isActive: true
            },
            VIP: {
                id: 'VIP',
                name: 'Bingo VIP',
                description: 'Experiencia premium con premios exclusivos y cartones especiales',
                duration: 3 * 60 * 1000, // 3 minutos
                numberCallInterval: 4000, // 4 segundos
                cardPrice: 3.00,
                minPlayers: 5,
                maxCards: 50,
                requirements: {
                    level: 10,
                    balance: 50,
                    timeOfDay: 'any',
                    vipStatus: true
                },
                prizes: {
                    line: 25,
                    twoLines: 75,
                    bingo: 300
                },
                features: ['Cartones VIP', 'Premios exclusivos', 'Chat privado', 'Soporte prioritario'],
                isActive: true
            },
            NIGHT: {
                id: 'NIGHT',
                name: 'Bingo Nocturno',
                description: 'Partidas especiales solo disponibles por la noche',
                duration: 2.5 * 60 * 1000, // 2.5 minutos
                numberCallInterval: 3500, // 3.5 segundos
                cardPrice: 2.00,
                minPlayers: 2,
                maxCards: 25,
                requirements: {
                    level: 3,
                    balance: 20,
                    timeOfDay: 'night'
                },
                prizes: {
                    line: 20,
                    twoLines: 60,
                    bingo: 200
                },
                features: ['Solo por la noche', 'Ambiente especial', 'Premios nocturnos', 'Números mágicos'],
                isActive: true
            }
        };

        // Modo de juego actual (con persistencia)
        this.currentGameMode = this.loadGameMode() || 'CLASSIC';
        
        // Condiciones de victoria por modo
        this.winConditions = {
            LINE: { name: 'línea', required: 5, prize: 10, probability: 0.15 },
            BINGO: { name: 'bingo', required: 15, prize: 100, probability: 0.02 }
        };
        this.availableNumbers = this.generateNumberPool();
        this.packages = {
            basic: { price: 2.50, cards: 1, validity: '24h', bonus: 0, maxCards: 5 },
            premium: { price: 8.00, cards: 5, validity: '7 días', bonus: 20, maxCards: 20 },
            vip: { price: 15.00, cards: 12, validity: '30 días', bonus: 50, maxCards: 50 }
        };
        // Configuración de seguridad privada
        this._securitySettings = {
            maxCardsPerGame: 50,
            maxBalance: 10000,
            minCallInterval: 1000, // 1 segundo mínimo entre llamadas
            maxAutoPlayDuration: 300000, // 5 minutos máximo
            antiSpamDelay: 500
        };

        // Configuración pública (solo lectura)
        this.securitySettings = new Proxy(this._securitySettings, {
            get: (target, prop) => {
                // Permitir solo lectura de configuraciones no sensibles
                if (prop === 'minCallInterval' || prop === 'antiSpamDelay') {
                    return target[prop];
                }
                return undefined; // Ocultar configuraciones sensibles
            },
            set: () => {
                console.warn('⚠️ Intento de modificación de configuración de seguridad bloqueado');
                return false;
            }
        });
        // Variables para chat en vivo
        this.chatApiUrl = '/api/chat';
        // Usar userId persistente basado en sesión o generar uno único
        this.userId = this.getOrCreateUserId();
        this.userName = 'Jugador';
        this.chatPollingInterval = null;
        this.lastMessageId = null;
        this.newsScrollInterval = null;
        
        // Enhanced Analytics and Statistics
        this.gameAnalytics = {
            totalGamesPlayed: 0,
            totalWins: 0,
            totalLosses: 0,
            totalCardsPurchased: 0,
            totalMoneySpent: 0,
            totalMoneyWon: 0,
            averageGameDuration: 0,
            winRate: 0,
            favoriteNumbers: new Map(),
            luckyCards: [],
            
            // Session statistics
            sessionStats: {
                startTime: new Date(),
                gamesPlayed: 0,
                cardsUsed: 0,
                numbersCalled: 0
            },
            
            // Nuevo sistema de dificultad dinámica
            difficultySystem: {
                currentLevel: 1,
                playerSkill: 0.5, // 0-1, se ajusta basado en el rendimiento
                winRate: 0,
                gamesWon: 0,
                totalGames: 0,
                difficultyMultiplier: 1.0,
                adaptiveEnabled: true,
                lastAdjustment: Date.now()
            },
            
            // Sistema de patrones de juego
            gamePatterns: {
                lastNumbers: [],
                patternDetection: true,
                antiPatternEnabled: true,
                consecutiveWins: 0,
                consecutiveLosses: 0
            }
        };
        
        this.gameHistory = [];
        
        // Performance tracking
        this.performanceMetrics = {
            gameLoadTime: 0,
            numberCallDelay: 0,
            uiUpdateTime: 0,
            memoryUsage: 0
        };
        
        this.initializeGame();
        this.setupEventListeners();
        this.initializeSounds();
        this.updateUI();
        this.initializeLiveChat();
        
        // ===== CONEXIÓN AL BINGO GLOBAL =====
        this.connectToGlobalBingo();
        
        console.log('BingoPro inicializado correctamente');
    }

    initializeGame() {
        console.log('🚀 Inicializando juego de bingo (optimizado)...');
        
        // Inicializar estado del juego
        this.gameState = 'waiting';
        this.currentGameId = this.generateGameId();
        this.isPlayerJoined = false;
        this.calledNumbers = new Set();
        this.callHistory = [];
        this.lastNumberCalled = null;
        this.gameStartTime = new Date();
        
        // Generar pool de números disponibles
        this.availableNumbers = this.generateNumberPool();
        
        // Inicializar cartones del usuario
        this.userCards = [];
        this.selectedCards = [];
        this.favoriteCards = new Set();
        
        // Cargar estado del juego guardado (optimizado)
        this.loadGameState();
        
        // Cargar datos guardados de forma asíncrona para no bloquear
        requestIdleCallback(() => {
            this.loadFavoriteCards();
            this.loadAnalytics();
        });
        
        // NO generar cartones automáticamente - el usuario debe comprarlos
        console.log('Juego profesional: Sin cartones por defecto - El usuario debe comprarlos');
        
        // No seleccionar cartones por defecto
        this.selectedCards = [];
        
        // Actualizar display de forma optimizada
        this.updateDisplay();
        
        // Guardar analytics de forma asíncrona
        requestIdleCallback(() => {
            this.updateAnalyticsDisplay();
            this.saveAnalytics();
        });
        
        console.log('Juego inicializado correctamente');
        
        // Inicializar características de producción de forma asíncrona
        if (securityManager.isProduction()) {
            requestIdleCallback(() => {
                this.setupProductionFeatures();
            });
        }
        
        // Inicializar sistema de bote global
        this.initializeGlobalJackpot();
        
        // Inicializar modos de juego
        this.initializeGameModes();
        
        // Conectar al bingo global inmediatamente para mantener estado
        this.connectToGlobalBingo();
        
        // Inicializar contadores de modo independientes con delay reducido
        setTimeout(() => {
            this.updateAllModeCountdowns();
        }, 500); // Reducido de 1000ms a 500ms
        
        // Actualizar contadores cada 60 segundos (mantener para evitar rate limiting)
        setInterval(() => {
            this.updateAllModeCountdowns();
        }, 60000);
        
        console.log('✅ Inicialización optimizada completada');
    }

    /**
     * Configurar características de producción
     */
    setupProductionFeatures() {
        // Configurar límites más estrictos
        this.maxCardsPerGame = 30;
        this.maxBalance = 5000;
        this.maxAutoPlayDuration = 3 * 60 * 1000; // 3 minutos
        
        // Configurar auditoría
        this.enableAuditLogging = true;
        this.sessionStartTime = Date.now();
        
        // Configurar monitoreo de tiempo
        this.setupTimeMonitoring();
        
        // Configurar alertas de gasto
        this.setupSpendingAlerts();
        
        // Inicializar sistema de juego responsable
        this.initializeResponsibleGaming();
        
        console.log('🔒 Características de producción configuradas');
    }

    /**
     * Configurar monitoreo de tiempo
     */
    setupTimeMonitoring() {
        this.timeAlertShown = {};
        this.sessionStartTime = Date.now();
        
        // Monitorear tiempo cada minuto
        setInterval(() => {
            const sessionTime = Date.now() - this.sessionStartTime;
            const minutes = Math.floor(sessionTime / 60000);
            
            // Alertas de tiempo: 30, 60, 120 minutos
            [30, 60, 120].forEach(alertTime => {
                if (minutes === alertTime && !this.timeAlertShown[alertTime]) {
                    this.showTimeAlert(minutes);
                    this.timeAlertShown[alertTime] = true;
                }
            });
        }, 60000);
    }

    /**
     * Configurar alertas de gasto
     */
    setupSpendingAlerts() {
        this.spendingAlertShown = {};
        this.totalSpent = 0;
        
        // Interceptar compras para monitorear gasto
        const originalBuyCards = this.buyCards;
        this.buyCards = function(quantity) {
            const result = originalBuyCards.call(this, quantity);
            if (result) {
                this.totalSpent += quantity * this.cardPrice;
                this.checkSpendingAlerts(this.totalSpent);
            }
            return result;
        };
    }

    /**
     * Inicializar sistema de juego responsable
     */
    initializeResponsibleGaming() {
        this.responsibleGaming = {
            sessionStartTime: Date.now(),
            totalPlayTime: 0,
            totalSpent: 0,
            breaks: [],
            alerts: {
                time: [30, 60, 120], // minutos
                spending: [50, 100, 200] // euros
            },
            
            // Monitorear tiempo de juego
            updatePlayTime: () => {
                const currentTime = Date.now();
                const sessionTime = currentTime - this.responsibleGaming.sessionStartTime;
                this.responsibleGaming.totalPlayTime = sessionTime;
                
                // Verificar alertas de tiempo
                this.checkTimeAlerts(sessionTime);
            },
            
            // Monitorear gasto
            updateSpending: (amount) => {
                this.responsibleGaming.totalSpent += amount;
                this.checkSpendingAlerts(this.responsibleGaming.totalSpent);
            },
            
            // Tomar descanso
            takeBreak: () => {
                this.responsibleGaming.breaks.push({
                    startTime: Date.now(),
                    duration: 15 * 60 * 1000 // 15 minutos
                });
                this.showBreakReminder();
            },
            
            // Auto-exclusión
            selfExclude: (days) => {
                const exclusionData = {
                    startDate: Date.now(),
                    duration: days * 24 * 60 * 60 * 1000,
                    reason: 'user_request'
                };
                localStorage.setItem('self_exclusion', JSON.stringify(exclusionData));
                this.forceLogout('Auto-exclusión activada');
            }
        };
        
        console.log('🎯 Sistema de juego responsable inicializado');
    }

    /**
     * Verificar alertas de tiempo
     */
    checkTimeAlerts(sessionTime) {
        const minutes = Math.floor(sessionTime / 60000);
        
        this.responsibleGaming.alerts.time.forEach(alertTime => {
            if (minutes === alertTime && !this.timeAlertShown[alertTime]) {
                this.showTimeAlert(minutes);
                this.timeAlertShown[alertTime] = true;
            }
        });
    }

    /**
     * Verificar alertas de gasto
     */
    checkSpendingAlerts(totalSpent) {
        this.responsibleGaming.alerts.spending.forEach(alertAmount => {
            if (totalSpent >= alertAmount && !this.spendingAlertShown[alertAmount]) {
                this.showSpendingAlert(totalSpent);
                this.spendingAlertShown[alertAmount] = true;
            }
        });
    }

    /**
     * Mostrar alerta de tiempo
     */
    showTimeAlert(minutes) {
        const alert = document.createElement('div');
        alert.className = 'responsible-gaming-alert time-alert';
        alert.innerHTML = `
            <div class="alert-content">
                <i class="fas fa-clock"></i>
                <div class="alert-text">
                    <h4>⏰ Recordatorio de Tiempo</h4>
                    <p>Has jugado ${minutes} minutos. Recuerda tomar descansos regulares.</p>
                </div>
                <div class="alert-actions">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">Continuar</button>
                    <button onclick="bingoGame.responsibleGaming.takeBreak()">Tomar Descanso</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(alert);
        
        // Auto-remover después de 30 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 30000);
    }

    /**
     * Mostrar alerta de gasto
     */
    showSpendingAlert(totalSpent) {
        const alert = document.createElement('div');
        alert.className = 'responsible-gaming-alert spending-alert';
        alert.innerHTML = `
            <div class="alert-content">
                <i class="fas fa-euro-sign"></i>
                <div class="alert-text">
                    <h4>💰 Control de Gasto</h4>
                    <p>Has gastado €${totalSpent.toFixed(2)} en esta sesión. Controla tu presupuesto.</p>
                </div>
                <div class="alert-actions">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">Entendido</button>
                    <button onclick="bingoGame.responsibleGaming.selfExclude(1)">Auto-exclusión</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(alert);
        
        // Auto-remover después de 30 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 30000);
    }

    /**
     * Mostrar recordatorio de descanso
     */
    showBreakReminder() {
        const alert = document.createElement('div');
        alert.className = 'responsible-gaming-alert break-alert';
        alert.innerHTML = `
            <div class="alert-content">
                <i class="fas fa-coffee"></i>
                <div class="alert-text">
                    <h4>☕ Tiempo de Descanso</h4>
                    <p>Es recomendable tomar un descanso de 15 minutos. El juego estará disponible cuando regreses.</p>
                </div>
                <div class="alert-actions">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">Continuar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(alert);
        
        // Auto-remover después de 15 minutos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 15 * 60 * 1000);
    }

    /**
     * Sincronizar con el estado del servidor global
     */
    syncWithServerState() {
        // Obtener estado actual del servidor
        this.updateCountdownFromServer();
        
        // Actualizar countdown cada segundo
        if (this.gameCountdown) {
            clearInterval(this.gameCountdown);
        }
        
        this.gameCountdown = setInterval(() => {
            this.updateCountdownFromServer();
        }, 1000);
    }

    /**
     * Actualizar countdown desde el servidor
     */
    async updateCountdownFromServer() {
        try {
            const currentMode = this.getCurrentGameMode();
            const response = await fetch(`/api/bingo/state?mode=${currentMode.id}`);
            const data = await response.json();
            
            if (data.success && data.gameState) {
                const serverState = data.gameState;
                
                // Sincronizar estado del juego
                this.gameState = serverState.gameState;
                
                // Si el servidor está en 'waiting', calcular tiempo restante
                if (serverState.gameState === 'waiting' && serverState.nextGameTime) {
                    const nextGameTime = new Date(serverState.nextGameTime);
                    const now = new Date();
                    const timeLeft = nextGameTime.getTime() - now.getTime();
                    
                    if (timeLeft > 0) {
                        const minutes = Math.floor(timeLeft / 60000);
                        const seconds = Math.floor((timeLeft % 60000) / 1000);
                        this.updateCountdownDisplay(minutes, seconds);
                    } else {
                        // El tiempo se agotó, el servidor debería iniciar el juego
                        this.updateCountdownDisplay(0, 0);
                    }
                } else if (serverState.gameState === 'playing') {
                    // El juego está en curso, mostrar 0:00
                    this.updateCountdownDisplay(0, 0);
                }
                
                // Sincronizar números llamados
                if (serverState.calledNumbers && serverState.calledNumbers.length > this.calledNumbers.size) {
                    this.calledNumbers = new Set(serverState.calledNumbers);
                    this.lastNumberCalled = serverState.lastNumberCalled;
                    this.renderCalledNumbers();
                    this.updateLastNumber();
                    this.renderCards();
                }
            }
            
            // NO llamar updateAllModeCountdowns aquí para evitar peticiones excesivas
            // Solo actualizar el countdown del modo actual
            
        } catch (error) {
            console.log('⚠️ Error sincronizando con servidor:', error);
            // Fallback: mostrar countdown local si no se puede conectar
            this.updateCountdownDisplay(0, 0);
        }
    }

    updateCountdownDisplay(minutes, seconds) {
        const countdownElement = document.getElementById('gameCountdown');
        if (countdownElement) {
            countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    generateGameId() {
        return 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateNumberPool() {
        const numbers = [];
        for (let i = 1; i <= 90; i++) {
            numbers.push(i);
        }
        return numbers;
    }

    /**
     * Inicializar sistema de bote global
     */
    initializeGlobalJackpot() {
        console.log('💰 Inicializando sistema de bote global...');
        
        // Actualizar bote global cada 30 segundos
        this.jackpotUpdateInterval = setInterval(() => {
            this.updateGlobalJackpot();
        }, 30000);
        
        // Actualización inicial
        this.updateGlobalJackpot();
    }

    /**
     * Actualizar bote global
     */
    updateGlobalJackpot() {
        // Simular incremento del bote basado en actividad
        const baseIncrement = Math.random() * 50 + 10; // 10-60 euros por actualización
        const timeMultiplier = 1 + (Date.now() % 3600000) / 3600000; // Variación por hora
        const increment = baseIncrement * timeMultiplier;
        
        this.globalJackpot += increment;
        
        // Actualizar display
        this.updateGlobalJackpotDisplay();
        
        console.log(`💰 Bote global actualizado: €${this.globalJackpot.toFixed(2)} (+€${increment.toFixed(2)})`);
    }

    /**
     * Actualizar display del bote global
     */
    updateGlobalJackpotDisplay() {
        const jackpotElement = document.getElementById('globalJackpot');
        if (jackpotElement) {
            const formattedAmount = this.globalJackpot.toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            jackpotElement.textContent = `€${formattedAmount}`;
            
            // Agregar efecto de animación
            jackpotElement.classList.add('player-count-updated');
            setTimeout(() => {
                jackpotElement.classList.remove('player-count-updated');
            }, 1000);
        }
    }

    /**
     * Obtener o crear un userId único por usuario real
     */
    getOrCreateUserId() {
        // Intentar obtener información del usuario autenticado
        let userInfo = null;
        
        // Verificar si hay sesión de usuario
        const sessionData = localStorage.getItem('bingoroyal_session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                userInfo = session.user;
                console.log('👤 Usuario autenticado encontrado:', userInfo.email || userInfo.firstName);
            } catch (error) {
                console.log('⚠️ Error parseando sesión:', error);
            }
        }
        
        // Verificar si hay authManager disponible
        if (!userInfo && typeof authManager !== 'undefined' && authManager.isUserAuthenticated()) {
            userInfo = authManager.getCurrentUser();
            console.log('👤 Usuario desde authManager:', userInfo.email || userInfo.name);
        }
        
        // Si tenemos información del usuario real, usar su email como identificador único
        if (userInfo && (userInfo.email || userInfo.id)) {
            // Usar email como identificador único para evitar duplicados por navegador
            const realUserId = userInfo.email || `user_${userInfo.id}`;
            console.log('🆔 Usando userId basado en usuario real (email):', realUserId);
            return realUserId;
        }
        
        // Si no hay usuario autenticado, usar userId anónimo persistente
        let anonymousUserId = localStorage.getItem('bingoroyal_anonymous_userId');
        
        if (!anonymousUserId) {
            // Crear un userId anónimo único
            anonymousUserId = 'anonymous_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('bingoroyal_anonymous_userId', anonymousUserId);
            console.log('🆔 Nuevo userId anónimo creado:', anonymousUserId);
        } else {
            console.log('🆔 Usando userId anónimo existente:', anonymousUserId);
        }
        
        return anonymousUserId;
    }

    /**
     * Obtener información del usuario para verificar requisitos
     */
    getUserInfo() {
        let userInfo = null;
        
        // Verificar si hay sesión de usuario
        const sessionData = localStorage.getItem('bingoroyal_session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                userInfo = session.user;
            } catch (error) {
                console.log('⚠️ Error parseando sesión:', error);
            }
        }
        
        // Verificar si hay authManager disponible
        if (!userInfo && typeof authManager !== 'undefined' && authManager.isUserAuthenticated()) {
            userInfo = authManager.getCurrentUser();
        }
        
        return userInfo;
    }

    /**
     * Verificar si es de noche (entre 22:00 y 06:00)
     */
    isNightTime() {
        const now = new Date();
        const hour = now.getHours();
        return hour >= 22 || hour < 6;
    }

    /**
     * Verificar si el usuario cumple los requisitos para un modo de juego
     */
    checkGameModeRequirements(modeId) {
        const mode = this.gameModes[modeId];
        if (!mode || !mode.isActive) {
            return { canPlay: false, reason: 'Modo de juego no disponible' };
        }

        const userInfo = this.getUserInfo();
        const requirements = mode.requirements;

        // Verificar nivel del usuario
        const userLevel = userInfo?.level || 0;
        if (userLevel < requirements.level) {
            return { 
                canPlay: false, 
                reason: `Nivel requerido: ${requirements.level}. Tu nivel: ${userLevel}` 
            };
        }

        // Verificar saldo
        if (this.userBalance < requirements.balance) {
            return { 
                canPlay: false, 
                reason: `Saldo requerido: €${requirements.balance}. Tu saldo: €${this.userBalance.toFixed(2)}` 
            };
        }

        // Verificar hora del día para Bingo Nocturno
        if (requirements.timeOfDay === 'night' && !this.isNightTime()) {
            return { 
                canPlay: false, 
                reason: 'Bingo Nocturno solo disponible entre 22:00 y 06:00' 
            };
        }

        // Verificar estado VIP
        if (requirements.vipStatus && !userInfo?.vipStatus) {
            return { 
                canPlay: false, 
                reason: 'Se requiere estado VIP para este modo' 
            };
        }

        return { canPlay: true, reason: 'Requisitos cumplidos' };
    }

    /**
     * Cambiar modo de juego
     */
    changeGameMode(modeId) {
        console.log(`⚡ Cambiando modo de juego a: ${modeId} (optimizado)`);
        
        const check = this.checkGameModeRequirements(modeId);
        
        if (!check.canPlay) {
            this.showGameModeError(check.reason);
            return false;
        }

        const mode = this.gameModes[modeId];
        this.currentGameMode = modeId;
        
        // Actualizar configuración del juego
        this.cardPrice = mode.cardPrice;
        this.winConditions = {
            LINE: { name: 'línea', required: 5, prize: mode.prizes.line, probability: 0.15 },
            BINGO: { name: 'bingo', required: 15, prize: mode.prizes.bingo, probability: 0.02 }
        };

        // Guardar el nuevo modo en localStorage de forma asíncrona
        requestIdleCallback(() => {
            this.saveGameMode(modeId);
        });
        
        // Limpiar cartones actuales y cargar los del nuevo modo
        this.userCards = [];
        this.loadUserCards();
        
        // NO limpiar completamente el estado - mantener números llamados del servidor
        // this.calledNumbers = new Set();
        // this.lastNumberCalled = null;
        // this.gameState = 'waiting';
        
        // Actualizar UI de forma optimizada
        this.updateGameModeDisplay();
        this.updateCardPriceDisplay();
        this.updateCardInfo();
        this.renderCards(); // Renderizar cartones del nuevo modo
        
        // Cambiar visibilidad de contenedores de números llamados por modo
        this.switchCalledNumbersContainer(modeId);
        
        // Renderizar números llamados del nuevo modo
        this.renderCalledNumbers();
        this.updateLastNumber(); // Limpiar último número
        
        // Reconectar al bingo global del nuevo modo de forma asíncrona
        requestIdleCallback(() => {
            this.connectToGlobalBingo();
        });
        
        // Actualizar countdown inmediatamente para el nuevo modo
        this.updateCountdownFromServer();
        
        // Mostrar confirmación de forma asíncrona
        requestIdleCallback(() => {
            this.showGameModeChanged(mode);
        });
        
        console.log(`✅ Modo de juego cambiado a: ${mode.name} (optimizado)`);
        return true;
    }

    /**
     * Obtener modo de juego actual
     */
    getCurrentGameMode() {
        return this.gameModes[this.currentGameMode];
    }

    /**
     * Guardar modo de juego en localStorage
     */
    saveGameMode(modeId) {
        try {
            localStorage.setItem('bingoroyal_current_mode', modeId);
            console.log(`💾 Modo de juego guardado: ${modeId}`);
        } catch (error) {
            console.error('❌ Error guardando modo de juego:', error);
        }
    }

    /**
     * Cargar modo de juego desde localStorage
     */
    loadGameMode() {
        try {
            const savedMode = localStorage.getItem('bingoroyal_current_mode');
            if (savedMode && this.gameModes[savedMode]) {
                console.log(`📂 Modo de juego cargado: ${savedMode}`);
                return savedMode;
            }
        } catch (error) {
            console.error('❌ Error cargando modo de juego:', error);
        }
        return null;
    }

    /**
     * Guardar cartones del usuario en localStorage (independiente por modo)
     */
    saveUserCards() {
        try {
            const currentMode = this.getCurrentGameMode();
            const cardsData = this.userCards.map(card => ({
                id: card.id,
                numbers: card.numbers,
                purchaseTime: card.purchaseTime,
                purchasePrice: card.purchasePrice,
                gameMode: card.gameMode,
                isFavorite: card.isFavorite
            }));
            
            // Guardar cartones específicos del modo actual
            const storageKey = `bingoroyal_user_cards_${currentMode.id}`;
            localStorage.setItem(storageKey, JSON.stringify(cardsData));
            console.log(`💾 Cartones guardados para modo ${currentMode.id}: ${cardsData.length} cartones`);
        } catch (error) {
            console.error('❌ Error guardando cartones:', error);
        }
    }

    /**
     * Cargar cartones del usuario desde localStorage (independiente por modo)
     */
    loadUserCards() {
        try {
            const currentMode = this.getCurrentGameMode();
            const storageKey = `bingoroyal_user_cards_${currentMode.id}`;
            const savedCards = localStorage.getItem(storageKey);
            
            if (savedCards) {
                const cardsData = JSON.parse(savedCards);
                // Filtrar solo cartones del modo actual
                this.userCards = cardsData
                    .filter(cardData => cardData.gameMode === currentMode.id)
                    .map(cardData => ({
                        ...cardData,
                        purchaseTime: new Date(cardData.purchaseTime)
                    }));
                console.log(`📂 Cartones cargados para modo ${currentMode.id}: ${this.userCards.length} cartones`);
                return true;
            }
        } catch (error) {
            console.error('❌ Error cargando cartones:', error);
        }
        return false;
    }

    /**
     * Guardar estado completo del juego
     */
    saveGameState() {
        this.saveGameMode(this.currentGameMode);
        this.saveUserCards();
        
        // Guardar números llamados
        try {
            localStorage.setItem('bingoroyal_called_numbers', JSON.stringify(Array.from(this.calledNumbers)));
        } catch (error) {
            console.log('⚠️ Error guardando números llamados:', error);
        }
        
        // Guardar último número llamado
        try {
            if (this.lastNumberCalled) {
                localStorage.setItem('bingoroyal_last_number', this.lastNumberCalled.toString());
            }
        } catch (error) {
            console.log('⚠️ Error guardando último número:', error);
        }
        
        console.log('💾 Estado del juego guardado completamente');
    }

    /**
     * Cargar estado completo del juego
     */
    loadGameState() {
        const modeLoaded = this.loadGameMode();
        const cardsLoaded = this.loadUserCards();
        
        if (modeLoaded) {
            this.currentGameMode = modeLoaded;
        }
        
        // Cargar números llamados guardados
        try {
            const savedCalledNumbers = localStorage.getItem('bingoroyal_called_numbers');
            if (savedCalledNumbers) {
                const numbers = JSON.parse(savedCalledNumbers);
                this.calledNumbers = new Set(numbers);
                console.log('📂 Números llamados cargados:', Array.from(this.calledNumbers));
            }
        } catch (error) {
            console.log('⚠️ Error cargando números llamados:', error);
        }
        
        // Cargar último número llamado
        try {
            const lastNumber = localStorage.getItem('bingoroyal_last_number');
            if (lastNumber) {
                this.lastNumberCalled = parseInt(lastNumber);
                console.log('📂 Último número llamado cargado:', this.lastNumberCalled);
            }
        } catch (error) {
            console.log('⚠️ Error cargando último número:', error);
        }
        
        console.log(`📂 Estado del juego cargado - Modo: ${modeLoaded ? 'Sí' : 'No'}, Cartones: ${cardsLoaded ? 'Sí' : 'No'}`);
        return { modeLoaded, cardsLoaded };
    }

    /**
     * Obtener todos los modos disponibles para el usuario
     */
    getAvailableGameModes() {
        const availableModes = [];
        
        for (const [modeId, mode] of Object.entries(this.gameModes)) {
            if (mode.isActive) {
                const check = this.checkGameModeRequirements(modeId);
                availableModes.push({
                    ...mode,
                    canPlay: check.canPlay,
                    reason: check.reason
                });
            }
        }
        
        return availableModes;
    }

    /**
     * Mostrar error de modo de juego
     */
    showGameModeError(message) {
        // Crear modal de error
        const modal = document.createElement('div');
        modal.className = 'game-mode-error-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>⚠️ No puedes jugar este modo</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()">Entendido</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (modal.parentElement) {
                modal.remove();
            }
        }, 5000);
    }

    /**
     * Mostrar confirmación de cambio de modo
     */
    showGameModeChanged(mode) {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = 'game-mode-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>🎮 ${mode.name}</h4>
                <p>${mode.description}</p>
                <div class="mode-features">
                    ${mode.features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remover después de 3 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    /**
     * Actualizar display del modo de juego
     */
    updateGameModeDisplay() {
        const mode = this.getCurrentGameMode();
        const modeDisplay = document.getElementById('currentGameMode');
        
        if (modeDisplay) {
            modeDisplay.textContent = mode.name;
            modeDisplay.className = `game-mode-display mode-${mode.id}`;
        }
    }

    /**
     * Actualizar display del precio de cartones
     */
    updateCardPriceDisplay() {
        const mode = this.getCurrentGameMode();
        const priceDisplay = document.getElementById('cardPrice');
        
        if (priceDisplay) {
            priceDisplay.textContent = `€${mode.cardPrice.toFixed(2)}`;
        }
        
        // También actualizar el precio en el hero section
        const heroPriceDisplay = document.querySelector('.hero-stats .stat-number');
        if (heroPriceDisplay && heroPriceDisplay.textContent.includes('€')) {
            heroPriceDisplay.textContent = `€${mode.cardPrice.toFixed(2)}`;
        }
    }

    /**
     * Inicializar modos de juego
     */
    initializeGameModes() {
        console.log('🎮 Inicializando modos de juego...');
        
        // Actualizar displays iniciales
        this.updateGameModeDisplay();
        this.updateCardPriceDisplay();
        this.updateCardInfo();
        
        // Verificar disponibilidad de modos
        const availableModes = this.getAvailableGameModes();
        console.log('📋 Modos disponibles:', availableModes.map(mode => ({
            name: mode.name,
            canPlay: mode.canPlay,
            reason: mode.reason
        })));
        
        // Mostrar información del modo actual
        const currentMode = this.getCurrentGameMode();
        console.log(`🎯 Modo actual: ${currentMode.name}`);
        
        // Agregar mensaje al chat sobre el modo actual
        this.addChatMessage('system', `🎮 Modo actual: ${currentMode.name} - ${currentMode.description}`);
        
        // Actualizar estado visual de las tarjetas de modo
        setTimeout(() => {
            updateModeCardsVisualState();
        }, 100);
    }

    /**
     * Actualizar información de cartones según el modo
     */
    updateCardInfo() {
        const currentMode = this.getCurrentGameMode();
        const cardInfoElement = document.querySelector('.selected-cards');
        
        if (cardInfoElement) {
            cardInfoElement.innerHTML = `
                <span id="selectedCardsCount">0</span> cartones seleccionados
                <br><small style="color: var(--text-secondary);">Modo: ${currentMode.name}</small>
            `;
        }
    }





    addCard() {
        // Validación de seguridad
        if (this.userCards.length >= this.securitySettings.maxCardsPerGame) {
            console.log('Límite de cartones alcanzado');
            return null;
        }

        const currentMode = this.getCurrentGameMode();
        const card = {
            id: this.generateCardId(),
            numbers: this.generateBingoCard(),
            markedNumbers: new Set(),
            linesCompleted: 0,
            isActive: true,
            createdAt: new Date(),
            lastModified: new Date(),
            winHistory: [],
            // Agregar información del cartón
            totalNumbers: 0,
            emptyCells: 0,
            // Información específica del modo
            gameMode: currentMode.id,
            purchasePrice: currentMode.cardPrice,
            purchaseTime: new Date()
        };
        
        // Calcular estadísticas del cartón
        card.totalNumbers = card.numbers.flat().filter(num => num !== null).length;
        card.emptyCells = card.numbers.flat().filter(num => num === null).length;
        
        this.userCards.push(card);
        return card;
    }

    generateCardId() {
        return 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateBingoCard() {
        const card = [];
        const totalPositions = 27; // 9 columnas x 3 filas
        const numbersToPlace = 15; // Exactamente 15 números
        const emptyPositions = 12; // 12 espacios vacíos con logotipos
        
        // Crear array de todas las posiciones disponibles
        const allPositions = [];
        for (let col = 0; col < 9; col++) {
            for (let row = 0; row < 3; row++) {
                allPositions.push({ col, row });
            }
        }
        
        // Mezclar aleatoriamente todas las posiciones
        for (let i = allPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
        }
        
        // Inicializar el cartón con null en todas las posiciones
        for (let col = 0; col < 9; col++) {
            card[col] = [null, null, null];
        }
        
        // Colocar 15 números aleatoriamente
        const numbersPlaced = [];
        for (let i = 0; i < numbersToPlace; i++) {
            const position = allPositions[i];
            const col = position.col;
            const row = position.row;
            
            // Generar número para esta columna
            const minNumber = col * 10 + 1;
            const maxNumber = Math.min((col + 1) * 10, 90);
            const availableNumbers = [];
            for (let num = minNumber; num <= maxNumber; num++) {
                if (!numbersPlaced.includes(num)) {
                    availableNumbers.push(num);
                }
            }
            
            if (availableNumbers.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableNumbers.length);
                const selectedNumber = availableNumbers[randomIndex];
                card[col][row] = selectedNumber;
                numbersPlaced.push(selectedNumber);
            }
        }
        
        // Ordenar números en cada columna
        for (let col = 0; col < 9; col++) {
            card[col].sort((a, b) => {
                if (a === null && b === null) return 0;
                if (a === null) return 1;
                if (b === null) return -1;
                return a - b;
            });
        }

        return card;
    }

    renderCards() {
        const cardsContainer = document.getElementById('bingoCards');
        if (!cardsContainer) {
            console.log('Contenedor de cartones no encontrado');
            return;
        }
        
        cardsContainer.innerHTML = '';

        this.userCards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            // Asignar colores aleatorios a los cartones
            const colorClasses = ['card-red', 'card-blue', 'card-green', 'card-purple'];
            const randomColor = colorClasses[index % colorClasses.length];
            cardElement.className = `bingo-card ${randomColor}`;
            cardElement.innerHTML = `
                <div class="card-header">
                    <h4><i class="fas fa-ticket-alt"></i> Cartón N° ${index + 1}</h4>
                    <div class="card-status ${card.isActive ? 'active' : 'inactive'}">
                        ${card.isActive ? 'Activo' : 'Inactivo'}
                    </div>
                </div>
                <div class="bingo-card-grid">
                    ${this.renderCardGrid(card)}
                </div>
                <div class="card-info">
                    <small>15 números • 12 espacios</small>
                </div>
            `;
            cardsContainer.appendChild(cardElement);
        });
        
        // Si el modal está abierto, ajustar altura después de renderizar
        if (document.getElementById('bingoCardsModal')?.style.display === 'flex') {
            setTimeout(() => this.adjustModalHeight(), 100);
        }
    }

    renderCardGrid(card) {
        let html = '';
        const logos = ['', '⭐', '🍀', '💎', '🎪', '🎰', '🏆', '🎨'];
        let logoIndex = 0;
        
        console.log(`Renderizando cartón ${card.id}:`, card.numbers);
        console.log('Números llamados:', Array.from(this.calledNumbers));
        
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 9; col++) {
                const number = card.numbers[col][row];
                const isMarked = number && this.calledNumbers.has(number);
                const isEmpty = !number;
                
                // Asignar logotipo aleatorio para celdas vacías
                let logoClass = '';
                let displayContent = '';
                
                if (isEmpty) {
                    const randomLogo = logos[Math.floor(Math.random() * logos.length)];
                    logoClass = `logo-${logoIndex % logos.length}`;
                    displayContent = randomLogo;
                    logoIndex++;
                } else {
                    displayContent = number.toString();
                }
                
                // Debug: mostrar si el número está marcado
                if (number && isMarked) {
                    console.log(`Número ${number} marcado en cartón ${card.id}`);
                }
                
                html += `
                    <div class="bingo-cell ${isMarked ? 'marked' : ''} ${isEmpty ? 'empty' : ''} ${logoClass}" 
                         data-card-id="${card.id}" data-row="${row}" data-col="${col}" data-number="${number || ''}">
                        ${displayContent}
                    </div>
                `;
            }
        }
        
        console.log(`Cartón ${card.id} renderizado con ${Array.from(this.calledNumbers).filter(num => 
            card.numbers.flat().includes(num)).length} números marcados`);
        return html;
    }

    renderCalledNumbers() {
        // Obtener el modo actual y usar su contenedor específico
        const currentMode = this.getCurrentGameMode();
        const containerId = `calledNumbers-${currentMode.id}`;
        let container = document.getElementById(containerId);
        
        console.log(`🎯 Renderizando números llamados para modo: ${currentMode.id} (optimizado)`);
        
        // Si no existe el contenedor específico, usar CLASSIC como fallback
        if (!container) {
            console.log(`⚠️ Contenedor ${containerId} no encontrado, usando CLASSIC como fallback`);
            container = document.getElementById('calledNumbers-CLASSIC');
        }
        
        if (!container) {
            console.log('❌ Contenedor de números llamados no encontrado');
            return;
        }
        
        console.log(`✅ Contenedor encontrado: ${container.id}`);
        
        // Usar DocumentFragment para optimizar el rendimiento
        const fragment = document.createDocumentFragment();
        
        // Asegurar que el contenedor tenga las clases correctas
        container.className = 'numbers-container mode-numbers';
        container.setAttribute('data-mode', currentMode.id);
        
        // Aplicar estilos CSS directamente para asegurar el grid
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(10, 1fr)';
        container.style.gap = '4px';
        container.style.height = '350px';
        container.style.overflowY = 'auto';
        container.style.padding = '12px';
        container.style.background = 'var(--bg-tertiary)';
        container.style.borderRadius = 'var(--radius-md)';
        container.style.width = '100%';
        container.style.boxSizing = 'border-box';
        container.style.border = '2px solid var(--border-color)';
        container.style.minHeight = '350px';
        container.style.marginBottom = 'var(--spacing-md)';

        // Crear grid de 9x10 para los números del 1-90 de forma optimizada
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 10; col++) {
                const number = row * 10 + col + 1;
                if (number <= 90) {
                    const numberDiv = document.createElement('div');
                    numberDiv.className = 'called-number';
                    numberDiv.textContent = number;
                    numberDiv.setAttribute('data-number', number);
                    
                    if (this.calledNumbers.has(number)) {
                        numberDiv.classList.add('called');
                    }
                    
                    fragment.appendChild(numberDiv);
                }
            }
        }
        
        // Limpiar contenedor y agregar fragmento de una vez
        container.innerHTML = '';
        container.appendChild(fragment);
        
        console.log(`✅ Panel de números llamados actualizado para modo ${currentMode.id} (optimizado)`);
    }

    updateLastNumber() {
        const lastNumberElement = document.getElementById('lastNumber');
        if (!lastNumberElement) return;
        
        const calledArray = Array.from(this.calledNumbers);
        
        if (calledArray.length > 0) {
            const lastNumber = calledArray[calledArray.length - 1];
            lastNumberElement.textContent = lastNumber;
            lastNumberElement.style.animation = 'none';
            setTimeout(() => {
                lastNumberElement.style.animation = 'pulse 2s infinite';
            }, 10);
        } else {
            lastNumberElement.textContent = '-';
        }
    }

    updateStats() {
        const numbersCalledElement = document.getElementById('numbersCalled');
        const numbersMarkedElement = document.getElementById('numbersMarked');
        const linesCompletedElement = document.getElementById('linesCompleted');
        const totalPlayersElement = document.getElementById('totalPlayers');
        const totalCardsElement = document.getElementById('totalCards');
        const gameTimeElement = document.getElementById('gameTime');
        const winRateElement = document.getElementById('winRate');
        const totalWinningsElement = document.getElementById('totalWinnings');
        
        if (numbersCalledElement) {
            numbersCalledElement.textContent = this.calledNumbers.size;
        }
        
        let totalMarked = 0;
        let totalLines = 0;
        
        this.userCards.forEach(card => {
            totalMarked += this.countMarkedNumbers(card);
            totalLines += this.countCompletedLines(card);
        });
        
        if (numbersMarkedElement) {
            numbersMarkedElement.textContent = totalMarked;
        }
        if (linesCompletedElement) {
            linesCompletedElement.textContent = totalLines;
        }
        
        // Estadísticas adicionales
        if (totalPlayersElement) {
            // Usar el mismo valor que se muestra en el hero section
            const currentPlayers = this.globalGameState?.totalPlayers || 0;
            totalPlayersElement.textContent = currentPlayers;
        }
        
        if (totalCardsElement) {
            totalCardsElement.textContent = this.globalGameState?.totalCards || this.userCards.length;
        }
        
        if (gameTimeElement) {
            const now = new Date();
            const startTime = this.gameStartTime || now;
            const elapsed = Math.floor((now - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            gameTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (winRateElement) {
            const winRate = this.gameAnalytics.totalGamesPlayed > 0 
                ? Math.round((this.gameAnalytics.totalWins / this.gameAnalytics.totalGamesPlayed) * 100)
                : 0;
            winRateElement.textContent = `${winRate}%`;
        }
        
        if (totalWinningsElement) {
            totalWinningsElement.textContent = `€${this.gameAnalytics.totalMoneyWon.toFixed(2)}`;
        }
    }

    countMarkedNumbers(card) {
        let count = 0;
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 9; col++) {
                const number = card.numbers[col][row];
                if (number && this.calledNumbers.has(number)) {
                    count++;
                }
            }
        }
        return count;
    }

    countCompletedLines(card) {
        let lines = 0;
        
        for (let row = 0; row < 3; row++) {
            let rowComplete = true;
            for (let col = 0; col < 9; col++) {
                const number = card.numbers[col][row];
                if (number && !this.calledNumbers.has(number)) {
                    rowComplete = false;
                    break;
                }
            }
            if (rowComplete) lines++;
        }

        return lines;
    }

    callNumber() {
        // Validaciones profesionales
        if (this.gameState !== 'playing') {
            console.log('⚠️ Juego no está en estado playing:', this.gameState);
            return;
        }

        if (this.calledNumbers.size >= 90) {
            console.log('🏁 Todos los números han sido llamados');
            this.endGame();
            return;
        }

        // Anti-spam protection profesional
        const now = Date.now();
        if (this.lastCallTime && (now - this.lastCallTime) < this.securitySettings.minCallInterval) {
            console.log('⚠️ Llamada demasiado rápida - Protección anti-spam');
            return;
        }

        const availableNumbers = this.availableNumbers.filter(num => !this.calledNumbers.has(num));
        
        if (availableNumbers.length === 0) {
            console.log('❌ No hay números disponibles');
            this.endGame();
            return;
        }

        // Seleccionar número con lógica estratégica profesional
        const number = this.selectNextNumber(availableNumbers);
        
        console.log(`🎯 Llamando número: ${number}`);
        console.log(`📊 Números disponibles restantes: ${availableNumbers.length}`);
        
        // Agregar número a los llamados con metadata profesional
        this.calledNumbers.add(number);
        this.lastNumberCalled = number;
        this.lastCallTime = now;
        this.callHistory.push({
            number: number,
            timestamp: new Date(),
            gameId: this.currentGameId,
            phase: this.globalGameState?.phase || 'unknown',
            totalCalled: this.calledNumbers.size
        });

        console.log(`✅ Número ${number} agregado. Total llamados: ${this.calledNumbers.size}`);

        // Update analytics profesional
        this.updateAnalytics('number_called', { 
            number,
            phase: this.globalGameState?.phase,
            totalCalled: this.calledNumbers.size,
            gameId: this.currentGameId
        });

        // Efectos profesionales
        this.playNumberSound();
        this.updateDisplay();
        
        // Verificar victorias inmediatamente
        const winResult = this.checkWin();
        if (winResult) {
            console.log('🏆 ¡Victoria detectada!');
            this.endGame();
            return;
        }
        
        // Notificación profesional en chat
        this.addChatMessage('system', `🎯 Número llamado: **${number}** (${this.calledNumbers.size}/90)`);
        
        // Actualizar modal de números llamados si está abierto
        const modal = document.getElementById('calledNumbersModal');
        if (modal && modal.style.display === 'block') {
            this.updateCalledNumbersModal();
        }
        
        // Actualizar estadísticas en tiempo real
        this.updateStats();
    }

    selectNextNumber(availableNumbers) {
        // Algoritmo más inteligente para hacer el juego más desafiante
        const calledCount = this.calledNumbers.size;
        
        // En los primeros 20 números, favorecer números que no ayuden a completar líneas
        if (calledCount < 20) {
            return this.selectStrategicNumber(availableNumbers, 'early');
        }
        // Entre 20-60 números, balance normal
        else if (calledCount < 60) {
            return this.selectStrategicNumber(availableNumbers, 'mid');
        }
        // Después de 60 números, hacer más difícil completar
        else {
            return this.selectStrategicNumber(availableNumbers, 'late');
        }
    }

    selectStrategicNumber(availableNumbers, phase) {
        // Análisis estratégico avanzado de números disponibles
        const strategicAnalysis = this.analyzeStrategicNumbers(availableNumbers);
        
        // Sistema de ponderación dinámica basado en la fase del juego
        const phaseWeights = {
            early: { low: 0.6, mid: 0.3, high: 0.1 },
            mid: { low: 0.3, mid: 0.5, high: 0.2 },
            late: { low: 0.1, mid: 0.3, high: 0.6 }
        };
        
        const weights = phaseWeights[phase];
        
        // Categorizar números por valor estratégico
        const lowValueNumbers = strategicAnalysis.filter(num => num.value < 0.3);
        const midValueNumbers = strategicAnalysis.filter(num => num.value >= 0.3 && num.value <= 0.7);
        const highValueNumbers = strategicAnalysis.filter(num => num.value > 0.7);
        
        // Crear pool de selección ponderada
        let selectionPool = [];
        
        // Agregar números según ponderación de fase
        if (lowValueNumbers.length > 0) {
            const count = Math.ceil(lowValueNumbers.length * weights.low);
            selectionPool.push(...lowValueNumbers.slice(0, count));
        }
        
        if (midValueNumbers.length > 0) {
            const count = Math.ceil(midValueNumbers.length * weights.mid);
            selectionPool.push(...midValueNumbers.slice(0, count));
        }
        
        if (highValueNumbers.length > 0) {
            const count = Math.ceil(highValueNumbers.length * weights.high);
            selectionPool.push(...highValueNumbers.slice(0, count));
        }
        
        // Si no hay suficientes números en el pool, agregar todos los disponibles
        if (selectionPool.length === 0) {
            selectionPool = strategicAnalysis;
        }
        
        // Selección final con algoritmo de ruleta ponderada
        const totalWeight = selectionPool.reduce((sum, num) => sum + (1 - num.value), 0);
        let random = Math.random() * totalWeight;
        
        for (const num of selectionPool) {
            random -= (1 - num.value);
            if (random <= 0) {
                return num.number;
            }
        }
        
        // Fallback: selección aleatoria del pool
        return selectionPool[Math.floor(Math.random() * selectionPool.length)].number;
    }

    analyzeStrategicNumbers(availableNumbers) {
        const strategicAnalysis = [];
        
        availableNumbers.forEach(number => {
            let totalScore = 0;
            let maxPossibleScore = 0;
            
            this.userCards.forEach(card => {
                const cardScore = this.calculateNumberStrategicValue(number, card);
                totalScore += cardScore;
                maxPossibleScore += 10; // Máximo score posible por cartón
            });
            
            // Normalizar el valor entre 0 y 1
            const normalizedValue = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
            
            strategicAnalysis.push({
                number: number,
                value: normalizedValue,
                score: totalScore
            });
        });
        
        // Ordenar por valor estratégico (mayor a menor)
        return strategicAnalysis.sort((a, b) => b.value - a.value);
    }

    calculateNumberStrategicValue(number, card) {
        let value = 0;
        
        // Verificar si el número está en el cartón
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 9; col++) {
                if (card.numbers[col][row] === number) {
                    // Calcular cuántos números de la fila ya están marcados
                    let rowMarked = 0;
                    let rowTotal = 0;
                    
                    for (let c = 0; c < 9; c++) {
                        if (card.numbers[c][row]) {
                            rowTotal++;
                            if (this.calledNumbers.has(card.numbers[c][row])) {
                                rowMarked++;
                            }
                        }
                    }
                    
                    // Calcular valor estratégico de la fila
                    if (rowMarked === 4 && rowTotal === 5) {
                        value += 15; // Muy cerca de completar línea
                    } else if (rowMarked === 3 && rowTotal === 5) {
                        value += 8; // Cerca de completar línea
                    } else if (rowMarked === 2 && rowTotal === 5) {
                        value += 4; // Progreso medio
                    } else if (rowMarked === 1 && rowTotal === 5) {
                        value += 2; // Inicio de línea
                    } else {
                        value += 1; // Valor base
                    }
                    
                    // Bonus por números en esquinas (más difíciles de completar)
                    if ((row === 0 && col === 0) || (row === 0 && col === 8) || 
                        (row === 2 && col === 0) || (row === 2 && col === 8)) {
                        value += 2;
                    }
                    
                    // Bonus por números en el centro (más fáciles de completar)
                    if (row === 1 && col === 4) {
                        value += 1;
                    }
                }
            }
        }
        
        return value;
    }

    checkWin() {
        // Verificar si ya hay ganadores globales
        if (this.globalGameState && this.globalGameState.winners.bingo) {
            // Bingo ya ganado globalmente
            return false;
        }
        
        if (this.globalGameState && this.globalGameState.winners.line) {
            // Línea ya ganada globalmente
            return false;
        }
        
        this.userCards.forEach(card => {
            if (!card.isActive) return;
            
            const winResult = this.checkCardWin(card);
            if (winResult.won) {
                // Verificar si este tipo de premio ya fue ganado globalmente
                if (this.globalGameState && this.globalGameState.winners[winResult.type.toLowerCase()]) {
                    return; // Ya ganado por otro jugador
                }
                
                // Marcar como ganador global
                if (this.globalGameState) {
                    this.globalGameState.winners[winResult.type.toLowerCase()] = {
                        playerId: 'current_user', // En producción sería el ID real del usuario
                        cardId: card.id,
                        timestamp: new Date(),
                        prize: this.globalGameState.prizes[winResult.type.toLowerCase()]
                    };
                }
                
                this.handleWin(card, winResult.type);
            }
        });
    }

    checkCardWin(card) {
        const completedLines = this.countCompletedLines(card);
        const markedCount = this.countMarkedNumbers(card);
        
        // Verificar Bingo (cartón completo) - más difícil
        if (markedCount === 15) {
            return { won: true, type: 'BINGO' };
        }
        
        // Verificar línea - más difícil
        if (completedLines >= 1 && card.linesCompleted < 1) {
            card.linesCompleted = 1;
            return { won: true, type: 'LINE' };
        }

        return { won: false };
    }

    handleWin(card, winType) {
        const winCondition = this.winConditions[winType];
        if (!winCondition) return;

        // Validación de seguridad adicional
        if (!this.validateWin(card, winType)) {
            console.log('Victoria no válida detectada');
            return;
        }

        const prize = this.calculatePrize(winType);
        this.userBalance += prize;
        
        // Registrar la victoria
        const winRecord = {
            type: 'win',
            winType: winType,
            prize: prize,
            numbersCalled: this.calledNumbers.size,
            timestamp: new Date(),
            gameId: this.currentGameId,
            cardId: card.id,
            validation: this.generateWinValidation(card, winType)
        };
        
        this.gameHistory.push(winRecord);
        card.winHistory.push(winRecord);
        
        // Update analytics
        this.updateAnalytics('win', {
            cardId: card.id,
            winType: winType,
            prize: prize
        });
        
        this.showWinModal(winType, prize);
        this.playWinSound();
        this.updateUI();
        
        // Log de seguridad
        console.log(`Victoria registrada: ${winType} - €${prize} - Validación: ${winRecord.validation}`);
    }

    validateWin(card, winType) {
        // Validaciones adicionales de seguridad
        const markedCount = this.countMarkedNumbers(card);
        const completedLines = this.countCompletedLines(card);
        
        switch (winType) {
            case 'BINGO':
                return markedCount === 15 && this.calledNumbers.size >= 30; // Mínimo 30 números llamados
            case 'LINE':
                return completedLines >= 1 && this.calledNumbers.size >= 10; // Mínimo 10 números llamados
            default:
                return false;
        }
    }

    generateWinValidation(card, winType) {
        // Generar un hash de validación para la victoria
        const validationData = {
            cardId: card.id,
            winType: winType,
            numbersCalled: Array.from(this.calledNumbers).sort(),
            timestamp: Date.now(),
            gameId: this.currentGameId
        };
        
        return btoa(JSON.stringify(validationData)).substr(0, 20);
    }

    calculatePrize(winType) {
        const basePrize = this.winConditions[winType].prize;
        
        // Aplicar bonificaciones según el paquete
        let bonus = 0;
        this.userCards.forEach(card => {
            // Calcular bonificación basada en el paquete más alto del usuario
            // (simplificado para este ejemplo)
        });
        
        return basePrize + bonus;
    }

    /**
     * Calcular premios dinámicos basados en el horario
     */
    calculateDynamicPrizes() {
        // Obtener premios del modo actual
        const currentMode = this.getCurrentGameMode();
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay(); // 0 = Domingo, 6 = Sábado
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        let basePrize = currentMode.prizes.bingo; // Premio base del modo actual
        
        // Premio especial cada 2 horas (a las horas pares)
        if (hour % 2 === 0) {
            basePrize = Math.floor(basePrize * 1.5);
        }
        
        // Premio especial los fines de semana a las 21:00
        if (isWeekend && hour === 21) {
            basePrize = Math.floor(basePrize * 2);
        }
        
        // Distribuir el premio base entre las diferentes combinaciones ganadoras
        const prizes = {
            line: Math.floor(basePrize * 0.20),      // 20% del premio total
            twoLines: Math.floor(basePrize * 0.30),  // 30% del premio total
            bingo: Math.floor(basePrize * 0.50)      // 50% del premio total
        };
        
        return {
            basePrize,
            prizes,
            isSpecialGame: basePrize > currentMode.prizes.bingo,
            modeName: currentMode.name
        };
    }

    endGame() {
        console.log('Terminando partida...');
        this.gameState = 'waiting'; // Cambiar a 'waiting' en lugar de 'finished'
        this.stopAutoPlay();
        
        // Update analytics
        this.updateAnalytics('game_end', {
            gameId: this.currentGameId,
            duration: this.gameStartTime ? Date.now() - this.gameStartTime.getTime() : 0,
            numbersCalled: this.calledNumbers.size,
            finalBalance: this.userBalance
        });
        
        this.showGameOverModal();
        
        // La próxima partida se programa desde el servidor global
        // No necesitamos programar localmente
        
        // Resetear estado del jugador
        this.isPlayerJoined = false;
        this.selectedCards = [];
        
        // Actualizar interfaz
        this.updateDisplay();
        this.updateUI();
        
        const currentMode = this.getCurrentGameMode();
        const durationMinutes = Math.floor(currentMode.duration / 60000);
        this.addChatMessage('system', `¡Partida terminada! La próxima partida de ${currentMode.name} comenzará en ${durationMinutes} minutos.`);
        console.log('Juego terminado, estado cambiado a waiting');
    }

    joinGame() {
        if (this.gameState === 'playing') {
            alert('No puedes unirte a una partida que ya ha comenzado');
            return false;
        }

        if (this.selectedCards.length === 0) {
            alert('Debes comprar al menos 1 cartón para unirte a la partida');
            return false;
        }

        this.isPlayerJoined = true;
        this.addChatMessage('system', `¡Te has unido a la partida con ${this.selectedCards.length} cartón(es)!`);
        console.log('Jugador unido a la partida');
        return true;
    }

    buyCards(quantity) {
        // Validación de entrada estricta
        if (!Number.isInteger(quantity) || quantity <= 0) {
            console.warn('⚠️ Intento de compra con cantidad inválida:', quantity);
            alert('❌ Cantidad inválida. Debe ser un número entero positivo.');
            return false;
        }

        // Validación de tipo de datos
        if (typeof quantity !== 'number' || isNaN(quantity)) {
            console.warn('⚠️ Intento de compra con tipo de datos inválido:', typeof quantity);
            alert('❌ Tipo de datos inválido para la cantidad.');
            return false;
        }

        // Obtener precio del modo actual
        const currentMode = this.getCurrentGameMode();
        const cardPrice = currentMode.cardPrice;
        const totalCost = quantity * cardPrice;
        
        console.log('Intentando comprar cartones:', quantity, 'Estado del juego:', this.gameState);
        
        // Validaciones profesionales con límites estrictos
        if (quantity > 20) {
            console.warn('⚠️ Intento de compra excesiva:', quantity);
            alert('❌ Cantidad inválida. Puedes comprar entre 1 y 20 cartones por transacción.');
            return false;
        }
        
        // Validación de saldo con precisión decimal
        if (this.userBalance < totalCost) {
            console.warn('⚠️ Intento de compra con saldo insuficiente:', this.userBalance, '<', totalCost);
            alert(`❌ Saldo insuficiente.\n💰 Necesitas: €${totalCost.toFixed(2)}\n💳 Tienes: €${this.userBalance.toFixed(2)}`);
            return false;
        }

        // Validar estado del juego
        if (this.gameState === 'playing') {
            console.warn('⚠️ Intento de compra durante partida en curso');
            alert('❌ No puedes comprar cartones durante una partida en curso.\n⏰ Espera a que termine la partida actual.');
            return false;
        }
        
        // Validar límite de cartones por juego con configuración de seguridad
        const maxCardsPerGame = this._securitySettings ? this._securitySettings.maxCardsPerGame : 50;
        if (this.userCards.length + quantity > maxCardsPerGame) {
            console.warn('⚠️ Intento de compra excediendo límite:', this.userCards.length + quantity, '>', maxCardsPerGame);
            alert(`❌ Límite de cartones alcanzado.\n📊 Máximo ${maxCardsPerGame} cartones por juego.\n🎯 Ya tienes ${this.userCards.length} cartones.`);
            return false;
        }

        // Validación adicional de seguridad
        if (this.userBalance < 0 || totalCost < 0) {
            console.error('🚨 Valores negativos detectados en compra:', { balance: this.userBalance, cost: totalCost });
            alert('❌ Error de seguridad detectado. Contacta al soporte.');
            return false;
        }

        // Procesar compra profesional
        this.userBalance -= totalCost;
        
        // Generar cartones únicos
        const newCards = [];
        for (let i = 0; i < quantity; i++) {
            const card = this.addCard();
            if (card) {
                card.purchaseTime = new Date();
                card.purchasePrice = cardPrice; // Usar precio del modo actual
                card.gameMode = currentMode.id; // Guardar modo de juego
                newCards.push(card);
            }
        }
        
        // Seleccionar automáticamente los nuevos cartones
        this.selectedCards.push(...newCards);
        
        // Registrar transacción
        this.gameHistory.push({
            type: 'card_purchase',
            quantity: quantity,
            totalCost: totalCost,
            timestamp: new Date(),
            gameId: this.currentGameId
        });
        
        // Update analytics
        this.updateAnalytics('card_purchased', {
            quantity: quantity,
            cost: totalCost,
            balance_after: this.userBalance
        });
        
        // Actualizar interfaz
        this.updateUI();
        this.updateDisplay();
        
        // Notificación profesional
        this.addChatMessage('system', `✅ ${quantity} cartón(es) comprado(s) por €${totalCost.toFixed(2)}\n💰 Saldo restante: €${this.userBalance.toFixed(2)}`);
        
        // Guardar cartones en localStorage
        this.saveUserCards();
        
        // Mostrar confirmación visual
        console.log('🔔 Llamando a showPurchaseConfirmation...');
        this.showPurchaseConfirmation(quantity, totalCost);
        
        console.log(`✅ Compra exitosa: ${quantity} cartones por €${totalCost}`);
        return true;
    }

    showPurchaseConfirmation(quantity, totalCost) {
        console.log('🔔 Mostrando notificación de compra:', quantity, totalCost);
        
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = 'purchase-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle"></i>
                <div class="notification-text">
                    <h4>✅ Compra Exitosa</h4>
                    <p>${quantity} cartón(es) comprado(s) por €${totalCost.toFixed(2)}</p>
                    <small>Saldo restante: €${this.userBalance.toFixed(2)}</small>
                </div>
            </div>
        `;
        
        console.log('🔔 Notificación creada, agregando al DOM...');
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            console.log('🔔 Agregando clase show...');
            notification.classList.add('show');
        }, 100);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            console.log('🔔 Removiendo notificación...');
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                    console.log('🔔 Notificación removida del DOM');
                }
            }, 300);
        }, 3000);
    }

    buyPackage(packageType) {
        console.log('Comprando paquete:', packageType);
        
        // Validar límite de velocidad para compras
        if (!securityManager.validateRateLimit('purchases')) {
            alert('Demasiadas compras rápidas. Espere un momento.');
            return;
        }
        
        const packageInfo = this.packages[packageType];
        if (!packageInfo) {
            console.log('Paquete no encontrado');
            securityManager.logSecurityEvent('invalid_package', `Paquete inválido: ${packageType}`);
            return;
        }

        // Validaciones de seguridad
        if (this.userBalance < packageInfo.price) {
            alert('Saldo insuficiente. Por favor, deposita más fondos.');
            return;
        }

        if (this.userCards.length + packageInfo.cards > this.securitySettings.maxCardsPerGame) {
            alert('Límite de cartones alcanzado para este juego.');
            return;
        }

        // Validar límite de saldo
        if (this.userBalance > securityManager.securityConfig.validationRules.maxBalance) {
            alert('Límite de saldo alcanzado.');
            securityManager.logSecurityEvent('balance_limit_exceeded', `Saldo: ${this.userBalance}`);
            return;
        }

        this.userBalance -= packageInfo.price;
        
        for (let i = 0; i < packageInfo.cards; i++) {
            this.addCard();
        }

        this.gameHistory.push({
            type: 'purchase',
            package: packageType,
            price: packageInfo.price,
            cards: packageInfo.cards,
            timestamp: new Date(),
            gameId: this.currentGameId
        });

        // Registrar evento de auditoría
        securityManager.logEvent('package_purchased', {
            package: packageType,
            price: packageInfo.price,
            cards: packageInfo.cards,
            gameId: this.currentGameId
        });

        this.updateUI();
        this.updateDisplay();
        this.addChatMessage('system', `Compra realizada: ${packageInfo.cards} cartones por €${packageInfo.price}`);
        console.log(`Compra exitosa: ${packageInfo.cards} cartones por €${packageInfo.price}`);
    }

    showDepositModal() {
        console.log('Mostrando modal de depósito');
        const modal = document.getElementById('depositModal');
        if (modal) {
            modal.style.display = 'block';
        } else {
            console.log('Modal de depósito no encontrado');
        }
    }

    processDeposit() {
        const amount = parseFloat(document.getElementById('depositAmount').textContent);
        const paymentMethod = document.querySelector('.payment-method.active');
        const method = paymentMethod ? paymentMethod.dataset.method : 'card';
        
        // Simular procesamiento de pago
        setTimeout(() => {
            this.userBalance += amount;
            this.gameHistory.push({
                type: 'deposit',
                amount: amount,
                method: method,
                timestamp: new Date()
            });
            
            this.closeModal('depositModal');
            this.updateUI();
            this.addChatMessage('system', `Depósito de €${amount} procesado correctamente`);
        }, 2000);
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    addChatMessage(type, message) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        
        const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        // Formatear mensaje del bot con markdown básico
        let formattedMessage = message;
        if (type === 'bot') {
            // Convertir **texto** a <strong>texto</strong>
            formattedMessage = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            // Convertir • a <li>
            formattedMessage = formattedMessage.replace(/•/g, '<li>');
            // Convertir saltos de línea a <br>
            formattedMessage = formattedMessage.replace(/\n/g, '<br>');
            // Envolver listas en <ul>
            if (formattedMessage.includes('<li>')) {
                formattedMessage = formattedMessage.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');
            }
        }
        
        if (type === 'system') {
            messageDiv.innerHTML = `
                <span class="message-time">${time}</span>
                <span class="message-text">${message}</span>
            `;
        } else if (type === 'bot') {
            messageDiv.innerHTML = `
                <span class="message-time">${time}</span>
                <span class="message-user">BingoBot:</span>
                <span class="message-text">${formattedMessage}</span>
            `;
        } else {
            messageDiv.innerHTML = `
                <span class="message-time">${time}</span>
                <span class="message-user">Tú:</span>
                <span class="message-text">${message}</span>
            `;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Inicializar chat en vivo
     */
    initializeLiveChat() {
        // Probar conexión con la API
        this.testChatConnection();
        
        // Cargar mensajes existentes
        this.loadChatMessages();
        
        // Iniciar polling para nuevos mensajes
        this.startChatPolling();
        
        console.log('Chat en vivo inicializado');
    }

    /**
     * Probar conexión con la API del chat
     */
    async testChatConnection() {
        try {
            console.log('🔍 Probando conexión con la API del chat...');
            const response = await fetch(this.chatApiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📡 Estado de la conexión:', response.status, response.statusText);
            
            if (response.ok) {
                console.log('✅ Conexión con la API del chat exitosa');
            } else {
                console.error('❌ Error en la conexión con la API del chat:', response.status);
            }
        } catch (error) {
            console.error('❌ Error probando conexión con la API del chat:', error);
        }
    }

    /**
     * Cargar mensajes del chat
     */
    async loadChatMessages() {
        try {
            const response = await fetch(this.chatApiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.messages) {
                    this.displayChatMessages(data.messages);
                }
            }
        } catch (error) {
            console.error('Error cargando mensajes del chat:', error);
        }
    }

    /**
     * Mostrar mensajes en el chat
     */
    displayChatMessages(messages) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        // Limpiar mensajes existentes
        chatMessages.innerHTML = '';
        
        // Mostrar mensajes en orden cronológico
        messages.reverse().forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${msg.type}`;
            
            if (msg.type === 'system') {
                messageDiv.innerHTML = `
                    <span class="message-time">${msg.time}</span>
                    <span class="message-text">${msg.message}</span>
                `;
            } else if (msg.type === 'bot') {
                messageDiv.innerHTML = `
                    <span class="message-time">${msg.time}</span>
                    <span class="message-user">BingoBot:</span>
                    <span class="message-text">${msg.message}</span>
                `;
            } else {
                const displayName = msg.userId === this.userId ? 'Tú' : msg.userName;
                messageDiv.innerHTML = `
                    <span class="message-time">${msg.time}</span>
                    <span class="message-user">${displayName}:</span>
                    <span class="message-text">${msg.message}</span>
                `;
            }
            
            chatMessages.appendChild(messageDiv);
        });
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Enviar mensaje al chat
     */
    async sendChatMessage(message) {
        try {
            console.log('📤 Enviando mensaje a la API:', message);
            console.log('🔗 URL de la API:', this.chatApiUrl);
            
            const response = await fetch(this.chatApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    userId: this.userId,
                    userName: this.userName
                })
            });
            
            console.log('📥 Respuesta de la API:', response.status, response.statusText);
            
            if (response.ok) {
                const data = await response.json();
                console.log('📋 Datos de respuesta:', data);
                
                if (data.success) {
                    // Mostrar mensaje del usuario
                    this.addChatMessage('user', message);
                    
                    // Mostrar respuesta del bot si existe
                    if (data.botMessage) {
                        console.log('🤖 Respuesta del bot:', data.botMessage.message);
                        setTimeout(() => {
                            this.addChatMessage('bot', data.botMessage.message);
                        }, 500);
                    } else {
                        console.log('⚠️ No hay respuesta del bot en los datos');
                    }
                } else {
                    console.error('❌ Error en la respuesta de la API:', data.error);
                    // Fallback: mostrar mensaje localmente
                    this.addChatMessage('user', message);
                }
            } else {
                console.error('❌ Error HTTP:', response.status, response.statusText);
                // Fallback: mostrar mensaje localmente
                this.addChatMessage('user', message);
            }
        } catch (error) {
            console.error('❌ Error enviando mensaje:', error);
            // Fallback: mostrar mensaje localmente
            this.addChatMessage('user', message);
        }
    }

    /**
     * Iniciar polling para nuevos mensajes
     */
    startChatPolling() {
        this.chatPollingInterval = setInterval(async () => {
            try {
                const response = await fetch(this.chatApiUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.messages && data.messages.length > 0) {
                        const latestMessage = data.messages[0];
                        if (this.lastMessageId !== latestMessage.id) {
                            this.lastMessageId = latestMessage.id;
                            this.loadChatMessages();
                        }
                    }
                }
            } catch (error) {
                console.error('Error en polling del chat:', error);
            }
        }, 3000); // Polling cada 3 segundos
    }

    /**
     * Detener polling del chat
     */
    stopChatPolling() {
        if (this.chatPollingInterval) {
            clearInterval(this.chatPollingInterval);
            this.chatPollingInterval = null;
        }
    }

    initializeSounds() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            this.sounds.number = () => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
            };
            
            this.sounds.win = () => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                const frequencies = [523.25, 659.25, 783.99, 1046.50];
                frequencies.forEach((freq, index) => {
                    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + index * 0.1);
                });
                
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.4);
            };
            
        } catch (e) {
            console.log('Audio no disponible');
        }
    }

    playNumberSound() {
        if (this.sounds.number) {
            this.sounds.number();
        }
    }

    playWinSound() {
        if (this.sounds.win) {
            this.sounds.win();
        }
    }

    showWinModal(winType, prize) {
        const modal = document.getElementById('winModal');
        const winDetails = document.getElementById('winDetails');
        
        if (winDetails) {
            const winCondition = this.winConditions[winType];
            winDetails.innerHTML = `
                <div class="win-celebration">
                    <div class="win-icon">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <h3>¡${winCondition.name.toUpperCase()}!</h3>
                    <div class="win-prize">
                        <span class="prize-amount">€${prize.toFixed(2)}</span>
                        <span class="prize-label">Premio Ganado</span>
                    </div>
                    <div class="win-stats">
                        <div class="stat">
                            <span class="stat-label">Números Llamados:</span>
                            <span class="stat-value">${this.calledNumbers.size}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Saldo Actual:</span>
                            <span class="stat-value">€${this.userBalance.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (modal) {
            modal.style.display = 'block';
        }
    }

    showGameOverModal() {
        const modal = document.getElementById('winModal');
        const winDetails = document.getElementById('winDetails');
        
        if (winDetails) {
            winDetails.innerHTML = `
                <div class="game-over">
                    <div class="game-over-icon">
                        <i class="fas fa-flag-checkered"></i>
                    </div>
                    <h3>¡Fin del Juego!</h3>
                    <p>Se han llamado todos los números del 1 al 90.</p>
                    <div class="final-stats">
                        <div class="stat">
                            <span class="stat-label">Números Llamados:</span>
                            <span class="stat-value">${this.calledNumbers.size}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Saldo Final:</span>
                            <span class="stat-value">€${this.userBalance.toFixed(2)}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Cartones Jugados:</span>
                            <span class="stat-value">${this.userCards.length}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (modal) {
            modal.style.display = 'block';
        }
    }

    newGame() {
        console.log('Iniciando nuevo juego');
        this.calledNumbers.clear();
        this.callHistory = [];
        this.stopAutoPlay();
        this.gameState = 'waiting';
        this.currentGameId = this.generateGameId();
        this.gameStartTime = new Date();
        this.lastNumberCalled = null;
        this.lastCallTime = null;
        
        this.userCards.forEach(card => {
            card.linesCompleted = 0;
            card.markedNumbers.clear();
            card.lastModified = new Date();
        });
        
        this.updateDisplay();
        this.addChatMessage('system', 'Nuevo juego iniciado');
    }

    startNewGame() {
        console.log('🎮 Iniciando nueva partida profesional de Bingo...');
        
        if (this.gameState === 'playing') {
            console.log('⚠️ Ya hay una partida en curso');
            return;
        }
        
        // Obtener configuración del modo de juego actual
        const currentMode = this.getCurrentGameMode();
        console.log(`🎮 Modo de juego: ${currentMode.name}`);
        
        // En un bingo global, el juego funciona independientemente de los cartones del usuario
        // Los cartones del usuario solo afectan si puede ganar, no si el juego puede comenzar
        if (this.userCards.length === 0) {
            console.log('ℹ️ Usuario sin cartones - Juego global continúa, pero usuario no puede ganar');
            this.addChatMessage('system', `ℹ️ ${currentMode.name} iniciado. Compra cartones para participar y ganar premios.`);
        }
        
        // Calcular premios dinámicos basados en el modo actual
        const dynamicPrizes = this.calculateDynamicPrizes();
        
        // Inicializar estado global del juego profesional
        this.globalGameState = {
            gameId: this.generateGameId(),
            startTime: new Date(),
            endTime: null,
            totalPlayers: this.globalGameState?.totalPlayers || 0, // Mantener valor real del servidor
            totalCards: this.userCards.length, // Usar cartones reales del usuario
            calledNumbers: new Set(),
            winners: {
                line: null,
                twoLines: null,
                bingo: null
            },
            prizes: dynamicPrizes.prizes,
            isActive: true,
            phase: 'early', // early, mid, late
            numbersCalled: 0
        };
        
        // Limpiar estado anterior
        this.calledNumbers.clear();
        this.callHistory = [];
        this.lastNumberCalled = null;
        this.gameState = 'playing';
        this.currentGameId = this.globalGameState.gameId;
        this.gameStartTime = new Date();
        
        // Usar cartones seleccionados o todos si no hay seleccionados
        if (this.selectedCards.length === 0 && this.userCards.length > 0) {
            this.selectedCards = [...this.userCards];
        }
        
        // Actualizar interfaz
        this.updateDisplay();
        this.updateUI();
        this.updatePrizeDisplay(dynamicPrizes);
        
        // Update analytics
        this.updateAnalytics('game_start', {
            gameId: this.globalGameState.gameId,
            cardsCount: this.userCards.length,
            isSpecialGame: dynamicPrizes.isSpecialGame,
            basePrize: dynamicPrizes.basePrize
        });
        
        // Agregar mensaje al chat
        const prizeMessage = dynamicPrizes.isSpecialGame 
            ? `🎉 ¡PARTIDA ESPECIAL! Premio total: €${dynamicPrizes.basePrize}`
            : `🎮 ¡Nueva partida iniciada! Premio total: €${dynamicPrizes.basePrize}`;
        
        this.addChatMessage('system', prizeMessage);
        
        // Iniciar llamada automática de números
        this.startAutoCalling();
        
        console.log('Nueva partida global iniciada correctamente');
    }

    startAutoCalling() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
        }
        
        // Obtener configuración del modo de juego actual
        const currentMode = this.getCurrentGameMode();
        const callInterval = currentMode.numberCallInterval;
        
        console.log(`🎲 Iniciando llamada automática en modo ${currentMode.name} (${callInterval}ms entre números)...`);
        
        // Anunciar inicio de partida con información del modo
        this.addChatMessage('system', `🎮 ¡${currentMode.name} ha comenzado! Los números se llamarán automáticamente cada ${callInterval/1000} segundos.`);
        
        this.autoPlayInterval = setInterval(() => {
            if (this.gameState === 'playing' && this.calledNumbers.size < 90) {
                console.log('🎯 Llamando número automáticamente...');
                
                // Actualizar fase del juego
                this.updateGamePhase();
                
                // Llamar número con lógica estratégica
                this.callNumber();
                
                // Verificar victorias
                if (this.checkWin()) {
                    this.endGame();
                    return;
                }
                
                // Verificar si se han llamado todos los números
                if (this.calledNumbers.size >= 90) {
                    console.log('🏁 Todos los números han sido llamados - Fin de partida');
                    this.addChatMessage('system', '🏁 ¡Fin de partida! Se han llamado todos los números del 1 al 90.');
                    this.endGame();
                    return;
                }
                
                // Mostrar progreso cada 10 números
                if (this.calledNumbers.size % 10 === 0) {
                    this.addChatMessage('system', `📊 Progreso: ${this.calledNumbers.size}/90 números llamados`);
                }
                
            } else if (this.calledNumbers.size >= 90) {
                console.log('🏁 Todos los números han sido llamados');
                this.endGame();
            }
        }, 2500); // Llamar número cada 2.5 segundos (más dinámico)
    }

    updateGamePhase() {
        const numbersCalled = this.calledNumbers.size;
        
        if (numbersCalled < 30) {
            this.globalGameState.phase = 'early';
        } else if (numbersCalled < 60) {
            this.globalGameState.phase = 'mid';
        } else {
            this.globalGameState.phase = 'late';
        }
        
        this.globalGameState.numbersCalled = numbersCalled;
    }

    // Función para resetear la experiencia de bienvenida (solo para desarrollo)
    resetWelcomeExperience() {
        localStorage.removeItem('bingoroyal_welcome_visited');
        alert('Experiencia de bienvenida reseteada. Recarga la página para ver la página de bienvenida.');
    }

    toggleAutoPlay() {
        console.log('Cambiando estado de auto play');
        if (this.isAutoPlaying) {
            this.stopAutoPlay();
        } else {
            this.startAutoPlay();
        }
    }

    startAutoPlay() {
        this.isAutoPlaying = true;
        this.gameState = 'playing';
        const btn = document.querySelector('.btn-auto');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-pause"></i> Detener';
            btn.classList.add('playing');
        }
        
        this.autoPlayInterval = setInterval(() => {
            if (this.calledNumbers.size < 90 && this.gameState !== 'finished') {
                this.callNumber();
            } else {
                this.stopAutoPlay();
            }
        }, 2000);
        
        // Límite de tiempo para auto play
        setTimeout(() => {
            if (this.isAutoPlaying) {
                this.stopAutoPlay();
                this.addChatMessage('system', 'Auto play detenido por límite de tiempo');
            }
        }, this.securitySettings.maxAutoPlayDuration);
    }

    stopAutoPlay() {
        this.isAutoPlaying = false;
        this.gameState = 'paused';
        const btn = document.querySelector('.btn-auto');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-play"></i> Auto';
            btn.classList.remove('playing');
        }
        
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }

    updateDisplay() {
        console.log('Actualizando display...');
        console.log('Números llamados:', Array.from(this.calledNumbers));
        console.log('Cartones del usuario:', this.userCards.length);
        
        this.renderCards();
        this.renderCalledNumbers();
        this.updateLastNumber();
        this.updateStats();
        
        console.log('Display actualizado');
    }

    updateUI() {
        const balanceElement = document.getElementById('userBalance');
        const totalCardsElement = document.getElementById('totalCards');
        const activeCardsElement = document.getElementById('activeCards');
        const selectedCardsElement = document.getElementById('selectedCardsCount');
        const joinGameBtn = document.getElementById('joinGameBtn');
        
        // Elementos del preview de cartones
        const cardsCountElement = document.getElementById('cardsCount');
        const activeCardsCountElement = document.getElementById('activeCardsCount');
        
        // Elementos del hero de Mis Cartones
        const totalCardsHero = document.getElementById('totalCardsHero');
        const activeCardsHero = document.getElementById('activeCardsHero');
        const winRateHero = document.getElementById('winRateHero');
        const earningsHero = document.getElementById('earningsHero');
        
        if (balanceElement) {
            balanceElement.textContent = `€${this.userBalance.toFixed(2)}`;
        }
        if (totalCardsElement) {
            totalCardsElement.textContent = this.userCards.length;
        }
        if (activeCardsElement) {
            activeCardsElement.textContent = this.userCards.filter(card => card.isActive).length;
        }
        if (selectedCardsElement) {
            selectedCardsElement.textContent = this.selectedCards.length;
        }
        if (joinGameBtn) {
            joinGameBtn.disabled = this.selectedCards.length === 0 || this.gameState === 'playing';
        }
        
        // Actualizar preview de cartones
        if (cardsCountElement) {
            cardsCountElement.textContent = this.userCards.length;
        }
        if (activeCardsCountElement) {
            activeCardsCountElement.textContent = this.userCards.filter(card => card.isActive).length;
        }
        
        // Actualizar elementos del hero
        if (totalCardsHero) {
            totalCardsHero.textContent = this.userCards.length;
        }
        if (activeCardsHero) {
            activeCardsHero.textContent = this.userCards.filter(card => card.isActive).length;
        }
        if (winRateHero) {
            const winRate = this.gameAnalytics.totalGamesPlayed > 0 
                ? Math.round((this.gameAnalytics.totalWins / this.gameAnalytics.totalGamesPlayed) * 100)
                : 67; // Valor por defecto atractivo
            winRateHero.textContent = `${winRate}%`;
        }
        if (earningsHero) {
            earningsHero.textContent = `€${this.gameAnalytics.totalMoneyWon.toFixed(0)}`;
        }
    }

    /**
     * Actualizar display de premios en la UI
     */
    updatePrizeDisplay(dynamicPrizes) {
        // Actualizar premio principal en el header
        const currentPrizeElement = document.getElementById('currentPrize');
        if (currentPrizeElement) {
            currentPrizeElement.textContent = `€${dynamicPrizes.basePrize}`;
        }
        
        // Actualizar premio en lateral derecho (estadísticas)
        const currentPrizeRight = document.getElementById('currentPrizeRight');
        const mainPrizeRight = currentPrizeRight?.closest('.main-prize');
        if (currentPrizeRight) {
            currentPrizeRight.textContent = `€${dynamicPrizes.basePrize}`;
            
            // Agregar clase especial para partidas especiales
            if (dynamicPrizes.isSpecialGame) {
                mainPrizeRight?.classList.add('special-prize');
            } else {
                mainPrizeRight?.classList.remove('special-prize');
            }
        }
        
        // Actualizar información detallada de premios en el lateral derecho
        this.updateDetailedPrizeInfo(dynamicPrizes);
    }

    /**
     * Actualizar información detallada de premios
     */
    updateDetailedPrizeInfo(dynamicPrizes) {
        const prizeInfoRight = document.getElementById('prizeInfoRight');
        
        const prizeHTML = `
            <div class="prize-breakdown">
                <div class="prize-item">
                    <span class="prize-label">Línea:</span>
                    <span class="prize-amount">€${dynamicPrizes.prizes.line}</span>
                </div>
                <div class="prize-item">
                    <span class="prize-label">Bingo:</span>
                    <span class="prize-amount">€${dynamicPrizes.prizes.bingo}</span>
                </div>
            </div>
        `;
        
        if (prizeInfoRight) {
            prizeInfoRight.innerHTML = prizeHTML;
        }
        
        // Actualizar noticias con información de premios
        this.updateNewsContent(dynamicPrizes);
    }

    /**
     * Actualizar contenido de noticias
     */
    updateNewsContent(dynamicPrizes) {
        const newsContent = document.getElementById('newsContent');
        if (!newsContent) return;
        
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        let newsHTML = '';
        
        // Noticia sobre premio actual
        if (dynamicPrizes.isSpecialGame) {
            newsHTML += `
                <div class="news-item prize-alert">
                    <div class="news-title">🎉 ¡PARTIDA ESPECIAL ACTIVA!</div>
                    <div class="news-description">Premio total: €${dynamicPrizes.basePrize} - ¡No te la pierdas!</div>
                    <div class="news-time">Ahora mismo</div>
                </div>
            `;
        }
        
        // Próximos premios especiales
        if (hour % 2 === 1) {
            const nextSpecialHour = hour + 1;
            newsHTML += `
                <div class="news-item">
                    <div class="news-title">⏰ Próximo Premio Especial</div>
                    <div class="news-description">A las ${nextSpecialHour}:00 - Premio de €1,500</div>
                    <div class="news-time">En ${60 - now.getMinutes()} minutos</div>
                </div>
            `;
        }
        
        // Premio de fin de semana
        if (isWeekend && hour < 21) {
            newsHTML += `
                <div class="news-item prize-alert">
                    <div class="news-title">🌟 Premio Mega del Fin de Semana</div>
                    <div class="news-description">A las 21:00 - Premio de €5,000</div>
                    <div class="news-time">Hoy a las 21:00</div>
                </div>
            `;
        } else if (isWeekend && hour === 21) {
            newsHTML += `
                <div class="news-item prize-alert">
                    <div class="news-title">🔥 ¡PREMIO MEGA ACTIVO!</div>
                    <div class="news-description">€5,000 en juego - ¡Únete ahora!</div>
                    <div class="news-time">Ahora mismo</div>
                </div>
            `;
        }
        
        // Noticias generales
        const generalNews = [
            {
                title: "📈 Récord de Jugadores",
                description: "Más de 1,500 jugadores activos hoy",
                time: "Hace 2 horas"
            },
            {
                title: "🏆 Ganador del Día",
                description: "María G. ganó €900 con Bingo",
                time: "Hace 1 hora"
            },
            {
                title: "🎮 Nuevas Funciones",
                description: "Chat mejorado y noticias en tiempo real",
                time: "Recién actualizado"
            }
        ];
        
        generalNews.forEach(news => {
            newsHTML += `
                <div class="news-item">
                    <div class="news-title">${news.title}</div>
                    <div class="news-description">${news.description}</div>
                    <div class="news-time">${news.time}</div>
                </div>
            `;
        });
        
        newsContent.innerHTML = newsHTML;
        
        // Auto-scroll horizontal cada 5 segundos
        this.startNewsAutoScroll();
    }
    
    startNewsAutoScroll() {
        const newsContent = document.getElementById('newsContent');
        if (!newsContent) return;
        
        // Limpiar intervalo anterior si existe
        if (this.newsScrollInterval) {
            clearInterval(this.newsScrollInterval);
        }
        
        this.newsScrollInterval = setInterval(() => {
            if (newsContent.scrollLeft >= newsContent.scrollWidth - newsContent.clientWidth) {
                newsContent.scrollLeft = 0;
            } else {
                newsContent.scrollLeft += 260; // Ancho de una noticia + gap
            }
        }, 5000);
    }

    setupEventListeners() {
        console.log('Configurando event listeners...');
        
        // Navegación por pestañas
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Actualizar pestañas activas
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Mostrar contenido correspondiente
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                const targetContent = document.getElementById(`${targetTab}-tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });

        // Ajustar modal cuando cambie el tamaño de la ventana
        window.addEventListener('resize', () => {
            if (document.getElementById('bingoCardsModal')?.style.display === 'flex') {
                this.adjustModalHeight();
            }
        });

        // Event delegation para todos los botones
        document.addEventListener('click', (e) => {
            // Botones del juego
            if (e.target.closest('.btn-call')) {
                console.log('Botón llamar clickeado');
                this.callNumber();
            } else if (e.target.closest('.btn-auto')) {
                console.log('Botón auto clickeado');
                this.toggleAutoPlay();
            } else if (e.target.closest('.btn-new-game')) {
                console.log('Botón nuevo juego clickeado');
                this.newGame();
            }
            
            // Botones de compra
            else if (e.target.closest('.btn-buy')) {
                const btn = e.target.closest('.btn-buy');
                const packageType = btn.getAttribute('data-package');
                console.log('Botón comprar clickeado:', packageType);
                if (packageType) {
                    this.buyPackage(packageType);
                }
            }
            
            // Botón depositar
            else if (e.target.closest('.btn-deposit')) {
                console.log('Botón depositar clickeado');
                this.showDepositModal();
            }
            
            // Botón ver números llamados
            else if (e.target.closest('.btn-view-numbers')) {
                console.log('Botón ver números clickeado');
                this.showCalledNumbersModal();
            }
            
            // Botón ver cartones
            else if (e.target.closest('#viewCardsBtn')) {
                console.log('Botón ver cartones clickeado');
                this.showBingoCardsModal();
            }
            
            // Botones de monto
            else if (e.target.classList.contains('amount-btn')) {
                document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                const amount = e.target.dataset.amount;
                const depositAmountElement = document.getElementById('depositAmount');
                if (depositAmountElement) {
                    depositAmountElement.textContent = amount;
                }
            }
            
            // Métodos de pago
            else if (e.target.closest('.payment-method')) {
                document.querySelectorAll('.payment-method').forEach(method => method.classList.remove('active'));
                e.target.closest('.payment-method').classList.add('active');
            }
            
            // Botones de modal
            else if (e.target.closest('#depositModal .btn-confirm')) {
                this.processDeposit();
            } else if (e.target.closest('#depositModal .btn-cancel')) {
                this.closeModal('depositModal');
            } else if (e.target.closest('#winModal .btn-confirm')) {
                this.closeModal('winModal');
            } else if (e.target.closest('#calledNumbersModal .btn-confirm')) {
                this.closeModal('calledNumbersModal');
            } else if (e.target.closest('#bingoCardsModal .btn-confirm')) {
                this.closeBingoCardsModal();
            }
            
            // Botones de cerrar modal (X)
            else if (e.target.closest('#calledNumbersModal .modal-close')) {
                this.closeModal('calledNumbersModal');
            } else if (e.target.closest('#depositModal .modal-close')) {
                this.closeModal('depositModal');
            }
            
            // Cerrar modales al hacer clic fuera
            else if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Eventos de cartones
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('bingo-cell') && !event.target.classList.contains('empty')) {
                const cardId = event.target.dataset.cardId;
                const row = parseInt(event.target.dataset.row);
                const col = parseInt(event.target.dataset.col);
                
                const card = this.userCards.find(c => c.id == cardId);
                if (card) {
                    const number = card.numbers[col][row];
                    if (number) {
                        if (this.calledNumbers.has(number)) {
                            this.calledNumbers.delete(number);
                        } else {
                            this.calledNumbers.add(number);
                        }
                        this.updateDisplay();
                        this.checkWin();
                    }
                }
            }
        });

        // Chat - Event listeners mejorados
        const chatInput = document.getElementById('chatInput');
        const btnSend = document.querySelector('.btn-send');
        
        console.log('🔧 Configurando chat event listeners...');
        console.log('Chat input encontrado:', !!chatInput);
        console.log('Botón enviar encontrado:', !!btnSend);
        
        if (chatInput && btnSend) {
            // Hacer el input editable y funcional
            chatInput.readOnly = false;
            chatInput.disabled = false;
            chatInput.style.pointerEvents = 'auto';
            chatInput.style.userSelect = 'text';
            chatInput.style.webkitUserSelect = 'text';
            
            const sendMessage = () => {
                const message = chatInput.value.trim();
                console.log('📤 Intentando enviar mensaje:', message);
                if (message) {
                    // Usar sendChatMessage en lugar de addChatMessage para enviar al servidor
                    this.sendChatMessage(message);
                    chatInput.value = '';
                    chatInput.focus();
                    console.log('✅ Mensaje enviado correctamente');
                }
            };
            
            // Event listener para el botón enviar
            btnSend.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log('📤 Click en botón enviar');
                sendMessage();
                return false;
            });
            
            // Event listener para Enter en el input
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    console.log('⌨️ Enter presionado en chat');
                    sendMessage();
                    return false;
                }
            });
            
            // Event listener para keydown para prevenir propagación
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
            });
            
            // Event listener para focus
            chatInput.addEventListener('focus', (e) => {
                console.log('🎯 Focus en chat input');
                e.target.select();
            });
            
            console.log('✅ Chat event listeners configurados correctamente');
        } else {
            console.log('❌ Elementos del chat no encontrados');
        }

        // Atajos de teclado
        document.addEventListener('keydown', (event) => {
            // Verificar si el chat está activo
            const chatInput = document.getElementById('chatInput');
            const chatSection = document.getElementById('chatSectionFixed');
            
            // Si el chat está expandido y el input tiene focus, no ejecutar atajos
            if (chatSection && chatSection.classList.contains('expanded') && 
                chatInput && document.activeElement === chatInput) {
                return;
            }
            
            switch(event.key) {
                case ' ':
                    event.preventDefault();
                    this.callNumber();
                    break;
                case 'n':
                case 'N':
                    this.newGame();
                    break;
                case 'a':
                case 'A':
                    this.toggleAutoPlay();
                    break;
            }
        });

        console.log('Event listeners configurados');
    }

    showCalledNumbersModal() {
        console.log('Mostrando modal de números llamados');
        const modal = document.getElementById('calledNumbersModal');
        if (modal) {
            modal.style.display = 'block';
            this.updateCalledNumbersModal();
            
            // Configurar botón de cerrar
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.onclick = () => this.closeCalledNumbersModal();
            }
            
            // Configurar botón de confirmar
            const confirmBtn = modal.querySelector('.btn-confirm');
            if (confirmBtn) {
                confirmBtn.onclick = () => this.closeCalledNumbersModal();
            }
            
            // Cerrar al hacer clic fuera del modal
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.closeCalledNumbersModal();
                }
            };
        } else {
            console.log('Modal de números llamados no encontrado');
        }
    }
    
    closeCalledNumbersModal() {
        const modal = document.getElementById('calledNumbersModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showBingoCardsModal() {
        const modal = document.getElementById('bingoCardsModal');
        if (modal) {
            modal.style.display = 'flex';
            this.updateBingoCardsModal();
            
            // Ajustar altura del modal según el número de cartones
            this.adjustModalHeight();
        }
    }

    closeBingoCardsModal() {
        const modal = document.getElementById('bingoCardsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    updateBingoCardsModal() {
        // Actualizar estadísticas del modal
        const totalCardsElement = document.getElementById('modalTotalCards');
        const activeCardsElement = document.getElementById('modalActiveCards');
        const markedNumbersElement = document.getElementById('modalMarkedNumbers');
        
        if (totalCardsElement) {
            totalCardsElement.textContent = this.userCards.length;
        }
        if (activeCardsElement) {
            activeCardsElement.textContent = this.userCards.filter(card => card.isActive).length;
        }
        if (markedNumbersElement) {
            let totalMarked = 0;
            this.userCards.forEach(card => {
                totalMarked += this.countMarkedNumbers(card);
            });
            markedNumbersElement.textContent = totalMarked;
        }
        
        // Renderizar cartones en el modal
        this.renderCards();
    }

    adjustModalHeight() {
        const modal = document.getElementById('bingoCardsModal');
        const modalContent = modal?.querySelector('.modal-content');
        const cardsGrid = modal?.querySelector('.cards-modal-grid');
        const modalBody = modal?.querySelector('.modal-body');
        
        if (!modal || !modalContent || !cardsGrid || !modalBody) return;
        
        // Calcular altura necesaria basada en el número de cartones
        const cardCount = this.userCards.length;
        const cardsPerRow = window.innerWidth > 1200 ? 3 : window.innerWidth > 768 ? 2 : 1;
        const rowsNeeded = Math.ceil(cardCount / cardsPerRow);
        
        // Altura estimada por fila (cartón + gap + padding)
        const rowHeight = 280; // altura reducida de un cartón + espaciado
        const summaryHeight = 80; // altura del header de estadísticas
        const headerHeight = 60; // altura del header del modal
        const footerHeight = 60; // altura del footer del modal
        const padding = 40; // padding adicional
        
        const estimatedHeight = headerHeight + summaryHeight + (rowsNeeded * rowHeight) + footerHeight + padding;
        
        // Limitar altura máxima al 95% de la ventana
        const maxHeight = window.innerHeight * 0.95;
        const finalHeight = Math.min(estimatedHeight, maxHeight);
        
        // Aplicar altura fija para asegurar scroll
        modalContent.style.height = `${finalHeight}px`;
        modalContent.style.maxHeight = `${maxHeight}px`;
        
        // Calcular altura del área de scroll
        const scrollableHeight = finalHeight - headerHeight - summaryHeight - footerHeight - 20;
        
        // Asegurar que el grid tenga scroll con altura fija
        cardsGrid.style.height = `${scrollableHeight}px`;
        cardsGrid.style.overflowY = 'auto';
        cardsGrid.style.overflowX = 'hidden';
        
        // Asegurar que el modal body tenga flex correcto
        modalBody.style.display = 'flex';
        modalBody.style.flexDirection = 'column';
        modalBody.style.height = '100%';
        modalBody.style.overflow = 'hidden';
        
        console.log(`Modal ajustado: ${cardCount} cartones, ${rowsNeeded} filas, altura: ${finalHeight}px, scroll habilitado`);
        
        // Agregar indicador visual de scroll si hay muchos cartones
        if (cardCount > 6) {
            this.addScrollIndicator();
        }
    }
    
    addScrollIndicator() {
        const cardsGrid = document.querySelector('.cards-modal-grid');
        if (!cardsGrid) return;
        
        // Remover indicador anterior si existe
        const existingIndicator = document.querySelector('.scroll-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Crear indicador de scroll
        const indicator = document.createElement('div');
        indicator.className = 'scroll-indicator';
        indicator.innerHTML = `
            <div class="scroll-indicator-content">
                <i class="fas fa-chevron-down"></i>
                <span>Desliza para ver más cartones</span>
                <i class="fas fa-chevron-down"></i>
            </div>
        `;
        
        // Agregar estilos inline para el indicador
        indicator.style.cssText = `
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(102, 126, 234, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            z-index: 10;
            animation: fadeInOut 2s ease-in-out infinite;
            backdrop-filter: blur(10px);
        `;
        
        indicator.querySelector('.scroll-indicator-content').style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        cardsGrid.appendChild(indicator);
        
        // Remover indicador después de 5 segundos
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 5000);
    }

    updateCalledNumbersModal() {
        // Actualizar estadísticas
        const totalCalled = document.getElementById('modalTotalCalled');
        const lastNumber = document.getElementById('modalLastNumber');
        const remaining = document.getElementById('modalRemaining');
        
        if (totalCalled) totalCalled.textContent = this.calledNumbers.size;
        if (remaining) remaining.textContent = 90 - this.calledNumbers.size;
        
        const calledArray = Array.from(this.calledNumbers);
        if (lastNumber && calledArray.length > 0) {
            lastNumber.textContent = calledArray[calledArray.length - 1];
        } else if (lastNumber) {
            lastNumber.textContent = '-';
        }

        // Actualizar grid de números
        this.updateModalNumbersGrid();
        
        // Actualizar lista de números llamados
        this.updateModalCalledList();
    }

    updateModalNumbersGrid() {
        // Números 1-30
        const numbers1_30 = document.getElementById('numbers1-30');
        if (numbers1_30) {
            numbers1_30.innerHTML = '';
            for (let i = 1; i <= 30; i++) {
                const numberDiv = document.createElement('div');
                numberDiv.className = 'modal-number';
                numberDiv.textContent = i;
                if (this.calledNumbers.has(i)) {
                    numberDiv.classList.add('called');
                }
                numbers1_30.appendChild(numberDiv);
            }
        }

        // Números 31-60
        const numbers31_60 = document.getElementById('numbers31-60');
        if (numbers31_60) {
            numbers31_60.innerHTML = '';
            for (let i = 31; i <= 60; i++) {
                const numberDiv = document.createElement('div');
                numberDiv.className = 'modal-number';
                numberDiv.textContent = i;
                if (this.calledNumbers.has(i)) {
                    numberDiv.classList.add('called');
                }
                numbers31_60.appendChild(numberDiv);
            }
        }

        // Números 61-90
        const numbers61_90 = document.getElementById('numbers61-90');
        if (numbers61_90) {
            numbers61_90.innerHTML = '';
            for (let i = 61; i <= 90; i++) {
                const numberDiv = document.createElement('div');
                numberDiv.className = 'modal-number';
                numberDiv.textContent = i;
                if (this.calledNumbers.has(i)) {
                    numberDiv.classList.add('called');
                }
                numbers61_90.appendChild(numberDiv);
            }
        }
    }

    updateModalCalledList() {
        const calledList = document.getElementById('calledNumbersList');
        if (!calledList) return;
        
        calledList.innerHTML = '';
        const calledArray = Array.from(this.calledNumbers);
        
        // Mostrar los números en orden cronológico (más recientes primero)
        calledArray.reverse().forEach(number => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'called-item';
            itemDiv.textContent = number;
            calledList.appendChild(itemDiv);
        });
    }

    // Analytics Methods
    updateAnalytics(event, data = {}) {
        const timestamp = new Date();
        
        switch (event) {
            case 'game_start':
                this.gameAnalytics.totalGamesPlayed++;
                this.gameAnalytics.sessionStats.gamesPlayed++;
                this.gameHistory.push({
                    type: 'game_start',
                    timestamp,
                    gameId: this.currentGameId,
                    ...data
                });
                break;
                
            case 'number_called':
                this.gameAnalytics.sessionStats.numbersCalled++;
                const number = data.number;
                this.gameAnalytics.favoriteNumbers.set(
                    number, 
                    (this.gameAnalytics.favoriteNumbers.get(number) || 0) + 1
                );
                break;
                
            case 'card_purchased':
                this.gameAnalytics.totalCardsPurchased += data.quantity || 1;
                this.gameAnalytics.totalMoneySpent += data.cost || 0;
                this.gameAnalytics.sessionStats.cardsUsed += data.quantity || 1;
                break;
                
            case 'win':
                this.gameAnalytics.totalWins++;
                this.gameAnalytics.totalMoneyWon += data.prize || 0;
                this.gameAnalytics.luckyCards.push({
                    cardId: data.cardId,
                    winType: data.winType,
                    prize: data.prize,
                    timestamp
                });
                break;
                
            case 'game_end':
                const gameDuration = timestamp - this.gameStartTime;
                this.gameAnalytics.averageGameDuration = 
                    (this.gameAnalytics.averageGameDuration * (this.gameAnalytics.totalGamesPlayed - 1) + gameDuration) / 
                    this.gameAnalytics.totalGamesPlayed;
                break;
        }
        
        this.updateAnalyticsDisplay();
        this.saveAnalytics(); // Save analytics data after each update
    }
    
    updateAnalyticsDisplay() {
        const analyticsContainer = document.getElementById('analytics-display');
        if (!analyticsContainer) return;
        
        const winRate = this.gameAnalytics.totalGamesPlayed > 0 
            ? (this.gameAnalytics.totalWins / this.gameAnalytics.totalGamesPlayed * 100).toFixed(1)
            : '0.0';
            
        const sessionDuration = Math.floor((new Date() - this.gameAnalytics.sessionStats.startTime) / 1000 / 60);
        
        analyticsContainer.innerHTML = `
            <div class="analytics-grid">
                <div class="analytics-item">
                    <i class="fas fa-trophy"></i>
                    <span>Partidas: ${this.gameAnalytics.totalGamesPlayed}</span>
                </div>
                <div class="analytics-item">
                    <i class="fas fa-percentage"></i>
                    <span>Victoria: ${winRate}%</span>
                </div>
                <div class="analytics-item">
                    <i class="fas fa-coins"></i>
                    <span>Ganado: €${this.gameAnalytics.totalMoneyWon.toFixed(2)}</span>
                </div>
                <div class="analytics-item">
                    <i class="fas fa-clock"></i>
                    <span>Sesión: ${sessionDuration}m</span>
                </div>
            </div>
        `;
    }
    
    getTopFavoriteNumbers() {
        return Array.from(this.gameAnalytics.favoriteNumbers.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([number, count]) => ({ number, count }));
    }

    // Enhanced Card Management
    selectCard(cardId) {
        const card = this.userCards.find(c => c.id === cardId);
        if (!card) return;
        
        card.isSelected = !card.isSelected;
        this.updateCardSelection();
        this.updateUI();
    }
    
    selectAllCards() {
        this.userCards.forEach(card => {
            card.isSelected = true;
        });
        this.updateCardSelection();
        this.updateUI();
    }
    
    deselectAllCards() {
        this.userCards.forEach(card => {
            card.isSelected = false;
        });
        this.updateCardSelection();
        this.updateUI();
    }
    
    updateCardSelection() {
        const selectedCards = this.userCards.filter(card => card.isSelected);
        this.selectedCards = selectedCards;
        
        // Update analytics
        this.updateAnalytics('cards_selected', {
            quantity: selectedCards.length,
            totalCards: this.userCards.length
        });
    }
    
    markCardAsFavorite(cardId) {
        const card = this.userCards.find(c => c.id === cardId);
        if (card) {
            card.isFavorite = !card.isFavorite;
            this.updateUI();
            
            // Save to localStorage
            this.saveFavoriteCards();
        }
    }
    
    saveFavoriteCards() {
        const favoriteCardIds = this.userCards
            .filter(card => card.isFavorite)
            .map(card => card.id);
        localStorage.setItem('bingoroyal_favorite_cards', JSON.stringify(favoriteCardIds));
    }
    
    loadFavoriteCards() {
        const favoriteCardIds = JSON.parse(localStorage.getItem('bingoroyal_favorite_cards') || '[]');
        this.userCards.forEach(card => {
            card.isFavorite = favoriteCardIds.includes(card.id);
        });
    }
    
    getCardStats(cardId) {
        const card = this.userCards.find(c => c.id === cardId);
        if (!card) return null;
        
        const wins = this.gameAnalytics.luckyCards.filter(win => win.cardId === cardId);
        const totalWins = wins.length;
        const totalWinnings = wins.reduce((sum, win) => sum + win.prize, 0);
        
        return {
            cardId,
            totalWins,
            totalWinnings,
            winRate: this.gameAnalytics.totalGamesPlayed > 0 
                ? (totalWins / this.gameAnalytics.totalGamesPlayed * 100).toFixed(1)
                : '0.0',
            lastWin: wins.length > 0 ? wins[wins.length - 1] : null
        };
    }
    
    // Analytics Data Persistence
    saveAnalytics() {
        try {
            localStorage.setItem('bingoroyal_analytics', JSON.stringify(this.gameAnalytics));
            console.log('Analytics data saved successfully');
        } catch (error) {
            console.error('Error saving analytics:', error);
        }
    }
    
    loadAnalytics() {
        try {
            const saved = localStorage.getItem('bingoroyal_analytics');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.gameAnalytics = { ...this.gameAnalytics, ...parsed };
                console.log('Analytics data loaded successfully');
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }
    
    exportAnalytics() {
        const data = {
            ...this.gameAnalytics,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bingoroyal-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    resetAnalytics() {
        if (confirm('¿Estás seguro de que quieres resetear todas las estadísticas? Esta acción no se puede deshacer.')) {
            this.gameAnalytics = {
                totalGamesPlayed: 0,
                totalWins: 0,
                totalLosses: 0,
                totalCardsPurchased: 0,
                totalMoneySpent: 0,
                totalMoneyWon: 0,
                averageGameDuration: 0,
                winRate: 0,
                favoriteNumbers: new Map(),
                luckyCards: [],
                gameHistory: [],
                sessionStats: {
                    startTime: new Date(),
                    gamesPlayed: 0,
                    cardsUsed: 0,
                    numbersCalled: 0
                },
                difficultySystem: {
                    currentLevel: 1,
                    playerSkill: 0.5,
                    winRate: 0,
                    gamesWon: 0,
                    totalGames: 0,
                    difficultyMultiplier: 1.0,
                    adaptiveEnabled: true,
                    lastAdjustment: Date.now()
                },
                gamePatterns: {
                    lastNumbers: [],
                    patternDetection: true,
                    antiPatternEnabled: true,
                    consecutiveWins: 0,
                    consecutiveLosses: 0
                }
            };
            this.saveAnalytics();
            this.updateAnalyticsDisplay();
            alert('Estadísticas reseteadas correctamente');
        }
    }
    
    // Nuevo método para actualizar dificultad dinámica
    updateDifficultySystem(gameResult) {
        const difficulty = this.gameAnalytics.difficultySystem;
        
        // Actualizar estadísticas
        difficulty.totalGames++;
        if (gameResult === 'win') {
            difficulty.gamesWon++;
            this.gameAnalytics.gamePatterns.consecutiveWins++;
            this.gameAnalytics.gamePatterns.consecutiveLosses = 0;
        } else {
            this.gameAnalytics.gamePatterns.consecutiveLosses++;
            this.gameAnalytics.gamePatterns.consecutiveWins = 0;
        }
        
        // Calcular nueva tasa de victoria
        difficulty.winRate = difficulty.gamesWon / difficulty.totalGames;
        
        // Ajustar habilidad del jugador
        const targetWinRate = 0.15; // 15% es la tasa objetivo
        const skillAdjustment = (difficulty.winRate - targetWinRate) * 0.1;
        difficulty.playerSkill = Math.max(0, Math.min(1, difficulty.playerSkill - skillAdjustment));
        
        // Ajustar multiplicador de dificultad
        if (difficulty.winRate > 0.2) {
            difficulty.difficultyMultiplier = Math.min(2.0, difficulty.difficultyMultiplier + 0.1);
        } else if (difficulty.winRate < 0.1) {
            difficulty.difficultyMultiplier = Math.max(0.5, difficulty.difficultyMultiplier - 0.1);
        }
        
        difficulty.lastAdjustment = Date.now();
        
        console.log(`🎯 Dificultad actualizada: Win Rate: ${(difficulty.winRate * 100).toFixed(1)}%, Skill: ${(difficulty.playerSkill * 100).toFixed(1)}%, Multiplier: ${difficulty.difficultyMultiplier.toFixed(2)}`);
    }
    
    // ===== CONEXIÓN AL BINGO GLOBAL =====
    async connectToGlobalBingo() {
        try {
            const currentMode = this.getCurrentGameMode();
            console.log(`🌐 Conectando al bingo global (${currentMode.name})...`);
            
            // Usar userId persistente
            this.userId = this.userId || this.getOrCreateUserId();
            
            // Unirse al juego global del modo actual
            await this.joinGlobalGame();
            
            // Obtener estado actual del juego global del modo actual
            const response = await fetch(`/api/bingo/state?mode=${currentMode.id}`);
            const data = await response.json();
            
            if (data.success) {
                console.log(`✅ Conectado al bingo global (${currentMode.name}):`, data.gameState.gameState);
                
                // Sincronizar números llamados del servidor global SOLO si hay números nuevos
                if (data.gameState.calledNumbers && data.gameState.calledNumbers.length > 0) {
                    // Solo actualizar si hay más números que los actuales
                    if (data.gameState.calledNumbers.length > this.calledNumbers.size) {
                        this.calledNumbers = new Set(data.gameState.calledNumbers);
                        this.lastNumberCalled = data.gameState.lastNumberCalled;
                        console.log('🔄 Números sincronizados del servidor global:', data.gameState.calledNumbers);
                        
                        // Actualizar la UI con los números del servidor
                        this.renderCalledNumbers();
                        this.updateLastNumber();
                        this.renderCards(); // Actualizar cartones con nuevos números marcados
                        
                        // Guardar estado actualizado
                        this.saveGameState();
                    }
                }
                
                // Actualizar contador de jugadores
                this.updatePlayerCount(data.gameState);
                
                // Iniciar sincronización con el servidor
                this.syncWithServerState();
                
                // Sincronización adicional cada 3 segundos para datos no críticos
                setInterval(async () => {
                    await this.syncWithGlobalServer();
                }, 3000);
                
            } else {
                console.log('⚠️ No se pudo conectar al bingo global, continuando en modo local');
            }
        } catch (error) {
            console.log('⚠️ Error conectando al bingo global, continuando en modo local:', error);
        }
    }
    
    async joinGlobalGame() {
        try {
            const currentMode = this.getCurrentGameMode();
            const response = await fetch('/api/bingo/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    cards: this.userCards,
                    mode: currentMode.id
                })
            });
            
            const data = await response.json();
            if (data.success) {
                console.log(`👤 Unido al juego global (${currentMode.name}) como jugador`);
            }
        } catch (error) {
            console.error('❌ Error uniéndose al juego global:', error);
        }
    }
    
    async syncWithGlobalServer() {
        try {
            const currentMode = this.getCurrentGameMode();
            const response = await fetch(`/api/bingo/state?mode=${currentMode.id}`);
            const data = await response.json();
            
            if (data.success) {
                const globalState = data.gameState;
                
                // Sincronizar números llamados SOLO si hay números nuevos
                if (globalState.calledNumbers && globalState.calledNumbers.length > 0) {
                    // Solo actualizar si hay más números que los actuales o si el estado del juego cambió
                    if (globalState.calledNumbers.length > this.calledNumbers.size || 
                        globalState.gameState !== this.gameState) {
                        
                        this.calledNumbers = new Set(globalState.calledNumbers);
                        this.lastNumberCalled = globalState.lastNumberCalled;
                        this.gameState = globalState.gameState;
                        
                        console.log('🔄 Nuevos números del servidor global:', globalState.calledNumbers);
                        
                        // Actualizar UI
                        this.renderCalledNumbers();
                        this.updateLastNumber();
                        this.renderCards(); // Actualizar cartones con nuevos números marcados
                        
                        // Reproducir sonido de nuevo número
                        this.playNumberSound();
                    }
                }
                
                // Actualizar contador de jugadores
                console.log('🔍 DEBUG: syncWithGlobalServer - estado del servidor:', globalState);
                this.updatePlayerCount(globalState);
                
                // Actualizar cartones del usuario en el servidor si han cambiado
                if (this.userCards.length > 0) {
                    await this.updateGlobalCards();
                }
            }
        } catch (error) {
            // Silenciar errores de sincronización para no afectar el juego local
        }
    }
    
    updatePlayerCount(gameState) {
        console.log('🔍 DEBUG: updatePlayerCount llamado con:', gameState);
        
        // Extraer contadores del estado del juego
        const totalOnlinePlayers = gameState.totalOnlinePlayers || 0;
        const playersWithCards = gameState.playersWithCards || 0;
        
        console.log('🎮 Jugadores con cartones:', playersWithCards);
        console.log('🌐 Total jugadores online:', totalOnlinePlayers);
        
        // Actualizar elementos específicos
        const activePlayersElement = document.getElementById('activePlayers');
        const totalPlayersElement = document.getElementById('totalPlayers');
        
        if (activePlayersElement) {
            console.log(`🔍 DEBUG: Actualizando jugadores con cartones:`, activePlayersElement.textContent, '→', playersWithCards);
            
            // Formatear el número con comas para mejor legibilidad
            const formattedActive = playersWithCards.toLocaleString('es-ES');
            activePlayersElement.textContent = formattedActive;
            
            // Agregar clase para animación si el número cambió
            if (activePlayersElement.dataset.lastCount !== playersWithCards.toString()) {
                activePlayersElement.classList.add('player-count-updated');
                setTimeout(() => {
                    activePlayersElement.classList.remove('player-count-updated');
                }, 1000);
                activePlayersElement.dataset.lastCount = playersWithCards.toString();
            }
        }
        
        if (totalPlayersElement) {
            console.log(`🔍 DEBUG: Actualizando total jugadores online:`, totalPlayersElement.textContent, '→', totalOnlinePlayers);
            
            // Formatear el número con comas para mejor legibilidad
            const formattedTotal = totalOnlinePlayers.toLocaleString('es-ES');
            totalPlayersElement.textContent = formattedTotal;
            
            // Agregar clase para animación si el número cambió
            if (totalPlayersElement.dataset.lastCount !== totalOnlinePlayers.toString()) {
                totalPlayersElement.classList.add('player-count-updated');
                setTimeout(() => {
                    totalPlayersElement.classList.remove('player-count-updated');
                }, 1000);
                totalPlayersElement.dataset.lastCount = totalOnlinePlayers.toString();
            }
        }
        
        console.log('👥 Jugadores actualizados - Con cartones:', playersWithCards, 'Total online:', totalOnlinePlayers);
    }
    
    async updateGlobalCards() {
        try {
            const currentMode = this.getCurrentGameMode();
            await fetch('/api/bingo/update-cards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    cards: this.userCards,
                    mode: currentMode.id
                })
            });
        } catch (error) {
            console.error('❌ Error actualizando cartones globales:', error);
        }
    }

    /**
     * Actualizar todos los contadores de modo independientemente
     */
    async updateAllModeCountdowns() {
        try {
            // Usar una sola petición para obtener estadísticas globales que incluyen todos los modos
            const response = await fetch('/api/bingo/global-stats');
            const data = await response.json();
            
            if (data.success && data.stats) {
                const modes = ['CLASSIC', 'RAPID', 'VIP', 'NIGHT'];
                
                for (const mode of modes) {
                    const modeStats = data.stats[mode];
                    const countdownElement = document.getElementById(`countdown-${mode}`);
                    
                    if (countdownElement && modeStats) {
                        if (modeStats.gameState === 'waiting' && modeStats.nextGameTime) {
                            const nextGameTime = new Date(modeStats.nextGameTime);
                            const now = new Date();
                            const timeLeft = nextGameTime.getTime() - now.getTime();
                            
                            if (timeLeft > 0) {
                                const minutes = Math.floor(timeLeft / 60000);
                                const seconds = Math.floor((timeLeft % 60000) / 1000);
                                const countdownText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                                countdownElement.textContent = countdownText;
                            } else {
                                countdownElement.textContent = '0:00';
                            }
                        } else if (modeStats.gameState === 'playing') {
                            countdownElement.textContent = 'En curso';
                        } else {
                            countdownElement.textContent = '--:--';
                        }
                    }
                }
            }
        } catch (error) {
            console.log('⚠️ Error actualizando countdowns:', error);
        }
    }

    /**
     * Cambiar la visibilidad de los contenedores de números llamados por modo
     */
    switchCalledNumbersContainer(modeId) {
        try {
            // Ocultar todos los contenedores de modo
            const allContainers = document.querySelectorAll('.mode-numbers');
            allContainers.forEach(el => {
                el.style.display = 'none';
            });
            
            // Mostrar solo el contenedor del modo seleccionado
            const targetContainer = document.getElementById(`calledNumbers-${modeId}`);
            if (targetContainer) {
                targetContainer.style.display = 'block';
                console.log(`✅ Contenedor de números llamados cambiado a modo: ${modeId}`);
            } else {
                console.log(`⚠️ Contenedor de números llamados para modo ${modeId} no encontrado`);
                // Fallback: mostrar el contenedor CLASSIC
                const fallbackContainer = document.getElementById('calledNumbers-CLASSIC');
                if (fallbackContainer) {
                    fallbackContainer.style.display = 'block';
                    console.log('✅ Usando contenedor CLASSIC como fallback');
                }
            }
        } catch (error) {
            console.error('❌ Error cambiando contenedor de números llamados:', error);
        }
    }
}

// Hacer funciones críticas disponibles globalmente para el sistema de seguridad
window.callNumber = function() {
    return bingoGame.callNumber();
};

window.checkWin = function() {
    return bingoGame.checkWin();
};

window.buyPackage = function(packageType) {
    return bingoGame.buyPackage(packageType);
};

// Función para resetear experiencia de bienvenida (solo para desarrollo)
window.resetWelcomeExperience = function() {
    localStorage.removeItem('bingoroyal_welcome_visited');
    alert('Experiencia de bienvenida reseteada. Recarga la página para ver la página de bienvenida.');
};

// Inicializar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Si el juego ya fue inicializado de manera simple, saltar verificación de auth pero continuar con la inicialización
    if (window.gameInitialized) {
        console.log('🎮 Juego inicializado en modo simple - saltando verificación auth, cargando funcionalidad...');
        
        // Obtener datos del usuario desde localStorage
        const sessionData = localStorage.getItem('bingoroyal_session');
        if (sessionData) {
            const session = JSON.parse(sessionData);
            const user = session.user;
            
            console.log('✅ Usuario desde sesión simple:', user.firstName);
            
            // Actualizar información del usuario en la UI (versión simple)
            updateUserInfoSimple(user);
            
            // Inicializar el juego
            window.bingoGame = new BingoPro();
            window.bingoGame.initializeGame();
            
            // Configuración adicional del chat después de la inicialización
            setTimeout(() => {
                console.log('🔧 Configuración adicional del chat...');
                const chatInput = document.getElementById('chatInput');
                const sendButton = document.querySelector('.btn-send');
                
                if (chatInput) {
                    console.log('✅ Chat input encontrado y configurado');
                    chatInput.readOnly = false;
                    chatInput.disabled = false;
                    chatInput.style.pointerEvents = 'auto';
                    chatInput.style.userSelect = 'text';
                    chatInput.style.webkitUserSelect = 'text';
                }
                
                if (sendButton) {
                    console.log('✅ Botón enviar encontrado y configurado');
                    sendButton.style.pointerEvents = 'auto';
                    sendButton.style.cursor = 'pointer';
                }
            }, 500);
        }
        return;
    }
    
    // Verificar autenticación antes de inicializar el juego (solo si NO está en modo simple)
    if (typeof authManager !== 'undefined' && authManager.isUserAuthenticated()) {
        const user = authManager.getCurrentUser();
        console.log('✅ Usuario autenticado:', user.name);
        
        // Actualizar información del usuario en la UI
        updateUserInfo(user);
        
        // Inicializar el juego
        window.bingoGame = new BingoPro();
        window.bingoGame.initializeGame();
        
        // Configuración adicional del chat después de la inicialización
        setTimeout(() => {
            console.log('🔧 Configuración adicional del chat...');
            const chatInput = document.getElementById('chatInput');
            const sendButton = document.querySelector('.btn-send');
            
            if (chatInput) {
                console.log('✅ Chat input encontrado y configurado');
                chatInput.readOnly = false;
                chatInput.disabled = false;
                chatInput.style.pointerEvents = 'auto';
                chatInput.style.userSelect = 'text';
                chatInput.style.webkitUserSelect = 'text';
            }
            
            if (sendButton) {
                console.log('✅ Botón enviar encontrado y configurado');
                sendButton.style.pointerEvents = 'auto';
                sendButton.style.cursor = 'pointer';
            }
        }, 500);
    } else {
        // En un bingo global, el juego debe funcionar independientemente de la autenticación
        console.log('🌍 Inicializando bingo global sin autenticación...');
        
        // Inicializar el juego en modo global
        window.bingoGame = new BingoPro();
        window.bingoGame.initializeGame();
        
        // Configuración adicional del chat después de la inicialización
        setTimeout(() => {
            console.log('🔧 Configuración adicional del chat...');
            const chatInput = document.getElementById('chatInput');
            const sendButton = document.querySelector('.btn-send');
            
            if (chatInput) {
                console.log('✅ Chat input encontrado y configurado');
                chatInput.readOnly = false;
                chatInput.disabled = false;
                chatInput.style.pointerEvents = 'auto';
                chatInput.style.userSelect = 'text';
                chatInput.style.webkitUserSelect = 'text';
            }
            
            if (sendButton) {
                console.log('✅ Botón enviar encontrado y configurado');
                sendButton.style.pointerEvents = 'auto';
                sendButton.style.cursor = 'pointer';
            }
        }, 500);
    }
});

// Función para actualizar información del usuario en la UI
function closeBingoCardsModal() {
    if (window.bingoGame) {
        window.bingoGame.closeBingoCardsModal();
    }
}

function updateUserInfo(user) {
    // Actualizar nombre de usuario
    const usernameElement = document.querySelector('.username');
    if (usernameElement) {
        usernameElement.textContent = user.name;
    }
    
    // Actualizar saldo
    const balanceElement = document.getElementById('userBalance');
    if (balanceElement) {
        balanceElement.textContent = `€${user.balance.toFixed(2)}`;
    }
    
    // Actualizar nivel
    const levelElement = document.querySelector('.user-level');
    if (levelElement) {
        levelElement.textContent = `Nivel ${user.level}`;
    }
}

// Función para actualizar información del usuario en modo simple (sin authManager)
function updateUserInfoSimple(user) {
    console.log('🔄 Actualizando UI con datos de sesión simple...');
    
    // Actualizar nombre de usuario
    const usernameElement = document.querySelector('.username');
    if (usernameElement) {
        usernameElement.textContent = `${user.firstName} ${user.lastName}`;
        console.log('✅ Username actualizado:', usernameElement.textContent);
    }
    
    // Actualizar saldo
    const balanceElement = document.getElementById('userBalance');
    if (balanceElement) {
        balanceElement.textContent = `€${user.balance}`;
        console.log('✅ Balance actualizado:', balanceElement.textContent);
    }
    
    // Actualizar nivel si existe
    const levelElement = document.querySelector('.user-level');
    if (levelElement) {
        levelElement.textContent = `Nivel ${user.level || 1}`;
        console.log('✅ Level actualizado:', levelElement.textContent);
    }
    
    console.log('✅ UI actualizada con datos de sesión simple');
}

// Función de logout
function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        if (typeof authManager !== 'undefined') {
            authManager.logout();
        } else {
            // Fallback si authManager no está disponible
            localStorage.removeItem('bingoroyal_session');
            window.location.href = 'login.html';
        }
    }
}

// Funciones globales para la interfaz de compra
function changeQuantity(delta) {
    const quantityInput = document.getElementById('cardQuantity');
    if (quantityInput) {
        let newValue = parseInt(quantityInput.value) + delta;
        newValue = Math.max(1, Math.min(20, newValue));
        quantityInput.value = newValue;
    }
}

function buySelectedCards() {
    const quantityInput = document.getElementById('cardQuantity');
    if (quantityInput && window.bingoGame) {
        const quantity = parseInt(quantityInput.value);
        window.bingoGame.buyCards(quantity);
    }
}

function joinCurrentGame() {
    if (window.bingoGame) {
        window.bingoGame.joinGame();
    }
}

// Función para alternar el chat
function toggleChat() {
    const chatSection = document.getElementById('chatSectionFixed');
    const toggleBtn = document.querySelector('.chat-toggle-btn-fixed');
    
    console.log('🔧 Toggle chat clicked');
    console.log('Chat section:', chatSection);
    console.log('Toggle button:', toggleBtn);
    
    if (!chatSection || !toggleBtn) {
        console.error('❌ Chat elements not found');
        return;
    }
    
    const isExpanded = chatSection.classList.contains('expanded');
    
    if (isExpanded) {
        // Colapsar el chat
        chatSection.classList.remove('expanded');
        toggleBtn.classList.remove('active');
        console.log('🔽 Chat collapsed');
        
        // Limpiar el input cuando se colapsa
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.blur();
        }
    } else {
        // Expandir el chat
        chatSection.classList.add('expanded');
        toggleBtn.classList.add('active');
        console.log('🔼 Chat expanded');
        
        // Configurar el input del chat después de expandir
        setTimeout(() => {
            const chatInput = document.getElementById('chatInput');
            const btnSend = document.querySelector('.btn-send');
            
            if (chatInput && btnSend) {
                console.log('🔧 Reconfigurando event listeners del chat...');
                
                // Forzar que el input sea editable
                chatInput.readOnly = false;
                chatInput.disabled = false;
                chatInput.style.pointerEvents = 'auto';
                chatInput.style.userSelect = 'text';
                chatInput.style.webkitUserSelect = 'text';
                
                // Enfocar y seleccionar
                chatInput.focus();
                chatInput.select();
                
                // Función para enviar mensaje
                const sendMessage = () => {
                    const message = chatInput.value.trim();
                    console.log('📤 Intentando enviar mensaje:', message);
                    if (message && window.bingoGame) {
                        window.bingoGame.sendChatMessage(message);
                        chatInput.value = '';
                        chatInput.focus();
                        console.log('✅ Mensaje enviado correctamente');
                    }
                };
                
                // Remover event listeners anteriores para evitar duplicados
                chatInput.removeEventListener('keypress', chatInput._keypressHandler);
                chatInput.removeEventListener('click', chatInput._clickHandler);
                btnSend.removeEventListener('click', btnSend._clickHandler);
                
                // Crear nuevos event listeners
                chatInput._keypressHandler = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('⌨️ Enter presionado en chat (reconfigurado)');
                        sendMessage();
                        return false;
                    }
                };
                
                chatInput._clickHandler = function() {
                    this.focus();
                    this.select();
                };
                
                btnSend._clickHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('📤 Click en botón enviar (reconfigurado)');
                    sendMessage();
                    return false;
                };
                
                // Agregar los nuevos event listeners
                chatInput.addEventListener('keypress', chatInput._keypressHandler);
                chatInput.addEventListener('click', chatInput._clickHandler);
                btnSend.addEventListener('click', btnSend._clickHandler);
                
                // Enviar mensaje de bienvenida automático solo si es la primera vez
                if (!chatSection.dataset.welcomeSent) {
                    setTimeout(() => {
                        if (window.bingoGame) {
                            window.bingoGame.addChatMessage('bot', '¡Hola! 👋 Soy BingoBot, tu asistente personal. Escribe "ayuda" para ver todos los comandos disponibles. ¿En qué puedo ayudarte? 🤖');
                            chatSection.dataset.welcomeSent = 'true';
                        }
                    }, 500);
                }
                
                console.log('✅ Chat event listeners reconfigurados correctamente');
            } else {
                console.log('❌ Elementos del chat no encontrados para reconfigurar');
            }
        }, 100);
    }
}

// Función para enviar mensaje de chat
function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    console.log('📤 Sending chat message:', message);
    console.log('BingoGame available:', !!window.bingoGame);
    
    if (message && window.bingoGame) {
        window.bingoGame.sendChatMessage(message);
        chatInput.value = '';
        console.log('✅ Message sent successfully');
    } else if (!message) {
        console.log('⚠️ Empty message, not sending');
    } else {
        console.log('❌ BingoGame not available');
    }
}

// Función para generar números llamados dinámicamente
function generateCalledNumbers() {
    console.log('🔄 Generando números llamados...');
    const numbersContainer = document.getElementById('calledNumbers');
    if (!numbersContainer) {
        console.log('❌ Contenedor de números no encontrado');
        return;
    }
    
    console.log('✅ Contenedor encontrado, limpiando...');
    // Limpiar contenedor
    numbersContainer.innerHTML = '';
    
    // Generar números del 1 al 90
    for (let i = 1; i <= 90; i++) {
        const numberElement = document.createElement('div');
        numberElement.className = 'called-number';
        numberElement.textContent = i.toString();
        numberElement.dataset.number = i;
        
        // Agregar evento click para marcar como llamado
        numberElement.addEventListener('click', function() {
            this.classList.toggle('called');
            if (this.classList.contains('called')) {
                this.style.background = '#ff6b6b';
                this.style.color = '#ffffff';
                this.style.borderColor = '#ff6b6b';
                this.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 300);
            } else {
                this.style.background = '#16213e';
                this.style.color = '#ffffff';
                this.style.borderColor = '#333';
            }
        });
        
        numbersContainer.appendChild(numberElement);
    }
    
    console.log('✅ Números generados:', numbersContainer.children.length);
}

// Función para marcar números como llamados
function markNumberAsCalled(number) {
    const numberElement = document.querySelector(`[data-number="${number}"]`);
    if (numberElement) {
        numberElement.classList.add('called', 'recent');
        setTimeout(() => {
            numberElement.classList.remove('recent');
        }, 1000);
    }
}

// Función para actualizar el último número llamado
function updateLastCalledNumber(number) {
    const lastNumberDisplay = document.getElementById('lastNumber');
    if (lastNumberDisplay) {
        lastNumberDisplay.textContent = number || '-';
        if (number) {
            lastNumberDisplay.classList.add('recent');
            setTimeout(() => {
                lastNumberDisplay.classList.remove('recent');
            }, 2000);
        }
    }
}

// Inicializar números llamados cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Inicializando números llamados...');
    
    // Debug inmediato
    const numbersContainer = document.getElementById('calledNumbers');
    console.log('🔍 Estado inicial del contenedor:', {
        exists: !!numbersContainer,
        id: numbersContainer?.id,
        className: numbersContainer?.className,
        children: numbersContainer?.children?.length || 0
    });
    
    generateCalledNumbers();
    
    // Verificar después de generar
    setTimeout(() => {
        const container = document.getElementById('calledNumbers');
        console.log('🔍 Estado después de generar:', {
            children: container?.children?.length || 0,
            firstChild: container?.children[0]?.textContent,
            lastChild: container?.children[89]?.textContent
        });
    }, 100);
});

// También inicializar cuando se carga el juego
window.addEventListener('load', function() {
    console.log('🎮 Página cargada, verificando números llamados...');
    setTimeout(() => {
        const numbersContainer = document.getElementById('calledNumbers');
        if (numbersContainer && numbersContainer.children.length === 0) {
            console.log('⚠️ Contenedor vacío, regenerando números...');
            generateCalledNumbers();
        } else {
            console.log('✅ Números llamados ya generados:', numbersContainer?.children.length || 0);
        }
        
        // Debug adicional
        if (numbersContainer) {
            console.log('🔍 Debug contenedor:', {
                id: numbersContainer.id,
                className: numbersContainer.className,
                children: numbersContainer.children.length,
                innerHTML: numbersContainer.innerHTML.substring(0, 200) + '...'
            });
        }
    }, 500);
}); 

/**
 * Función global para seleccionar modo de juego
 */
function selectGameMode(modeId) {
    if (typeof bingoGame !== 'undefined' && bingoGame) {
        const success = bingoGame.changeGameMode(modeId);
        if (success) {
            // Actualizar estado visual de las tarjetas
            updateModeCardsVisualState();
        }
    } else {
        console.error('❌ BingoGame no está inicializado');
    }
}

/**
 * Actualizar estado visual de las tarjetas de modo
 */
function updateModeCardsVisualState() {
    const modeCards = document.querySelectorAll('.mode-card');
    const currentMode = bingoGame ? bingoGame.getCurrentGameMode() : null;
    
    modeCards.forEach(card => {
        const modeId = card.dataset.mode;
        const availableModes = bingoGame ? bingoGame.getAvailableGameModes() : [];
        const modeInfo = availableModes.find(mode => mode.id === modeId);
        
        if (modeInfo) {
            if (modeInfo.canPlay) {
                card.classList.remove('disabled');
            } else {
                card.classList.add('disabled');
            }
            
            // Marcar como activo el modo actual
            if (currentMode && modeId === currentMode.id) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        }
    });
}

/**
 * Inicializar estado de las tarjetas de modo al cargar la página
 */
function initializeModeCards() {
    setTimeout(() => {
        updateModeCardsVisualState();
    }, 1000); // Esperar a que BingoGame se inicialice
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initializeModeCards();
});