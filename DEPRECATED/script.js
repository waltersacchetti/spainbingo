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
        this.winConditions = {
            LINE: { name: 'línea', required: 5, prize: 10, probability: 0.15 },
            TWO_LINES: { name: 'dos líneas', required: 10, prize: 25, probability: 0.08 },
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
        this.initializeGame();
        this.setupEventListeners();
        this.initializeSounds();
        this.updateUI();
        console.log('BingoPro inicializado correctamente');
    }

    initializeGame() {
        // Generar cartones iniciales con validación
        this.addCard();
        this.addCard();
        this.updateDisplay();
        this.gameState = 'waiting';
        this.currentGameId = this.generateGameId();
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
            winHistory: []
        };
        this.userCards.push(card);
        return card;
    }

    generateCardId() {
        return 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateBingoCard() {
        const card = [];
        
        for (let col = 0; col < 9; col++) {
            const columnNumbers = [];
            const minNumber = col * 10 + 1;
            const maxNumber = Math.min((col + 1) * 10, 90);
            
            const availableNumbers = [];
            for (let i = minNumber; i <= maxNumber; i++) {
                availableNumbers.push(i);
            }
            
            // Mejorar la distribución para hacer el juego más desafiante
            const numbersToPick = Math.min(3, availableNumbers.length);
            for (let i = 0; i < numbersToPick; i++) {
                if (availableNumbers.length > 0) {
                    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
                    columnNumbers.push(availableNumbers[randomIndex]);
                    availableNumbers.splice(randomIndex, 1);
                }
            }
            
            // Rellenar con espacios vacíos si es necesario
            while (columnNumbers.length < 3) {
                columnNumbers.push(null);
            }
            
            columnNumbers.sort((a, b) => (a || 0) - (b || 0));
            card.push(columnNumbers);
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
            cardElement.className = 'bingo-card';
            cardElement.innerHTML = `
                <div class="card-header">
                    <h4>Cartón ${index + 1}</h4>
                    <div class="card-status ${card.isActive ? 'active' : 'inactive'}">
                        ${card.isActive ? 'Activo' : 'Inactivo'}
                    </div>
                </div>
                <div class="bingo-card-grid">
                    ${this.renderCardGrid(card)}
                </div>
            `;
            cardsContainer.appendChild(cardElement);
        });
    }

    renderCardGrid(card) {
        let html = '';
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 9; col++) {
                const number = card.numbers[col][row];
                const isMarked = number && this.calledNumbers.has(number);
                const isEmpty = !number;
                
                html += `
                    <div class="bingo-cell ${isMarked ? 'marked' : ''} ${isEmpty ? 'empty' : ''}" 
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
        this.userCards.forEach(card => {
            if (!card.isActive) return;
            
            const winResult = this.checkCardWin(card);
            if (winResult.won) {
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
        
        // Verificar dos líneas - más difícil
        if (completedLines >= 2 && card.linesCompleted < 2) {
            card.linesCompleted = 2;
            return { won: true, type: 'TWO_LINES' };
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
            case 'TWO_LINES':
                return completedLines >= 2 && this.calledNumbers.size >= 20; // Mínimo 20 números llamados
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

    endGame() {
        this.gameState = 'finished';
        this.stopAutoPlay();
        this.showGameOverModal();
        console.log('Juego terminado');
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
        
        if (type === 'system') {
            messageDiv.innerHTML = `
                <span class="message-time">${time}</span>
                <span class="message-text">${message}</span>
            `;
        } else {
            messageDiv.innerHTML = `
                <span class="message-user">Tú:</span>
                <span class="message-text">${message}</span>
            `;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
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
        
        if (balanceElement) {
            balanceElement.textContent = `€${this.userBalance.toFixed(2)}`;
        }
        if (totalCardsElement) {
            totalCardsElement.textContent = this.userCards.length;
        }
        if (activeCardsElement) {
            activeCardsElement.textContent = this.userCards.filter(card => card.isActive).length;
        }
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

        // Chat
        const chatInput = document.getElementById('chatInput');
        const btnSend = document.querySelector('.btn-send');
        
        if (chatInput && btnSend) {
            const sendMessage = () => {
                const message = chatInput.value.trim();
                if (message) {
                    this.addChatMessage('user', message);
                    chatInput.value = '';
                }
            };
            
            btnSend.addEventListener('click', sendMessage);
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }

        // Atajos de teclado
        document.addEventListener('keydown', (event) => {
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