/* ===== SISTEMA DE TEMPORADAS TEMÁTICAS v3.0 ===== */
/* Sistema completo de temporadas con contenido exclusivo y premios limitados */

class SeasonsSystem {
    constructor(bingoGame) {
        this.bingoGame = bingoGame;
        this.currentSeason = null;
        this.seasonData = {
            completedSeasons: [],
            currentProgress: {},
            unlockedRewards: [],
            seasonTokens: 0,
            specialAchievements: []
        };
        
        // Configuración de temporadas
        this.seasons = this.initializeSeasons();
        this.seasonalContent = this.initializeSeasonalContent();
        this.seasonalRewards = this.initializeSeasonalRewards();
        
        console.log('🌟 Seasons System inicializando...');
        this.loadSeasonData();
        this.createInterface();
        this.checkCurrentSeason();
        this.initializeSeasonEvents();
    }

    /**
     * Inicializar temporadas temáticas
     */
    initializeSeasons() {
        return {
            // TEMPORADA ESPAÑOLA (Primavera)
            spanish_spring: {
                id: 'spanish_spring',
                name: 'Fiesta Española',
                description: 'Celebra la rica cultura española con fiestas regionales',
                theme: 'spanish',
                icon: 'fa-flag',
                color: '#AA1E22', // Rojo español
                gradient: 'linear-gradient(135deg, #AA1E22 0%, #FFD700 100%)',
                duration: 90, // días
                startMonth: 3, // Marzo
                startDay: 15,
                
                features: {
                    exclusiveRooms: ['Sala Flamenco', 'Sala Paella', 'Sala Toros'],
                    specialCards: ['Cartón España', 'Cartón Andalucía', 'Cartón Cataluña'],
                    festivalEvents: ['Feria de Abril', 'San Fermín', 'La Tomatina'],
                    musicTheme: 'flamenco',
                    decorations: ['spanish_flags', 'guitars', 'bulls']
                },
                
                objectives: [
                    { id: 'fiestas_win', name: 'Gana en 5 festivales diferentes', reward: 500, type: 'tokens' },
                    { id: 'spanish_bingo', name: 'Completa 20 bingos en salas españolas', reward: 1000, type: 'tokens' },
                    { id: 'regional_master', name: 'Visita todas las salas regionales', reward: 'exclusive_title', value: 'Maestro Regional' },
                    { id: 'paella_party', name: 'Participa en evento Paella Party', reward: 'physical_prize', value: 'Kit Paella' }
                ],
                
                exclusiveRewards: [
                    { id: 'spanish_avatar', name: 'Avatar Torero', cost: 800, type: 'cosmetic' },
                    { id: 'flamenco_sound', name: 'Pack Sonidos Flamenco', cost: 600, type: 'audio' },
                    { id: 'spanish_frame', name: 'Marco Bandera España', cost: 400, type: 'cosmetic' }
                ]
            },

            // TEMPORADA NAVIDEÑA (Invierno)
            christmas_winter: {
                id: 'christmas_winter',
                name: 'Navidad Mágica',
                description: 'Vive la magia navideña con nieve, regalos y villancicos',
                theme: 'christmas',
                icon: 'fa-snowflake',
                color: '#0F5132',
                gradient: 'linear-gradient(135deg, #0F5132 0%, #DC3545 50%, #FFD700 100%)',
                duration: 45, // días
                startMonth: 12, // Diciembre
                startDay: 1,
                
                features: {
                    exclusiveRooms: ['Sala Santa Claus', 'Sala Renos', 'Sala Belén'],
                    specialCards: ['Cartón Navidad', 'Cartón Reyes Magos', 'Cartón Nochebuena'],
                    festivalEvents: ['Nochebuena Especial', 'Año Nuevo', 'Reyes Magos'],
                    musicTheme: 'christmas_carols',
                    decorations: ['christmas_trees', 'snow', 'presents', 'reindeer']
                },
                
                objectives: [
                    { id: 'christmas_calendar', name: 'Completa calendario de adviento', reward: 1200, type: 'tokens' },
                    { id: 'gift_giver', name: 'Envía 25 regalos navideños', reward: 800, type: 'tokens' },
                    { id: 'santa_helper', name: 'Ayuda a Santa en misiones especiales', reward: 'exclusive_title', value: 'Ayudante de Santa' },
                    { id: 'three_kings', name: 'Gana en evento de Reyes Magos', reward: 'physical_prize', value: 'Cesta Navideña' }
                ],
                
                exclusiveRewards: [
                    { id: 'santa_avatar', name: 'Avatar Santa Claus', cost: 1000, type: 'cosmetic' },
                    { id: 'christmas_sounds', name: 'Villancicos Premium', cost: 700, type: 'audio' },
                    { id: 'snow_effect', name: 'Efecto Nieve', cost: 500, type: 'visual' }
                ]
            },

            // TEMPORADA VERANIEGA (Verano)
            summer_beach: {
                id: 'summer_beach',
                name: 'Verano Dorado',
                description: 'Disfruta del sol, playa y vacaciones de verano',
                theme: 'summer',
                icon: 'fa-sun',
                color: '#FD7E14',
                gradient: 'linear-gradient(135deg, #FD7E14 0%, #FFD60A 50%, #20C997 100%)',
                duration: 60, // días
                startMonth: 7, // Julio
                startDay: 1,
                
                features: {
                    exclusiveRooms: ['Sala Playa', 'Sala Chiringuito', 'Sala Ibiza'],
                    specialCards: ['Cartón Verano', 'Cartón Playa', 'Cartón Vacaciones'],
                    festivalEvents: ['Festival de Verano', 'Noche de San Juan', 'Beach Party'],
                    musicTheme: 'summer_hits',
                    decorations: ['palm_trees', 'beach_balls', 'cocktails', 'surfboards']
                },
                
                objectives: [
                    { id: 'beach_master', name: 'Gana 30 partidas en salas de playa', reward: 900, type: 'tokens' },
                    { id: 'summer_collector', name: 'Colecciona 15 items de verano', reward: 600, type: 'tokens' },
                    { id: 'vacation_mode', name: 'Juega 50 días consecutivos', reward: 'exclusive_title', value: 'Rey del Verano' },
                    { id: 'beach_party', name: 'Organiza Beach Party con amigos', reward: 'physical_prize', value: 'Kit Playa' }
                ],
                
                exclusiveRewards: [
                    { id: 'surfer_avatar', name: 'Avatar Surfista', cost: 750, type: 'cosmetic' },
                    { id: 'beach_sounds', name: 'Sonidos de Playa', cost: 550, type: 'audio' },
                    { id: 'sunset_theme', name: 'Tema Atardecer', cost: 650, type: 'visual' }
                ]
            },

            // TEMPORADA DEL ORO (Otoño)
            golden_autumn: {
                id: 'golden_autumn',
                name: 'Otoño Dorado',
                description: 'Botes multiplicados y premios dorados especiales',
                theme: 'golden',
                icon: 'fa-coins',
                color: '#B8860B',
                gradient: 'linear-gradient(135deg, #B8860B 0%, #FFD700 50%, #FFA500 100%)',
                duration: 75, // días
                startMonth: 10, // Octubre
                startDay: 1,
                
                features: {
                    exclusiveRooms: ['Sala Oro', 'Sala Tesoro', 'Sala Midas'],
                    specialCards: ['Cartón Oro', 'Cartón Tesoro', 'Cartón Midas'],
                    festivalEvents: ['Festival del Oro', 'Caza del Tesoro', 'Golden Rush'],
                    musicTheme: 'orchestral',
                    decorations: ['golden_leaves', 'treasure_chests', 'coins'],
                    specialBenefits: {
                        doubleJackpots: true,
                        goldenMultiplier: 2.5,
                        bonusDrops: true
                    }
                },
                
                objectives: [
                    { id: 'golden_touch', name: 'Gana botes de oro 10 veces', reward: 1500, type: 'tokens' },
                    { id: 'treasure_hunter', name: 'Encuentra 20 tesoros ocultos', reward: 1200, type: 'tokens' },
                    { id: 'midas_blessing', name: 'Convierte 100 cartones en oro', reward: 'exclusive_title', value: 'Rey Midas' },
                    { id: 'golden_league', name: 'Alcanza Liga Oro en torneos', reward: 'physical_prize', value: 'Lingote Oro 24k' }
                ],
                
                exclusiveRewards: [
                    { id: 'midas_avatar', name: 'Avatar Rey Midas', cost: 1200, type: 'cosmetic' },
                    { id: 'golden_sounds', name: 'Efectos Dorados', cost: 800, type: 'audio' },
                    { id: 'treasure_animation', name: 'Animación Tesoro', cost: 900, type: 'visual' }
                ]
            }
        };
    }

    /**
     * Inicializar contenido estacional
     */
    initializeSeasonalContent() {
        return {
            cards: {
                spanish_spring: {
                    designs: ['flamenco_pattern', 'bull_design', 'spanish_tiles'],
                    colors: ['#AA1E22', '#FFD700', '#FFFFFF'],
                    animations: ['flamenco_dance', 'bull_charge', 'fan_wave']
                },
                christmas_winter: {
                    designs: ['snowflake_pattern', 'santa_design', 'christmas_tree'],
                    colors: ['#0F5132', '#DC3545', '#FFD700'],
                    animations: ['snow_fall', 'gift_unwrap', 'star_twinkle']
                },
                summer_beach: {
                    designs: ['wave_pattern', 'palm_design', 'beach_vibes'],
                    colors: ['#FD7E14', '#20C997', '#FFD60A'],
                    animations: ['wave_motion', 'sun_rays', 'seagull_fly']
                },
                golden_autumn: {
                    designs: ['gold_pattern', 'treasure_design', 'coin_stack'],
                    colors: ['#B8860B', '#FFD700', '#FFA500'],
                    animations: ['gold_shine', 'coin_spin', 'treasure_glow']
                }
            },
            
            sounds: {
                spanish_spring: {
                    ambient: 'flamenco_guitar.mp3',
                    victory: 'ole_celebration.mp3',
                    call: 'spanish_caller.mp3'
                },
                christmas_winter: {
                    ambient: 'jingle_bells.mp3',
                    victory: 'ho_ho_ho.mp3',
                    call: 'santa_voice.mp3'
                },
                summer_beach: {
                    ambient: 'ocean_waves.mp3',
                    victory: 'beach_party.mp3',
                    call: 'surfer_dude.mp3'
                },
                golden_autumn: {
                    ambient: 'treasure_ambience.mp3',
                    victory: 'gold_coins.mp3',
                    call: 'royal_herald.mp3'
                }
            }
        };
    }

    /**
     * Inicializar recompensas estacionales
     */
    initializeSeasonalRewards() {
        return {
            daily: {
                login: { tokens: 25, xp: 100 },
                firstWin: { tokens: 50, xp: 200 },
                seasonalTask: { tokens: 75, xp: 300 }
            },
            
            weekly: {
                participation: { tokens: 200, xp: 800 },
                topPlayer: { tokens: 500, xp: 2000, title: 'Estrella Semanal' },
                socialActivity: { tokens: 150, xp: 600 }
            },
            
            seasonal: {
                completion: { tokens: 2000, xp: 10000, title: 'Maestro de Temporada' },
                perfectScore: { tokens: 3000, xp: 15000, special: 'legendary_badge' },
                earlyAdopter: { tokens: 1000, xp: 5000, title: 'Pionero' }
            }
        };
    }

    /**
     * Crear interfaz de temporadas
     */
    createInterface() {
        const seasonsPanel = document.createElement('div');
        seasonsPanel.id = 'seasonsSystemPanel';
        seasonsPanel.className = 'seasons-system-panel card-premium';
        
        seasonsPanel.innerHTML = `
            <div class="seasons-header">
                <div class="seasons-title">
                    <h3><i class="fas fa-calendar-alt"></i> Temporadas Temáticas</h3>
                    <div class="season-status">
                        ${this.generateCurrentSeasonHTML()}
                    </div>
                </div>
                <button class="seasons-toggle" id="toggleSeasons">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            
            <div class="seasons-content" id="seasonsContent">
                <div class="current-season-overview">
                    <div class="season-banner" id="seasonBanner">
                        ${this.generateSeasonBannerHTML()}
                    </div>
                    
                    <div class="season-progress" id="seasonProgress">
                        ${this.generateSeasonProgressHTML()}
                    </div>
                </div>
                
                <div class="seasons-tabs">
                    <button class="tab-btn active" data-tab="objectives">Objetivos</button>
                    <button class="tab-btn" data-tab="rewards">Recompensas</button>
                    <button class="tab-btn" data-tab="content">Contenido</button>
                    <button class="tab-btn" data-tab="calendar">Calendario</button>
                </div>
                
                <div class="tab-content active" id="objectivesTab">
                    ${this.generateObjectivesHTML()}
                </div>
                
                <div class="tab-content" id="rewardsTab">
                    ${this.generateRewardsHTML()}
                </div>
                
                <div class="tab-content" id="contentTab">
                    ${this.generateContentHTML()}
                </div>
                
                <div class="tab-content" id="calendarTab">
                    ${this.generateCalendarHTML()}
                </div>
            </div>
        `;
        
        // Insertar en el DOM
        const sidebar = document.querySelector('.game-sidebar');
        if (sidebar) {
            sidebar.appendChild(seasonsPanel);
        } else {
            document.body.appendChild(seasonsPanel);
        }
        
        this.bindSeasonsEvents();
    }

    /**
     * Generar HTML de temporada actual
     */
    generateCurrentSeasonHTML() {
        const currentSeason = this.getCurrentSeason();
        
        if (!currentSeason) {
            return `
                <div class="no-season">
                    <span class="season-status-text">Sin temporada activa</span>
                    <span class="next-season">Próxima: ${this.getNextSeasonName()}</span>
                </div>
            `;
        }
        
        const daysLeft = this.calculateDaysLeft(currentSeason);
        
        return `
            <div class="current-season" style="background: ${currentSeason.gradient}">
                <div class="season-info">
                    <i class="fas ${currentSeason.icon}"></i>
                    <span class="season-name">${currentSeason.name}</span>
                </div>
                <div class="season-time">
                    <span class="days-left">${daysLeft} días restantes</span>
                    <span class="tokens-earned">${this.seasonData.seasonTokens} tokens</span>
                </div>
            </div>
        `;
    }

    /**
     * Generar HTML del banner de temporada
     */
    generateSeasonBannerHTML() {
        const currentSeason = this.getCurrentSeason();
        
        if (!currentSeason) {
            return '<div class="no-season-banner">No hay temporada activa</div>';
        }
        
        return `
            <div class="season-banner-content" style="background: ${currentSeason.gradient}">
                <div class="season-banner-left">
                    <div class="season-icon-large">
                        <i class="fas ${currentSeason.icon}"></i>
                    </div>
                    <div class="season-details">
                        <h2>${currentSeason.name}</h2>
                        <p>${currentSeason.description}</p>
                        <div class="season-features">
                            <span class="feature-tag">${currentSeason.features.exclusiveRooms.length} Salas Exclusivas</span>
                            <span class="feature-tag">${currentSeason.features.specialCards.length} Cartones Especiales</span>
                            <span class="feature-tag">${currentSeason.objectives.length} Objetivos</span>
                        </div>
                    </div>
                </div>
                <div class="season-banner-right">
                    <div class="season-countdown">
                        <div class="countdown-label">Tiempo Restante</div>
                        <div class="countdown-time" id="seasonCountdown">
                            ${this.formatSeasonTimeLeft(currentSeason)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Métodos de funcionalidad
     */
    
    getCurrentSeason() {
        const now = new Date();
        const month = now.getMonth() + 1; // getMonth() es 0-indexed
        const day = now.getDate();
        
        // Verificar cada temporada
        for (const season of Object.values(this.seasons)) {
            if (this.isSeasonActive(season, month, day)) {
                return season;
            }
        }
        
        return null;
    }
    
    isSeasonActive(season, currentMonth, currentDay) {
        const startMonth = season.startMonth;
        const startDay = season.startDay;
        const duration = season.duration;
        
        // Calcular fecha de fin
        const startDate = new Date(new Date().getFullYear(), startMonth - 1, startDay);
        const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
        const currentDate = new Date(new Date().getFullYear(), currentMonth - 1, currentDay);
        
        return currentDate >= startDate && currentDate <= endDate;
    }
    
    calculateDaysLeft(season) {
        if (!season) return 0;
        
        const now = new Date();
        const startDate = new Date(now.getFullYear(), season.startMonth - 1, season.startDay);
        const endDate = new Date(startDate.getTime() + season.duration * 24 * 60 * 60 * 1000);
        
        const timeLeft = endDate.getTime() - now.getTime();
        return Math.max(0, Math.ceil(timeLeft / (24 * 60 * 60 * 1000)));
    }
    
    /**
     * Eventos del sistema
     */
    bindSeasonsEvents() {
        // Toggle panel
        document.getElementById('toggleSeasons')?.addEventListener('click', () => {
            this.toggleSeasonsPanel();
        });
        
        // Tabs
        document.querySelectorAll('.seasons-content .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSeasonTab(e.target.dataset.tab);
            });
        });
    }
    
    toggleSeasonsPanel() {
        const content = document.getElementById('seasonsContent');
        const toggle = document.getElementById('toggleSeasons');
        
        if (content && toggle) {
            content.classList.toggle('collapsed');
            toggle.querySelector('i').classList.toggle('fa-chevron-down');
            toggle.querySelector('i').classList.toggle('fa-chevron-up');
        }
    }
    
    switchSeasonTab(tab) {
        // Actualizar botones
        document.querySelectorAll('.seasons-content .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Actualizar contenido
        document.querySelectorAll('.seasons-content .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tab}Tab`).classList.add('active');
    }
    
    /**
     * Persistencia y gestión de datos
     */
    loadSeasonData() {
        try {
            const saved = localStorage.getItem('bingoroyal_seasons_data');
            if (saved) {
                this.seasonData = { ...this.seasonData, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.log('⚠️ Error cargando datos de temporadas:', error);
        }
    }
    
    saveSeasonData() {
        try {
            localStorage.setItem('bingoroyal_seasons_data', JSON.stringify(this.seasonData));
        } catch (error) {
            console.log('⚠️ Error guardando datos de temporadas:', error);
        }
    }
    
    /**
     * Verificar y inicializar temporada actual
     */
    checkCurrentSeason() {
        const currentSeason = this.getCurrentSeason();
        
        if (currentSeason && this.currentSeason?.id !== currentSeason.id) {
            console.log('🌟 Nueva temporada detectada:', currentSeason.name);
            this.currentSeason = currentSeason;
            this.onSeasonStart(currentSeason);
        } else if (currentSeason) {
            this.currentSeason = currentSeason;
        }
    }
    
    onSeasonStart(season) {
        // Resetear progreso de temporada
        this.seasonData.currentProgress = {};
        this.seasonData.seasonTokens = 0;
        
        // Aplicar contenido estacional
        this.applySeasonalContent(season);
        
        // Mostrar notificación de nueva temporada
        this.showSeasonStartNotification(season);
        
        // Activar eventos especiales
        this.activateSeasonalEvents(season);
        
        this.saveSeasonData();
    }
    
    /**
     * Destruir sistema
     */
    destroy() {
        document.getElementById('seasonsSystemPanel')?.remove();
        console.log('🌟 Seasons System destruido');
    }
}

// CSS básico para temporadas
const seasonsSystemCSS = `
.seasons-system-panel {
    margin-bottom: var(--spacing-lg);
    animation: seasonEntrance 1.2s ease-out;
}

@keyframes seasonEntrance {
    from {
        opacity: 0;
        transform: translateX(-30px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateX(0) scale(1);
    }
}

.seasons-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
    color: white;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.seasons-title h3 {
    font-size: 1.3rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin: 0;
}

.current-season {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    margin-top: var(--spacing-sm);
}

.season-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-weight: 600;
}

.season-time {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 0.85rem;
}

.seasons-content {
    padding: var(--spacing-md);
    background: var(--glass-bg);
    color: white;
}

.season-banner-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    border-radius: var(--radius-lg);
    color: white;
    margin-bottom: var(--spacing-lg);
}

.season-banner-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
}

.season-icon-large {
    font-size: 3rem;
    min-width: 80px;
    text-align: center;
}

.season-details h2 {
    font-size: 1.8rem;
    margin-bottom: var(--spacing-sm);
}

.feature-tag {
    background: rgba(255, 255, 255, 0.2);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    margin-right: var(--spacing-sm);
}

.season-countdown {
    text-align: center;
    padding: var(--spacing-md);
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--radius-md);
}

.countdown-label {
    font-size: 0.9rem;
    margin-bottom: var(--spacing-sm);
    opacity: 0.9;
}

.countdown-time {
    font-size: 1.5rem;
    font-weight: 700;
}

@media (max-width: 768px) {
    .season-banner-content {
        flex-direction: column;
        gap: var(--spacing-lg);
        text-align: center;
    }
    
    .season-banner-left {
        flex-direction: column;
        text-align: center;
    }
}
`;

// Inyectar CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = seasonsSystemCSS;
document.head.appendChild(styleSheet);

// Exportar clase
window.SeasonsSystem = SeasonsSystem; 