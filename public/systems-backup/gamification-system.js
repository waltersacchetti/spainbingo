/* ===== SISTEMA DE GAMIFICACIÓN AVANZADA v3.0 ===== */
/* Sistema completo de logros, misiones, títulos y recompensas */

class GamificationSystem {
    constructor(bingoGame) {
        this.bingoGame = bingoGame;
        this.playerProgress = {
            achievements: new Map(),
            missions: new Map(),
            titles: [],
            activeTitle: null,
            dailyMissions: [],
            weeklyMissions: [],
            seasonMissions: [],
            totalPoints: 0,
            streaks: {},
            collections: {}
        };
        
        // Configuraciones del sistema
        this.achievements = this.initializeAchievements();
        this.missions = this.initializeMissions();
        this.titles = this.initializeTitles();
        this.rewards = this.initializeRewards();
        this.streakTypes = this.initializeStreaks();
        
        console.log('🎯 Gamification System inicializando...');
        this.loadProgressData();
        this.createInterface();
        this.initializeDailyMissions();
        this.startProgressTracking();
    }

    /**
     * Inicializar todos los logros (150+)
     */
    initializeAchievements() {
        return {
            // === CATEGORIA: PRIMEROS PASOS ===
            first_game: {
                id: 'first_game',
                name: 'Primer Paso',
                description: 'Juega tu primera partida de bingo',
                icon: 'fa-baby',
                category: 'beginner',
                rarity: 'common',
                points: 10,
                rewards: { xp: 50, coins: 25 },
                condition: (stats) => stats.gamesPlayed >= 1
            },
            
            first_win: {
                id: 'first_win',
                name: 'Primera Victoria',
                description: 'Gana tu primera partida',
                icon: 'fa-trophy',
                category: 'beginner',
                rarity: 'common',
                points: 25,
                rewards: { xp: 100, coins: 50, title: 'Novato Ganador' },
                condition: (stats) => stats.gamesWon >= 1
            },
            
            five_games: {
                id: 'five_games',
                name: 'Jugador Dedicado',
                description: 'Completa 5 partidas',
                icon: 'fa-gamepad',
                category: 'beginner',
                rarity: 'common',
                points: 50,
                rewards: { xp: 200, coins: 100 },
                condition: (stats) => stats.gamesPlayed >= 5
            },

            // === CATEGORIA: VICTORIA ===
            five_wins: {
                id: 'five_wins',
                name: 'Racha Ganadora',
                description: 'Gana 5 partidas',
                icon: 'fa-fire',
                category: 'victory',
                rarity: 'uncommon',
                points: 100,
                rewards: { xp: 300, coins: 200, title: 'Ganador Nato' },
                condition: (stats) => stats.gamesWon >= 5
            },
            
            ten_wins: {
                id: 'ten_wins',
                name: 'Veterano',
                description: 'Gana 10 partidas',
                icon: 'fa-medal',
                category: 'victory',
                rarity: 'uncommon',
                points: 200,
                rewards: { xp: 500, coins: 350, title: 'Veterano del Bingo' },
                condition: (stats) => stats.gamesWon >= 10
            },
            
            fifty_wins: {
                id: 'fifty_wins',
                name: 'Campeón',
                description: 'Gana 50 partidas',
                icon: 'fa-crown',
                category: 'victory',
                rarity: 'rare',
                points: 500,
                rewards: { xp: 1000, coins: 750, title: 'Campeón Regional' },
                condition: (stats) => stats.gamesWon >= 50
            },
            
            hundred_wins: {
                id: 'hundred_wins',
                name: 'Leyenda',
                description: 'Gana 100 partidas',
                icon: 'fa-star',
                category: 'victory',
                rarity: 'epic',
                points: 1000,
                rewards: { xp: 2000, coins: 1500, title: 'Leyenda del Bingo' },
                condition: (stats) => stats.gamesWon >= 100
            },

            // === CATEGORIA: PARTICIPACION ===
            active_player: {
                id: 'active_player',
                name: 'Jugador Activo',
                description: 'Juega 3 días consecutivos',
                icon: 'fa-calendar-check',
                category: 'participation',
                rarity: 'common',
                points: 75,
                rewards: { xp: 250, coins: 150 },
                condition: (stats) => stats.consecutiveDays >= 3
            },
            
            weekly_warrior: {
                id: 'weekly_warrior',
                name: 'Guerrero Semanal',
                description: 'Juega 7 días consecutivos',
                icon: 'fa-sword',
                category: 'participation',
                rarity: 'uncommon',
                points: 200,
                rewards: { xp: 500, coins: 400, title: 'Guerrero Semanal' },
                condition: (stats) => stats.consecutiveDays >= 7
            },
            
            month_master: {
                id: 'month_master',
                name: 'Maestro del Mes',
                description: 'Juega 30 días consecutivos',
                icon: 'fa-calendar-alt',
                category: 'participation',
                rarity: 'epic',
                points: 1000,
                rewards: { xp: 2000, coins: 1500, title: 'Maestro del Mes', special: 'month_badge' },
                condition: (stats) => stats.consecutiveDays >= 30
            },

            // === CATEGORIA: SOCIAL ===
            first_message: {
                id: 'first_message',
                name: 'Hola Mundo',
                description: 'Envía tu primer mensaje en el chat',
                icon: 'fa-comment',
                category: 'social',
                rarity: 'common',
                points: 25,
                rewards: { xp: 50, coins: 25 },
                condition: (stats) => stats.messagesPosted >= 1
            },
            
            chat_active: {
                id: 'chat_active',
                name: 'Conversador',
                description: 'Envía 50 mensajes en el chat',
                icon: 'fa-comments',
                category: 'social',
                rarity: 'uncommon',
                points: 150,
                rewards: { xp: 300, coins: 200, title: 'Conversador Experto' },
                condition: (stats) => stats.messagesPosted >= 50
            },
            
            emoji_master: {
                id: 'emoji_master',
                name: 'Maestro del Emoji',
                description: 'Usa 20 emojis diferentes',
                icon: 'fa-smile',
                category: 'social',
                rarity: 'rare',
                points: 300,
                rewards: { xp: 500, coins: 350, title: 'Maestro del Emoji' },
                condition: (stats) => stats.uniqueEmojisUsed >= 20
            },

            // === CATEGORIA: COLECCION ===
            card_collector: {
                id: 'card_collector',
                name: 'Coleccionista',
                description: 'Compra 10 cartones diferentes',
                icon: 'fa-collection',
                category: 'collection',
                rarity: 'uncommon',
                points: 100,
                rewards: { xp: 200, coins: 150 },
                condition: (stats) => stats.uniqueCardsBought >= 10
            },
            
            lucky_numbers: {
                id: 'lucky_numbers',
                name: 'Números de la Suerte',
                description: 'Marca todos los números del 1 al 75',
                icon: 'fa-hashtag',
                category: 'collection',
                rarity: 'epic',
                points: 750,
                rewards: { xp: 1500, coins: 1000, title: 'Maestro de Números' },
                condition: (stats) => stats.uniqueNumbersMarked >= 75
            },

            // === CATEGORIA: ESPECIALES ===
            perfect_game: {
                id: 'perfect_game',
                name: 'Juego Perfecto',
                description: 'Gana sin perder ningún número',
                icon: 'fa-gem',
                category: 'special',
                rarity: 'legendary',
                points: 1500,
                rewards: { xp: 3000, coins: 2000, title: 'Perfeccionista', special: 'perfect_badge' },
                condition: (stats) => stats.perfectGames >= 1
            },
            
            speed_demon: {
                id: 'speed_demon',
                name: 'Demonio de la Velocidad',
                description: 'Gana en menos de 5 minutos',
                icon: 'fa-tachometer-alt',
                category: 'special',
                rarity: 'rare',
                points: 400,
                rewards: { xp: 600, coins: 400, title: 'Velocista' },
                condition: (stats) => stats.fastestWin <= 300000 // 5 minutos en ms
            },
            
            multitasker: {
                id: 'multitasker',
                name: 'Multitarea',
                description: 'Juega 3 cartones simultáneamente y gana',
                icon: 'fa-layer-group',
                category: 'special',
                rarity: 'epic',
                points: 600,
                rewards: { xp: 1200, coins: 800, title: 'Maestro Multitarea' },
                condition: (stats) => stats.multiCardWins >= 1
            },

            // === CATEGORIA: MONEY ===
            big_spender: {
                id: 'big_spender',
                name: 'Gran Gastador',
                description: 'Gasta €100 en cartones',
                icon: 'fa-money-bill-wave',
                category: 'money',
                rarity: 'rare',
                points: 500,
                rewards: { xp: 800, coins: 600, title: 'Inversor' },
                condition: (stats) => stats.totalSpent >= 100
            },
            
            jackpot_winner: {
                id: 'jackpot_winner',
                name: 'Ganador del Bote',
                description: 'Gana un bote mayor a €500',
                icon: 'fa-coins',
                category: 'money',
                rarity: 'legendary',
                points: 2000,
                rewards: { xp: 4000, coins: 3000, title: 'Rey del Jackpot', special: 'jackpot_crown' },
                condition: (stats) => stats.biggestWin >= 500
            },

            // === CATEGORIA: TOURNAMENTO ===
            tournament_player: {
                id: 'tournament_player',
                name: 'Competidor',
                description: 'Participa en tu primer torneo',
                icon: 'fa-users',
                category: 'tournament',
                rarity: 'common',
                points: 50,
                rewards: { xp: 150, coins: 100 },
                condition: (stats) => stats.tournamentsPlayed >= 1
            },
            
            tournament_winner: {
                id: 'tournament_winner',
                name: 'Campeón de Torneo',
                description: 'Gana un torneo',
                icon: 'fa-trophy',
                category: 'tournament',
                rarity: 'epic',
                points: 1000,
                rewards: { xp: 2000, coins: 1500, title: 'Campeón de Torneo' },
                condition: (stats) => stats.tournamentsWon >= 1
            },

            // Agregar más logros hasta llegar a 150+...
            // [Continuaría con más categorías y logros]
        };
    }

    /**
     * Inicializar sistema de misiones
     */
    initializeMissions() {
        return {
            daily: [
                {
                    id: 'daily_play_3',
                    name: 'Jugador Diario',
                    description: 'Juega 3 partidas',
                    icon: 'fa-gamepad',
                    type: 'daily',
                    target: 3,
                    current: 0,
                    rewards: { xp: 100, coins: 50 },
                    condition: 'gamesPlayed'
                },
                {
                    id: 'daily_win_1',
                    name: 'Victoria Diaria',
                    description: 'Gana 1 partida',
                    icon: 'fa-trophy',
                    type: 'daily',
                    target: 1,
                    current: 0,
                    rewards: { xp: 150, coins: 75 },
                    condition: 'gamesWon'
                },
                {
                    id: 'daily_chat_5',
                    name: 'Social Diario',
                    description: 'Envía 5 mensajes en el chat',
                    icon: 'fa-comment',
                    type: 'daily',
                    target: 5,
                    current: 0,
                    rewards: { xp: 75, coins: 25 },
                    condition: 'messagesPosted'
                }
            ],
            
            weekly: [
                {
                    id: 'weekly_play_15',
                    name: 'Jugador Semanal',
                    description: 'Juega 15 partidas esta semana',
                    icon: 'fa-calendar-week',
                    type: 'weekly',
                    target: 15,
                    current: 0,
                    rewards: { xp: 500, coins: 300 },
                    condition: 'gamesPlayed'
                },
                {
                    id: 'weekly_win_5',
                    name: 'Ganador Semanal',
                    description: 'Gana 5 partidas esta semana',
                    icon: 'fa-medal',
                    type: 'weekly',
                    target: 5,
                    current: 0,
                    rewards: { xp: 750, coins: 500 },
                    condition: 'gamesWon'
                }
            ],
            
            season: [
                {
                    id: 'season_collector',
                    name: 'Coleccionista de Temporada',
                    description: 'Desbloquea 10 logros esta temporada',
                    icon: 'fa-star',
                    type: 'season',
                    target: 10,
                    current: 0,
                    rewards: { xp: 2000, coins: 1500, title: 'Coleccionista de Temporada' },
                    condition: 'achievementsUnlocked'
                }
            ]
        };
    }

    /**
     * Inicializar títulos disponibles
     */
    initializeTitles() {
        return {
            'Novato Ganador': {
                id: 'novato_ganador',
                name: 'Novato Ganador',
                description: 'Primera victoria conseguida',
                color: '#00FF00',
                rarity: 'common'
            },
            'Ganador Nato': {
                id: 'ganador_nato',
                name: 'Ganador Nato',
                description: 'Múltiples victorias',
                color: '#0080FF',
                rarity: 'uncommon'
            },
            'Veterano del Bingo': {
                id: 'veterano_bingo',
                name: 'Veterano del Bingo',
                description: '10 victorias alcanzadas',
                color: '#8000FF',
                rarity: 'rare'
            },
            'Campeón Regional': {
                id: 'campeon_regional',
                name: 'Campeón Regional',
                description: '50 victorias conseguidas',
                color: '#FF8000',
                rarity: 'epic'
            },
            'Leyenda del Bingo': {
                id: 'leyenda_bingo',
                name: 'Leyenda del Bingo',
                description: '100 victorias épicas',
                color: '#FFD700',
                rarity: 'legendary'
            },
            'Rey del Jackpot': {
                id: 'rey_jackpot',
                name: 'Rey del Jackpot',
                description: 'Ganador de grandes botes',
                color: '#FF0080',
                rarity: 'legendary'
            },
            'Perfeccionista': {
                id: 'perfeccionista',
                name: 'Perfeccionista',
                description: 'Juego perfecto logrado',
                color: '#00FFFF',
                rarity: 'legendary'
            }
        };
    }

    /**
     * Inicializar sistema de recompensas
     */
    initializeRewards() {
        return {
            daily_login: {
                1: { xp: 25, coins: 10 },
                2: { xp: 50, coins: 25 },
                3: { xp: 75, coins: 50 },
                4: { xp: 100, coins: 75 },
                5: { xp: 150, coins: 100 },
                6: { xp: 200, coins: 150 },
                7: { xp: 300, coins: 250, special: 'weekly_bonus' },
                30: { xp: 1000, coins: 1000, special: 'monthly_bonus' }
            },
            
            treasure_chests: {
                bronze: { coins: 25, xp: 50, chance: 0.7 },
                silver: { coins: 100, xp: 200, chance: 0.2 },
                gold: { coins: 500, xp: 1000, chance: 0.08 },
                diamond: { coins: 2000, xp: 5000, chance: 0.02 }
            }
        };
    }

    /**
     * Crear interfaz de gamificación
     */
    createInterface() {
        const gamificationPanel = document.createElement('div');
        gamificationPanel.id = 'gamificationPanel';
        gamificationPanel.className = 'gamification-panel card-premium';
        
        gamificationPanel.innerHTML = `
            <div class="gamification-header">
                <div class="gamification-title">
                    <h3><i class="fas fa-star"></i> Progreso y Logros</h3>
                    <div class="player-level-badge">
                        <span class="level-number">${this.bingoGame.currentLevel || 1}</span>
                        <span class="level-text">Nivel</span>
                    </div>
                </div>
                <button class="gamification-toggle" id="toggleGamification">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            
            <div class="gamification-content" id="gamificationContent">
                <div class="progress-overview">
                    <div class="total-points">
                        <i class="fas fa-gem"></i>
                        <span>${this.playerProgress.totalPoints} Puntos</span>
                    </div>
                    <div class="active-title">
                        <i class="fas fa-crown"></i>
                        <span>${this.playerProgress.activeTitle || 'Sin título'}</span>
                    </div>
                </div>
                
                <div class="gamification-tabs">
                    <button class="tab-btn active" data-tab="missions">Misiones</button>
                    <button class="tab-btn" data-tab="achievements">Logros</button>
                    <button class="tab-btn" data-tab="titles">Títulos</button>
                    <button class="tab-btn" data-tab="rewards">Recompensas</button>
                </div>
                
                <div class="tab-content active" id="missionsTab">
                    ${this.generateMissionsHTML()}
                </div>
                
                <div class="tab-content" id="achievementsTab">
                    ${this.generateAchievementsHTML()}
                </div>
                
                <div class="tab-content" id="titlesTab">
                    ${this.generateTitlesHTML()}
                </div>
                
                <div class="tab-content" id="rewardsTab">
                    ${this.generateRewardsHTML()}
                </div>
            </div>
        `;
        
        // Insertar en el DOM
        const sidebar = document.querySelector('.game-sidebar');
        if (sidebar) {
            sidebar.appendChild(gamificationPanel);
        } else {
            document.body.appendChild(gamificationPanel);
        }
        
        this.bindGamificationEvents();
    }

    /**
     * Generar HTML de misiones
     */
    generateMissionsHTML() {
        return `
            <div class="missions-section">
                <h4>Misiones Diarias</h4>
                <div class="missions-list">
                    ${this.playerProgress.dailyMissions.map(mission => `
                        <div class="mission-item ${mission.completed ? 'completed' : ''}">
                            <div class="mission-icon">
                                <i class="fas ${mission.icon}"></i>
                            </div>
                            <div class="mission-info">
                                <h5>${mission.name}</h5>
                                <p>${mission.description}</p>
                                <div class="mission-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${(mission.current / mission.target) * 100}%"></div>
                                    </div>
                                    <span class="progress-text">${mission.current}/${mission.target}</span>
                                </div>
                            </div>
                            <div class="mission-reward">
                                <i class="fas fa-star"></i>
                                <span>+${mission.rewards.xp} XP</span>
                                <i class="fas fa-coins"></i>
                                <span>+${mission.rewards.coins}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <h4>Misiones Semanales</h4>
                <div class="missions-list">
                    ${this.playerProgress.weeklyMissions.map(mission => `
                        <div class="mission-item weekly ${mission.completed ? 'completed' : ''}">
                            <div class="mission-icon">
                                <i class="fas ${mission.icon}"></i>
                            </div>
                            <div class="mission-info">
                                <h5>${mission.name}</h5>
                                <p>${mission.description}</p>
                                <div class="mission-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${(mission.current / mission.target) * 100}%"></div>
                                    </div>
                                    <span class="progress-text">${mission.current}/${mission.target}</span>
                                </div>
                            </div>
                            <div class="mission-reward">
                                <i class="fas fa-star"></i>
                                <span>+${mission.rewards.xp} XP</span>
                                <i class="fas fa-coins"></i>
                                <span>+${mission.rewards.coins}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Generar HTML de logros
     */
    generateAchievementsHTML() {
        const achievementCategories = this.groupAchievementsByCategory();
        
        return `
            <div class="achievements-section">
                <div class="achievements-stats">
                    <div class="stat-item">
                        <span class="stat-label">Desbloqueados:</span>
                        <span class="stat-value">${this.playerProgress.achievements.size}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total:</span>
                        <span class="stat-value">${Object.keys(this.achievements).length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Progreso:</span>
                        <span class="stat-value">${Math.round((this.playerProgress.achievements.size / Object.keys(this.achievements).length) * 100)}%</span>
                    </div>
                </div>
                
                ${Object.entries(achievementCategories).map(([category, achievements]) => `
                    <div class="achievement-category">
                        <h4>${this.getCategoryName(category)}</h4>
                        <div class="achievements-grid">
                            ${achievements.map(achievement => `
                                <div class="achievement-item ${this.playerProgress.achievements.has(achievement.id) ? 'unlocked' : 'locked'} rarity-${achievement.rarity}">
                                    <div class="achievement-icon">
                                        <i class="fas ${achievement.icon}"></i>
                                    </div>
                                    <div class="achievement-info">
                                        <h5>${achievement.name}</h5>
                                        <p>${achievement.description}</p>
                                        <div class="achievement-reward">
                                            <span>+${achievement.points} pts</span>
                                            <span>+${achievement.rewards.xp} XP</span>
                                        </div>
                                    </div>
                                    ${this.playerProgress.achievements.has(achievement.id) ? 
                                        '<div class="achievement-badge"><i class="fas fa-check"></i></div>' :
                                        '<div class="achievement-progress">' + this.getAchievementProgress(achievement) + '</div>'
                                    }
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Eventos del sistema
     */
    bindGamificationEvents() {
        // Toggle panel
        document.getElementById('toggleGamification')?.addEventListener('click', () => {
            this.toggleGamificationPanel();
        });
        
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    }

    /**
     * Funcionalidades principales
     */
    
    // Verificar y desbloquear logros
    checkAchievements() {
        const stats = this.gatherPlayerStats();
        
        Object.values(this.achievements).forEach(achievement => {
            if (!this.playerProgress.achievements.has(achievement.id)) {
                if (achievement.condition(stats)) {
                    this.unlockAchievement(achievement);
                }
            }
        });
    }
    
    // Desbloquear logro
    unlockAchievement(achievement) {
        this.playerProgress.achievements.set(achievement.id, {
            unlockedAt: new Date(),
            progress: 100
        });
        
        this.playerProgress.totalPoints += achievement.points;
        
        // Aplicar recompensas
        this.bingoGame.currentXP += achievement.rewards.xp;
        this.bingoGame.userBalance += achievement.rewards.coins || 0;
        
        // Título si tiene
        if (achievement.rewards.title) {
            this.unlockTitle(achievement.rewards.title);
        }
        
        // Mostrar notificación
        this.showAchievementNotification(achievement);
        
        // Efectos visuales y sonoros
        if (this.bingoGame.premiumAnimationSystem) {
            this.bingoGame.premiumAnimationSystem.playAchievementAnimation(achievement);
        }
        
        if (this.bingoGame.premiumSoundSystem) {
            this.bingoGame.premiumSoundSystem.playAchievementSound(achievement.rarity);
        }
        
        this.saveProgressData();
        console.log(`🏆 Logro desbloqueado: ${achievement.name}`);
    }
    
    // Actualizar progreso de misiones
    updateMissionProgress(type, amount = 1) {
        let updated = false;
        
        this.playerProgress.dailyMissions.forEach(mission => {
            if (mission.condition === type && !mission.completed) {
                mission.current = Math.min(mission.current + amount, mission.target);
                if (mission.current >= mission.target) {
                    this.completeMission(mission);
                }
                updated = true;
            }
        });
        
        this.playerProgress.weeklyMissions.forEach(mission => {
            if (mission.condition === type && !mission.completed) {
                mission.current = Math.min(mission.current + amount, mission.target);
                if (mission.current >= mission.target) {
                    this.completeMission(mission);
                }
                updated = true;
            }
        });
        
        if (updated) {
            this.saveProgressData();
            this.updateInterface();
        }
    }
    
    // Completar misión
    completeMission(mission) {
        mission.completed = true;
        
        // Aplicar recompensas
        this.bingoGame.currentXP += mission.rewards.xp;
        this.bingoGame.userBalance += mission.rewards.coins || 0;
        
        this.showMissionCompleteNotification(mission);
        console.log(`✅ Misión completada: ${mission.name}`);
    }
    
    /**
     * Utilidades
     */
    gatherPlayerStats() {
        return {
            gamesPlayed: this.bingoGame.gameHistory?.length || 0,
            gamesWon: this.bingoGame.gameHistory?.filter(g => g.won).length || 0,
            totalSpent: this.bingoGame.calculateTotalSpent?.() || 0,
            consecutiveDays: this.calculateConsecutiveDays(),
            messagesPosted: this.getChatMessages(),
            uniqueEmojisUsed: this.getUniqueEmojis(),
            uniqueCardsBought: this.getUniqueCards(),
            uniqueNumbersMarked: this.getUniqueNumbers(),
            perfectGames: this.getPerfectGames(),
            fastestWin: this.getFastestWin(),
            multiCardWins: this.getMultiCardWins(),
            biggestWin: this.getBiggestWin(),
            tournamentsPlayed: this.getTournamentStats().played,
            tournamentsWon: this.getTournamentStats().won
        };
    }
    
    /**
     * Persistencia
     */
    loadProgressData() {
        try {
            const saved = localStorage.getItem('bingoroyal_gamification');
            if (saved) {
                const data = JSON.parse(saved);
                this.playerProgress = { ...this.playerProgress, ...data };
                // Convertir Map si es necesario
                if (data.achievements && Array.isArray(data.achievements)) {
                    this.playerProgress.achievements = new Map(data.achievements);
                }
            }
            
            // Inicializar misiones diarias si no existen
            if (this.playerProgress.dailyMissions.length === 0) {
                this.initializeDailyMissions();
            }
        } catch (error) {
            console.log('⚠️ Error cargando datos de gamificación:', error);
        }
    }
    
    saveProgressData() {
        try {
            const data = {
                ...this.playerProgress,
                achievements: Array.from(this.playerProgress.achievements.entries())
            };
            localStorage.setItem('bingoroyal_gamification', JSON.stringify(data));
        } catch (error) {
            console.log('⚠️ Error guardando datos de gamificación:', error);
        }
    }
    
    /**
     * Destruir sistema
     */
    destroy() {
        document.getElementById('gamificationPanel')?.remove();
        console.log('🎯 Gamification System destruido');
    }
}

// CSS básico
const gamificationCSS = `
.gamification-panel {
    margin-bottom: var(--spacing-lg);
    animation: slideInLeft 1s ease-out;
}

.gamification-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background: var(--gradient-gold);
    color: var(--premium-royal-blue-dark);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.gamification-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
}

.player-level-badge {
    background: var(--premium-royal-blue);
    color: white;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
}

.gamification-content {
    padding: var(--spacing-md);
    background: var(--glass-bg);
    color: white;
}

.progress-overview {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-md);
    padding-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--glass-border);
}

.total-points,
.active-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--premium-gold);
    font-weight: 600;
}

.gamification-tabs {
    display: flex;
    margin-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--glass-border);
}

.tab-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    padding: var(--spacing-sm) var(--spacing-md);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all var(--transition-fast);
}

.tab-btn.active,
.tab-btn:hover {
    color: var(--premium-gold);
    border-bottom-color: var(--premium-gold);
}

.tab-content {
    display: none;
}

.tab-content.active {
    display: block;
}

.mission-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-sm);
    border-left: 4px solid var(--premium-gold);
}

.mission-item.completed {
    opacity: 0.7;
    border-left-color: #00ff00;
}

.mission-item.weekly {
    border-left-color: var(--premium-royal-blue);
}

.mission-icon {
    color: var(--premium-gold);
    font-size: 1.5rem;
    min-width: 40px;
    text-align: center;
}

.mission-info {
    flex: 1;
}

.mission-info h5 {
    margin-bottom: var(--spacing-xs);
    color: white;
}

.mission-info p {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
    margin-bottom: var(--spacing-sm);
}

.mission-progress {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.progress-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    flex: 1;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: var(--gradient-gold);
    transition: width var(--transition-medium);
}

.progress-text {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.9);
    min-width: 50px;
}

.mission-reward {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.9rem;
    color: var(--premium-gold);
}

.achievements-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
}

.achievement-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    border: 2px solid transparent;
    transition: all var(--transition-medium);
    position: relative;
}

.achievement-item.unlocked {
    border-color: var(--premium-gold);
    box-shadow: var(--shadow-glow);
}

.achievement-item.locked {
    opacity: 0.6;
}

.achievement-item.rarity-common { border-left: 4px solid #ffffff; }
.achievement-item.rarity-uncommon { border-left: 4px solid #00ff00; }
.achievement-item.rarity-rare { border-left: 4px solid #0080ff; }
.achievement-item.rarity-epic { border-left: 4px solid #8000ff; }
.achievement-item.rarity-legendary { border-left: 4px solid #ffd700; }

@media (max-width: 768px) {
    .achievements-grid {
        grid-template-columns: 1fr;
    }
    
    .mission-item {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
    }
    
    .gamification-tabs {
        flex-wrap: wrap;
    }
    
    .tab-btn {
        flex: 1;
        min-width: 80px;
    }
}
`;

// Inyectar CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = gamificationCSS;
document.head.appendChild(styleSheet);

// Exportar clase
window.GamificationSystem = GamificationSystem; 