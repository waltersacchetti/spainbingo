/* ===== SISTEMA DE SALAS MÚLTIPLES v3.0 ===== */
/* Sistema premium para 6-8 salas simultáneas */

class MultiRoomSystem {
    constructor(bingoGame) {
        this.bingoGame = bingoGame;
        this.currentRoom = 'classic';
        this.rooms = this.initializeRooms();
        this.roomStates = new Map();
        this.roomTimers = new Map();
        this.playerCounts = new Map();
        
        console.log('🏟️ Multi-Room System inicializado');
        this.initializeRoomStates();
        this.createRoomInterface();
    }

    /**
     * Definir configuración de salas
     */
    initializeRooms() {
        return {
            beginners: {
                id: 'beginners',
                name: 'Sala Principiantes',
                description: 'Perfecta para empezar tu aventura',
                cardPrice: 0.50,
                duration: 3 * 60 * 1000, // 3 minutos
                numberCallInterval: 4000, // 4 segundos
                maxPlayers: 50,
                minPlayers: 2,
                requirements: {
                    level: 0,
                    maxLevel: 3, // Solo hasta nivel 3
                    balance: 0
                },
                prizes: {
                    line: 8,
                    twoLines: 20,
                    bingo: 75,
                    jackpot: 1000
                },
                theme: {
                    primary: '#4CAF50',
                    secondary: '#81C784',
                    icon: 'fa-seedling'
                },
                schedule: 'continuous', // Partidas continuas
                features: ['Ayuda en tiempo real', 'Ritmo relajado', 'Premios principiantes'],
                isActive: true
            },

            classic: {
                id: 'classic',
                name: 'Sala Clásica',
                description: 'La experiencia tradicional del bingo',
                cardPrice: 1.00,
                duration: 2 * 60 * 1000, // 2 minutos
                numberCallInterval: 3000, // 3 segundos
                maxPlayers: 100,
                minPlayers: 3,
                requirements: {
                    level: 0,
                    balance: 2
                },
                prizes: {
                    line: 15,
                    twoLines: 40,
                    bingo: 150,
                    jackpot: 2500
                },
                theme: {
                    primary: '#1a237e',
                    secondary: '#3949ab',
                    icon: 'fa-crown'
                },
                schedule: 'hourly', // Cada hora
                features: ['Bingo tradicional', 'Comunidad activa', 'Premios equilibrados'],
                isActive: true
            },

            rapid: {
                id: 'rapid',
                name: 'Sala Rápida',
                description: 'Velocidad y emoción máxima',
                cardPrice: 1.50,
                duration: 1 * 60 * 1000, // 1 minuto
                numberCallInterval: 1500, // 1.5 segundos
                maxPlayers: 75,
                minPlayers: 5,
                requirements: {
                    level: 2,
                    balance: 10
                },
                prizes: {
                    line: 25,
                    twoLines: 60,
                    bingo: 200,
                    jackpot: 3500
                },
                theme: {
                    primary: '#FF5722',
                    secondary: '#FF8A65',
                    icon: 'fa-bolt'
                },
                schedule: 'frequent', // Cada 30 minutos
                features: ['Partidas rápidas', 'Alta emoción', 'Premios incrementados'],
                isActive: true
            },

            golden: {
                id: 'golden',
                name: 'Sala Dorada',
                description: 'Premios dorados para jugadores experimentados',
                cardPrice: 2.50,
                duration: 2.5 * 60 * 1000, // 2.5 minutos
                numberCallInterval: 3500, // 3.5 segundos
                maxPlayers: 60,
                minPlayers: 8,
                requirements: {
                    level: 5,
                    balance: 25
                },
                prizes: {
                    line: 40,
                    twoLines: 100,
                    bingo: 350,
                    jackpot: 7500
                },
                theme: {
                    primary: '#FFD700',
                    secondary: '#FFF176',
                    icon: 'fa-star'
                },
                schedule: 'special', // Horarios especiales
                features: ['Premios dorados', 'Jugadores experimentados', 'Botes aumentados'],
                isActive: true
            },

            vip: {
                id: 'vip',
                name: 'Sala VIP',
                description: 'Exclusiva para miembros VIP',
                cardPrice: 5.00,
                duration: 3 * 60 * 1000, // 3 minutos
                numberCallInterval: 4000, // 4 segundos
                maxPlayers: 30,
                minPlayers: 5,
                requirements: {
                    level: 7,
                    balance: 50,
                    vipStatus: true
                },
                prizes: {
                    line: 75,
                    twoLines: 200,
                    bingo: 500,
                    jackpot: 15000
                },
                theme: {
                    primary: '#9C27B0',
                    secondary: '#BA68C8',
                    icon: 'fa-gem'
                },
                schedule: 'exclusive', // Horarios VIP
                features: ['Solo VIP', 'Premios exclusivos', 'Chat privado', 'Manager personal'],
                isActive: true
            },

            night: {
                id: 'night',
                name: 'Sala Nocturna',
                description: 'Magia nocturna con premios especiales',
                cardPrice: 2.00,
                duration: 2.5 * 60 * 1000, // 2.5 minutos
                numberCallInterval: 3500, // 3.5 segundos
                maxPlayers: 80,
                minPlayers: 4,
                requirements: {
                    level: 3,
                    balance: 15,
                    timeOfDay: 'night'
                },
                prizes: {
                    line: 35,
                    twoLines: 85,
                    bingo: 300,
                    jackpot: 6000
                },
                theme: {
                    primary: '#3F51B5',
                    secondary: '#7986CB',
                    icon: 'fa-moon'
                },
                schedule: 'night', // Solo por la noche
                features: ['Solo nocturno', 'Ambiente misterioso', 'Bonificaciones especiales'],
                isActive: true
            },

            tournament: {
                id: 'tournament',
                name: 'Sala Torneo',
                description: 'Competición oficial con ranking',
                cardPrice: 3.00,
                duration: 4 * 60 * 1000, // 4 minutos
                numberCallInterval: 2500, // 2.5 segundos
                maxPlayers: 200,
                minPlayers: 20,
                requirements: {
                    level: 4,
                    balance: 30
                },
                prizes: {
                    line: 50,
                    twoLines: 150,
                    bingo: 600,
                    jackpot: 25000
                },
                theme: {
                    primary: '#E91E63',
                    secondary: '#F48FB1',
                    icon: 'fa-trophy'
                },
                schedule: 'tournament', // Horarios de torneo
                features: ['Competición oficial', 'Ranking global', 'Premios enormes'],
                isActive: false // Activar en eventos especiales
            },

            special: {
                id: 'special',
                name: 'Sala Especial',
                description: 'Eventos temáticos y celebraciones',
                cardPrice: 0, // Variable según evento
                duration: 0, // Variable según evento
                numberCallInterval: 3000,
                maxPlayers: 150,
                minPlayers: 10,
                requirements: {
                    level: 0
                },
                prizes: {
                    line: 0, // Variable según evento
                    twoLines: 0,
                    bingo: 0,
                    jackpot: 0
                },
                theme: {
                    primary: '#FF9800',
                    secondary: '#FFB74D',
                    icon: 'fa-gift'
                },
                schedule: 'event', // Solo durante eventos
                features: ['Eventos especiales', 'Temáticas únicas', 'Premios sorpresa'],
                isActive: false
            }
        };
    }

    /**
     * Inicializar estados de salas
     */
    initializeRoomStates() {
        for (const [roomId, room] of Object.entries(this.rooms)) {
            if (room.isActive) {
                this.roomStates.set(roomId, {
                    gameState: 'waiting',
                    currentPlayers: Math.floor(Math.random() * 20) + 5, // Simular jugadores
                    nextGameTime: this.calculateNextGameTime(room),
                    currentJackpot: room.prizes.jackpot,
                    calledNumbers: new Set(),
                    lastWinner: null
                });
                
                this.startRoomTimer(roomId);
            }
        }
    }

    /**
     * Calcular próximo horario de partida
     */
    calculateNextGameTime(room) {
        const now = new Date();
        const nextGame = new Date(now);
        
        switch (room.schedule) {
            case 'continuous':
                nextGame.setMinutes(nextGame.getMinutes() + 2);
                break;
            case 'frequent':
                nextGame.setMinutes(nextGame.getMinutes() + 5);
                break;
            case 'hourly':
                nextGame.setHours(nextGame.getHours() + 1, 0, 0, 0);
                break;
            case 'special':
                nextGame.setHours(nextGame.getHours() + 2);
                break;
            case 'night':
                if (now.getHours() < 22 && now.getHours() >= 6) {
                    nextGame.setHours(22, 0, 0, 0);
                } else {
                    nextGame.setMinutes(nextGame.getMinutes() + 30);
                }
                break;
            case 'exclusive':
                nextGame.setMinutes(nextGame.getMinutes() + 15);
                break;
            case 'tournament':
                nextGame.setHours(nextGame.getHours() + 6);
                break;
            default:
                nextGame.setMinutes(nextGame.getMinutes() + 10);
        }
        
        return nextGame;
    }

    /**
     * Crear interfaz de salas
     */
    createRoomInterface() {
        const roomsContainer = document.createElement('div');
        roomsContainer.id = 'multiRoomContainer';
        roomsContainer.className = 'multi-room-container card-premium';
        
        roomsContainer.innerHTML = `
            <div class="rooms-header">
                <h3><i class="fas fa-building"></i> Salas de Bingo</h3>
                <div class="room-filters">
                    <button class="filter-btn active" data-filter="all">Todas</button>
                    <button class="filter-btn" data-filter="available">Disponibles</button>
                    <button class="filter-btn" data-filter="vip">VIP</button>
                </div>
            </div>
            
            <div class="rooms-grid" id="roomsGrid">
                ${this.generateRoomsHTML()}
            </div>
            
            <div class="current-room-info" id="currentRoomInfo">
                <div class="info-header">
                    <h4>Sala Actual: <span id="currentRoomName">${this.rooms[this.currentRoom].name}</span></h4>
                    <button class="btn-premium btn-gold" id="leaveRoomBtn">
                        <i class="fas fa-sign-out-alt"></i> Cambiar Sala
                    </button>
                </div>
                <div class="room-stats">
                    <div class="stat-item">
                        <i class="fas fa-users"></i>
                        <span id="currentRoomPlayers">${this.roomStates.get(this.currentRoom)?.currentPlayers || 0}</span> jugadores
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-coins"></i>
                        <span id="currentRoomJackpot">€${this.roomStates.get(this.currentRoom)?.currentJackpot || 0}</span> bote
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-clock"></i>
                        <span id="currentRoomCountdown">--:--</span>
                    </div>
                </div>
            </div>
        `;
        
        // Insertar en el DOM
        const gameLayout = document.querySelector('.game-layout');
        if (gameLayout) {
            gameLayout.insertBefore(roomsContainer, gameLayout.firstChild);
        } else {
            document.body.appendChild(roomsContainer);
        }
        
        this.bindRoomEvents();
        this.startRoomUpdates();
    }

    /**
     * Generar HTML de salas
     */
    generateRoomsHTML() {
        let html = '';
        
        for (const [roomId, room] of Object.entries(this.rooms)) {
            if (!room.isActive && roomId !== 'special') continue;
            
            const state = this.roomStates.get(roomId);
            const canJoin = this.canJoinRoom(roomId);
            const isCurrentRoom = roomId === this.currentRoom;
            
            html += `
                <div class="room-card ${isCurrentRoom ? 'current' : ''} ${canJoin ? 'available' : 'locked'}" 
                     data-room-id="${roomId}">
                    <div class="room-header" style="background: linear-gradient(135deg, ${room.theme.primary}, ${room.theme.secondary})">
                        <div class="room-icon">
                            <i class="fas ${room.theme.icon}"></i>
                        </div>
                        <div class="room-title">
                            <h4>${room.name}</h4>
                            <p>${room.description}</p>
                        </div>
                        ${isCurrentRoom ? '<div class="current-badge">ACTUAL</div>' : ''}
                    </div>
                    
                    <div class="room-body">
                        <div class="room-info">
                            <div class="info-row">
                                <span class="label">Precio cartón:</span>
                                <span class="value">€${room.cardPrice.toFixed(2)}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Duración:</span>
                                <span class="value">${Math.floor(room.duration / 60000)}min</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Jugadores:</span>
                                <span class="value">${state?.currentPlayers || 0}/${room.maxPlayers}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Bote:</span>
                                <span class="value gold">€${state?.currentJackpot || room.prizes.jackpot}</span>
                            </div>
                        </div>
                        
                        <div class="room-features">
                            ${room.features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
                        </div>
                        
                        <div class="room-requirements">
                            ${this.generateRequirementsHTML(room.requirements)}
                        </div>
                        
                        <div class="room-countdown">
                            <i class="fas fa-clock"></i>
                            <span class="countdown-text" id="countdown-${roomId}">--:--</span>
                        </div>
                    </div>
                    
                    <div class="room-footer">
                        ${canJoin ? 
                            `<button class="btn-premium btn-royal join-room-btn" data-room-id="${roomId}">
                                <i class="fas fa-sign-in-alt"></i> ${isCurrentRoom ? 'En esta sala' : 'Unirse'}
                            </button>` :
                            `<button class="btn-premium" disabled>
                                <i class="fas fa-lock"></i> Bloqueada
                            </button>`
                        }
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    /**
     * Generar HTML de requisitos
     */
    generateRequirementsHTML(requirements) {
        let html = '<div class="requirements-list">';
        
        if (requirements.level > 0) {
            html += `<div class="req-item"><i class="fas fa-level-up-alt"></i> Nivel ${requirements.level}+</div>`;
        }
        
        if (requirements.maxLevel) {
            html += `<div class="req-item"><i class="fas fa-level-down-alt"></i> Máx. Nivel ${requirements.maxLevel}</div>`;
        }
        
        if (requirements.balance > 0) {
            html += `<div class="req-item"><i class="fas fa-coins"></i> €${requirements.balance}+ saldo</div>`;
        }
        
        if (requirements.vipStatus) {
            html += `<div class="req-item vip"><i class="fas fa-crown"></i> Estado VIP</div>`;
        }
        
        if (requirements.timeOfDay === 'night') {
            html += `<div class="req-item"><i class="fas fa-moon"></i> Solo nocturno</div>`;
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Verificar si puede unirse a una sala
     */
    canJoinRoom(roomId) {
        const room = this.rooms[roomId];
        const userInfo = this.bingoGame.getUserInfo();
        
        if (!room || !room.isActive) return false;
        if (!userInfo) return false;
        
        const requirements = room.requirements;
        
        // Verificar nivel
        if (requirements.level && (userInfo.level || 1) < requirements.level) {
            return false;
        }
        
        // Verificar nivel máximo
        if (requirements.maxLevel && (userInfo.level || 1) > requirements.maxLevel) {
            return false;
        }
        
        // Verificar saldo
        if (requirements.balance && this.bingoGame.userBalance < requirements.balance) {
            return false;
        }
        
        // Verificar VIP
        if (requirements.vipStatus && !userInfo.vipStatus) {
            return false;
        }
        
        // Verificar horario nocturno
        if (requirements.timeOfDay === 'night') {
            const hour = new Date().getHours();
            if (hour < 22 && hour >= 6) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Vincular eventos de salas
     */
    bindRoomEvents() {
        // Botones de unirse a sala
        document.querySelectorAll('.join-room-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const roomId = e.target.dataset.roomId;
                this.joinRoom(roomId);
            });
        });
        
        // Filtros de salas
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterRooms(e.target.dataset.filter);
            });
        });
        
        // Salir de sala
        document.getElementById('leaveRoomBtn')?.addEventListener('click', () => {
            this.showRoomSelector();
        });
    }

    /**
     * Unirse a una sala
     */
    joinRoom(roomId) {
        if (!this.canJoinRoom(roomId)) {
            this.showRoomError(roomId);
            return;
        }
        
        const room = this.rooms[roomId];
        const previousRoom = this.currentRoom;
        
        console.log(`🏟️ Cambiando de sala ${previousRoom} → ${roomId}`);
        
        // Actualizar sala actual
        this.currentRoom = roomId;
        
        // Actualizar configuración del juego principal
        this.updateGameConfiguration(room);
        
        // Actualizar UI
        this.updateCurrentRoomDisplay();
        this.updateRoomCards();
        
        // Notificar cambio
        this.showRoomChangeNotification(room);
        
        // Actualizar contadores de jugadores
        this.updatePlayerCounts(previousRoom, roomId);
        
        console.log(`✅ Unido exitosamente a ${room.name}`);
    }

    /**
     * Actualizar configuración del juego
     */
    updateGameConfiguration(room) {
        // Actualizar configuración en el juego principal
        if (this.bingoGame) {
            this.bingoGame.cardPrice = room.cardPrice;
            this.bingoGame.currentGameMode = room.id;
            
            // Actualizar precios en UI
            this.bingoGame.updateCardPriceDisplay?.();
            
            // Limpiar cartones actuales
            this.bingoGame.userCards = [];
            this.bingoGame.selectedCards = [];
            this.bingoGame.renderCards?.();
        }
    }

    /**
     * Actualizar display de sala actual
     */
    updateCurrentRoomDisplay() {
        const room = this.rooms[this.currentRoom];
        const state = this.roomStates.get(this.currentRoom);
        
        document.getElementById('currentRoomName').textContent = room.name;
        document.getElementById('currentRoomPlayers').textContent = state?.currentPlayers || 0;
        document.getElementById('currentRoomJackpot').textContent = `€${state?.currentJackpot || room.prizes.jackpot}`;
    }

    /**
     * Actualizar tarjetas de salas
     */
    updateRoomCards() {
        document.querySelectorAll('.room-card').forEach(card => {
            card.classList.remove('current');
        });
        
        const currentCard = document.querySelector(`[data-room-id="${this.currentRoom}"]`);
        if (currentCard) {
            currentCard.classList.add('current');
            const btn = currentCard.querySelector('.join-room-btn');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-check"></i> En esta sala';
                btn.disabled = true;
            }
        }
    }

    /**
     * Iniciar timers de salas
     */
    startRoomTimer(roomId) {
        const timer = setInterval(() => {
            this.updateRoomState(roomId);
        }, 1000);
        
        this.roomTimers.set(roomId, timer);
    }

    /**
     * Actualizar estado de sala
     */
    updateRoomState(roomId) {
        const state = this.roomStates.get(roomId);
        const room = this.rooms[roomId];
        
        if (!state || !room) return;
        
        // Actualizar countdown
        const now = new Date();
        const timeLeft = state.nextGameTime.getTime() - now.getTime();
        
        if (timeLeft <= 0) {
            // Iniciar nueva partida
            this.startRoomGame(roomId);
        } else {
            // Actualizar countdown
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            const countdownText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            const countdownElement = document.getElementById(`countdown-${roomId}`);
            if (countdownElement) {
                countdownElement.textContent = countdownText;
            }
            
            if (roomId === this.currentRoom) {
                const currentCountdown = document.getElementById('currentRoomCountdown');
                if (currentCountdown) {
                    currentCountdown.textContent = countdownText;
                }
            }
        }
    }

    /**
     * Iniciar partida en sala
     */
    startRoomGame(roomId) {
        const state = this.roomStates.get(roomId);
        const room = this.rooms[roomId];
        
        console.log(`🎮 Iniciando partida en ${room.name}`);
        
        // Actualizar estado
        state.gameState = 'playing';
        state.calledNumbers = new Set();
        
        // Simular duración de partida
        setTimeout(() => {
            this.endRoomGame(roomId);
        }, room.duration);
        
        // Programar siguiente partida
        state.nextGameTime = this.calculateNextGameTime(room);
    }

    /**
     * Finalizar partida en sala
     */
    endRoomGame(roomId) {
        const state = this.roomStates.get(roomId);
        const room = this.rooms[roomId];
        
        console.log(`🏁 Partida finalizada en ${room.name}`);
        
        // Actualizar estado
        state.gameState = 'waiting';
        
        // Actualizar bote (simulado)
        state.currentJackpot += Math.floor(Math.random() * 500) + 100;
        
        // Actualizar jugadores
        state.currentPlayers = Math.max(
            room.minPlayers,
            state.currentPlayers + Math.floor(Math.random() * 10) - 3
        );
    }

    /**
     * Iniciar actualizaciones periódicas
     */
    startRoomUpdates() {
        setInterval(() => {
            this.updateCurrentRoomDisplay();
            this.updateRoomCards();
        }, 5000);
    }

    /**
     * Filtrar salas
     */
    filterRooms(filter) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        document.querySelectorAll('.room-card').forEach(card => {
            const roomId = card.dataset.roomId;
            const room = this.rooms[roomId];
            let show = true;
            
            switch (filter) {
                case 'available':
                    show = this.canJoinRoom(roomId);
                    break;
                case 'vip':
                    show = room.requirements.vipStatus;
                    break;
                case 'all':
                default:
                    show = true;
                    break;
            }
            
            card.style.display = show ? 'block' : 'none';
        });
    }

    /**
     * Mostrar selector de salas
     */
    showRoomSelector() {
        const roomsGrid = document.getElementById('roomsGrid');
        if (roomsGrid) {
            roomsGrid.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Mostrar error de sala
     */
    showRoomError(roomId) {
        const room = this.rooms[roomId];
        const requirements = room.requirements;
        let message = `No puedes acceder a ${room.name}. `;
        
        if (requirements.level) {
            message += `Necesitas nivel ${requirements.level}. `;
        }
        if (requirements.vipStatus) {
            message += `Se requiere estado VIP. `;
        }
        if (requirements.balance) {
            message += `Saldo mínimo: €${requirements.balance}. `;
        }
        
        this.bingoGame.showNotification?.(message, 'error');
    }

    /**
     * Mostrar notificación de cambio de sala
     */
    showRoomChangeNotification(room) {
        const notification = document.createElement('div');
        notification.className = 'room-change-notification';
        notification.innerHTML = `
            <div class="notification-icon" style="background: linear-gradient(135deg, ${room.theme.primary}, ${room.theme.secondary})">
                <i class="fas ${room.theme.icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">Sala cambiada</div>
                <div class="notification-message">Ahora estás en ${room.name}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    /**
     * Actualizar contadores de jugadores
     */
    updatePlayerCounts(fromRoom, toRoom) {
        if (fromRoom && this.roomStates.has(fromRoom)) {
            const fromState = this.roomStates.get(fromRoom);
            fromState.currentPlayers = Math.max(1, fromState.currentPlayers - 1);
        }
        
        if (toRoom && this.roomStates.has(toRoom)) {
            const toState = this.roomStates.get(toRoom);
            toState.currentPlayers += 1;
        }
    }

    /**
     * Obtener sala actual
     */
    getCurrentRoom() {
        return this.rooms[this.currentRoom];
    }

    /**
     * Obtener estado de sala actual
     */
    getCurrentRoomState() {
        return this.roomStates.get(this.currentRoom);
    }

    /**
     * Destruir sistema
     */
    destroy() {
        // Limpiar timers
        this.roomTimers.forEach(timer => clearInterval(timer));
        this.roomTimers.clear();
        
        // Remover elementos del DOM
        document.getElementById('multiRoomContainer')?.remove();
        
        console.log('🏟️ Multi-Room System destruido');
    }
}

// CSS para el sistema de salas múltiples
const multiRoomCSS = `
.multi-room-container {
    margin-bottom: var(--spacing-xl);
    animation: fadeInUp 0.8s ease-out;
}

.rooms-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--glass-border);
}

.rooms-header h3 {
    color: var(--premium-gold);
    font-size: 1.3rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.room-filters {
    display: flex;
    gap: var(--spacing-sm);
}

.filter-btn {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: white;
    padding: var(--spacing-sm) var(--spacing-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: 0.85rem;
}

.filter-btn:hover, .filter-btn.active {
    background: var(--gradient-gold);
    color: var(--premium-royal-blue-dark);
    border-color: var(--premium-gold);
}

.rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
}

.room-card {
    background: var(--glass-bg-strong);
    backdrop-filter: var(--glass-backdrop);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-medium);
    overflow: hidden;
    transition: all var(--transition-medium);
    position: relative;
}

.room-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-strong);
}

.room-card.current {
    border-color: var(--premium-gold);
    box-shadow: var(--shadow-glow);
}

.room-card.locked {
    opacity: 0.6;
    filter: grayscale(0.3);
}

.room-header {
    padding: var(--spacing-md);
    color: white;
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
}

.room-icon {
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-round);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
}

.room-title h4 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: var(--spacing-xs);
}

.room-title p {
    font-size: 0.85rem;
    opacity: 0.9;
    margin: 0;
}

.current-badge {
    position: absolute;
    top: var(--spacing-sm);
    right: var(--spacing-sm);
    background: var(--premium-gold);
    color: var(--premium-royal-blue-dark);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    font-weight: 600;
}

.room-body {
    padding: var(--spacing-md);
}

.room-info {
    margin-bottom: var(--spacing-md);
}

.info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-xs);
    font-size: 0.9rem;
}

.info-row .label {
    color: rgba(255, 255, 255, 0.8);
}

.info-row .value {
    color: white;
    font-weight: 500;
}

.info-row .value.gold {
    color: var(--premium-gold);
    font-weight: 600;
}

.room-features {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-md);
}

.feature-tag {
    background: rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.9);
}

.room-requirements {
    margin-bottom: var(--spacing-md);
}

.requirements-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
}

.req-item {
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
}

.req-item.vip {
    background: linear-gradient(135deg, var(--premium-gold), var(--premium-gold-light));
    color: var(--premium-royal-blue-dark);
}

.room-countdown {
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--radius-sm);
    padding: var(--spacing-sm);
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    font-weight: 600;
    color: var(--premium-gold);
}

.room-footer {
    padding: var(--spacing-md);
    border-top: 1px solid var(--glass-border);
}

.current-room-info {
    background: var(--glass-bg-strong);
    backdrop-filter: var(--glass-backdrop);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    margin-top: var(--spacing-lg);
}

.info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
}

.info-header h4 {
    color: var(--premium-gold);
    font-size: 1.1rem;
    font-weight: 600;
}

.room-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--spacing-md);
}

.stat-item {
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
}

.stat-item i {
    color: var(--premium-gold);
    font-size: 1.2rem;
}

.room-change-notification {
    position: fixed;
    top: 200px;
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
    min-width: 280px;
}

.room-change-notification.show {
    transform: translateX(0);
    opacity: 1;
}

@media (max-width: 768px) {
    .rooms-grid {
        grid-template-columns: 1fr;
        gap: var(--spacing-md);
    }
    
    .room-filters {
        flex-wrap: wrap;
    }
    
    .filter-btn {
        font-size: 0.8rem;
        padding: var(--spacing-xs) var(--spacing-sm);
    }
    
    .room-stats {
        grid-template-columns: 1fr;
        gap: var(--spacing-sm);
    }
    
    .info-header {
        flex-direction: column;
        align-items: stretch;
        gap: var(--spacing-md);
    }
}
`;

// Inyectar CSS
const multiRoomStyleSheet = document.createElement('style');
multiRoomStyleSheet.textContent = multiRoomCSS;
document.head.appendChild(multiRoomStyleSheet);

// Exportar clase
window.MultiRoomSystem = MultiRoomSystem; 