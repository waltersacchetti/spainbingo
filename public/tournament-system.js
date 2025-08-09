/* ===== SISTEMA DE TORNEOS COMPETITIVOS v3.0 ===== */
/* Torneos automatizados con grandes premios y ranking */

class TournamentSystem {
    constructor(bingoGame) {
        this.bingoGame = bingoGame;
        this.currentTournaments = new Map();
        this.tournamentHistory = [];
        this.playerStats = {
            tournamentsPlayed: 0,
            tournamentsWon: 0,
            totalPrizes: 0,
            bestRank: null,
            currentStreak: 0
        };
        
        // Configuración de torneos
        this.tournamentTypes = this.initializeTournamentTypes();
        this.prizeStructures = this.initializePrizeStructures();
        this.schedule = this.initializeSchedule();
        
        console.log('🏆 Tournament System inicializando...');
        this.loadTournamentData();
        this.createInterface();
        this.initializeScheduler();
    }

    /**
     * Inicializar tipos de torneos
     */
    initializeTournamentTypes() {
        return {
            daily_morning: {
                id: 'daily_morning',
                name: 'Torneo Matutino',
                description: 'Comienza tu día ganando',
                icon: 'fa-sun',
                color: '#FFD700',
                duration: 30 * 60 * 1000, // 30 minutos
                maxPlayers: 50,
                minPlayers: 10,
                entryFee: 5.00,
                cardPrice: 1.00,
                gamesPerRound: 3,
                format: 'elimination',
                schedule: {
                    days: [1, 2, 3, 4, 5, 6, 0], // Todos los días
                    time: '09:00'
                },
                requirements: {
                    level: 2,
                    balance: 10
                },
                prizes: {
                    total: 200,
                    structure: 'percentage',
                    distribution: [40, 25, 15, 10, 5, 3, 2] // Top 7
                }
            },

            daily_afternoon: {
                id: 'daily_afternoon',
                name: 'Torneo Vespertino',
                description: 'Tarde de emociones',
                icon: 'fa-cloud-sun',
                color: '#FF8C00',
                duration: 45 * 60 * 1000,
                maxPlayers: 75,
                minPlayers: 15,
                entryFee: 8.00,
                cardPrice: 1.50,
                gamesPerRound: 4,
                format: 'points',
                schedule: {
                    days: [1, 2, 3, 4, 5, 6, 0],
                    time: '16:00'
                },
                requirements: {
                    level: 3,
                    balance: 20
                },
                prizes: {
                    total: 400,
                    structure: 'percentage',
                    distribution: [35, 20, 15, 10, 8, 6, 4, 2] // Top 8
                }
            },

            daily_night: {
                id: 'daily_night',
                name: 'Torneo Nocturno',
                description: 'La noche de los campeones',
                icon: 'fa-moon',
                color: '#4B0082',
                duration: 60 * 60 * 1000,
                maxPlayers: 100,
                minPlayers: 20,
                entryFee: 12.00,
                cardPrice: 2.00,
                gamesPerRound: 5,
                format: 'survival',
                schedule: {
                    days: [1, 2, 3, 4, 5, 6, 0],
                    time: '21:00'
                },
                requirements: {
                    level: 4,
                    balance: 30
                },
                prizes: {
                    total: 800,
                    structure: 'percentage',
                    distribution: [30, 18, 12, 10, 8, 6, 5, 4, 3, 2, 2] // Top 11
                }
            },

            weekly_classic: {
                id: 'weekly_classic',
                name: 'Clásico Semanal',
                description: 'El torneo más prestigioso',
                icon: 'fa-trophy',
                color: '#DAA520',
                duration: 2 * 60 * 60 * 1000, // 2 horas
                maxPlayers: 200,
                minPlayers: 50,
                entryFee: 25.00,
                cardPrice: 3.00,
                gamesPerRound: 8,
                format: 'championship',
                schedule: {
                    days: [0], // Domingos
                    time: '20:00'
                },
                requirements: {
                    level: 6,
                    balance: 100
                },
                prizes: {
                    total: 2000,
                    structure: 'fixed',
                    distribution: [800, 500, 300, 200, 100, 50, 30, 20] // Top 8
                }
            },

            monthly_championship: {
                id: 'monthly_championship',
                name: 'Campeonato Mensual',
                description: 'Solo para los mejores',
                icon: 'fa-crown',
                color: '#DC143C',
                duration: 4 * 60 * 60 * 1000, // 4 horas
                maxPlayers: 500,
                minPlayers: 100,
                entryFee: 50.00,
                cardPrice: 5.00,
                gamesPerRound: 12,
                format: 'grand_prix',
                schedule: {
                    days: [6], // Último sábado del mes
                    time: '18:00'
                },
                requirements: {
                    level: 8,
                    balance: 200,
                    monthlyGames: 50
                },
                prizes: {
                    total: 10000,
                    structure: 'fixed',
                    distribution: [4000, 2500, 1500, 1000, 500, 300, 200] // Top 7
                },
                physicalPrizes: [
                    'iPad Pro',
                    'iPhone 15',
                    'AirPods Pro',
                    'Apple Watch'
                ]
            },

            speed_tournament: {
                id: 'speed_tournament',
                name: 'Torneo Relámpago',
                description: '30 cartones en 10 minutos',
                icon: 'fa-bolt',
                color: '#FF4500',
                duration: 10 * 60 * 1000, // 10 minutos
                maxPlayers: 30,
                minPlayers: 8,
                entryFee: 3.00,
                cardPrice: 0.50,
                gamesPerRound: 30,
                format: 'speed',
                schedule: {
                    days: [1, 2, 3, 4, 5], // Laborables
                    time: 'hourly' // Cada hora
                },
                requirements: {
                    level: 5,
                    balance: 15
                },
                prizes: {
                    total: 75,
                    structure: 'percentage',
                    distribution: [50, 30, 20] // Top 3
                }
            },

            vip_exclusive: {
                id: 'vip_exclusive',
                name: 'Torneo VIP Exclusivo',
                description: 'Solo para miembros VIP',
                icon: 'fa-gem',
                color: '#9932CC',
                duration: 90 * 60 * 1000, // 1.5 horas
                maxPlayers: 50,
                minPlayers: 15,
                entryFee: 0, // Gratis para VIPs
                cardPrice: 0, // Cartones gratis
                gamesPerRound: 6,
                format: 'vip_special',
                schedule: {
                    days: [6], // Sábados
                    time: '15:00'
                },
                requirements: {
                    vipStatus: true,
                    level: 7
                },
                prizes: {
                    total: 1500,
                    structure: 'percentage',
                    distribution: [40, 25, 15, 10, 5, 3, 2] // Top 7
                },
                vipBonuses: {
                    extraCashback: 10,
                    bonusXP: 500,
                    exclusiveTitle: 'Campeón VIP'
                }
            }
        };
    }

    /**
     * Inicializar estructuras de premios
     */
    initializePrizeStructures() {
        return {
            percentage: (totalPrize, distribution, playersCount) => {
                const prizes = [];
                distribution.forEach((percentage, index) => {
                    if (index < playersCount) {
                        prizes.push(Math.floor(totalPrize * percentage / 100));
                    }
                });
                return prizes;
            },

            fixed: (totalPrize, distribution, playersCount) => {
                return distribution.slice(0, Math.min(distribution.length, playersCount));
            },

            dynamic: (totalPrize, playersCount) => {
                // Distribución dinámica basada en número de jugadores
                const prizes = [];
                const winners = Math.min(Math.floor(playersCount * 0.3), 15);
                
                for (let i = 0; i < winners; i++) {
                    const percentage = Math.max(5, 40 - (i * 3));
                    prizes.push(Math.floor(totalPrize * percentage / 100));
                }
                
                return prizes;
            }
        };
    }

    /**
     * Inicializar programación
     */
    initializeSchedule() {
        return {
            nextTournaments: [],
            activeTournaments: [],
            upcomingEvents: []
        };
    }

    /**
     * Crear interfaz de torneos
     */
    createInterface() {
        const tournamentPanel = document.createElement('div');
        tournamentPanel.id = 'tournamentSystemPanel';
        tournamentPanel.className = 'tournament-system-panel card-premium';
        
        tournamentPanel.innerHTML = `
            <div class="tournament-header">
                <div class="tournament-title">
                    <h3><i class="fas fa-trophy"></i> Torneos Competitivos</h3>
                    <div class="tournament-status" id="tournamentStatus">
                        ${this.generateStatusHTML()}
                    </div>
                </div>
                <button class="tournament-btn" id="viewAllTournaments">
                    <i class="fas fa-list"></i> Ver Todos
                </button>
            </div>
            
            <div class="tournament-content">
                <div class="active-tournaments" id="activeTournaments">
                    <h4>Torneos Activos</h4>
                    ${this.generateActiveTournamentsHTML()}
                </div>
                
                <div class="upcoming-tournaments" id="upcomingTournaments">
                    <h4>Próximos Torneos</h4>
                    ${this.generateUpcomingTournamentsHTML()}
                </div>
                
                <div class="player-stats" id="playerTournamentStats">
                    <h4>Mis Estadísticas</h4>
                    ${this.generatePlayerStatsHTML()}
                </div>
                
                <div class="tournament-leaderboard" id="tournamentLeaderboard">
                    <h4>Ranking General</h4>
                    ${this.generateLeaderboardHTML()}
                </div>
            </div>
        `;
        
        // Insertar en el DOM
        const sidebar = document.querySelector('.game-sidebar');
        if (sidebar) {
            sidebar.appendChild(tournamentPanel);
        } else {
            document.body.appendChild(tournamentPanel);
        }
        
        this.bindTournamentEvents();
    }

    /**
     * Generar HTML de estado
     */
    generateStatusHTML() {
        const activeTournaments = Array.from(this.currentTournaments.values())
            .filter(t => t.status === 'active').length;
        
        return `
            <div class="status-info">
                <span class="status-label">Activos:</span>
                <span class="status-value">${activeTournaments}</span>
            </div>
            <div class="status-info">
                <span class="status-label">Participando:</span>
                <span class="status-value">${this.getPlayerActiveTournaments()}</span>
            </div>
        `;
    }

    /**
     * Generar HTML de torneos activos
     */
    generateActiveTournamentsHTML() {
        const activeTournaments = Array.from(this.currentTournaments.values())
            .filter(t => t.status === 'active' || t.status === 'registration');
        
        if (activeTournaments.length === 0) {
            return '<div class="no-tournaments">No hay torneos activos en este momento</div>';
        }
        
        return activeTournaments.map(tournament => `
            <div class="tournament-card active" data-tournament-id="${tournament.id}">
                <div class="tournament-card-header" style="background: ${tournament.type.color}">
                    <i class="fas ${tournament.type.icon}"></i>
                    <div class="tournament-info">
                        <h5>${tournament.type.name}</h5>
                        <p>${tournament.type.description}</p>
                    </div>
                    <div class="tournament-status-badge ${tournament.status}">
                        ${tournament.status === 'active' ? 'EN VIVO' : 'REGISTRO'}
                    </div>
                </div>
                
                <div class="tournament-card-body">
                    <div class="tournament-details">
                        <div class="detail-item">
                            <i class="fas fa-users"></i>
                            <span>${tournament.currentPlayers}/${tournament.type.maxPlayers}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-coins"></i>
                            <span>€${tournament.type.entryFee}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-trophy"></i>
                            <span>€${tournament.totalPrize}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-clock"></i>
                            <span id="countdown-${tournament.id}">--:--</span>
                        </div>
                    </div>
                    
                    <div class="tournament-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(tournament.currentPlayers / tournament.type.maxPlayers) * 100}%"></div>
                        </div>
                        <span class="progress-text">${tournament.currentPlayers} jugadores</span>
                    </div>
                </div>
                
                <div class="tournament-card-footer">
                    ${this.generateTournamentActionHTML(tournament)}
                </div>
            </div>
        `).join('');
    }

    /**
     * Generar HTML de próximos torneos
     */
    generateUpcomingTournamentsHTML() {
        const upcomingTournaments = this.calculateUpcomingTournaments();
        
        return upcomingTournaments.slice(0, 3).map(tournament => `
            <div class="tournament-card upcoming" data-tournament-type="${tournament.typeId}">
                <div class="tournament-card-header" style="background: ${tournament.type.color}">
                    <i class="fas ${tournament.type.icon}"></i>
                    <div class="tournament-info">
                        <h5>${tournament.type.name}</h5>
                        <p>Inicia en ${this.formatTimeUntil(tournament.startTime)}</p>
                    </div>
                </div>
                
                <div class="tournament-card-body">
                    <div class="tournament-schedule">
                        <div class="schedule-item">
                            <i class="fas fa-calendar"></i>
                            <span>${tournament.startTime.toLocaleDateString('es-ES')}</span>
                        </div>
                        <div class="schedule-item">
                            <i class="fas fa-clock"></i>
                            <span>${tournament.startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                    
                    <div class="tournament-preview">
                        <div class="preview-item">
                            <span class="preview-label">Premio Total:</span>
                            <span class="preview-value">€${tournament.type.prizes.total}</span>
                        </div>
                        <div class="preview-item">
                            <span class="preview-label">Duración:</span>
                            <span class="preview-value">${Math.floor(tournament.type.duration / 60000)} min</span>
                        </div>
                    </div>
                </div>
                
                <div class="tournament-card-footer">
                    <button class="tournament-action-btn notify-btn" data-tournament-type="${tournament.typeId}">
                        <i class="fas fa-bell"></i> Notificarme
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Generar HTML de estadísticas del jugador
     */
    generatePlayerStatsHTML() {
        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-gamepad"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-value">${this.playerStats.tournamentsPlayed}</span>
                        <span class="stat-label">Jugados</span>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-value">${this.playerStats.tournamentsWon}</span>
                        <span class="stat-label">Ganados</span>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-coins"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-value">€${this.playerStats.totalPrizes.toFixed(0)}</span>
                        <span class="stat-label">Premios</span>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-medal"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-value">${this.playerStats.bestRank || '--'}</span>
                        <span class="stat-label">Mejor Pos.</span>
                    </div>
                </div>
            </div>
            
            <div class="achievement-progress">
                <div class="achievement-item">
                    <span class="achievement-label">Racha Actual:</span>
                    <span class="achievement-value">${this.playerStats.currentStreak} torneos</span>
                </div>
                
                <div class="achievement-item">
                    <span class="achievement-label">Win Rate:</span>
                    <span class="achievement-value">${this.calculateWinRate()}%</span>
                </div>
            </div>
        `;
    }

    /**
     * Generar HTML del leaderboard
     */
    generateLeaderboardHTML() {
        const topPlayers = this.getTopPlayers();
        
        return `
            <div class="leaderboard-list">
                ${topPlayers.map((player, index) => `
                    <div class="leaderboard-item ${index < 3 ? 'top-three' : ''}">
                        <div class="player-rank">
                            ${index < 3 ? `<i class="fas fa-medal rank-${index + 1}"></i>` : `<span class="rank-number">${index + 1}</span>`}
                        </div>
                        <div class="player-info">
                            <span class="player-name">${player.name}</span>
                            <span class="player-score">${player.score} pts</span>
                        </div>
                        <div class="player-prizes">
                            €${player.totalPrizes}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="leaderboard-footer">
                <button class="tournament-action-btn" id="viewFullLeaderboard">
                    Ver Ranking Completo
                </button>
            </div>
        `;
    }

    /**
     * Vincular eventos de torneos
     */
    bindTournamentEvents() {
        // Ver todos los torneos
        document.getElementById('viewAllTournaments')?.addEventListener('click', () => {
            this.showAllTournamentsModal();
        });
        
        // Acciones de torneos
        document.querySelectorAll('.join-tournament-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tournamentId = e.target.dataset.tournamentId;
                this.joinTournament(tournamentId);
            });
        });
        
        // Notificaciones
        document.querySelectorAll('.notify-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tournamentType = e.target.dataset.tournamentType;
                this.setTournamentNotification(tournamentType);
            });
        });
        
        // Ver leaderboard completo
        document.getElementById('viewFullLeaderboard')?.addEventListener('click', () => {
            this.showFullLeaderboard();
        });
    }

    /**
     * Funcionalidades principales del sistema
     */
    
    joinTournament(tournamentId) {
        const tournament = this.currentTournaments.get(tournamentId);
        if (!tournament) {
            this.showError('Torneo no encontrado');
            return;
        }
        
        if (!this.canJoinTournament(tournament)) {
            this.showJoinError(tournament);
            return;
        }
        
        // Verificar balance
        if (this.bingoGame.userBalance < tournament.type.entryFee) {
            this.showError('Saldo insuficiente para unirse al torneo');
            return;
        }
        
        // Cobrar entrada
        this.bingoGame.userBalance -= tournament.type.entryFee;
        
        // Añadir jugador
        tournament.players.push({
            id: this.bingoGame.username || 'Usuario',
            name: this.bingoGame.username || 'Usuario',
            joinTime: new Date(),
            score: 0,
            position: null,
            isActive: true
        });
        
        tournament.currentPlayers++;
        
        this.saveTournamentData();
        this.updateInterface();
        this.showJoinSuccess(tournament);
        
        console.log(`🏆 Unido al torneo: ${tournament.type.name}`);
    }
    
    canJoinTournament(tournament) {
        const userLevel = this.bingoGame.currentLevel || 1;
        const userBalance = this.bingoGame.userBalance || 0;
        const requirements = tournament.type.requirements;
        
        // Verificar nivel
        if (requirements.level && userLevel < requirements.level) {
            return false;
        }
        
        // Verificar balance
        if (requirements.balance && userBalance < requirements.balance) {
            return false;
        }
        
        // Verificar VIP
        if (requirements.vipStatus && !this.bingoGame.isVip) {
            return false;
        }
        
        // Verificar que no esté lleno
        if (tournament.currentPlayers >= tournament.type.maxPlayers) {
            return false;
        }
        
        // Verificar que esté en registro
        if (tournament.status !== 'registration') {
            return false;
        }
        
        return true;
    }
    
    /**
     * Inicializar programador de torneos
     */
    initializeScheduler() {
        // Crear torneos programados
        this.scheduleAllTournaments();
        
        // Actualizar cada minuto
        setInterval(() => {
            this.updateTournamentSchedule();
        }, 60000);
        
        // Actualizar interfaz cada 10 segundos
        setInterval(() => {
            this.updateInterface();
        }, 10000);
    }
    
    scheduleAllTournaments() {
        Object.values(this.tournamentTypes).forEach(tournamentType => {
            if (tournamentType.schedule.time === 'hourly') {
                this.scheduleHourlyTournaments(tournamentType);
            } else {
                this.scheduleRegularTournaments(tournamentType);
            }
        });
    }
    
    /**
     * Calcular próximos torneos
     */
    calculateUpcomingTournaments() {
        const upcoming = [];
        const now = new Date();
        
        Object.entries(this.tournamentTypes).forEach(([typeId, type]) => {
            if (type.schedule.time === 'hourly') {
                // Próxima hora
                const nextHour = new Date(now);
                nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
                upcoming.push({ typeId, type, startTime: nextHour });
            } else {
                // Próximo día programado
                const nextDate = this.getNextScheduledDate(type.schedule);
                if (nextDate) {
                    upcoming.push({ typeId, type, startTime: nextDate });
                }
            }
        });
        
        return upcoming.sort((a, b) => a.startTime - b.startTime);
    }
    
    /**
     * Utilidades
     */
    formatTimeUntil(date) {
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        
        if (diff < 0) return 'Ya comenzó';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }
    
    calculateWinRate() {
        if (this.playerStats.tournamentsPlayed === 0) return 0;
        return Math.round((this.playerStats.tournamentsWon / this.playerStats.tournamentsPlayed) * 100);
    }
    
    getPlayerActiveTournaments() {
        return Array.from(this.currentTournaments.values())
            .filter(t => t.players.some(p => p.id === this.bingoGame.username)).length;
    }
    
    getTopPlayers() {
        // Simular datos de ranking
        return [
            { name: 'ProPlayer123', score: 2500, totalPrizes: 1250 },
            { name: 'BingoMaster', score: 2300, totalPrizes: 980 },
            { name: 'LuckyWinner', score: 2100, totalPrizes: 875 },
            { name: 'ChampionRoyal', score: 1950, totalPrizes: 720 },
            { name: 'EliteGamer', score: 1800, totalPrizes: 650 }
        ];
    }
    
    /**
     * Persistencia de datos
     */
    loadTournamentData() {
        try {
            const saved = localStorage.getItem('bingoroyal_tournament_data');
            if (saved) {
                const data = JSON.parse(saved);
                this.playerStats = { ...this.playerStats, ...data.playerStats };
                this.tournamentHistory = data.tournamentHistory || [];
            }
        } catch (error) {
            console.log('⚠️ Error cargando datos de torneos:', error);
        }
    }
    
    saveTournamentData() {
        try {
            const data = {
                playerStats: this.playerStats,
                tournamentHistory: this.tournamentHistory
            };
            localStorage.setItem('bingoroyal_tournament_data', JSON.stringify(data));
        } catch (error) {
            console.log('⚠️ Error guardando datos de torneos:', error);
        }
    }
    
    updateInterface() {
        document.getElementById('tournamentStatus').innerHTML = this.generateStatusHTML();
        document.getElementById('activeTournaments').innerHTML = 
            '<h4>Torneos Activos</h4>' + this.generateActiveTournamentsHTML();
        document.getElementById('upcomingTournaments').innerHTML = 
            '<h4>Próximos Torneos</h4>' + this.generateUpcomingTournamentsHTML();
        document.getElementById('playerTournamentStats').innerHTML = 
            '<h4>Mis Estadísticas</h4>' + this.generatePlayerStatsHTML();
    }
    
    /**
     * Destruir sistema
     */
    destroy() {
        document.getElementById('tournamentSystemPanel')?.remove();
        console.log('🏆 Tournament System destruido');
    }
}

// CSS básico para torneos
const tournamentSystemCSS = `
.tournament-system-panel {
    margin-bottom: var(--spacing-xl);
    animation: slideInRight 1s ease-out;
}

.tournament-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-md);
    border-bottom: 2px solid var(--premium-gold);
}

.tournament-title h3 {
    color: var(--premium-gold);
    font-size: 1.3rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.tournament-status {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-sm);
}

.status-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.9rem;
}

.status-value {
    color: var(--premium-gold);
    font-weight: 600;
}

.tournament-card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-md);
    overflow: hidden;
    transition: all var(--transition-medium);
}

.tournament-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-medium);
}

.tournament-card.active {
    border-color: var(--premium-gold);
    box-shadow: var(--shadow-glow);
}

.tournament-card-header {
    padding: var(--spacing-md);
    color: white;
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    position: relative;
}

.tournament-info h5 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: var(--spacing-xs);
}

.tournament-status-badge {
    position: absolute;
    top: var(--spacing-sm);
    right: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    font-weight: 600;
}

.tournament-status-badge.active {
    background: #ff4444;
    color: white;
}

.tournament-status-badge.registration {
    background: #44ff44;
    color: var(--premium-royal-blue-dark);
}

.tournament-card-body {
    padding: var(--spacing-md);
    color: white;
}

.tournament-details {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
}

.detail-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 0.9rem;
}

.tournament-progress {
    margin-bottom: var(--spacing-md);
}

.progress-bar {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: var(--spacing-xs);
}

.progress-fill {
    height: 100%;
    background: var(--gradient-gold);
    transition: width var(--transition-medium);
}

.progress-text {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.8);
}

.tournament-card-footer {
    padding: var(--spacing-md);
    border-top: 1px solid var(--glass-border);
}

.tournament-action-btn {
    width: 100%;
    background: var(--gradient-gold);
    color: var(--premium-royal-blue-dark);
    border: none;
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.tournament-action-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-medium);
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
}

.stat-card {
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
}

.stat-icon {
    color: var(--premium-gold);
    font-size: 1.5rem;
}

.stat-value {
    color: white;
    font-size: 1.2rem;
    font-weight: 700;
}

.stat-label {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.8rem;
}

.leaderboard-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-sm);
}

.leaderboard-item.top-three {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1));
}

.player-rank .rank-1 { color: #FFD700; }
.player-rank .rank-2 { color: #C0C0C0; }
.player-rank .rank-3 { color: #CD7F32; }

@media (max-width: 768px) {
    .tournament-details {
        grid-template-columns: 1fr;
    }
    
    .stats-grid {
        grid-template-columns: 1fr;
    }
}
`;

// Inyectar CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = tournamentSystemCSS;
document.head.appendChild(styleSheet);

// Exportar clase
window.TournamentSystem = TournamentSystem; 