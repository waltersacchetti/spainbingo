// Variable global para el juego
let game;

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
        this.securitySettings = {
            maxCardsPerGame: 50,
            maxBalance: 10000,
            minCallInterval: 1000, // 1 segundo mínimo entre llamadas
            maxAutoPlayDuration: 300000, // 5 minutos máximo
            antiSpamDelay: 500
        };
        // Variables para chat en vivo
        this.chatApiUrl = '/api/chat';
        this.userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
            gameHistory: [],
            sessionStats: {
                startTime: new Date(),
                gamesPlayed: 0,
                cardsUsed: 0,
                numbersCalled: 0
            }
        };
        
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
        console.log('BingoPro inicializado correctamente');
    }

    initializeGame() {
        this.gameState = 'waiting';
        this.currentGameId = this.generateGameId();
        this.isPlayerJoined = false;
        this.selectedCards = [];
        this.loadFavoriteCards(); // Load favorite cards from localStorage
        this.loadAnalytics(); // Load analytics data
        this.updateDisplay();
        this.updateAnalyticsDisplay();
        this.saveAnalytics(); // Save analytics data after each update // Initialize analytics display
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
        if (!this.nextGameStartTime) return;
        
        const now = new Date();
        const timeLeft = this.nextGameStartTime.getTime() - now.getTime();
        
        if (timeLeft <= 0) {
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
    }

    renderCardGrid(card) {
        let html = '';
        const logos = ['🎯', '⭐', '🍀', '💎', '🎪', '🎰', '🏆', '🎨'];
        let logoIndex = 0;
        
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 9; col++) {
                const number = card.numbers[col][row];
                const isMarked = number && this.calledNumbers.has(number);
                const isEmpty = !number;
                
                // Asignar logotipo aleatorio para celdas vacías
                let logoClass = '';
                if (isEmpty) {
                    const randomLogo = logos[Math.floor(Math.random() * logos.length)];
                    logoClass = `logo-${logoIndex % logos.length}`;
                    logoIndex++;
                }
                
                html += `
                    <div class="bingo-cell ${isMarked ? 'marked' : ''} ${isEmpty ? 'empty' : ''} ${logoClass}" 
                         data-card-id="${card.id}" data-row="${row}" data-col="${col}">
                        ${number || ''}
                    </div>
                `;
            }
        }
        return html;
    }

    renderCalledNumbers() {
        const container = document.getElementById('calledNumbers');
        if (!container) {
            console.log('Contenedor de números llamados no encontrado');
            return;
        }
        
        container.innerHTML = '';

        for (let i = 1; i <= 90; i++) {
            const numberDiv = document.createElement('div');
            numberDiv.className = 'called-number';
            numberDiv.textContent = i;
            
            if (this.calledNumbers.has(i)) {
                numberDiv.classList.add('called');
            }
            
            container.appendChild(numberDiv);
        }
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
        // Validaciones de seguridad
        if (this.gameState === 'finished') {
            console.log('Juego terminado');
            return;
        }

        if (this.calledNumbers.size >= 90) {
            this.endGame();
            return;
        }

        // Validar límite de velocidad
        if (!securityManager.validateRateLimit('calls')) {
            alert('Demasiadas llamadas rápidas. Espere un momento.');
            return;
        }

        // Anti-spam protection
        const now = Date.now();
        if (this.lastCallTime && (now - this.lastCallTime) < this.securitySettings.minCallInterval) {
            console.log('Llamada demasiado rápida');
            securityManager.logSecurityEvent('spam_detected', 'Llamadas demasiado rápidas');
            return;
        }

        const availableNumbers = this.availableNumbers.filter(num => !this.calledNumbers.has(num));
        
        if (availableNumbers.length === 0) {
            this.endGame();
            return;
        }

        // Algoritmo mejorado para hacer el juego más desafiante
        const number = this.selectNextNumber(availableNumbers);
        
        // Validar número antes de agregarlo
        if (!securityManager.validateBingoNumbers([number])) {
            securityManager.logSecurityEvent('invalid_number', `Número inválido: ${number}`);
            return;
        }
        
        this.calledNumbers.add(number);
        this.lastNumberCalled = number;
        this.lastCallTime = now;
        this.callHistory.push({
            number: number,
            timestamp: new Date(),
            gameId: this.currentGameId
        });

        // Registrar evento de auditoría
        securityManager.logEvent('number_called', { number: number, gameId: this.currentGameId });

        // Update analytics
        this.updateAnalytics('number_called', { number });

        this.playNumberSound();
        this.updateDisplay();
        this.checkWin();
        this.addChatMessage('system', `Número llamado: ${number}`);
        console.log(`Número llamado: ${number}`);
        
        // Actualizar modal de números llamados si está abierto
        const modal = document.getElementById('calledNumbersModal');
        if (modal && modal.style.display === 'block') {
            this.updateCalledNumbersModal();
        }
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
        // Analizar qué números ayudarían más a completar líneas
        const strategicNumbers = this.analyzeStrategicNumbers(availableNumbers);
        
        if (phase === 'early') {
            // En fase temprana, evitar números muy estratégicos
            const nonStrategic = availableNumbers.filter(num => !strategicNumbers.includes(num));
            return nonStrategic.length > 0 ? 
                nonStrategic[Math.floor(Math.random() * nonStrategic.length)] :
                availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
        }
        else if (phase === 'late') {
            // En fase tardía, favorecer números menos estratégicos
            const lessStrategic = strategicNumbers.slice(0, Math.floor(strategicNumbers.length * 0.3));
            return lessStrategic.length > 0 ?
                lessStrategic[Math.floor(Math.random() * lessStrategic.length)] :
                availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
        }
        else {
            // Fase media: balance normal
            return availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
        }
    }

    analyzeStrategicNumbers(availableNumbers) {
        const strategicScores = {};
        
        availableNumbers.forEach(number => {
            let score = 0;
            this.userCards.forEach(card => {
                score += this.calculateNumberStrategicValue(number, card);
            });
            strategicScores[number] = score;
        });
        
        // Ordenar por valor estratégico (mayor a menor)
        return availableNumbers.sort((a, b) => strategicScores[b] - strategicScores[a]);
    }

    calculateNumberStrategicValue(number, card) {
        let value = 0;
        
        // Verificar si el número está en el cartón
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 9; col++) {
                if (card.numbers[col][row] === number) {
                    // Calcular cuántos números de la fila ya están marcados
                    let rowMarked = 0;
                    for (let c = 0; c < 9; c++) {
                        if (card.numbers[c][row] && this.calledNumbers.has(card.numbers[c][row])) {
                            rowMarked++;
                        }
                    }
                    
                    // Si ya hay 4 números marcados en la fila, este número es muy estratégico
                    if (rowMarked === 4) {
                        value += 10;
                    } else if (rowMarked === 3) {
                        value += 5;
                    } else if (rowMarked === 2) {
                        value += 2;
                    } else {
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
        this.gameState = 'finished';
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
        
        this.addChatMessage('system', '¡Partida terminada! La próxima partida comenzará en 2 minutos.');
        console.log('Juego terminado');
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
        const totalCost = quantity * this.cardPrice;
        
        if (this.userBalance < totalCost) {
            alert('Saldo insuficiente para comprar estos cartones');
            return false;
        }

        if (this.gameState === 'playing') {
            alert('No puedes comprar cartones durante una partida en curso');
            return false;
        }

        // Procesar compra
        this.userBalance -= totalCost;
        
        // Generar cartones
        const newCards = [];
        for (let i = 0; i < quantity; i++) {
            const card = this.addCard();
            if (card) {
                newCards.push(card);
            }
        }
        
        // Agregar a cartones seleccionados
        this.selectedCards.push(...newCards);
        
        // Update analytics
        this.updateAnalytics('card_purchased', {
            quantity: quantity,
            cost: totalCost
        });
        
        this.updateUI();
        this.updateDisplay();
        
        this.addChatMessage('system', `${quantity} cartón(es) comprado(s) por €${totalCost.toFixed(2)}`);
        console.log(`${quantity} cartones comprados por €${totalCost}`);
        
        return true;
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
        console.log('Iniciando nueva partida automática global...');
        
        if (this.gameState === 'playing') {
            console.log('Ya hay una partida en curso');
            return;
        }
        
        // Calcular premios dinámicos
        const dynamicPrizes = this.calculateDynamicPrizes();
        
        // Inicializar estado global del juego
        this.globalGameState = {
            gameId: this.generateGameId(),
            startTime: new Date(),
            endTime: null,
            totalPlayers: Math.floor(Math.random() * 50) + 10, // Simular jugadores
            totalCards: Math.floor(Math.random() * 200) + 50,  // Simular cartones
            calledNumbers: new Set(),
            winners: {
                line: null,
                twoLines: null,
                bingo: null
            },
            prizes: dynamicPrizes.prizes,
            isActive: true
        };
        
        // Limpiar estado anterior
        this.calledNumbers.clear();
        this.callHistory = [];
        this.lastNumberCalled = null;
        this.gameState = 'playing';
        this.currentGameId = this.globalGameState.gameId;
        this.gameStartTime = new Date();
        
        // Solo usar cartones seleccionados por el jugador
        this.userCards = [...this.selectedCards];
        
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
        
        this.autoPlayInterval = setInterval(() => {
            if (this.gameState === 'playing') {
                this.callNumber();
                
                // Verificar si alguien ganó
                if (this.checkWin()) {
                    this.endGame();
                }
            }
        }, 3000); // Llamar número cada 3 segundos
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
        this.renderCards();
        this.renderCalledNumbers();
        this.updateLastNumber();
        this.updateStats();
    }

    updateUI() {
        const balanceElement = document.getElementById('userBalance');
        const totalCardsElement = document.getElementById('totalCards');
        const activeCardsElement = document.getElementById('activeCards');
        const selectedCardsElement = document.getElementById('selectedCardsCount');
        const joinGameBtn = document.getElementById('joinGameBtn');
        
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
        } else {
            console.log('Modal de números llamados no encontrado');
        }
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
                this.gameAnalytics.gameHistory.push({
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
                }
            };
            this.saveAnalytics();
            this.updateAnalyticsDisplay();
            alert('Estadísticas reseteadas correctamente');
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
    // Verificar autenticación antes de inicializar el juego
    if (typeof authManager !== 'undefined' && authManager.isUserAuthenticated()) {
        const user = authManager.getCurrentUser();
        console.log('✅ Usuario autenticado:', user.name);
        
        // Actualizar información del usuario en la UI
        updateUserInfo(user);
        
        // Inicializar el juego
        bingoGame = new BingoPro();
        bingoGame.initializeGame();
        
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
        // Usuario no autenticado, redirigir a login
        console.log('🔒 Usuario no autenticado, redirigiendo a login...');
        window.location.href = 'login.html';
    }
});

// Función para actualizar información del usuario en la UI
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
            if (chatInput) {
                // Forzar que el input sea editable
                chatInput.readOnly = false;
                chatInput.disabled = false;
                chatInput.style.pointerEvents = 'auto';
                chatInput.style.userSelect = 'text';
                chatInput.style.webkitUserSelect = 'text';
                
                // Enfocar y seleccionar
                chatInput.focus();
                chatInput.select();
                
                // Agregar event listener adicional para asegurar que funcione
                chatInput.addEventListener('click', function() {
                    this.focus();
                    this.select();
                });
                
                // Enviar mensaje de bienvenida automático solo si es la primera vez
                if (!chatSection.dataset.welcomeSent) {
                    setTimeout(() => {
                        if (window.bingoGame) {
                            window.bingoGame.addChatMessage('bot', '¡Hola! 👋 Soy BingoBot, tu asistente personal. Escribe "ayuda" para ver todos los comandos disponibles. ¿En qué puedo ayudarte? 🤖');
                            chatSection.dataset.welcomeSent = 'true';
                        }
                    }, 500);
                }
                
                console.log('🎯 Chat input enfocado y configurado después de expandir');
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