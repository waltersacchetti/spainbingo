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
        this.startGameScheduler();
        this.initializeLiveChat();
        
        // ===== CONEXIÓN AL BINGO GLOBAL =====
        this.connectToGlobalBingo();
        
        console.log('BingoPro inicializado correctamente');
    }

    initializeGame() {
        console.log('Inicializando juego de bingo...');
        
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
        
        // Cargar datos guardados
        this.loadFavoriteCards(); // Load favorite cards from localStorage
        this.loadAnalytics(); // Load analytics data
        
        // NO generar cartones automáticamente - el usuario debe comprarlos
        console.log('Juego profesional: Sin cartones por defecto - El usuario debe comprarlos');
        
        // No seleccionar cartones por defecto
        this.selectedCards = [];
        
        this.updateDisplay();
        this.updateAnalyticsDisplay();
        this.saveAnalytics(); // Save analytics data after each update
        
        // Iniciar el scheduler de partidas
        this.startGameScheduler();
        
        console.log('Juego inicializado correctamente');
        
        // Inicializar características de producción
        if (securityManager.isProduction()) {
            this.setupProductionFeatures();
        }
        
        // Inicializar números llamados
        setTimeout(() => {
            generateCalledNumbers();
        }, 100);
        
        // Inicializar sistema de bote global
        this.initializeGlobalJackpot();
        
        // La lógica real de jugadores se maneja en connectToGlobalBingo()
        // que se llama automáticamente en el constructor
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

    startGameScheduler() {
        // Programar la próxima partida en 2 minutos
        this.scheduleNextGame();
        
        // Actualizar el countdown cada segundo
        this.gameCountdown = setInterval(() => {
            this.updateGameCountdown();
        }, 1000);
    }

    scheduleNextGame() {
        const now = new Date();
        this.nextGameStartTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutos
        console.log('Próxima partida programada para:', this.nextGameStartTime);
        this.updateGameCountdown();
    }

    updateGameCountdown() {
        if (!this.nextGameStartTime) {
            console.log('No hay próxima partida programada');
            return;
        }
        
        const now = new Date();
        const timeLeft = this.nextGameStartTime.getTime() - now.getTime();
        
        console.log('Countdown - Tiempo restante:', timeLeft, 'ms, Estado del juego:', this.gameState);
        
        if (timeLeft <= 0) {
            console.log('¡Tiempo agotado! Iniciando nueva partida...');
            this.startNewGame();
        } else {
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            this.updateCountdownDisplay(minutes, seconds);
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
        const sessionData = localStorage.getItem('spainbingo_session');
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
            const realUserId = userInfo.email || `user_${userInfo.id}`;
            console.log('🆔 Usando userId basado en usuario real:', realUserId);
            return realUserId;
        }
        
        // Si no hay usuario autenticado, usar userId anónimo persistente
        let anonymousUserId = localStorage.getItem('spainbingo_anonymous_userId');
        
        if (!anonymousUserId) {
            // Crear un userId anónimo único
            anonymousUserId = 'anonymous_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('spainbingo_anonymous_userId', anonymousUserId);
            console.log('🆔 Nuevo userId anónimo creado:', anonymousUserId);
        } else {
            console.log('🆔 Usando userId anónimo existente:', anonymousUserId);
        }
        
        return anonymousUserId;
    }





    addCard() {
        // Validación de seguridad
        if (this.userCards.length >= this.securitySettings.maxCardsPerGame) {
            console.log('Límite de cartones alcanzado');
            return null;
        }

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
            emptyCells: 0
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
        const logos = ['🎯', '⭐', '🍀', '💎', '🎪', '🎰', '🏆', '🎨'];
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
        const container = document.getElementById('calledNumbers');
        if (!container) {
            console.log('Contenedor de números llamados no encontrado');
            return;
        }
        
        console.log('Renderizando números llamados:', Array.from(this.calledNumbers));
        
        container.innerHTML = '';

        // Crear grid de 9x10 para los números del 1-90
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
                        console.log(`Número ${number} marcado como llamado en el panel`);
                    }
                    
                    container.appendChild(numberDiv);
                }
            }
        }
        
        console.log('Panel de números llamados actualizado');
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
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay(); // 0 = Domingo, 6 = Sábado
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        let basePrize = 500; // Premio base por partida
        
        // Premio especial cada 2 horas (a las horas pares)
        if (hour % 2 === 0) {
            basePrize = 1500;
        }
        
        // Premio especial los fines de semana a las 21:00
        if (isWeekend && hour === 21) {
            basePrize = 5000;
        }
        
        // Distribuir el premio base entre las diferentes combinaciones ganadoras
        const prizes = {
            line: Math.floor(basePrize * 0.20),      // 20% del premio total
            bingo: Math.floor(basePrize * 0.80)      // 80% del premio total
        };
        
        return {
            basePrize,
            prizes,
            isSpecialGame: basePrize > 500
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
        
        // Programar la próxima partida
        this.scheduleNextGame();
        
        // Resetear estado del jugador
        this.isPlayerJoined = false;
        this.selectedCards = [];
        
        // Actualizar interfaz
        this.updateDisplay();
        this.updateUI();
        
        this.addChatMessage('system', '¡Partida terminada! La próxima partida comenzará en 2 minutos.');
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

        const totalCost = quantity * this.cardPrice;
        
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
                card.purchasePrice = this.cardPrice;
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
        
        // En un bingo global, el juego funciona independientemente de los cartones del usuario
        // Los cartones del usuario solo afectan si puede ganar, no si el juego puede comenzar
        if (this.userCards.length === 0) {
            console.log('ℹ️ Usuario sin cartones - Juego global continúa, pero usuario no puede ganar');
            this.addChatMessage('system', 'ℹ️ Juego global iniciado. Compra cartones para participar y ganar premios.');
        }
        
        // Calcular premios dinámicos
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
        
        console.log('🎲 Iniciando llamada automática profesional...');
        
        // Anunciar inicio de partida
        this.addChatMessage('system', '🎮 ¡La partida ha comenzado! Los números se llamarán automáticamente.');
        
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
        localStorage.removeItem('bingospain_welcome_visited');
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
        localStorage.setItem('spainbingo_favorite_cards', JSON.stringify(favoriteCardIds));
    }
    
    loadFavoriteCards() {
        const favoriteCardIds = JSON.parse(localStorage.getItem('spainbingo_favorite_cards') || '[]');
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
            localStorage.setItem('spainbingo_analytics', JSON.stringify(this.gameAnalytics));
            console.log('Analytics data saved successfully');
        } catch (error) {
            console.error('Error saving analytics:', error);
        }
    }
    
    loadAnalytics() {
        try {
            const saved = localStorage.getItem('spainbingo_analytics');
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
        a.download = `spainbingo-analytics-${new Date().toISOString().split('T')[0]}.json`;
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
            console.log('🌐 Conectando al bingo global...');
            
            // Usar userId persistente
            this.userId = this.userId || this.getOrCreateUserId();
            
            // Unirse al juego global
            await this.joinGlobalGame();
            
            // Obtener estado actual del juego global
            const response = await fetch('/api/bingo/state');
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Conectado al bingo global:', data.gameState.gameState);
                
                // Sincronizar números llamados del servidor global
                if (data.gameState.calledNumbers && data.gameState.calledNumbers.length > 0) {
                    this.calledNumbers = new Set(data.gameState.calledNumbers);
                    this.lastNumberCalled = data.gameState.lastNumberCalled;
                    console.log('🔄 Números sincronizados del servidor global:', data.gameState.calledNumbers);
                    
                    // Actualizar la UI con los números del servidor
                    this.renderCalledNumbers();
                    this.updateLastNumber();
                }
                
                // Actualizar contador de jugadores
                this.updatePlayerCount(data.gameState.totalPlayers);
                
                // Iniciar sincronización periódica cada 3 segundos
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
            const response = await fetch('/api/bingo/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    cards: this.userCards
                })
            });
            
            const data = await response.json();
            if (data.success) {
                console.log('👤 Unido al juego global como jugador');
            }
        } catch (error) {
            console.error('❌ Error uniéndose al juego global:', error);
        }
    }
    
    async syncWithGlobalServer() {
        try {
            const response = await fetch('/api/bingo/state');
            const data = await response.json();
            
            if (data.success) {
                const globalState = data.gameState;
                
                // Sincronizar números llamados
                if (globalState.calledNumbers && globalState.calledNumbers.length > this.calledNumbers.size) {
                    this.calledNumbers = new Set(globalState.calledNumbers);
                    this.lastNumberCalled = globalState.lastNumberCalled;
                    
                    console.log('🔄 Nuevos números del servidor global:', globalState.calledNumbers);
                    
                    // Actualizar UI
                    this.renderCalledNumbers();
                    this.updateLastNumber();
                    this.renderCards(); // Actualizar cartones con nuevos números marcados
                    
                    // Reproducir sonido de nuevo número
                    this.playNumberSound();
                }
                
                // Actualizar contador de jugadores
                console.log('🔍 DEBUG: syncWithGlobalServer - totalPlayers del servidor:', globalState.totalPlayers);
                this.updatePlayerCount(globalState.totalPlayers);
                
                // Actualizar cartones del usuario en el servidor si han cambiado
                if (this.userCards.length > 0) {
                    await this.updateGlobalCards();
                }
            }
        } catch (error) {
            // Silenciar errores de sincronización para no afectar el juego local
        }
    }
    
    updatePlayerCount(totalPlayers) {
        console.log('🔍 DEBUG: updatePlayerCount llamado con:', totalPlayers);
        console.log('🔍 DEBUG: Tipo de totalPlayers:', typeof totalPlayers);
        
        // Actualizar todos los elementos que muestran el contador de jugadores
        const elements = [
            document.getElementById('activePlayers'),
            document.getElementById('totalPlayers')
        ];
        
        console.log('🔍 DEBUG: Elementos encontrados:', elements.length);
        
        elements.forEach((element, index) => {
            if (element) {
                console.log(`🔍 DEBUG: Actualizando elemento ${index}:`, element.id);
                console.log(`🔍 DEBUG: Valor anterior:`, element.textContent);
                
                // Formatear el número con comas para mejor legibilidad
                const formattedCount = totalPlayers.toLocaleString('es-ES');
                element.textContent = formattedCount;
                
                console.log(`🔍 DEBUG: Nuevo valor:`, formattedCount);
                
                // Agregar clase para animación si el número cambió
                if (element.dataset.lastCount !== totalPlayers.toString()) {
                    element.classList.add('player-count-updated');
                    setTimeout(() => {
                        element.classList.remove('player-count-updated');
                    }, 1000);
                    element.dataset.lastCount = totalPlayers.toString();
                }
            } else {
                console.log(`🔍 DEBUG: Elemento ${index} no encontrado`);
            }
        });
        
        console.log('👥 Jugadores en línea actualizados:', totalPlayers);
    }
    
    async updateGlobalCards() {
        try {
            await fetch('/api/bingo/update-cards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    cards: this.userCards
                })
            });
        } catch (error) {
            console.error('❌ Error actualizando cartones globales:', error);
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
    localStorage.removeItem('bingospain_welcome_visited');
    alert('Experiencia de bienvenida reseteada. Recarga la página para ver la página de bienvenida.');
};

// Inicializar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Si el juego ya fue inicializado de manera simple, saltar verificación de auth pero continuar con la inicialización
    if (window.gameInitialized) {
        console.log('🎮 Juego inicializado en modo simple - saltando verificación auth, cargando funcionalidad...');
        
        // Obtener datos del usuario desde localStorage
        const sessionData = localStorage.getItem('spainbingo_session');
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
            localStorage.removeItem('spainbingo_session');
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
    
    // Simular algunos números llamados para demostración
    setTimeout(() => {
        markNumberAsCalled(15);
        updateLastCalledNumber(15);
    }, 1000);
    
    setTimeout(() => {
        markNumberAsCalled(23);
        updateLastCalledNumber(23);
    }, 3000);
    
    setTimeout(() => {
        markNumberAsCalled(47);
        updateLastCalledNumber(47);
    }, 5000);
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