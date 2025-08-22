// ===== ELIMINACIÓN INMEDIATA DE OVERLAYS NO DESEADOS =====
// Función para eliminar inmediatamente cualquier overlay o modal visible
function removeAllOverlays() {
    // ✨ NUEVO: Reducir logging para evitar advertencias de debug en Firefox
    
    // Eliminar cualquier modal que se esté mostrando
    const allModals = document.querySelectorAll('.modal, [id*="modal"], [class*="modal"]');
    allModals.forEach(modal => {
        if (modal.style.display !== 'none' || modal.classList.contains('show') || modal.classList.contains('active')) {
            modal.style.display = 'none';
            modal.classList.remove('show', 'active');
            modal.style.opacity = '0';
            modal.style.visibility = 'hidden';
            modal.style.pointerEvents = 'none';
        }
    });
    
    // Eliminar cualquier overlay que se esté mostrando
    const allOverlays = document.querySelectorAll('.modal-overlay, .overlay, [class*="overlay"]');
    allOverlays.forEach(overlay => {
        if (overlay.style.display !== 'none' || overlay.classList.contains('show') || overlay.classList.contains('active')) {
            overlay.style.display = 'none';
            overlay.classList.remove('show', 'active');
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            overlay.style.pointerEvents = 'none';
        }
    });
    
    // Limpiar backdrop-filters problemáticos
    const backdropElements = document.querySelectorAll('[style*="backdrop-filter"], [style*="filter: blur"]');
    backdropElements.forEach(element => {
        if (element.style.backdropFilter || element.style.filter) {
            console.log('🔧 Limpiando backdrop-filter:', element);
            element.style.backdropFilter = '';
            element.style.filter = '';
        }
    });
    
    // Asegurar que el body y app-container no tengan opacidad 0
    if (document.body.style.opacity === '0') {
        document.body.style.opacity = '1';
        console.log('🔧 Corrigiendo opacidad del body');
    }
    
    const appContainer = document.querySelector('.app-container');
    if (appContainer && appContainer.style.opacity === '0') {
        appContainer.style.opacity = '1';
        console.log('🔧 Corrigiendo opacidad del app-container');
    }
}

// Ejecutar limpieza inmediatamente
removeAllOverlays();

// También ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeAllOverlays);
} else {
    removeAllOverlays();
}

// Y ejecutar cuando la ventana esté completamente cargada
window.addEventListener('load', removeAllOverlays);

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
        console.log('🚨🚨🚨 CONSTRUCTOR BINGOPRO INICIANDO 🚨🚨🚨');
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
        
        // 🚨 NUEVO: INICIALIZAR modeCycles EN EL CONSTRUCTOR
        this.modeCycles = {};
        
        // 🎯 NUEVO: SISTEMA DE CACHE PARA EVITAR POLLING EXCESIVO
        this.globalStatsCache = {
            data: null,
            lastUpdate: 0,
            cacheDuration: 10 * 1000, // 10 segundos de cache
            isUpdating: false
        };
        
        // 🎯 NUEVO: CONTROL DE POLLING INTELIGENTE
        this.pollingControl = {
            lastGlobalStatsRequest: 0,
            minIntervalBetweenRequests: 5 * 1000, // 5 segundos mínimo entre peticiones
            maxRequestsPerMinute: 10, // Máximo 10 peticiones por minuto
            requestCount: 0,
            lastResetTime: Date.now()
        };
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
        
        // 🚀 NUEVO: SISTEMA DE DEBOUNCE PARA RENDERIZADO
        this.renderTimeout = null;
        this.debouncedRenderUI = this.debouncedRenderUI.bind(this);
        
        // ===== SISTEMA DE NIVELES Y PROGRESIÓN =====
        this.userProgression = {
            // Sistema de niveles inspirado en bingos españoles
            levels: {
                1: { name: 'Novato', requiredXP: 0, benefits: [], color: '#8B4513', icon: 'fa-seedling' },
                2: { name: 'Aficionado', requiredXP: 100, benefits: ['Descuento 5%'], color: '#CD7F32', icon: 'fa-star' },
                3: { name: 'Bronce', requiredXP: 250, benefits: ['Descuento 10%', 'Botes +5%'], color: '#CD7F32', icon: 'fa-medal' },
                4: { name: 'Plata', requiredXP: 500, benefits: ['Descuento 15%', 'Botes +10%', 'Chat VIP'], color: '#C0C0C0', icon: 'fa-award' },
                5: { name: 'Oro', requiredXP: 1000, benefits: ['Descuento 20%', 'Botes +15%', 'Soporte Premium'], color: '#FFD700', icon: 'fa-crown' },
                6: { name: 'Platino', requiredXP: 2000, benefits: ['Descuento 25%', 'Botes +20%', 'Cartones Gratis'], color: '#E5E4E2', icon: 'fa-gem' },
                7: { name: 'Diamante', requiredXP: 4000, benefits: ['Descuento 30%', 'Botes +25%', 'Acceso VIP'], color: '#B9F2FF', icon: 'fa-diamond' },
                8: { name: 'Master', requiredXP: 8000, benefits: ['Descuento 35%', 'Botes +30%', 'Partidas Privadas'], color: '#9932CC', icon: 'fa-chess-king' },
                9: { name: 'Leyenda', requiredXP: 15000, benefits: ['Descuento 40%', 'Botes +35%', 'Torneos Exclusivos'], color: '#FF4500', icon: 'fa-fire' },
                10: { name: 'Campeón', requiredXP: 30000, benefits: ['Descuento 50%', 'Botes +50%', 'Todas las ventajas'], color: '#FF0000', icon: 'fa-trophy' }
            },
            
            // Métodos para ganar experiencia
            xpRewards: {
                playGame: 10,           // Por participar en una partida
                buyCard: 5,             // Por comprar un cartón
                markNumber: 1,          // Por marcar un número
                winLine: 20,            // Por ganar línea
                winTwoLines: 35,        // Por ganar dos líneas
                winBingo: 50,           // Por ganar bingo
                winJackpot: 200,        // Por ganar bote progresivo
                dailyLogin: 15,         // Por login diario
                weeklyBonus: 100,       // Bonus semanal por actividad
                monthlyBonus: 300,      // Bonus mensual
                referFriend: 500        // Por referir un amigo
            }
        };
        
        // ===== MODOS DE JUEGO =====
        this.gameModes = {
            CLASSIC: {
                id: 'CLASSIC',
                name: 'Bingo Clásico',
                description: 'El bingo tradicional con partidas de 2 minutos',
                duration: 2 * 60 * 1000, // 2 minutos
                breakTime: 3 * 60 * 1000, // ✨ NUEVO: 3 minutos de descanso entre partidas
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
                    line: 15,           // Aumentado de 10 a 15€
                    twoLines: 40,       // Aumentado de 25 a 40€
                    bingo: 150,         // Aumentado de 100 a 150€
                    jackpot: 2500       // Bote progresivo mínimo
                },
                features: ['Números del 1-90', 'Partidas automáticas', 'Bote progresivo desde 2.500€'],
                isActive: true
            },
            RAPID: {
                id: 'RAPID',
                name: 'Bingo Rápido',
                description: 'Partidas aceleradas de 1 minuto para jugadores experimentados',
                duration: 1 * 60 * 1000, // 1 minuto
                breakTime: 2 * 60 * 1000, // ✨ NUEVO: 2 minutos de descanso entre partidas
                numberCallInterval: 1500, // 1.5 segundos
                cardPrice: 1.50,
                minPlayers: 3,
                maxCards: 20,
                requirements: {
                    level: 0,           // ✅ MODO BÁSICO - ACCESIBLE PARA TODOS
                    balance: 0,         // ✅ SIN RESTRICCIÓN DE SALDO
                    timeOfDay: 'any'
                },
                prizes: {
                    line: 25,           // Aumentado de 15 a 25€
                    twoLines: 60,       // Aumentado de 40 a 60€
                    bingo: 200,         // Aumentado de 150 a 200€
                    jackpot: 3500       // Bote progresivo mínimo
                },
                features: ['Partidas express', 'Premios aumentados', 'Adrenalina máxima'],
                isActive: true
            },
            VIP: {
                id: 'VIP',
                name: 'Bingo VIP',
                description: 'Experiencia premium con premios exclusivos y cartones especiales',
                duration: 3 * 60 * 1000, // 3 minutos
                breakTime: 4 * 60 * 1000, // ✨ NUEVO: 4 minutos de descanso entre partidas
                numberCallInterval: 4000, // 4 segundos
                cardPrice: 3.00,
                minPlayers: 5,
                maxCards: 50,
                requirements: {
                    level: 5,           // 🔒 MODO PREMIUM - Nivel Plata requerido
                    balance: 15,        // 🔒 Saldo mínimo €15
                    timeOfDay: 'any',
                    vipStatus: true     // 🔒 Estado VIP requerido
                },
                prizes: {
                    line: 50,           // Aumentado de 25 a 50€
                    twoLines: 120,      // Aumentado de 75 a 120€
                    bingo: 400,         // Aumentado de 300 a 400€
                    jackpot: 10000      // Bote progresivo VIP mínimo
                },
                features: ['Cartones premium', 'Premios exclusivos', 'Chat privado', 'Soporte prioritario'],
                isActive: true
            },
            NIGHT: {
                id: 'NIGHT',
                name: 'Bingo Nocturno',
                description: 'Partidas especiales solo disponibles por la noche (22h-6h)',
                duration: 2.5 * 60 * 1000, // 2.5 minutos
                breakTime: 3.5 * 60 * 1000, // ✨ NUEVO: 3.5 minutos de descanso entre partidas
                numberCallInterval: 3500, // 3.5 segundos
                cardPrice: 2.00,
                minPlayers: 2,
                maxCards: 25,
                requirements: {
                    level: 3,           // 🔒 MODO PREMIUM - Nivel Bronce requerido
                    balance: 8,         // 🔒 Saldo mínimo €8
                    timeOfDay: 'night'  // 🔒 Solo disponible de noche (22h-6h)
                },
                prizes: {
                    line: 30,           // Aumentado de 20 a 30€
                    twoLines: 75,       // Aumentado de 60 a 75€
                    bingo: 250,         // Aumentado de 200 a 250€
                    jackpot: 5000       // Bote progresivo nocturno
                },
                features: ['Solo 22h-6h', 'Ambiente misterioso', 'Bonificaciones nocturnas', 'Números de la suerte'],
                isActive: true
            }
        };

        // Modo de juego actual (con persistencia) - INICIALIZADO DESPUÉS DE gameModes
        const savedMode = this.loadGameMode() || 'CLASSIC';
        this.currentGameMode = this.gameModes[savedMode] || this.gameModes['CLASSIC'];
        
        // 🎯 NUEVO: VERIFICAR INICIALIZACIÓN DE gameModes
        console.log('🔍 VERIFICACIÓN DE INICIALIZACIÓN:');
        console.log('🔍 this.gameModes inicializado:', !!this.gameModes);
        console.log('🔍 this.gameModes keys:', Object.keys(this.gameModes));
        console.log('🔍 this.currentGameMode:', this.currentGameMode);
        console.log('🔍 this.gameModes[this.currentGameMode]:', this.gameModes[this.currentGameMode]);
        
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
        this.chatApiUrl = '/api/chat'; // Corregido: el servidor tiene endpoints en /api/chat
        this.chatPollingInterval = null;
        this.lastMessageId = null;
        this.chatInitialized = false; // ✨ NUEVO: Flag para evitar inicializaciones múltiples
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

        // ✨ NUEVO: Sistema de perfil de usuario
        this.userProfile = {
            registrationDate: new Date(),
            level: 1,
            experience: 0,
            vipStatus: false,
            totalGames: 0,
            totalWins: 0,
            totalSpent: 0,
            totalWon: 0,
            achievements: [],
            currentStreak: 0,
            bestStreak: 0,
            highestPrize: 0,
            settings: {
                notifications: true,
                sounds: true
            }
        };
        
        this.initializeGame();
        this.setupEventListeners();
        this.initializeSounds();
        this.updateUI();
        this.initializeLiveChat();
        
        // ===== CONEXIÓN AL BINGO GLOBAL =====
        // 🎯 CORREGIDO: NO conectar automáticamente al bingo global
        // this.connectToGlobalBingo();
        
        console.log('BingoPro inicializado correctamente');
    }

    initializeGame() {
        console.log('🚀 Inicializando juego de bingo (optimizado)...');
        
        // 🚀 INICIALIZAR SISTEMAS ROBUSTOS
        if (window.BingoAppState && !window.BingoAppState.isInitialized) {
            window.BingoAppState.init();
        }
        
        if (window.HeaderManager) {
            window.HeaderManager.init();
        }
        
        // ✨ NUEVO: CARGAR PERFIL DE USUARIO PRIMERO (ANTES DE TODO)
        console.log('🚀 ANTES DE loadUserProfile()');
        this.loadUserProfile();
        console.log('🚀 DESPUÉS DE loadUserProfile()');
        
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
        
        // 🎯 NUEVO: CARGAR CARTONES DEL USUARIO INMEDIATAMENTE
        this.loadUserCards();
        
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
        
        // 🔄 Sincronizar estado con el servidor al inicializar
        this.syncGameStateWithServer();
        
        // Configurar sincronización periódica cada 30 segundos
        setInterval(() => {
            this.syncGameStateWithServer();
        }, 30000);
        
        // 🚀 NUEVO: SINCRONIZACIÓN RÁPIDA DE NÚMEROS LLAMADOS (cada 2 segundos)
        setInterval(() => {
            this.syncCalledNumbersWithBackend();
        }, 2000);
        
        // ✨ NUEVO: Inicializar sistema de usuario y progresión
        this.initializeUserProgression();
        
        // Conectar al bingo global inmediatamente para mantener estado
        // 🎯 CORREGIDO: NO conectar automáticamente al bingo global
        // this.connectToGlobalBingo();
        
        // ✨ NUEVO: Inicializar chat en vivo
        console.log('🚀 Inicializando chat en vivo...');
        this.initializeLiveChat();
        
        // ✨ NUEVO: Actualizar información del usuario en el header
        this.initializeUserSession();
        updateHeaderUserInfo();
        

        
        // ✨ NUEVO: Configurar sincronización automática de userId
        this.setupUserIdSyncListener();
        
        // ✨ NUEVO: SISTEMA DE CRONÓMETROS COORDINADO Y PROFESIONAL
        this.initializeCoordinatedCountdownSystem();
        
        // ✨ NUEVO: SISTEMA DE SINCRONIZACIÓN CENTRALIZADO
        this.initializeCentralizedSyncSystem();
        
        // 🎯 NUEVO: INICIALIZAR PANEL INFORMATIVO EN VIVO
        this.updateLiveInfoPanel();
        
        // 🎯 NUEVO: ACTUALIZAR PANEL CADA 5 SEGUNDOS
        setInterval(() => {
            this.updateLiveInfoPanel();
        }, 5000);
        
        console.log('✅ Inicialización optimizada completada');
        
        // 🎯 NUEVO: Agregar comandos de debug a la consola
        this.setupDebugCommands();
    }

    /**
     * ✨ VERIFICAR SESIÓN DE USUARIO EXISTENTE
     */
    initializeUserSession() {
        // Verificar si ya existe una sesión del login
        let sessionData = localStorage.getItem('bingoroyal_session');
        
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                
                if (session.user && session.user.email) {
                    console.log('✅ Sesión del login cargada:', session.user);
                } else {
                    console.log('⚠️ Sesión sin datos de usuario válidos');
                }
            } catch (error) {
                console.warn('⚠️ Error al cargar sesión existente:', error);
            }
        } else {
            console.log('ℹ️ No hay sesión de login activa');
        }
    }
    

    
    /**
     * ✨ NUEVO: FUNCIONES DE PERFIL DE USUARIO
     */
    
    // Cargar perfil desde localStorage y sesión real
    loadUserProfile() {
        console.log('🚨🚨🚨 FUNCIÓN loadUserProfile() EJECUTÁNDOSE 🚨🚨🚨');
        console.log('🔍 INICIO: loadUserProfile() ejecutándose...');
        
        try {
            // Primero intentar cargar desde la sesión real
            const sessionData = localStorage.getItem('bingoroyal_session');
            console.log('🔍 Session data encontrada:', sessionData ? 'SÍ' : 'NO');
            
            if (sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    console.log('🔍 Sesión parseada:', session);
                    console.log('🔍 Usuario en sesión:', session.user);
                    
                    if (session.user) {
                        console.log('🔍 Datos del usuario encontrados:', {
                            id: session.user.id,
                            email: session.user.email,
                            firstName: session.user.firstName,
                            lastName: session.user.lastName,
                            level: session.user.level,
                            balance: session.user.balance
                        });
                        
                        // Actualizar perfil con datos reales de la sesión
                        this.userProfile = {
                            ...this.userProfile,
                            id: session.user.id,
                            email: session.user.email,
                            firstName: session.user.firstName,
                            lastName: session.user.lastName,
                            level: session.user.level || 1,
                            experience: session.user.experience || 0,
                            vipStatus: session.user.vipStatus || false,
                            balance: session.user.balance || 0,
                            registrationDate: session.user.registrationDate ? new Date(session.user.registrationDate) : new Date()
                        };
                        
                        // Actualizar userId también
                        this.userId = session.user.id;
                        
                        console.log('✅ Perfil actualizado con datos reales de la sesión:', this.userProfile);
                        
                        // 🚀 ACTUALIZAR ESTADO CENTRAL
                        if (window.BingoAppState) {
                            window.BingoAppState.updateUser(session.user);
                            console.log('✅ Usuario actualizado en estado central');
                        }
                        
                        // ✨ NUEVO: Actualizar también el header después de cargar el perfil
                        setTimeout(() => {
                            updateHeaderUserInfo();
                        }, 100);
                        
                        return;
                    } else {
                        console.log('⚠️ Sesión encontrada pero sin datos de usuario');
                    }
                } catch (error) {
                    console.log('⚠️ Error procesando sesión:', error);
                }
            } else {
                console.log('⚠️ No hay datos de sesión en localStorage');
            }
            
            // Fallback: cargar perfil guardado localmente
            const savedProfile = localStorage.getItem('bingoroyal_user_profile');
            if (savedProfile) {
                const profileData = JSON.parse(savedProfile);
                this.userProfile = { ...this.userProfile, ...profileData };
                // Convertir fecha de registro
                if (profileData.registrationDate) {
                    this.userProfile.registrationDate = new Date(profileData.registrationDate);
                }
                console.log('📂 Perfil de usuario cargado desde localStorage:', this.userProfile);
            } else {
                console.log('⚠️ No hay perfil guardado localmente');
            }
        } catch (error) {
            console.log('⚠️ Error cargando perfil de usuario:', error);
        }
        
        console.log('🔍 FINAL: Perfil final:', this.userProfile);
    }

    // Guardar perfil en localStorage
    saveUserProfile() {
        try {
            localStorage.setItem('bingoroyal_user_profile', JSON.stringify(this.userProfile));
            console.log('💾 Perfil de usuario guardado');
        } catch (error) {
            console.error('❌ Error guardando perfil de usuario:', error);
        }
    }

    // Obtener nombre de usuario
    getUserName() {
        if (this.userProfile.firstName && this.userProfile.lastName) {
            return `${this.userProfile.firstName} ${this.userProfile.lastName}`;
        } else if (this.userProfile.email) {
            // Extraer nombre del email si no hay firstName/lastName
            const emailName = this.userProfile.email.split('@')[0];
            return emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
        return `Usuario ${this.userProfile.level}`;
    }

    // Obtener ID de usuario
    getUserId() {
        return this.userId || 'N/A';
    }

    // Obtener nivel de usuario
    getUserLevel() {
        return this.userProfile.level;
    }

    // Obtener experiencia de usuario
    getUserExperience() {
        return `${this.userProfile.experience} XP`;
    }

    // Verificar si es usuario VIP
    isUserVip() {
        return this.userProfile.vipStatus;
    }

    // Obtener fecha de registro
    getUserRegistrationDate() {
        return this.userProfile.registrationDate.toLocaleDateString('es-ES');
    }

    // Obtener total de partidas
    getTotalGames() {
        return this.userProfile.totalGames;
    }

    // Obtener total de victorias
    getTotalWins() {
        return this.userProfile.totalWins;
    }

    // Obtener tasa de victoria
    getWinRate() {
        if (this.userProfile.totalGames === 0) return '0%';
        return `${Math.round((this.userProfile.totalWins / this.userProfile.totalGames) * 100)}%`;
    }

    // Obtener total de cartones
    getTotalCards() {
        return this.userCards.length;
    }

    // Obtener total gastado
    getTotalSpent() {
        return this.userProfile.totalSpent;
    }

    // Obtener total ganado
    getTotalWon() {
        return this.userProfile.totalWon;
    }

    // Obtener cartones por modo
    getCardsByMode() {
        const cardsByMode = {};
        this.userCards.forEach(card => {
            const mode = card.gameMode || 'CLASSIC';
            cardsByMode[mode] = (cardsByMode[mode] || 0) + 1;
        });
        return cardsByMode;
    }

    // Obtener logros desbloqueados
    getAchievementsUnlocked() {
        return this.userProfile.achievements.length;
    }

    // Obtener premio más alto
    getHighestPrize() {
        return this.userProfile.highestPrize;
    }

    // Obtener racha actual
    getCurrentStreak() {
        return this.userProfile.currentStreak;
    }

    // Obtener mejor racha
    getBestStreak() {
        return this.userProfile.bestStreak;
    }

    // Obtener configuración de notificaciones
    getNotificationSetting() {
        return this.userProfile.settings.notifications;
    }

    // Obtener configuración de sonidos
    getSoundSetting() {
        return this.userProfile.settings.sounds;
    }

    // Establecer configuración de notificaciones
    setNotificationSetting(enabled) {
        this.userProfile.settings.notifications = enabled;
        this.saveUserProfile();
    }

    // Establecer configuración de sonidos
    setSoundSetting(enabled) {
        this.userProfile.settings.sounds = enabled;
        this.saveUserProfile();
    }

    // Agregar experiencia al usuario
    addUserExperience(amount, reason = '') {
        this.userProfile.experience += amount;
        
        // Calcular nuevo nivel (cada 100 XP = 1 nivel)
        const newLevel = Math.floor(this.userProfile.experience / 100) + 1;
        if (newLevel > this.userProfile.level) {
            this.userProfile.level = newLevel;
            this.showNotification(`🎉 ¡Subiste al nivel ${newLevel}!`, 'success');
        }
        
        this.saveUserProfile();
        console.log(`✨ +${amount} XP (${reason}). Nivel: ${this.userProfile.level}`);
    }

    // Registrar partida jugada
    recordGamePlayed(won = false, prize = 0) {
        this.userProfile.totalGames++;
        if (won) {
            this.userProfile.totalWins++;
            this.userProfile.totalWon += prize;
            this.userProfile.currentStreak++;
            
            // Actualizar mejor racha
            if (this.userProfile.currentStreak > this.userProfile.bestStreak) {
                this.userProfile.bestStreak = this.userProfile.currentStreak;
            }
            
            // Actualizar premio más alto
            if (prize > this.userProfile.highestPrize) {
                this.userProfile.highestPrize = prize;
            }
        } else {
            this.userProfile.currentStreak = 0;
        }
        
        this.saveUserProfile();
    }

    // Registrar compra de cartones
    recordCardPurchase(cost) {
        this.userProfile.totalSpent += cost;
        this.saveUserProfile();
    }
    
    /**
     * ✨ NUEVO: SISTEMA DE CRONÓMETROS COORDINADO Y PROFESIONAL
     * SOLUCIONA: Cronómetros no coordinados y lógica fragmentada
     */
    initializeCoordinatedCountdownSystem() {
        console.log('🎯 Inicializando sistema de cronómetros coordinado y profesional...');
        
        // 1. LIMPIAR INTERVALOS ANTERIORES
        if (this.modeCountdownInterval) {
            clearInterval(this.modeCountdownInterval);
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        // 2. CONFIGURAR SISTEMA CENTRALIZADO
        this.countdownSystem = {
            isActive: false,
            currentMode: null,
            startTime: null,
            endTime: null,
            breakTime: null,
            interval: null,
            updateFrequency: 1000, // 1 segundo
            lastUpdate: 0
        };
        
        // 3. INICIALIZAR COUNTDOWNS INMEDIATAMENTE
        this.updateAllModeCountdownsCoordinated();
        
        // 4. CONFIGURAR INTERVALO COORDINADO
        this.modeCountdownInterval = setInterval(() => {
            this.updateAllModeCountdownsCoordinated();
        }, 1000); // Actualizar cada segundo para máxima precisión
        
        // 5. CONFIGURAR ACTUALIZACIÓN DE PRECIOS
        setInterval(() => {
            this.updateCardPriceDisplay();
        }, 10000); // Cada 10 segundos
        
        console.log('✅ Sistema de cronómetros coordinado inicializado (actualización cada 1s)');
    }
    
    /**
     * ✨ NUEVO: SISTEMA DE SINCRONIZACIÓN CENTRALIZADO
     * SOLUCIONA: Estado inconsistente y falta de coordinación
     */
    initializeCentralizedSyncSystem() {
        console.log('🔄 Inicializando sistema de sincronización centralizado...');
        
        // 1. SINCRONIZACIÓN INMEDIATA
        this.syncGameStateWithServer();
        
        // 2. SINCRONIZACIÓN PERIÓDICA COORDINADA
        setInterval(() => {
            this.syncGameStateWithServer();
        }, 30000); // Cada 30 segundos
        
        // 3. SINCRONIZACIÓN DE COUNTDOWNS
        setInterval(() => {
            this.syncCountdownsWithServer();
        }, 5000); // Cada 5 segundos
        
        console.log('✅ Sistema de sincronización centralizado inicializado');
        
        // 4. ✨ NUEVO: INICIALIZAR CICLOS INDEPENDIENTES PARA TODOS LOS MODOS
        this.initializeAllModeCycles();
    }
    
    /**
     * ✨ NUEVO: Inicializar ciclos independientes para todos los modos
     * SOLUCIONA: Secciones "Próxima" que no funcionan
     */
    initializeAllModeCycles() {
        console.log('🎯 Inicializando ciclos independientes para todos los modos...');
        
        // 1. INICIALIZAR CICLOS PARA CADA MODO
        Object.keys(this.gameModes).forEach(modeId => {
            this.initializeModeCycle(modeId);
        });
        
        // 2. VERIFICAR QUE SE INICIALIZARON CORRECTAMENTE
        console.log('✅ Ciclos inicializados:', Object.keys(this.modeCycles || {}));
        
        // 3. ACTUALIZAR COUNTDOWNS INMEDIATAMENTE
        this.updateAllModeCountdownsCoordinated();
        
        // 4. 🎯 CORREGIDO: SINCRONIZACIÓN INMEDIATA CON SERVIDOR EN LUGAR DE RESET
        setTimeout(() => {
            this.syncGameStateWithServer();
        }, 1000); // Esperar 1 segundo para que todo esté listo
        
        // 5. 🎯 NUEVO: LIMPIAR NÚMEROS LLAMADOS ANTIGUOS AL INICIALIZAR
        setTimeout(() => {
            this.clearCalledNumbersIfNoActiveGame();
        }, 2000); // Esperar 2 segundos para que la sincronización se complete
        
        // 5.5. 🎯 NUEVO: SINCRONIZAR NÚMEROS LLAMADOS CON SERVIDOR
        setTimeout(() => {
            this.syncCalledNumbersWithServer();
        }, 2500); // Esperar 2.5 segundos para sincronización completa
        
        // 6. 🎯 NUEVO: LIMPIAR PARTIDAS EXPIRADAS AL INICIALIZAR
        setTimeout(() => {
            this.cleanupExpiredGames();
        }, 3000); // Esperar 3 segundos para que la sincronización se complete
        
        // 5. 🎯 NUEVO: SINCRONIZACIÓN AUTOMÁTICA CADA 5 SEGUNDOS
        setInterval(() => {
            this.updatePurchaseButtonsState();
            this.updateAllModeCountdownsCoordinated();
            this.syncCalledNumbersWithServer(); // 🎯 NUEVO: Sincronizar números llamados
        }, 5000);
    }
    
    /**
     * ✨ NUEVO: ACTUALIZACIÓN COORDINADA DE COUNTDOWNS
     * SOLUCIONA: Cronómetros no coordinados
     */
    async updateAllModeCountdownsCoordinated() {
        try {
            // 1. VERIFICAR SI EL SISTEMA ESTÁ ACTIVO
            if (this.countdownSystem.isActive) {
                return; // Ya hay un countdown activo
            }
            
            // 2. OBTENER DATOS DEL SERVIDOR (INTELIGENTE)
            const serverData = await this.getGlobalStatsIntelligent();
            
            // 3. ACTUALIZAR COUNTDOWNS DE FORMA COORDINADA
            const modes = ['CLASSIC', 'RAPID', 'VIP', 'NIGHT'];
            let updatedCount = 0;
            
            for (const mode of modes) {
                const countdownInfo = this.calculateCoordinatedCountdown(mode, serverData);
                const updated = this.updateSingleModeCountdown(mode, countdownInfo);
                if (updated) updatedCount++;
            }
            
            // 4. ACTUALIZAR ESTADO DE BOTONES DE COMPRA
            this.updatePurchaseButtonsStateFromCountdowns();
            
            console.log(`✅ Countdowns coordinados actualizados: ${updatedCount}/${modes.length}`);
            
        } catch (error) {
            console.error('❌ Error en countdowns coordinados:', error);
            this.updateCountdownsFallback();
        }
    }
    
    /**
     * 🎯 NUEVO: MÉTODO INTELIGENTE PARA OBTENER GLOBAL-STATS CON CACHE
     * SOLUCIONA: Rate limiting HTTP 429 por polling excesivo
     */
    async getGlobalStatsIntelligent() {
        const now = Date.now();
        
        // 🔒 CONTROL DE RATE LIMITING
        if (now - this.pollingControl.lastGlobalStatsRequest < this.pollingControl.minIntervalBetweenRequests) {
            console.log('⏰ Rate limiting: esperando intervalo mínimo entre peticiones');
            return this.globalStatsCache.data;
        }
        
        // 🔒 CONTROL DE MÁXIMO DE PETICIONES POR MINUTO (SIN RESET AUTOMÁTICO)
        if (now - this.pollingControl.lastResetTime >= 60000) {
            this.pollingControl.requestCount = 0;
            this.pollingControl.lastResetTime = now;
            // 🎯 CORREGIDO: NO RESETEAR ESTADO, SOLO CONTADOR DE PETICIONES
        }
        
        if (this.pollingControl.requestCount >= this.pollingControl.maxRequestsPerMinute) {
            console.log('🚫 Rate limiting: máximo de peticiones por minuto alcanzado');
            return this.globalStatsCache.data;
        }
        
        // ✅ VERIFICAR CACHE
        if (this.globalStatsCache.data && 
            now - this.globalStatsCache.lastUpdate < this.globalStatsCache.cacheDuration) {
            console.log('💾 Usando cache de global-stats (válido por', 
                Math.floor((this.globalStatsCache.cacheDuration - (now - this.globalStatsCache.lastUpdate)) / 1000), 's)');
            return this.globalStatsCache.data;
        }
        
        // 🔄 ACTUALIZAR CACHE
        if (!this.globalStatsCache.isUpdating) {
            this.globalStatsCache.isUpdating = true;
            this.pollingControl.lastGlobalStatsRequest = now;
            this.pollingControl.requestCount++;
            
            try {
                console.log('🌐 Obteniendo global-stats del servidor...');
                const response = await fetch('/api/bingo/global-stats');
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('🔍 getGlobalStatsIntelligent - Respuesta del servidor:', data);
                    console.log('🔍 getGlobalStatsIntelligent - Estructura de data:', {
                        success: data.success,
                        hasStats: !!data.stats,
                        statsKeys: data.stats ? Object.keys(data.stats) : 'NO STATS',
                        hasModes: !!data.modes,
                        modesKeys: data.modes ? Object.keys(data.modes) : 'NO MODES',
                        dataKeys: Object.keys(data)
                    });
                    
                    this.globalStatsCache.data = data;
                    this.globalStatsCache.lastUpdate = now;
                    console.log('✅ Global-stats actualizado y cacheado');
                    return data;
                } else if (response.status === 429) {
                    console.log('🚫 Rate limit alcanzado, usando cache anterior');
                    return this.globalStatsCache.data;
                } else {
                    console.log('⚠️ Error del servidor, usando cache anterior');
                    return this.globalStatsCache.data;
                }
            } catch (error) {
                console.log('❌ Error de red, usando cache anterior:', error.message);
                return this.globalStatsCache.data;
            } finally {
                this.globalStatsCache.isUpdating = false;
            }
        }
        
        return this.globalStatsCache.data;
    }
    
    /**
     * 🎯 LÓGICA CORRECTA DE ESTADOS DE JUEGO
     * SOLUCIONA: Secciones "Próxima" que no funcionan y cartones que no se resetean
     */
    calculateCoordinatedCountdown(modeId, serverData = null) {
        const modeConfig = this.gameModes[modeId];
        if (!modeConfig) return { isActive: false, nextGameIn: null, timeRemaining: 0 };
        
        // 🚨 NUEVO: VERIFICACIÓN DE SEGURIDAD
        if (!this.modeCycles) {
            console.log('⚠️ modeCycles no inicializado en calculateCoordinatedCountdown, inicializando...');
            this.modeCycles = {};
        }
        
        // 1. 🎯 NUEVO: ACTUALIZAR CICLO DEL MODO
        this.updateModeCycle(modeId);
        
        // 2. 🎯 NUEVO: VERIFICACIÓN ROBUSTA DE PARTIDAS ACTIVAS
        const cycle = this.modeCycles[modeId];
        
        // 🚨 PRIORIDAD 1: Estado del servidor (más confiable)
        const serverSaysPlaying = this.serverGameState?.modes?.[modeId]?.gameState === 'playing';
        
        // 🎯 VERIFICAR MÚLTIPLES INDICADORES DE PARTIDA ACTIVA
        const isPartidaActiva = 
            serverSaysPlaying || // 🚨 PRIORIDAD MÁXIMA: Servidor
            (cycle && cycle.isActive) || // Por ciclos
            (this.gameState === 'playing' && this.currentGameMode === modeId) || // Por estado local
            this.isGlobalGameActive(modeId); // Por verificación global
        
        console.log(`🔍 Verificación de partida activa para ${modeId}:`);
        console.log('🔍 cycle.isActive:', cycle?.isActive);
        console.log('🔍 this.gameState:', this.gameState);
        console.log('🔍 this.currentGameMode:', this.currentGameMode);
        console.log('🔍 isGlobalGameActive result:', this.isGlobalGameActive(modeId));
        console.log('🔍 isPartidaActiva final:', isPartidaActiva);
        
        if (isPartidaActiva) {
            // 🎮 PARTIDA EN CURSO - MOSTRAR "PARTIDA EN CURSO"
            return { 
                isActive: true, 
                nextGameIn: 'PARTIDA EN CURSO',
                timeRemaining: 0,
                status: 'playing',
                displayText: '🎮 PARTIDA EN CURSO'
            };
        } else {
            // ✅ PARTIDA TERMINADA - PERMITIR COMPRAS
            return { 
                isActive: false, 
                nextGameIn: null,
                timeRemaining: 0,
                status: 'waiting',
                displayText: '✅ COMPRAR CARTONES'
            };
        }
    }
    
    /**
     * 🎯 NUEVO: FORMATEAR TIEMPO PARA COUNTDOWNS
     */
    formatTime(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * 🎯 NUEVO: POP-UP "YA PUEDES COMPRAR CARTONES"
     */
    showBuyCardsPopup(modeId) {
        const modeName = this.gameModes[modeId]?.name || modeId;
        
        const popup = document.createElement('div');
        popup.className = 'buy-cards-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-icon">🎉</div>
                <h3>¡Partida Terminada!</h3>
                <p>Ya puedes comprar cartones para <strong>${modeName}</strong></p>
                <p class="time-limit">⏰ Tienes 2 minutos para comprar y unirte</p>
                <button class="btn-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
        }, 5000);
        
        console.log(`🎉 Pop-up mostrado para ${modeId}: Ya puedes comprar cartones`);
    }
    
    /**
     * 🎯 NUEVO: ACTUALIZAR PANEL INFORMATIVO EN VIVO
     */
    updateLiveInfoPanel() {
        const gameStatusElement = document.getElementById('liveGameStatus');
        const nextGameElement = document.getElementById('nextGameInfo');
        const playerCountElement = document.getElementById('livePlayerCount');
        const update1Element = document.getElementById('liveUpdate1');
        const update2Element = document.getElementById('liveUpdate2');
        const update3Element = document.getElementById('liveUpdate3');
        
        if (!gameStatusElement || !nextGameElement || !playerCountElement) return;
        
        // 🎮 ESTADO GENERAL DEL JUEGO
        const activeModes = Object.keys(this.modeCycles).filter(modeId => 
            this.modeCycles[modeId] && this.modeCycles[modeId].isActive
        );
        
        if (activeModes.length > 0) {
            gameStatusElement.innerHTML = '🎮 <span style="color: #ff4444;">Partidas activas</span>';
            gameStatusElement.style.color = '#ff4444';
        } else {
            gameStatusElement.innerHTML = '✅ <span style="color: #4CAF50;">Todos los modos disponibles</span>';
            gameStatusElement.style.color = '#4CAF50';
        }
        
        // ⏰ PRÓXIMA PARTIDA
        const nextGameInfo = this.calculateNextGameInfo();
        nextGameElement.innerHTML = nextGameInfo.text;
        nextGameElement.style.color = nextGameInfo.color;
        
        // 👥 JUGADORES ONLINE Y ACTIVOS POR MODO (SISTEMA REAL)
        this.updatePlayerCounts();
        
        // 📡 ACTUALIZACIONES EN VIVO
        this.updateLiveUpdates(update1Element, update2Element, update3Element);
        
        console.log('🎯 Panel informativo en vivo actualizado');
    }
    
    /**
     * 🎯 NUEVO: CALCULAR INFORMACIÓN DE PRÓXIMA PARTIDA
     */
    calculateNextGameInfo() {
        const now = Date.now();
        let nextGameTime = Infinity;
        let nextGameMode = null;
        
        // Buscar la próxima partida más cercana
        Object.keys(this.modeCycles).forEach(modeId => {
            const cycle = this.modeCycles[modeId];
            if (cycle && cycle.nextGameStart && cycle.nextGameStart > now) {
                if (cycle.nextGameStart < nextGameTime) {
                    nextGameTime = cycle.nextGameStart;
                    nextGameMode = modeId;
                }
            }
        });
        
        if (nextGameTime === Infinity) {
            return {
                text: '🎯 Sistema sincronizado',
                color: '#4CAF50'
            };
        }
        
        const timeUntilNext = nextGameTime - now;
        const minutes = Math.floor(timeUntilNext / 60000);
        const seconds = Math.floor((timeUntilNext % 60000) / 1000);
        
        if (minutes > 0) {
            return {
                text: `⏰ ${nextGameMode} en ${minutes}:${seconds.toString().padStart(2, '0')}`,
                color: '#FF9800'
            };
        } else {
            return {
                text: `⚡ ${nextGameMode} en ${seconds}s`,
                color: '#E91E63'
            };
        }
    }
    
    /**
     * 🎯 CORREGIDO: SISTEMA DE JUGADORES ONLINE Y ACTIVOS POR MODO
     * SOLUCIONA: Contadores incorrectos de jugadores online vs activos por modo
     */
    async updatePlayerCounts() {
        try {
            // 🎯 OBTENER DATOS REALES DEL SERVIDOR
            const serverData = await this.getGlobalStatsIntelligent();
            
            if (serverData && serverData.success && serverData.stats) {
                const stats = serverData.stats;
                
                // 🎯 JUGADORES ONLINE (usuarios logueados, no necesariamente jugando)
                const totalOnlinePlayers = stats.totalOnlinePlayers || 0;
                const totalPlayersElement = document.getElementById('totalPlayers');
                if (totalPlayersElement) {
                    totalPlayersElement.textContent = totalOnlinePlayers.toLocaleString('es-ES');
                }
                
                // 🎯 JUGADORES ACTIVOS POR MODO (con cartones comprados en cada modo)
                if (stats.playersByMode) {
                    Object.keys(stats.playersByMode).forEach(modeId => {
                        const modeStats = stats.playersByMode[modeId];
                        const activePlayers = modeStats.playersWithCards || 0;
                        this.updateModePlayerCount(modeId, activePlayers);
                    });
                }
                
                // 🎯 TOTAL DE JUGADORES ACTIVOS (suma de todos los modos)
                const totalActivePlayers = stats.totalPlayersWithCards || 0;
                const activePlayersElement = document.getElementById('activePlayers');
                if (activePlayersElement) {
                    activePlayersElement.textContent = totalActivePlayers.toLocaleString('es-ES');
                }
                
                console.log('✅ Contadores actualizados desde servidor:', {
                    totalOnline: totalOnlinePlayers,
                    totalActive: totalActivePlayers,
                    byMode: stats.playersByMode
                });
                
            } else {
                // 🚨 FALLBACK: Usar datos locales si el servidor falla
                console.warn('⚠️ Servidor no disponible, usando datos locales');
                this.updatePlayerCountsFromLocalData();
            }
            
        } catch (error) {
            console.error('❌ Error actualizando contadores:', error);
            this.updatePlayerCountsFromLocalData();
        }
    }
    
    /**
     * 🎯 OBTENER TOTAL DE JUGADORES ONLINE
     */
    getTotalOnlinePlayers() {
        // Si tenemos datos del servidor, usarlos
        if (this.globalGameState?.totalOnlinePlayers) {
            return this.globalGameState.totalOnlinePlayers;
        }
        
        // Simular basado en el estado actual del juego
        let total = 0;
        Object.keys(this.modeCycles).forEach(modeId => {
            const cycle = this.modeCycles[modeId];
            if (cycle && cycle.players) {
                total += cycle.players.length;
            }
        });
        
        // Añadir jugadores "fantasma" para simular actividad real
        const baseOnline = Math.max(total, 50);
        const randomVariation = Math.floor(Math.random() * 30) - 15; // ±15
        return Math.max(baseOnline + randomVariation, 20);
    }
    
    /**
     * 🎯 OBTENER JUGADORES ACTIVOS POR MODO
     */
    getActivePlayersByMode() {
        const playersByMode = {};
        
        Object.keys(this.modeCycles).forEach(modeId => {
            const cycle = this.modeCycles[modeId];
            if (cycle && cycle.players) {
                // Solo contar jugadores que realmente tienen cartones activos
                const activePlayers = cycle.players.filter(player => 
                    player.hasActiveCards && player.isPlaying
                ).length;
                
                playersByMode[modeId] = activePlayers;
            } else {
                playersByMode[modeId] = 0;
            }
        });
        
        return playersByMode;
    }
    
    /**
     * 🎯 CORREGIDO: ACTUALIZAR CONTADOR DE JUGADORES PARA UN MODO ESPECÍFICO
     * SOLUCIONA: Contadores por modo que no se actualizan correctamente
     */
    updateModePlayerCount(modeId, activePlayers) {
        // 🎯 BUSCAR ELEMENTO DEL DOM POR MODO
        const modeContainer = document.querySelector(`[data-mode="${modeId}"]`);
        if (!modeContainer) {
            console.warn(`⚠️ Contenedor para modo ${modeId} no encontrado`);
            return;
        }
        
        // 🎯 BUSCAR ELEMENTO DE CONTADOR DE JUGADORES
        const playerCountElement = modeContainer.querySelector('.mode-player-count');
        if (!playerCountElement) {
            console.warn(`⚠️ Contador de jugadores para modo ${modeId} no encontrado`);
            return;
        }
        
        // 🎯 ACTUALIZAR CONTADOR
        const previousCount = parseInt(playerCountElement.textContent) || 0;
        playerCountElement.textContent = activePlayers;
        
        // 🎯 ANIMACIÓN SI CAMBIÓ EL VALOR
        if (previousCount !== activePlayers) {
            playerCountElement.classList.add('player-count-updated');
            setTimeout(() => {
                playerCountElement.classList.remove('player-count-updated');
            }, 1000);
            
            console.log(`✅ Contador actualizado para ${modeId}: ${previousCount} → ${activePlayers}`);
        }
        
        // 🎯 GUARDAR ÚLTIMO VALOR PARA COMPARACIONES FUTURAS
        playerCountElement.dataset.lastCount = activePlayers.toString();
    }
    
    /**
     * 🎯 NUEVO: ACTUALIZAR ACTUALIZACIONES EN VIVO
     */
    updateLiveUpdates(update1, update2, update3) {
        if (!update1 || !update2 || !update3) return;
        
        const updates = [
            {
                icon: '🎯',
                text: 'Sistema de bingo sincronizado en tiempo real',
                color: '#4CAF50'
            },
            {
                icon: '⚡',
                text: this.getRapidModeStatus(),
                color: '#FF9800'
            },
            {
                icon: '👑',
                text: this.getVipModeStatus(),
                color: '#E91E63'
            }
        ];
        
        // Aplicar actualizaciones con animación
        [update1, update2, update3].forEach((element, index) => {
            if (element && updates[index]) {
                element.querySelector('.update-icon').textContent = updates[index].icon;
                element.querySelector('.update-text').textContent = updates[index].text;
                element.style.borderLeftColor = updates[index].color;
                
                // Añadir efecto de parpadeo
                element.style.animation = 'none';
                element.offsetHeight; // Trigger reflow
                element.style.animation = 'slideInRight 0.5s ease-out';
            }
        });
    }
    
    /**
     * 🎯 NUEVO: OBTENER ESTADO DEL MODO RÁPIDO
     */
    getRapidModeStatus() {
        const cycle = this.modeCycles['RAPID'];
        if (!cycle) return 'Modo Rápido: Sistema offline';
        
        if (cycle.isActive) {
            return 'Rápido: Partida en progreso - Espera 1 min';
        } else {
            return 'Rápido: Disponible para comprar cartones';
        }
    }
    
    /**
     * 🎯 NUEVO: OBTENER ESTADO DEL MODO VIP
     */
    getVipModeStatus() {
        const cycle = this.modeCycles['VIP'];
        if (!cycle) return 'VIP: Sistema offline';
        
        if (cycle.isActive) {
            return 'VIP: Partida en progreso - Espera 3 min';
        } else {
            return 'VIP: Disponible para comprar cartones';
        }
    }
    
    /**
     * 🎨 INTERFAZ CORRECTA DE COUNTDOWN
     * SOLUCIONA: Secciones "Próxima" que no muestran estados correctos
     */
    updateSingleModeCountdown(modeId, countdownInfo) {
        const countdownElement = document.getElementById(`countdown-${modeId}`);
        if (!countdownElement) {
            console.log(`⚠️ Elemento countdown-${modeId} no encontrado`);
            return false;
        }
        
        try {
            console.log(`🔍 Actualizando countdown para ${modeId}:`, countdownInfo);
            
            // 🎯 NUEVO: VERIFICACIÓN ROBUSTA ANTES DE PERMITIR COMPRAS
            const isRealPartidaActiva = this.isGlobalGameActive(modeId);
            console.log(`🔍 Verificación real de partida activa para ${modeId}:`, isRealPartidaActiva);
            
            // 🚨 Regla robusta: SOLO mostrar "PARTIDA EN CURSO" si el backend confirma playing
            const serverSaysPlaying = this.serverGameState?.modes?.[modeId]?.gameState === 'playing';
            if (serverSaysPlaying) {
                // 🎮 PARTIDA EN CURSO - MOSTRAR "PARTIDA EN CURSO"
                countdownElement.textContent = '🎮 PARTIDA EN CURSO';
                countdownElement.className = 'countdown active-game';
                countdownElement.setAttribute('data-status', 'active');
                
                // 🔒 BLOQUEAR COMPRAS INMEDIATAMENTE
                this.blockPurchasesForMode(modeId, 'Partida en curso');
                
                // 🎯 NUEVO: Limpiar números llamados si no hay partida activa real
                if (!serverSaysPlaying) {
                    this.clearCalledNumbersForMode(modeId);
                }
                
                console.log(`🎮 Countdown ${modeId}: PARTIDA EN CURSO - COMPRAS BLOQUEADAS`);
                
            } else {
                // ✅ PARTIDA TERMINADA - PERMITIR COMPRAS
                countdownElement.textContent = '✅ COMPRAR CARTONES';
                countdownElement.className = 'countdown next-game';
                countdownElement.setAttribute('data-status', 'waiting');
                
                // ✅ PERMITIR COMPRAS INMEDIATAMENTE
                this.allowPurchasesForMode(modeId);
                
                // 🎯 NUEVO: Limpiar números llamados del modo terminado
                this.clearCalledNumbersForMode(modeId);
                
                console.log(`✅ Countdown ${modeId}: COMPRAR CARTONES - COMPRAS PERMITIDAS`);
            }
            
            // 🎯 ACTUALIZAR PANEL INFORMATIVO EN VIVO
            this.updateLiveInfoPanel();
            
            // 🎯 ACTUALIZAR ESTADO DE BOTONES DE COMPRA
            this.updatePurchaseButtonsState();
            
            return true;
            
        } catch (error) {
            console.error(`❌ Error actualizando countdown ${modeId}:`, error);
            return false;
        }
    }
    
    /**
     * ✨ NUEVO: SINCRONIZACIÓN DE COUNTDOWNS CON SERVIDOR
     * SOLUCIONA: Falta de coordinación con backend
     */
    async syncCountdownsWithServer() {
        try {
            const serverData = await this.getGlobalStatsIntelligent();
                
            if (serverData) {
                // ACTUALIZAR ESTADO LOCAL CON DATOS DEL SERVIDOR
                this.updateLocalGameState(serverData);
                
                // SINCRONIZAR COUNTDOWNS
                this.updateAllModeCountdownsCoordinated();
                
                console.log('✅ Countdowns sincronizados con servidor');
            }
        } catch (error) {
            console.log('⚠️ No se pudo sincronizar countdowns con servidor');
        }
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
    /**
     * 🎯 CORREGIDO: Actualizar countdown desde el servidor usando el endpoint correcto
     */
    async updateCountdownFromServer() {
        try {
            // 🎯 CORREGIDO: Usar el endpoint correcto global-stats
            const response = await fetch('/api/bingo/global-stats');
            const data = await response.json();
            
            if (data.success && data.stats) {
                // 🎯 CORREGIDO: Adaptar la respuesta del nuevo endpoint
                const currentMode = this.getCurrentGameMode();
                const modeStats = data.stats[currentMode.id];
                
                if (modeStats) {
                // Sincronizar estado del juego
                    this.gameState = modeStats.isActive ? 'playing' : 'waiting';
                
                // Si el servidor está en 'waiting', calcular tiempo restante
                    if (!modeStats.isActive && modeStats.nextGameTime) {
                        const nextGameTime = new Date(modeStats.nextGameTime);
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
                    } else if (modeStats.isActive) {
                    // El juego está en curso, mostrar 0:00
                    this.updateCountdownDisplay(0, 0);
                }
                
                // Sincronizar números llamados
                    if (modeStats.calledNumbers && modeStats.calledNumbers.length > this.calledNumbers.size) {
                        this.calledNumbers = new Set(modeStats.calledNumbers);
                        this.lastNumberCalled = modeStats.lastNumberCalled;
                    this.renderCalledNumbers();
                    this.updateLastNumber();
                    this.renderCards();
                    }
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
     * 🆔 SISTEMA DE IDENTIFICACIÓN ÚNICA POR USUARIO REAL
     * SOLUCIONA EL PROBLEMA DE DUPLICACIÓN ENTRE NAVEGADORES
     */
    getOrCreateUserId() {
        // ✨ NUEVO: Prioridad 1 - Usuario autenticado con email único
        let userInfo = this.getUserInfo();
        
        if (userInfo && userInfo.email) {
            // 🎯 SOLUCIÓN: Usar email como identificador único global
            const realUserId = `user_${userInfo.email}`;
            
            // ✨ NUEVO: Sincronizar este ID en todos los navegadores del usuario
            this.syncUserIdAcrossBrowsers(realUserId, userInfo);
            
            console.log('🆔 ✅ Usando userId único por email:', realUserId);
            return realUserId;
        }
        
        // ✨ NUEVO: Prioridad 2 - Usuario autenticado con ID de base de datos
        if (userInfo && userInfo.id) {
            const realUserId = `user_db_${userInfo.id}`;
            
            // Sincronizar también este ID
            this.syncUserIdAcrossBrowsers(realUserId, userInfo);
            
            console.log('🆔 ✅ Usando userId único por ID de BD:', realUserId);
            return realUserId;
        }
        
        // ✨ NUEVO: Prioridad 3 - Usuario anónimo con ID persistente global
        // SOLUCIONA: Cada navegador creaba un ID diferente
        let anonymousUserId = localStorage.getItem('bingoroyal_global_anonymous_userId');
        
        if (!anonymousUserId) {
            // 🎯 SOLUCIÓN: Crear un ID anónimo que se pueda sincronizar
            anonymousUserId = this.createGlobalAnonymousUserId();
            localStorage.setItem('bingoroyal_global_anonymous_userId', anonymousUserId);
            console.log('🆔 ✅ Nuevo userId anónimo global creado:', anonymousUserId);
        } else {
            console.log('🆔 ✅ Usando userId anónimo global existente:', anonymousUserId);
        }
        
        return anonymousUserId;
    }
    
    /**
     * ✨ NUEVO: Crear ID anónimo que se pueda sincronizar entre navegadores
     */
    createGlobalAnonymousUserId() {
        // 🎯 SOLUCIÓN: Usar timestamp + fingerprint del navegador para crear ID único pero sincronizable
        const browserFingerprint = this.getBrowserFingerprint();
        const timestamp = Math.floor(Date.now() / (24 * 60 * 60 * 1000)); // Día actual
        
        // Crear ID que sea único por día y navegador, pero sincronizable
        const anonymousUserId = `anonymous_${timestamp}_${browserFingerprint}`;
        
        // Guardar en localStorage global para sincronización
        localStorage.setItem('bingoroyal_global_anonymous_userId', anonymousUserId);
        
        return anonymousUserId;
    }
    
    /**
     * ✨ NUEVO: Obtener fingerprint del navegador para identificación única
     */
    getBrowserFingerprint() {
        // 🎯 SOLUCIÓN: Crear un identificador único del navegador
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('BingoRoyal Browser Fingerprint', 2, 2);
        
        // Usar hash del canvas como fingerprint
        const fingerprint = this.hashCode(canvas.toDataURL());
        
        return fingerprint.toString(36).substr(0, 8);
    }
    
    /**
     * ✨ NUEVO: Función hash simple para el fingerprint
     */
    hashCode(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a entero de 32 bits
        }
        
        return Math.abs(hash);
    }
    
    /**
     * ✨ NUEVO: Sincronizar userId en todos los navegadores del usuario
     */
    syncUserIdAcrossBrowsers(userId, userInfo) {
        // 🎯 SOLUCIÓN: Usar localStorage para sincronización entre pestañas/navegadores
        
        // Guardar el userId real en localStorage global
        localStorage.setItem('bingoroyal_real_userId', userId);
        
        // Guardar información del usuario para sincronización
        localStorage.setItem('bingoroyal_user_sync', JSON.stringify({
            userId: userId,
            userInfo: userInfo,
            lastSync: Date.now(),
            browserId: this.getBrowserFingerprint()
        }));
        
        // ✨ NUEVO: Broadcast a otras pestañas del mismo dominio
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const channel = new BroadcastChannel('bingoroyal_user_sync');
                channel.postMessage({
                    type: 'USER_ID_SYNC',
                    userId: userId,
                    userInfo: userInfo,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.log('⚠️ BroadcastChannel no disponible, usando localStorage');
            }
        }
        
        console.log('🔄 ✅ userId sincronizado:', userId);
    }

    /**
     * Obtener información del usuario para verificar requisitos
     */
    getUserInfo() {
        let userInfo = null;
        
        console.log('🔍 getUserInfo() - Debugging...');
        
        // Verificar si hay sesión de usuario
        const sessionData = localStorage.getItem('bingoroyal_session');
        console.log('🔍 sessionData from localStorage:', sessionData);
        
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                console.log('🔍 session parsed:', session);
                userInfo = session.user;
                console.log('🔍 userInfo extracted:', userInfo);
            } catch (error) {
                console.log('⚠️ Error parseando sesión:', error);
            }
        }
        
        // Verificar si hay authManager disponible
        if (!userInfo && typeof authManager !== 'undefined' && authManager.isUserAuthenticated()) {
            userInfo = authManager.getCurrentUser();
            console.log('🔍 userInfo from authManager:', userInfo);
        }
        
        console.log('🔍 Final userInfo returned:', userInfo);
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
        console.log(`🔍 checkGameModeRequirements(${modeId}) - Debugging...`);
        console.log('🔍 modeId recibido:', modeId);
        console.log('🔍 typeof modeId:', typeof modeId);
        console.log('🔍 this.gameModes keys:', Object.keys(this.gameModes));
        console.log('🔍 this.gameModes completo:', this.gameModes);
        
        const mode = this.gameModes[modeId];
        console.log('🔍 mode encontrado:', mode);
        console.log('🔍 mode.isActive:', mode?.isActive);
        console.log('🔍 mode.id:', mode?.id);
        console.log('🔍 mode.name:', mode?.name);
        
        if (!mode) {
            console.log('❌ Modo no encontrado en gameModes');
            console.log('❌ modeId buscado:', modeId);
            console.log('❌ Claves disponibles:', Object.keys(this.gameModes));
            return { canPlay: false, reason: 'Modo de juego no encontrado' };
        }
        
        if (!mode.isActive) {
            console.log('❌ Modo encontrado pero isActive = false');
            return { canPlay: false, reason: 'Modo de juego no disponible' };
        }

        const userInfo = this.getUserInfo();
        console.log('🔍 userInfo obtained:', userInfo);
        
        const requirements = mode.requirements;
        console.log('🔍 requirements:', requirements);

        // Verificar nivel del usuario
        const userLevel = userInfo?.level || 0;
        if (userLevel < requirements.level) {
            return { 
                canPlay: false, 
                reason: `Nivel requerido: ${requirements.level}. Tu nivel: ${userLevel}` 
            };
        }

        // Verificar saldo
        console.log('🔍 Verificación de saldo:');
        console.log('🔍 this.userBalance:', this.userBalance);
        console.log('🔍 requirements.balance:', requirements.balance);
        console.log('🔍 Comparación:', this.userBalance < requirements.balance);
        
        if (this.userBalance < requirements.balance) {
            console.log('❌ Saldo insuficiente para el modo');
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
     * 🔒 Verificar si hay una partida global activa en un modo específico
     * ✨ NUEVO: Sistema mejorado de detección de partidas activas
     */
    /**
     * 🎯 VERIFICACIÓN ROBUSTA DE PARTIDAS ACTIVAS
     * SOLUCIONA: Detección inconsistente de partidas activas
     */
    isGlobalGameActive(modeId) {
        console.log(`🔍 Verificando estado de partida para modo: ${modeId}`);
        
        // 🚨 NUEVO: VERIFICACIÓN DE SEGURIDAD
        if (!this.modeCycles) {
            console.log('⚠️ modeCycles no inicializado en isGlobalGameActive, inicializando...');
            this.modeCycles = {};
        }
        
        // 🎯 VERIFICACIÓN MÚLTIPLE Y ROBUSTA
        const countdownStatusResult = this.getCountdownStatus(modeId);
        console.log(`🔍 getCountdownStatus(${modeId}) retorna:`, countdownStatusResult, 'tipo:', typeof countdownStatusResult);
        
        // 🚨 PRIORIDAD 1: Estado del servidor (más confiable)
        const serverState = this.serverGameState?.modes?.[modeId]?.gameState === 'playing';
        
        const indicators = {
            serverState: serverState, // 🚨 PRIORIDAD MÁXIMA
            modeCycles: this.modeCycles[modeId]?.isActive || false,
            gameState: this.gameState === 'playing' && this.currentGameMode === modeId,
            countdownStatus: countdownStatusResult
        };
        
        console.log(`🔍 Indicadores de partida activa para ${modeId}:`, indicators);
        console.log(`🔍 modeCycles[${modeId}]:`, this.modeCycles[modeId]);
        console.log(`🔍 this.gameState:`, this.gameState);
        console.log(`🔍 this.currentGameMode:`, this.currentGameMode);
        console.log(`🔍 countdownStatus detallado:`, this.getCountdownStatusDetailed(modeId));
        console.log(`🔍 serverGameState.modes[${modeId}]:`, this.serverGameState?.modes?.[modeId]);
        console.log(`🔍 serverGameState completo:`, this.serverGameState);
        console.log(`🔍 serverGameState.modes:`, this.serverGameState?.modes);
        console.log(`🔍 serverGameState.stats:`, this.serverGameState?.stats || 'undefined');
        console.log(`🔍 serverGameState.stats?.[${modeId}]:`, this.serverGameState?.stats?.[modeId] || 'undefined');
        
        // 🚨 REGLA ROBUSTA: Si el servidor dice "waiting", NO hay partida activa
        if (serverState === false) {
            console.log(`🔍 Servidor confirma NO hay partida activa para ${modeId}`);
            return false;
        }
        
        const isActive = Object.values(indicators).some(indicator => indicator === true);
        console.log(`🔍 Resultado final isGlobalGameActive(${modeId}):`, isActive);
        
        // 🎯 CORREGIDO: DETECTAR DESINCRONIZACIÓN Y CORREGIRLA (MÁS PRECISO)
        if (!isActive && this.hasServerActivity(modeId)) {
            console.log(`⚠️ DESINCRONIZACIÓN DETECTADA en ${modeId} - Corrigiendo...`);
            console.log(`🔍 Indicadores que indican NO activo:`, indicators);
            console.log(`🔍 Pero hasServerActivity retorna:`, this.hasServerActivity(modeId));
            this.forceStateSync(modeId);
            return true; // Bloquear compras hasta que se sincronice
        }
        
        // 🎯 NUEVO: DETECTAR DESINCRONIZACIÓN DEL DOM Y CORREGIRLA
        const countdownElement = document.getElementById(`countdown-${modeId}`);
        if (countdownElement) {
            const domStatus = countdownElement.getAttribute('data-status');
            const domText = countdownElement.textContent;
            const serverStatus = this.serverGameState?.modes?.[modeId]?.gameState;
            
            console.log(`🔍 Verificando desincronización del DOM para ${modeId}:`);
            console.log(`🔍   - DOM status: ${domStatus}`);
            console.log(`🔍   - DOM text: ${domText}`);
            console.log(`🔍   - Server status: ${serverStatus}`);
            
            // 🎯 CORREGIR: Si el DOM muestra "active" pero el servidor dice "waiting"
            if (domStatus === 'active' && serverStatus === 'waiting') {
                console.log(`⚠️ DESINCRONIZACIÓN DEL DOM DETECTADA en ${modeId} - Corrigiendo...`);
                this.correctCountdownDisplay(modeId);
                return false; // No hay partida activa real
            }
        }
        
        return isActive;
    }
    
    /**
     * 🎯 CORREGIDO: Verificar si hay actividad del servidor (MÁS PRECISO)
     * SOLUCIONA: Desincronización entre números llamados y estado del juego
     */
    hasServerActivity(modeId) {
        // 🎯 NUEVO: Verificar si hay partida activa confirmada en el servidor (MÁS CONFIABLE)
        if (this.serverGameState?.modes?.[modeId]?.gameState === 'playing') {
            console.log(`🔍 hasServerActivity(${modeId}): Partida activa confirmada en servidor`);
            return true;
        }
        
        // 🎯 NUEVO: Verificar si hay partida activa en stats
        if (this.serverGameState?.stats?.[modeId]?.isActive === true) {
            console.log(`🔍 hasServerActivity(${modeId}): Partida activa en stats`);
            return true;
        }
        
        // 🎯 NUEVO: Verificar si hay partida activa en stats directos (estructura real del servidor)
        if (this.serverGameState?.stats?.[modeId]?.gameState === 'playing') {
            console.log(`🔍 hasServerActivity(${modeId}): Partida activa en stats directos`);
            return true;
        }
        
        // 🎯 NUEVO: Verificar si hay partida activa en playersByMode (estructura real del servidor)
        if (this.serverGameState?.stats?.playersByMode?.[modeId]?.gameState === 'playing') {
            console.log(`🔍 hasServerActivity(${modeId}): Partida activa en playersByMode`);
            return true;
        }
        
        // 🎯 CORREGIDO: Verificar números llamados SOLO si son del modo específico
        if (this.calledNumbers && this.calledNumbers.size > 0) {
            // 🎯 NUEVO: Verificar si los números llamados son del modo actual
            const currentMode = this.getCurrentGameMode();
            if (currentMode && currentMode.id === modeId) {
                console.log(`🔍 hasServerActivity(${modeId}): Números llamados del modo actual detectados:`, this.calledNumbers.size);
                return true;
            } else {
                console.log(`🔍 hasServerActivity(${modeId}): Números llamados detectados pero NO del modo ${modeId}`);
                return false;
            }
        }
        
        console.log(`🔍 hasServerActivity(${modeId}): No hay actividad del servidor`);
        return false;
    }
    
    /**
     * 🎯 NUEVO: Forzar sincronización del estado
     */
    forceStateSync(modeId) {
        console.log(`🔄 Forzando sincronización del estado para ${modeId}...`);
        
        // Marcar como partida activa temporalmente
        if (!this.modeCycles[modeId]) {
            this.modeCycles[modeId] = {};
        }
        this.modeCycles[modeId].isActive = true;
        
        // Forzar sincronización con servidor
        // 🎯 CORREGIDO: NO sincronizar automáticamente al forzar estado
        // this.syncGameStateWithServer();
        
        // Programar verificación adicional
        setTimeout(() => {
            this.verifyAndCorrectState(modeId);
        }, 1000);
    }
    
    /**
     * 🎯 NUEVO: Sincronizar números llamados con el servidor
     * SOLUCIONA: Desincronización entre números llamados y estado del juego
     */
    async syncCalledNumbersWithServer() {
        try {
            console.log('🔄 Sincronizando números llamados con el servidor...');
            
            // Obtener estado del servidor
            const serverData = await this.getGlobalStatsIntelligent();
            
            if (serverData && serverData.stats) {
                let hasAnyActiveGame = false;
                
                // Verificar si hay partida activa en cualquier modo
                Object.keys(serverData.stats).forEach(modeId => {
                    const modeStats = serverData.stats[modeId];
                    // 🎯 CORREGIDO: Verificar tanto isActive como gameState
                    if (modeStats && (modeStats.isActive === true || modeStats.gameState === 'playing')) {
                        hasAnyActiveGame = true;
                        console.log(`🔍 Modo ${modeId} tiene partida activa en servidor:`, {
                            isActive: modeStats.isActive,
                            gameState: modeStats.gameState
                        });
                    }
                });
                
                // 🎯 CORREGIR: Si no hay partida activa en el servidor, limpiar números llamados
                if (!hasAnyActiveGame && this.calledNumbers && this.calledNumbers.size > 0) {
                    console.log('🔧 Sincronización: Limpiando números llamados (no hay partida activa en servidor)');
                    this.calledNumbers.clear();
                    this.lastNumberCalled = null;
                    
                    // Limpiar display
                    this.clearCalledNumbersDisplay();
                    
                    console.log('✅ Números llamados sincronizados con servidor');
                } else if (hasAnyActiveGame) {
                    console.log('🔧 Sincronización: Manteniendo números llamados (hay partida activa en servidor)');
                }
            }
        } catch (error) {
            console.error('❌ Error sincronizando números llamados:', error);
        }
    }
    
    /**
     * 🎯 NUEVO: Limpiar números llamados de un modo específico
     * SOLUCIONA: Desincronización entre modos de juego
     */
    clearCalledNumbersForMode(modeId) {
        console.log(`🔧 Limpiando números llamados para modo ${modeId}...`);
        
        // Verificar si hay partida activa en este modo específico
        const isModeActive = this.serverGameState?.modes?.[modeId]?.gameState === 'playing' ||
                            this.modeCycles[modeId]?.isActive;
        
        if (!isModeActive && this.calledNumbers && this.calledNumbers.size > 0) {
            console.log(`🔧 Limpiando números llamados del modo ${modeId} (no está activo)`);
            
            // Limpiar números llamados
            this.calledNumbers.clear();
            this.lastNumberCalled = null;
            
            // Limpiar display específico del modo
            const modeContainer = document.getElementById(`calledNumbers-${modeId}`);
            if (modeContainer) {
                modeContainer.innerHTML = '';
                console.log(`✅ Display del modo ${modeId} limpiado`);
            }
            
            // Limpiar display general
            this.clearCalledNumbersDisplay();
            
            console.log(`✅ Números llamados del modo ${modeId} limpiados`);
        } else {
            console.log(`🔧 NO limpiando números llamados del modo ${modeId} (está activo)`);
        }
    }
    
    /**
     * 🎯 NUEVO: Verificar y corregir estado
     */
    verifyAndCorrectState(modeId) {
        console.log(`🔍 Verificando y corrigiendo estado para ${modeId}...`);
        
        // Obtener estado real del servidor
        this.getGlobalStatsIntelligent().then(serverData => {
            if (serverData && serverData.stats && serverData.stats[modeId]) {
                const modeStats = serverData.stats[modeId];
                console.log(`📡 Estado real del servidor para ${modeId}:`, modeStats);
                
                // Corregir estado local
                if (modeStats.isActive) {
                    this.modeCycles[modeId].isActive = true;
                    console.log(`✅ Estado corregido: ${modeId} está activo`);
                } else {
                    this.modeCycles[modeId].isActive = false;
                    console.log(`✅ Estado corregido: ${modeId} está inactivo`);
                }
                
                // Actualizar display
                this.updateDisplay();
            }
        });
    }
    
    /**
     * 🎯 CORREGIDO: Obtener estado del countdown para un modo específico
     * 🎯 CORREGIDO: Priorizar datos del backend sobre el DOM
     */
    getCountdownStatus(modeId) {
        const countdownElement = document.getElementById(`countdown-${modeId}`);
        if (!countdownElement) return false;
        
        const status = countdownElement.getAttribute('data-status');
        const text = countdownElement.textContent;
        
        // 🎯 PRIORIDAD 1: Verificar datos del backend (más confiables)
        if (this.modeCycles[modeId] && this.modeCycles[modeId].isActive) {
            console.log(`🔍 getCountdownStatus(${modeId}): Backend confirma partida activa`);
            
            // 🎯 VERIFICACIÓN ADICIONAL: Verificar si realmente hay una partida activa
            const cycle = this.modeCycles[modeId];
            const now = Date.now();
            const gameStartTime = cycle.startTime;
            const gameDuration = cycle.duration || 60000; // Default 1 minuto
            const gameEndTime = gameStartTime + gameDuration;
            
            console.log(`🔍 getCountdownStatus(${modeId}): Verificación temporal:`);
            console.log(`🔍   - Ahora: ${now}`);
            console.log(`🔍   - Inicio partida: ${gameStartTime}`);
            console.log(`🔍   - Duración: ${gameDuration}`);
            console.log(`🔍   - Fin partida: ${gameEndTime}`);
            console.log(`🔍   - ¿Partida terminó? ${now > gameEndTime}`);
            
            // 🎯 CORREGIDO: Si la partida ya terminó, limpiar el estado
            if (now > gameEndTime) {
                console.log(`🔍 getCountdownStatus(${modeId}): Partida ya terminó, limpiando estado...`);
                this.modeCycles[modeId].isActive = false;
                this.modeCycles[modeId].gameState = 'waiting';
                console.log(`🔍 getCountdownStatus(${modeId}) RETORNANDO: false (partida terminada)`);
                return false;
            }
            
            console.log(`🔍 getCountdownStatus(${modeId}) RETORNANDO: true (backend válido)`);
            return true;
        }

        // 🎯 PRIORIDAD 2: Verificar estado del servidor (MÁS CONFIABLE)
        console.log(`🔍 getCountdownStatus(${modeId}): Verificando estado del servidor...`);
        console.log(`🔍   - this.serverGameState:`, this.serverGameState);
        console.log(`🔍   - this.serverGameState?.modes:`, this.serverGameState?.modes);
        console.log(`🔍   - this.serverGameState?.modes?.[${modeId}]:`, this.serverGameState?.modes?.[modeId]);
        console.log(`🔍   - this.serverGameState?.modes?.[${modeId}]?.gameState:`, this.serverGameState?.modes?.[modeId]?.gameState);
        
        // 🚨 REGLA ROBUSTA: Si el servidor dice "waiting", NO hay partida activa
        if (this.serverGameState?.modes?.[modeId]?.gameState === 'waiting') {
            console.log(`🔍 getCountdownStatus(${modeId}): Servidor confirma NO hay partida activa`);
            return false;
        }
        
        if (this.serverGameState?.modes?.[modeId]?.gameState === 'playing') {
            console.log(`🔍 getCountdownStatus(${modeId}): Servidor confirma partida activa`);
            return true;
        }
        
        // 🎯 PRIORIDAD 3: Verificar números llamados (indicador de partida activa)
        if (this.calledNumbers && this.calledNumbers.size > 0) {
            console.log(`🔍 getCountdownStatus(${modeId}): Números llamados detectados:`, this.calledNumbers.size);
            console.log(`🔍 getCountdownStatus(${modeId}): Números llamados:`, Array.from(this.calledNumbers));
            console.log(`🔍 getCountdownStatus(${modeId}): ¿Hay partida activa real?`, this.modeCycles[modeId]?.isActive);
            
            // 🎯 CORREGIDO: Solo considerar números llamados si hay partida activa REAL
            if (this.modeCycles[modeId]?.isActive) {
                console.log(`🔍 getCountdownStatus(${modeId}): Números llamados + partida activa = VERDADERO`);
                return true;
            } else {
                console.log(`🔍 getCountdownStatus(${modeId}): Números llamados pero NO hay partida activa = FALSO`);
                // 🎯 LIMPIAR NÚMEROS LLAMADOS ANTIGUOS
                this.calledNumbers.clear();
                return false;
            }
        }
        
        // 🎯 PRIORIDAD 4: Solo si no hay datos del backend, confiar en el DOM
        const domIndicatesActive = 
            status === 'active' || 
            text.includes('PARTIDA EN CURSO') || 
            text.includes('En curso') ||
            text.includes('🎮 PARTIDA EN CURSO') ||
            (text.includes('⏰') && !text.includes('Esperando'));
        
        if (domIndicatesActive) {
            console.log(`🔍 getCountdownStatus(${modeId}): DOM indica partida activa, pero verificando...`);
            // 🎯 CORREGIR EL DOM SI ESTÁ DESINCRONIZADO
            this.correctCountdownDisplay(modeId);
            return false; // No confiar en DOM desactualizado
        }
        
        console.log(`🔍 getCountdownStatus(${modeId}): No hay partida activa confirmada`);
        console.log(`🔍 getCountdownStatus(${modeId}) RETORNANDO: false`);
        return false;
    }
    
    /**
     * 🎯 CORREGIDO: Limpiar números llamados si no hay partida activa
     */
    clearCalledNumbersIfNoActiveGame() {
        console.log('🔧 Verificando si hay números llamados sin partida activa REAL...');
        
        // 🎯 NUEVO: Verificar estado REAL del servidor, no solo local
        let hasActiveGameInServer = false;
        
        // 1. Verificar si hay partida activa en el servidor
        if (this.serverGameState && this.serverGameState.modes) {
            Object.keys(this.serverGameState.modes).forEach(modeId => {
                const modeState = this.serverGameState.modes[modeId];
                if (modeState && modeState.gameState === 'playing') {
                    hasActiveGameInServer = true;
                    console.log(`🔍 Modo ${modeId} tiene partida activa en el servidor`);
                }
            });
        }
        
        // 2. Verificar si hay partida activa local (como respaldo)
        let hasActiveGameLocal = false;
        Object.keys(this.modeCycles).forEach(modeId => {
            if (this.modeCycles[modeId]?.isActive) {
                hasActiveGameLocal = true;
                console.log(`🔍 Modo ${modeId} tiene partida activa local`);
            }
        });
        
        // 3. 🎯 DECISIÓN INTELIGENTE: Solo limpiar si NO hay partida activa en NINGÚN lado
        const hasAnyActiveGame = hasActiveGameInServer || hasActiveGameLocal;
        
        if (!hasAnyActiveGame && this.calledNumbers && this.calledNumbers.size > 0) {
            console.log('🔧 Limpiando números llamados antiguos (no hay partida activa en servidor ni local)');
            this.calledNumbers.clear();
            this.lastNumberCalled = null;
            
            // Limpiar display de números llamados
            const calledNumbersContainer = document.getElementById('calledNumbers');
            if (calledNumbersContainer) {
                calledNumbersContainer.innerHTML = '';
            }
            
            // Limpiar último número llamado
            const lastNumberElement = document.getElementById('lastNumberCalled');
            if (lastNumberElement) {
                lastNumberElement.textContent = '';
            }
            
            console.log('✅ Números llamados limpiados correctamente');
        } else if (hasAnyActiveGame) {
            console.log('🔧 NO limpiando números llamados - hay partida activa en:', {
                server: hasActiveGameInServer,
                local: hasActiveGameLocal
            });
        }
    }
    
    /**
     * 🎯 NUEVO: Limpiar estados de partidas terminadas automáticamente
     */
    cleanupExpiredGames() {
        console.log('🔧 Limpiando partidas expiradas...');
        
        Object.keys(this.modeCycles).forEach(modeId => {
            const cycle = this.modeCycles[modeId];
            if (cycle && cycle.isActive) {
                const now = Date.now();
                const gameStartTime = cycle.startTime;
                const gameDuration = cycle.duration || 60000;
                const gameEndTime = gameStartTime + gameDuration;
                
                if (now > gameEndTime) {
                    console.log(`🔧 Limpiando partida expirada en ${modeId}:`);
                    console.log(`🔧   - Inicio: ${new Date(gameStartTime).toLocaleTimeString()}`);
                    console.log(`🔧   - Duración: ${gameDuration}ms`);
                    console.log(`🔧   - Fin: ${new Date(gameEndTime).toLocaleTimeString()}`);
                    console.log(`🔧   - Ahora: ${new Date(now).toLocaleTimeString()}`);
                    
                    // Limpiar estado
                    cycle.isActive = false;
                    cycle.gameState = 'waiting';
                    cycle.players = [];
                    cycle.calledNumbers = [];
                    
                    console.log(`🔧 Estado limpiado para ${modeId}`);
                }
            }
        });
    }
    
    /**
     * 🎯 CORREGIDO: Corregir display del countdown si está desincronizado (MÁS AGRESIVO)
     */
    correctCountdownDisplay(modeId) {
        console.log(`🔧 Corrigiendo display del countdown para ${modeId}...`);
        
        const countdownElement = document.getElementById(`countdown-${modeId}`);
        if (!countdownElement) return;
        
        // 🎯 NUEVO: Obtener estado real del servidor (más confiable que modeCycles)
        const serverModeState = this.serverGameState?.modes?.[modeId];
        const isActuallyActive = serverModeState?.gameState === 'playing';
        
        console.log(`🔧 Estado real del servidor para ${modeId}:`, serverModeState);
        console.log(`🔧 ¿Hay partida activa según servidor? ${isActuallyActive}`);
        
        if (!isActuallyActive) {
            // 🎯 CORREGIR: Si no hay partida activa, mostrar tiempo restante
            console.log(`🔧 Corrigiendo ${modeId}: No hay partida activa, mostrando tiempo restante`);
            
            // 🎯 NUEVO: Usar datos del servidor para calcular tiempo restante
            if (serverModeState && serverModeState.nextGameTime) {
                const nextGameTime = new Date(serverModeState.nextGameTime);
                const now = new Date();
                const timeLeft = nextGameTime.getTime() - now.getTime();
                
                if (timeLeft > 0) {
                    const minutes = Math.floor(timeLeft / 60000);
                    const seconds = Math.floor((timeLeft % 60000) / 1000);
                    countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    console.log(`🔧 ${modeId} corregido: ${minutes}:${seconds} restantes`);
                } else {
                    countdownElement.textContent = '✅ COMPRAR CARTONES';
                    console.log(`🔧 ${modeId} corregido: COMPRAR CARTONES`);
                }
            } else {
                countdownElement.textContent = '✅ COMPRAR CARTONES';
                console.log(`🔧 ${modeId} corregido: COMPRAR CARTONES (sin tiempo)`);
            }
            
            // 🎯 CORREGIR: Actualizar atributos y clases
            countdownElement.setAttribute('data-status', 'waiting');
            countdownElement.classList.remove('active-game');
            countdownElement.classList.add('waiting-game');
            
            console.log(`🔧 ${modeId} corregido completamente`);
        } else {
            console.log(`🔧 ${modeId} ya está correcto (partida activa)`);
        }
    }
    
    /**
     * 🎯 CORREGIDO: Verificar partida activa por datos del servidor
     */
    isPartidaActivaByServerData(modeId) {
        // Verificar si hay números llamados en el servidor
        if (this.serverGameState?.modes?.[modeId]) {
            const modeState = this.serverGameState.modes[modeId];
            return modeState.gameState === 'playing' || modeState.isActive;
        }
        
        // Verificar si hay números llamados globalmente
        if (this.calledNumbers && this.calledNumbers.length > 0) {
            return true;
        }
        
        // Verificar si hay partida activa en el modo actual
        if (this.currentGameMode === modeId && this.gameState === 'playing') {
            return true;
        }

        return false;
    }
    
    /**
     * 🎯 NUEVO: Obtener estado detallado del countdown para diagnóstico
     */
    getCountdownStatusDetailed(modeId) {
        const countdownElement = document.getElementById(`countdown-${modeId}`);
        if (!countdownElement) {
            return { 
                elementFound: false, 
                status: null, 
                text: null, 
                className: null 
            };
        }
        
        return {
            elementFound: true,
            status: countdownElement.getAttribute('data-status'),
            text: countdownElement.textContent,
            className: countdownElement.className,
            isActive: countdownElement.getAttribute('data-status') === 'active',
            containsPartidaEnCurso: countdownElement.textContent.includes('PARTIDA EN CURSO'),
            containsEnCurso: countdownElement.textContent.includes('En curso')
        };
    }

    /**
     * 🔒 Verificar si se puede comprar cartones en este momento
     */
    canPurchaseCards(modeId = null) {
        console.log(`🔍 canPurchaseCards(${modeId}) - Debugging...`);
        console.log('🔍 modeId recibido:', modeId);
        console.log('🔍 this.currentGameMode:', this.currentGameMode);
        
        // 🎯 CORREGIDO: Manejar tanto objetos como strings para modeId
        let targetMode;
        if (modeId) {
            // Si modeId es un string, obtener el objeto del modo
            if (typeof modeId === 'string') {
                targetMode = this.gameModes[modeId];
                console.log('🔍 modeId es string, obteniendo objeto del modo:', modeId);
            } else {
                targetMode = modeId;
                console.log('🔍 modeId es objeto, usando directamente');
            }
        } else {
            targetMode = this.currentGameMode;
            console.log('🔍 Usando this.currentGameMode como targetMode');
        }
        
        console.log('🔍 targetMode final:', targetMode);
        console.log('🔍 targetMode.id:', targetMode?.id);
        console.log('🔍 targetMode.name:', targetMode?.name);
        console.log('🔍 targetMode tipo:', typeof targetMode);
        console.log('🔍 targetMode es null:', targetMode === null);
        console.log('🔍 targetMode es undefined:', targetMode === undefined);
        console.log('🔍 this.currentGameMode:', this.currentGameMode);
        console.log('🔍 this.currentGameMode tipo:', typeof this.currentGameMode);
        console.log('🔍 this.currentGameMode es null:', this.currentGameMode === null);
        console.log('🔍 this.currentGameMode es undefined:', this.currentGameMode === undefined);
        
        // 🔒 BLOQUEO 1: No permitir compra durante partidas activas
        console.log('🔍 this.gameState:', this.gameState);
        if (this.gameState === 'playing') {
            console.log('❌ BLOQUEO 1: Partida local activa');
            return { 
                canPurchase: false, 
                reason: 'No puedes comprar cartones durante una partida activa',
                code: 'GAME_IN_PROGRESS'
            };
        }

        // 🔒 BLOQUEO 2: Verificar partida global activa
        console.log('🔍 🔒 BLOQUEO 2 - DIAGNÓSTICO COMPLETO:');
        console.log('🔍 targetMode.id:', targetMode?.id);
        console.log('🔍 targetMode.name:', targetMode?.name);
        console.log('🔍 targetMode completo:', targetMode);
        console.log('🔍 this.gameModes:', this.gameModes);
        console.log('🔍 this.gameModes[targetMode.id]:', this.gameModes?.[targetMode?.id]);
        
        const isGlobalActive = this.isGlobalGameActive(targetMode.id);
        console.log('🔍 isGlobalGameActive result:', isGlobalActive);
        if (isGlobalActive) {
            console.log('❌ BLOQUEO 2: Partida global activa');
            
            // 🎯 CORREGIDO: Obtener nombre del modo desde gameModes si targetMode.name es undefined
            let modeName = targetMode?.name;
            if (!modeName && targetMode?.id && this.gameModes?.[targetMode.id]) {
                modeName = this.gameModes[targetMode.id].name;
                console.log('🔍 Nombre del modo corregido desde gameModes:', modeName);
            }
            
            return { 
                canPurchase: false, 
                reason: `Hay una partida global activa en ${modeName || targetMode?.id || 'modo desconocido'}`,
                code: 'GLOBAL_GAME_ACTIVE'
            };
        }
        
        // 🔒 BLOQUEO 3: Verificar estado del ciclo del modo
        const cycle = this.modeCycles[targetMode.id];
        console.log('🔍 cycle:', cycle);
        if (cycle && cycle.isActive) {
            console.log('❌ BLOQUEO 3: Ciclo del modo activo');
            return { 
                canPurchase: false, 
                reason: `${targetMode.name} está en curso`,
                code: 'MODE_ACTIVE'
            };
        }

        // Verificar requisitos del modo
        console.log('🔍 Verificando requisitos del modo:', targetMode?.id);
        console.log('🔍 targetMode completo para verificación:', targetMode);
        
        if (!targetMode || !targetMode.id) {
            console.log('❌ targetMode no válido para verificación de requisitos');
            console.log('🔍 targetMode recibido:', targetMode);
            console.log('🔍 targetMode.id:', targetMode?.id);
            console.log('🔍 this.currentGameMode:', this.currentGameMode);
            console.log('🔍 this.gameModes disponibles:', Object.keys(this.gameModes || {}));
            
            // 🎯 CORREGIDO: Intentar obtener un modo válido como fallback
            if (this.currentGameMode && this.currentGameMode.id) {
                console.log('🔍 Usando this.currentGameMode como fallback');
                const fallbackMode = this.currentGameMode;
                console.log('🔍 fallbackMode:', fallbackMode);
                
                if (fallbackMode.id) {
                    console.log('🔍 Fallback exitoso, continuando con:', fallbackMode.id);
                    // Continuar con el fallback
                } else {
                    return { 
                        canPurchase: false, 
                        reason: 'Modo de juego no válido (fallback falló)',
                        code: 'INVALID_MODE'
                    };
                }
            } else {
                return { 
                    canPurchase: false, 
                    reason: 'Modo de juego no válido',
                    code: 'INVALID_MODE'
                };
            }
        }
        
        const requirements = this.checkGameModeRequirements(targetMode.id);
        console.log('🔍 Resultado de checkGameModeRequirements:', requirements);
        
        if (!requirements.canPlay) {
            console.log('❌ Requisitos no cumplidos:', requirements.reason);
            return { 
                canPurchase: false, 
                reason: requirements.reason,
                code: 'REQUIREMENTS_NOT_MET'
            };
        }

        // Verificar límite de cartones
        const currentCardsInMode = this.userCards.filter(card => card.gameMode === targetMode.id).length;
        if (currentCardsInMode >= targetMode.maxCards) {
            return { 
                canPurchase: false, 
                reason: `Ya tienes el máximo de cartones permitidos para ${targetMode.name}`,
                code: 'MAX_CARDS_REACHED'
            };
        }

        return { 
            canPurchase: true, 
            reason: 'Puedes comprar cartones',
            code: 'CAN_PURCHASE'
        };
    }
    
    /**
     * 🎯 NUEVO: Forzar sincronización del estado del juego
     */
    forceGameStateSync() {
        console.log('🔄 Forzando sincronización del estado del juego...');
        
        // Resetear estado local
        this.gameState = 'waiting';
        this.modeCycles = {};
        
        // Limpiar estado del servidor
        this.serverGameState = {};
        
        // Forzar actualización de countdowns
        this.updateAllModeCountdownsCoordinated();
        
        console.log('✅ Estado del juego reseteado y sincronizado');
    }
    
    /**
     * 🎯 NUEVO: Forzar sincronización completa del sistema
     * SOLUCIONA: Desincronización entre todos los componentes
     */
    async forceFullSynchronization() {
        console.log('🔄 Forzando sincronización COMPLETA del sistema...');
        
        try {
            // 1. Sincronizar con servidor
            await this.syncGameStateWithServer();
            
            // 2. Sincronizar números llamados
            await this.syncCalledNumbersWithServer();
            
            // 3. Limpiar números llamados obsoletos
            this.clearCalledNumbersIfNoActiveGame();
            
            // 4. Actualizar countdowns
            this.updateAllModeCountdownsCoordinated();
            
            // 5. Actualizar estado de botones
            this.updatePurchaseButtonsState();
            
            // 6. Actualizar mensaje de estado
            this.updateGameStatusMessage();
            
            console.log('✅ Sincronización completa realizada');
            
            // Mostrar notificación al usuario
            this.showNotification('🔄 Sistema sincronizado correctamente', 'success');
            
        } catch (error) {
            console.error('❌ Error en sincronización completa:', error);
            this.showNotification('❌ Error en sincronización', 'error');
        }
    }
    
    /**
     * 🧪 FUNCIÓN DE PRUEBA: Verificar layout de todos los modos
     */
    testAllModesLayout() {
        console.log('🧪 Probando layout de todos los modos...');
        
        const modes = ['CLASSIC', 'RAPID', 'VIP', 'NIGHT'];
        
        modes.forEach(modeId => {
            console.log(`\n🔍 Probando modo: ${modeId}`);
            
            // Verificar contenedor de números llamados
            const numbersContainer = document.getElementById(`calledNumbers-${modeId}`);
            if (numbersContainer) {
                console.log(`✅ Contenedor ${modeId} encontrado:`, {
                    display: numbersContainer.style.display,
                    className: numbersContainer.className,
                    children: numbersContainer.children.length,
                    innerHTML: numbersContainer.innerHTML.substring(0, 100) + '...'
                });
            } else {
                console.log(`❌ Contenedor ${modeId} NO encontrado`);
            }
            
            // Verificar contenedor de cartones
            const cardsContainer = document.getElementById('cards-container');
            if (cardsContainer) {
                console.log(`✅ Contenedor de cartones encontrado:`, {
                    className: cardsContainer.className,
                    children: cardsContainer.children.length,
                    expanded: cardsContainer.classList.contains('expanded')
                });
            } else {
                console.log(`❌ Contenedor de cartones NO encontrado`);
            }
        });
        
        // Verificar estilos CSS aplicados
        const testContainer = document.getElementById('calledNumbers-CLASSIC');
        if (testContainer) {
            const computedStyle = window.getComputedStyle(testContainer);
            console.log('\n🎨 Estilos CSS del contenedor CLASSIC:', {
                background: computedStyle.background,
                borderRadius: computedStyle.borderRadius,
                padding: computedStyle.padding,
                margin: computedStyle.margin,
                minHeight: computedStyle.minHeight,
                width: computedStyle.width
            });
        }
        
        console.log('🧪 Prueba de layout completada');
    }

    /**
     * 🎯 NUEVO: Configurar comandos de debug en la consola
     */
    setupDebugCommands() {
        // Agregar comandos de debug a window para acceso desde consola
        window.bingoDebug = {
            forceSync: () => this.forceGameStateSync(),
            forceFullSync: () => this.forceFullSynchronization(), // 🎯 NUEVO: Sincronización completa
            checkState: (modeId) => {
                console.log('🔍 Estado del juego para modo:', modeId);
                console.log('🔍 this.gameState:', this.gameState);
                console.log('🔍 this.modeCycles:', this.modeCycles);
                console.log('🔍 this.serverGameState:', this.serverGameState);
                console.log('🔍 isGlobalGameActive result:', this.isGlobalGameActive(modeId));
                console.log('🔍 canPurchaseCards result:', this.canPurchaseCards(modeId));
            },
            checkPurchaseLogic: (modeId) => {
                console.log('🔍 DIAGNÓSTICO COMPLETO DE LÓGICA DE COMPRA para modo:', modeId);
                console.log('🔍 1. Estado del juego:', this.gameState);
                console.log('🔍 2. Modo actual:', this.currentGameMode);
                console.log('🔍 3. ModeCycles:', this.modeCycles[modeId]);
                console.log('🔍 4. Countdown status:', this.getCountdownStatus(modeId));
                console.log('🔍 5. Server state:', this.serverGameState?.modes?.[modeId]);
                console.log('🔍 6. Called numbers:', this.calledNumbers);
                console.log('🔍 7. hasServerActivity result:', this.hasServerActivity(modeId));
                console.log('🔍 8. isGlobalGameActive result:', this.isGlobalGameActive(modeId));
                console.log('🔍 9. canPurchaseCards result:', this.canPurchaseCards(modeId));
            },
            resetGame: () => {
                this.gameState = 'waiting';
                this.modeCycles = {};
                this.serverGameState = {};
                console.log('✅ Estado del juego reseteado');
            },
            testLayout: () => this.testAllModesLayout()
        };
        
        console.log('🎯 Comandos de debug disponibles:');
        console.log('🎯 bingoDebug.forceSync() - Forzar sincronización');
        console.log('🎯 bingoDebug.checkState("RAPID") - Verificar estado del modo');
        console.log('🎯 bingoDebug.resetGame() - Resetear estado del juego');
        console.log('🎯 bingoDebug.testLayout() - Probar layout de todos los modos');
    }

    /**
     * 📦 Comprar paquete de cartones (método para botones de paquete)
     */
    buyPackage(packageType) {
        console.log(`📦 Comprando paquete: ${packageType}`);
        
        // 🔒 Verificar si se puede comprar
        const currentMode = this.getCurrentGameMode();
        const canPurchase = this.canPurchaseCards(currentMode.id);
        
        if (!canPurchase.canPurchase) {
            this.showNotification(`❌ ${canPurchase.reason}`, 'error');
            return false;
        }
        
        // Mapear tipos de paquete a cantidades
        const packageQuantities = {
            'starter': 1,
            'basic': 3,
            'premium': 5,
            'vip': 10,
            'ultimate': 25
        };
        
        const quantity = packageQuantities[packageType];
        if (!quantity) {
            this.showNotification('❌ Tipo de paquete no válido', 'error');
            return false;
        }
        
        // Usar el método de compra existente
        return this.buyCards(quantity);
    }

    /**
     * 🔒 Actualizar estado visual de botones de compra
     */
    updatePurchaseButtonsState() {
        const buyButtons = document.querySelectorAll('.btn-buy, .btn-buy-cards, .btn-buy-card');
        const currentMode = this.getCurrentGameMode();
        
        buyButtons.forEach(button => {
            const canPurchase = this.canPurchaseCards(currentMode.id);
            
            if (!canPurchase.canPurchase) {
                button.disabled = true;
                button.title = canPurchase.reason;
                button.classList.add('disabled', 'game-blocked');
                
                // Agregar indicador visual del bloqueo
                if (!button.querySelector('.blocked-indicator')) {
                    const indicator = document.createElement('span');
                    indicator.className = 'blocked-indicator';
                    indicator.innerHTML = '🔒';
                    indicator.title = canPurchase.reason;
                    button.appendChild(indicator);
                }
            } else {
                button.disabled = false;
                button.title = 'Comprar cartones';
                button.classList.remove('disabled', 'game-blocked');
                
                // Remover indicador de bloqueo
                const indicator = button.querySelector('.blocked-indicator');
                if (indicator) {
                    indicator.remove();
                }
            }
        });
        
        // Actualizar mensaje de estado del juego
        this.updateGameStatusMessage();
    }

    /**
     * 📢 Actualizar mensaje de estado del juego
     * 🎯 CORREGIDO: Mostrar estado real del servidor, no solo local
     */
    updateGameStatusMessage() {
        const currentMode = this.getCurrentGameMode();
        const statusElement = document.getElementById('gameStatusMessage');
        
        if (!statusElement) return;
        
        // 🎯 NUEVO: Verificar estado REAL del servidor primero
        const isServerActive = this.serverGameState?.modes?.[currentMode.id]?.gameState === 'playing' || 
                              this.serverGameState?.stats?.[currentMode.id]?.isActive === true;
        const isLocalActive = this.gameState === 'playing';
        const isGlobalActive = this.isGlobalGameActive(currentMode.id);
        
        console.log(`🔍 updateGameStatusMessage para ${currentMode.id}:`, {
            serverActive: isServerActive,
            localActive: isLocalActive,
            globalActive: isGlobalActive
        });
        
        if (isServerActive || isLocalActive || isGlobalActive) {
            // 🎮 PARTIDA ACTIVA - Mostrar mensaje correcto
            if (isServerActive) {
                statusElement.innerHTML = `🎮 <strong>Partida en curso en ${currentMode.name}</strong> - No se pueden comprar cartones hasta que termine`;
                statusElement.className = 'game-status playing';
            } else if (isGlobalActive) {
                statusElement.innerHTML = `🌐 <strong>Partida global activa en ${currentMode.name}</strong> - Espera a que termine para comprar cartones`;
                statusElement.className = 'game-status global-active';
            } else {
                statusElement.innerHTML = `🎮 <strong>Partida activa en ${currentMode.name}</strong> - No se pueden comprar cartones hasta que termine`;
                statusElement.className = 'game-status playing';
            }
        } else {
            // ✅ PARTIDA DISPONIBLE - Permitir compras
            statusElement.innerHTML = `✅ <strong>${currentMode.name} disponible</strong> - Puedes comprar cartones y unirte a la próxima partida`;
            statusElement.className = 'game-status available';
        }
    }

    /**
     * 🌐 Sincronizar estado del juego con el servidor (CORREGIDO)
     */
    async syncGameStateWithServer() {
        try {
            console.log('🔄 Sincronizando estado del juego con el servidor...');
            
            // 🎯 NUEVO: Usar el método inteligente de global-stats en lugar de game/state
            const serverData = await this.getGlobalStatsIntelligent();
            
            if (serverData) {
                // 🎯 NUEVO: Formatear datos para compatibilidad
                const formattedState = this.formatServerDataForCompatibility(serverData);
                console.log('🔍 Estado formateado:', formattedState);
                
                // 🎯 NUEVO: LOGS DETALLADOS DE SINCRONIZACIÓN
                console.log('🔍 ANTES de asignar serverGameState:');
                console.log('🔍   - this.serverGameState:', this.serverGameState);
                console.log('🔍   - this.serverGameState?.modes:', this.serverGameState?.modes);
                
                this.serverGameState = formattedState;
                
                console.log('🔍 DESPUÉS de asignar serverGameState:');
                console.log('🔍   - this.serverGameState:', this.serverGameState);
                console.log('🔍   - this.serverGameState?.modes:', this.serverGameState?.modes);
                console.log('🔍   - this.serverGameState?.modes?.RAPID:', this.serverGameState?.modes?.RAPID);
                console.log('🔍   - this.serverGameState?.modes?.CLASSIC:', this.serverGameState?.modes?.CLASSIC);
                console.log('🔍   - this.serverGameState?.modes?.VIP:', this.serverGameState?.modes?.VIP);
                console.log('🔍   - this.serverGameState?.modes?.NIGHT:', this.serverGameState?.modes?.NIGHT);
                
                // Actualizar estado local basado en el servidor
                this.updateLocalGameState(formattedState);
                
                // 🚀 NUEVO: SINCRONIZAR NÚMEROS LLAMADOS CON EL BACKEND
                await this.syncCalledNumbersWithBackend();
                
                console.log('✅ Estado sincronizado con el servidor (formato corregido)');
                return true;
            } else {
                console.warn('⚠️ No se pudo sincronizar con el servidor');
                return false;
            }
        } catch (error) {
            console.error('❌ Error sincronizando con el servidor:', error);
            return false;
        }
    }

    /**
     * 🎯 CORREGIDO: Formatear datos del servidor para compatibilidad (ESTRUCTURA REAL)
     */
    formatServerDataForCompatibility(serverData) {
        console.log('🔍 formatServerDataForCompatibility - Datos de entrada:', serverData);
        console.log('🔍 formatServerDataForCompatibility - Claves disponibles:', Object.keys(serverData || {}));
        console.log('🔍 formatServerDataForCompatibility - Estructura completa:', {
            hasStats: !!serverData?.stats,
            hasGlobalStats: !!serverData?.globalStats,
            hasModes: !!serverData?.modes,
            statsKeys: serverData?.stats ? Object.keys(serverData.stats) : 'NO STATS',
            globalStatsKeys: serverData?.globalStats ? Object.keys(serverData.globalStats) : 'NO GLOBALSTATS'
        });
        
        // 🎯 CORREGIDO: Manejar la estructura real del servidor
        if (!serverData) {
            console.log('⚠️ formatServerDataForCompatibility: No hay datos del servidor');
            return { modes: {} };
        }
        
        // 🎯 CORREGIDO: Verificar si tenemos stats o modes directamente
        let gameModesData = null;
        
        console.log('🔍 formatServerDataForCompatibility - Verificando estructura del servidor:');
        console.log('🔍   - serverData.stats existe:', !!serverData.stats);
        console.log('🔍   - serverData.modes existe:', !!serverData.modes);
        console.log('🔍   - serverData.stats tipo:', typeof serverData.stats);
        console.log('🔍   - serverData.modes tipo:', typeof serverData.modes);
        console.log('🔍   - serverData.stats.playersByMode existe:', !!(serverData.stats && serverData.stats.playersByMode));
        
        // 🎯 CORREGIDO: Priorizar playersByMode que es donde están los modos de juego
        if (serverData.stats && serverData.stats.playersByMode) {
            console.log('🔍 formatServerDataForCompatibility - Usando serverData.stats.playersByMode');
            console.log('🔍   - serverData.stats.playersByMode contenido:', serverData.stats.playersByMode);
            gameModesData = serverData.stats.playersByMode;
        } else if (serverData.stats) {
            console.log('🔍 formatServerDataForCompatibility - Usando serverData.stats (fallback)');
            console.log('🔍   - serverData.stats contenido:', serverData.stats);
            gameModesData = serverData.stats;
        } else if (serverData.modes) {
            console.log('🔍 formatServerDataForCompatibility - Usando serverData.modes');
            console.log('🔍   - serverData.modes contenido:', serverData.modes);
            gameModesData = serverData.modes;
        } else {
            console.log('⚠️ formatServerDataForCompatibility: No hay stats ni modes, creando estructura vacía');
            console.log('🔍   - serverData completo para análisis:', serverData);
            return { modes: {} };
        }
        
        // 🎯 NUEVO: Crear estructura compatible con globalStats
        const formattedState = { 
            modes: {},
            stats: serverData.stats || {} // 🎯 CORREGIDO: Usar stats directamente
        };
        
        // 🎯 NUEVO: Crear estructura de modes compatible
        if (serverData.stats && serverData.stats.playersByMode) {
            formattedState.modes = serverData.stats.playersByMode;
            console.log('🔍 formatServerDataForCompatibility - modes creados desde playersByMode:', Object.keys(formattedState.modes));
        }
        
        console.log('🔍 formatServerDataForCompatibility - globalStats creado:', formattedState.globalStats);
        console.log('🔍 formatServerDataForCompatibility - modes creados:', Object.keys(formattedState.modes));
        
        console.log('🔍 formatServerDataForCompatibility - Datos de modos disponibles:', Object.keys(gameModesData));
        
        // 🎯 CORREGIDO: Usar la estructura ya creada arriba
        console.log('🔍 formatServerDataForCompatibility - globalStats creado:', formattedState.globalStats);
        
        // 🎯 CORREGIDO: Formatear datos de cada modo con verificación de estructura
        Object.keys(gameModesData).forEach(modeId => {
            const modeStats = gameModesData[modeId];
            console.log(`🔍 formatServerDataForCompatibility - Procesando modo ${modeId}:`, modeStats);
            
            // 🎯 NUEVO: Verificar si es un modo de juego válido (no estadísticas generales)
            if (modeId === 'totalOnlinePlayers' || modeId === 'totalPlayersWithCards' || modeId === 'playersByMode') {
                console.log(`🔍 formatServerDataForCompatibility - Saltando estadística general: ${modeId}`);
                return; // Saltar estadísticas generales
            }
            
            // 🎯 CORREGIDO: Verificar si el modo tiene la estructura esperada
            if (modeStats && typeof modeStats === 'object') {
                formattedState.modes[modeId] = {
                    gameState: modeStats.isActive ? 'playing' : 'waiting',
                    gameId: modeStats.gameId || null,
                    startTime: modeStats.startTime || null,
                    nextGameTime: modeStats.nextGameTime || null,
                    totalPlayers: modeStats.totalPlayers || 0,
                    totalCards: modeStats.totalCards || 0
                };
                
                console.log(`🔍 formatServerDataForCompatibility - Modo ${modeId} formateado:`, formattedState.modes[modeId]);
            } else {
                console.log(`⚠️ formatServerDataForCompatibility - Modo ${modeId} no tiene estructura válida:`, modeStats);
            }
        });
        
        console.log('🔄 Datos del servidor formateados para compatibilidad:', formattedState);
        return formattedState;
    }

    /**
     * 🔄 Actualizar estado local basado en el servidor
     */
    updateLocalGameState(serverState) {
        console.log('🔍 updateLocalGameState - Estado del servidor recibido:', serverState);
        
        if (!serverState || !serverState.modes) {
            console.log('⚠️ updateLocalGameState: No hay serverState o modes');
            return;
        }

        console.log('🔍 updateLocalGameState - Modos disponibles en servidor:', Object.keys(serverState.modes));
        console.log('🔍 updateLocalGameState - Modo actual:', this.currentGameMode);

        // Actualizar estado por modo de juego
        Object.keys(serverState.modes).forEach(modeId => {
            const modeState = serverState.modes[modeId];
            console.log(`🔍 updateLocalGameState - Procesando modo ${modeId}:`, modeState);
            
                    // Si hay una partida activa en el servidor, actualizar estado local
        if (modeState.gameState === 'playing') {
            console.log(`🔍 updateLocalGameState - Modo ${modeId} está jugando`);
            
            // Si el modo actual está jugando, actualizar estado local
            if (this.currentGameMode && this.currentGameMode.id === modeId) {
                console.log(`🔍 updateLocalGameState - Actualizando estado local para modo actual ${modeId}`);
                this.gameState = 'playing';
                this.globalGameState.isActive = true;
                this.globalGameState.gameId = modeState.gameId;
                this.globalGameState.startTime = new Date(modeState.startTime);
                
                // Mostrar notificación de partida activa
                this.showNotification(`🎮 Partida activa en ${this.gameModes[modeId].name}`, 'info');
            } else {
                console.log(`🔍 updateLocalGameState - Modo ${modeId} está jugando pero no es el modo actual`);
            }
        } else {
            console.log(`🔍 updateLocalGameState - Modo ${modeId} NO está jugando (${modeState.gameState})`);
        }
        });

        // Actualizar contadores y próximas partidas
        this.updateNextGameCountdowns(serverState);
    }

    /**
     * ⏰ Actualizar contadores de próximas partidas
     */
    updateNextGameCountdowns(serverState) {
        if (!serverState || !serverState.modes) return;

        Object.keys(serverState.modes).forEach(modeId => {
            const modeState = serverState.modes[modeId];
            const countdownElement = document.getElementById(`countdown-${modeId}`);
            
            if (countdownElement && modeState.nextGameTime) {
                const nextGameTime = new Date(modeState.nextGameTime);
                const now = new Date();
                const timeUntilNext = nextGameTime - now;
                
                if (timeUntilNext > 0) {
                    // Actualizar contador
                    this.updateCountdownDisplay(modeId, timeUntilNext);
                } else {
                    // La próxima partida debería estar empezando
                    countdownElement.textContent = '¡YA!';
                }
            }
        });
    }

    /**
     * 🚀 SINCRONIZAR NÚMEROS LLAMADOS CON EL BACKEND
     */
    async syncCalledNumbersWithBackend() {
        try {
            const currentMode = this.getCurrentGameMode();
            if (!currentMode) {
                console.log('⚠️ No hay modo válido para sincronizar números');
                return;
            }

            const modeId = currentMode.id;
            console.log(`🔍 Sincronizando números llamados para modo: ${modeId}`);

            // Obtener estado actual del juego desde el backend
            const response = await fetch(`/api/bingo/state?mode=${modeId}`);
            if (!response.ok) {
                console.log(`⚠️ Error obteniendo estado del backend para ${modeId}`);
                return;
            }

            const data = await response.json();
            if (!data.success || !data.gameState) {
                console.log(`⚠️ Respuesta inválida del backend para ${modeId}`);
                return;
            }

            const backendState = data.gameState;
            console.log(`🔍 Estado del backend para ${modeId}:`, backendState);

            // Verificar si hay partida activa en el backend
            if (backendState.gameState === 'playing') {
                console.log(`🎮 Partida activa detectada en backend para ${modeId}`);
                
                // Sincronizar números llamados
                if (backendState.calledNumbers && Array.isArray(backendState.calledNumbers)) {
                    const newNumbers = backendState.calledNumbers.filter(num => 
                        !this.calledNumbers.has(num)
                    );
                    
                    if (newNumbers.length > 0) {
                        console.log(`🆕 Nuevos números detectados del backend:`, newNumbers);
                        
                        // Agregar nuevos números al estado local
                        newNumbers.forEach(num => {
                            this.calledNumbers.add(num);
                            this.markNumberOnSelectedCards(num);
                        });
                        
                        // Actualizar UI (solo una vez después de procesar todos los números)
                        // 🚀 NUEVO: Usar debounce para evitar renderizados múltiples
                        this.debouncedRenderUI();
                        this.saveUserCards();
                        
                        console.log(`✅ Números sincronizados con backend. Total local: ${this.calledNumbers.size}`);
                    }
                }
                
                // Sincronizar último número llamado
                if (backendState.lastNumberCalled && 
                    backendState.lastNumberCalled !== this.lastNumberCalled) {
                    this.lastNumberCalled = backendState.lastNumberCalled;
                    console.log(`🆕 Último número actualizado desde backend: ${this.lastNumberCalled}`);
                }
                
                // Verificar condiciones de victoria
                this.checkWin();
                
            } else {
                console.log(`⏸️ No hay partida activa en backend para ${modeId}`);
                
                // Si el backend dice que no hay partida activa, limpiar números
                if (this.calledNumbers.size > 0) {
                    console.log(`🧹 Limpiando números llamados (backend dice no hay partida)`);
                    this.calledNumbers.clear();
                    this.lastNumberCalled = null;
                    // 🚀 NUEVO: Usar debounce para evitar renderizados múltiples
                    this.debouncedRenderUI();
                    this.saveUserCards();
                }
            }
            
        } catch (error) {
            console.error('❌ Error sincronizando con backend:', error);
        }
    }

    /**
     * 🚀 DEBOUNCE PARA RENDERIZADO DE UI (EVITA RENDERIZADOS MÚLTIPLES)
     */
    debouncedRenderUI() {
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }
        
        this.renderTimeout = setTimeout(() => {
            console.log('🚀 Ejecutando renderizado de UI (debounced)');
            this.renderCalledNumbers();
            this.renderCards();
            this.renderTimeout = null;
        }, 100); // 100ms de debounce
    }

    /**
     * ⏰ Actualizar display del contador para un modo específico
     * 🎯 CORREGIDO: Verificar estado real antes de permitir compras
     */
    updateCountdownDisplay(modeId, timeRemaining) {
        const countdownElement = document.getElementById(`countdown-${modeId}`);
        if (!countdownElement) return;

        const minutes = Math.floor(timeRemaining / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        
        countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 🎯 NUEVO: VERIFICAR ESTADO REAL ANTES DE PERMITIR COMPRAS
        if (timeRemaining > 0) {
            // ⏰ TIEMPO RESTANTE - VERIFICAR SI REALMENTE SE PUEDE COMPRAR
            const canActuallyPurchase = this.canPurchaseCards(modeId);
            console.log(`🔍 updateCountdownDisplay(${modeId}) - Verificación real:`, canActuallyPurchase);
            
            if (canActuallyPurchase.canPurchase) {
                this.allowPurchasesForMode(modeId);
                console.log(`✅ Compras realmente permitidas para ${modeId} (tiempo restante: ${timeRemaining}ms)`);
            } else {
                this.blockPurchasesForMode(modeId, canActuallyPurchase.reason);
                console.log(`🔒 Compras bloqueadas para ${modeId}: ${canActuallyPurchase.reason}`);
            }
        } else {
            // ⏰ TIEMPO AGOTADO - BLOQUEAR COMPRAS
            this.blockPurchasesForMode(modeId, 'Tiempo agotado');
            console.log(`🔒 Compras bloqueadas para ${modeId}: Tiempo agotado`);
        }
    }

    /**
     * Cambiar modo de juego
     */
    /**
     * ⚡ CAMBIO DE MODO DE JUEGO PROFESIONAL
     * SOLUCIONA: Reset automático de cartones y limpieza de números llamados
     */
    async changeGameMode(modeId) {
        console.log(`⚡ Cambiando modo de juego a: ${modeId} (PROFESIONAL)`);
        
        const check = this.checkGameModeRequirements(modeId);
        
        if (!check.canPlay) {
            this.showGameModeError(check.reason);
            return false;
        }

        const mode = this.gameModes[modeId];
        const previousMode = this.currentGameMode;
        this.currentGameMode = mode; // 🎯 CORREGIDO: Asignar el objeto completo, no solo el ID
        
        // 1. 🎯 CORREGIDO: NO RESETEAR ESTADO AL CAMBIAR DE MODO (PRESERVAR ESTADO)
        // this.resetGameStateForModeChange(previousMode);
        
        // 2. 🎯 CORREGIDO: NO LIMPIAR CARTONES AL CAMBIAR DE MODO (PRESERVAR ESTADO)
        // this.clearAllPreviousModeCards(previousMode);
        
        // 3. 🎯 CORREGIDO: NO LIMPIAR NÚMEROS LLAMADOS AL CAMBIAR DE MODO (PRESERVAR ESTADO)
        // this.clearAllCalledNumbers();
        
        // 4. 🎯 CORREGIDO: NO RESETEAR ESTADO DEL JUGADOR AL CAMBIAR DE MODO (PRESERVAR ESTADO)
        // this.resetPlayerStateForModeChange();
        
        // 5. Actualizar configuración del juego
        this.cardPrice = mode.cardPrice;
        this.winConditions = {
            LINE: { name: 'línea', required: 5, prize: mode.prizes.line, probability: 0.15 },
            BINGO: { name: 'bingo', required: 15, prize: mode.prizes.bingo, probability: 0.02 }
        };

        // 6. Guardar el nuevo modo en localStorage
        requestIdleCallback(() => {
            this.saveGameMode(modeId);
        });
        
        // 7. 🎯 CORREGIDO: NO RESETEAR CARTONES AL CAMBIAR DE MODO (PRESERVAR ESTADO)
        // if (previousMode) {
        //     await this.forceResetCardsForMode(previousMode.id || previousMode);
        // }
        
        // 8. 🎯 CORREGIDO: NO CARGAR CARTONES VACÍOS AL CAMBIAR DE MODO (PRESERVAR ESTADO)
        // this.loadUserCardsForNewMode(modeId);
        
        // 9. 🎯 CORREGIDO: NO LIMPIAR INTERFAZ AL CAMBIAR DE MODO (PRESERVAR ESTADO)
        // this.clearInterfaceForNewMode();
        
        // 10. 🎯 CORREGIDO: NO VERIFICAR CARTONES AL CAMBIAR DE MODO (PRESERVAR ESTADO)
        // this.verifyAndCorrectCards();
        
        // 11. Actualizar UI del nuevo modo
        this.updateGameModeDisplay();
        this.updateCardPriceDisplay();
        this.updateCardInfo();
        this.renderCards();
        
        // 10. 🎯 CORREGIDO: NO CAMBIAR CONTENEDORES AL CAMBIAR DE MODO (PRESERVAR ESTADO)
        // this.switchCalledNumbersContainerProfessional(modeId);
        
        // 11. 🎯 CORREGIDO: NO INICIALIZAR MODO DESDE CERO AL CAMBIAR (PRESERVAR ESTADO)
        // this.initializeNewModeFromScratch(modeId);
        
        // 12. Reconectar al bingo global del nuevo modo
        // 🎯 CORREGIDO: NO reconectar automáticamente al cambiar modo
        // requestIdleCallback(() => {
        //     this.connectToGlobalBingo();
        // });
        
        // 13. Actualizar countdown para el nuevo modo
        this.updateCountdownFromServer();
        
        // 14. 🎯 NUEVO: Cambiar contenedor de números llamados al nuevo modo
        this.switchCalledNumbersContainer(modeId);
        
        // 15. Mostrar confirmación
        requestIdleCallback(() => {
            this.showGameModeChanged(mode);
        });
        
        console.log(`✅ Modo de juego cambiado PROFESIONALMENTE a: ${mode.name}`);
        return true;
    }
    
    /**
     * ✨ NUEVO: Resetear estado del juego para cambio de modo
     */
    resetGameStateForModeChange(previousMode) {
        console.log(`🔄 Reseteando estado del juego para cambio de modo: ${previousMode} → ${this.currentGameMode}`);
        
        // Resetear estado del juego
        this.gameState = 'waiting';
        this.isPlayerJoined = false;
        
        // Limpiar números llamados
        this.calledNumbers.clear();
        this.callHistory = [];
        
        // Resetear último número
        this.lastNumberCalled = null;
        this.lastCallTime = null;
        
        // Resetear estadísticas
        this.gameStartTime = null;
        this.currentGameId = null;
        
        // Limpiar estado de victoria
        this.hasWon = false;
        this.winType = null;
        
        console.log(`✅ Estado del juego reseteado para nuevo modo`);
    }
    
    /**
     * ✨ NUEVO: Limpiar completamente cartones del modo anterior
     */
    clearAllPreviousModeCards(previousMode) {
        if (!previousMode) return;
        
        console.log(`🗑️ Limpiando cartones del modo anterior: ${previousMode}`);
        
        // Limpiar cartones seleccionados
        this.selectedCards = [];
        
        // Resetear estado de todos los cartones del modo anterior
        this.userCards.forEach(card => {
            if (card.gameMode === previousMode) {
                card.linesCompleted = 0;
                card.markedNumbers.clear();
                card.isSelected = false;
                card.gameId = null;
                card.lastModified = new Date();
            }
        });
        
        // Filtrar solo cartones del nuevo modo
        this.userCards = this.userCards.filter(card => card.gameMode === this.currentGameMode);
        
        console.log(`✅ Cartones del modo anterior limpiados. Cartones restantes: ${this.userCards.length}`);
    }
    
    /**
     * ✨ NUEVO: Limpiar completamente todos los números llamados
     */
    clearAllCalledNumbers() {
        console.log(`🗑️ Limpiando completamente todos los números llamados`);
        
        // Limpiar Set de números llamados
        this.calledNumbers.clear();
        
        // Limpiar historial de llamadas
        this.callHistory = [];
        
        // Resetear último número
        this.lastNumberCalled = null;
        this.lastCallTime = null;
        
        console.log(`✅ Todos los números llamados limpiados`);
    }
    
    /**
     * ✨ NUEVO: Resetear estado del jugador para cambio de modo
     */
    resetPlayerStateForModeChange() {
        console.log(`🔄 Reseteando estado del jugador para cambio de modo`);
        
        // Resetear participación
        this.isPlayerJoined = false;
        
        // Resetear cartones seleccionados
        this.selectedCards = [];
        
        // Resetear estado de victoria
        this.hasWon = false;
        this.winType = null;
        
        // Parar autoplay si está activo
        this.stopAutoPlay();
        
        console.log(`✅ Estado del jugador reseteado para nuevo modo`);
    }
    
    /**
     * ✨ NUEVO: Cargar cartones del nuevo modo (si existen)
     */
    loadUserCardsForNewMode(modeId) {
        console.log(`🗑️ RESETEANDO cartones para nuevo modo: ${modeId}`);
        
        try {
            // 1. 🗑️ RESETEAR CARTONES ANTES DE CARGAR
            this.userCards = [];
            this.selectedCards = [];
            
            // 2. LIMPIAR LOCALSTORAGE DEL MODO
            const storageKey = `bingoroyal_user_cards_${modeId}`;
            localStorage.removeItem(storageKey);
            
            // 3. ✅ INICIALIZAR ARRAY VACÍO (SIN CARTONES)
            this.userCards = [];
            
            console.log(`✅ Cartones reseteados a 0 para modo: ${modeId}`);
            
        } catch (error) {
            console.error(`❌ Error reseteando cartones para modo ${modeId}:`, error);
            // 4. EN CASO DE ERROR - INICIALIZAR ARRAY VACÍO
            this.userCards = [];
        }
    }
    
    /**
     * ✨ NUEVO: Limpiar completamente la interfaz para nuevo modo
     */
    clearInterfaceForNewMode() {
        console.log(`🎨 Limpiando completamente la interfaz para nuevo modo`);
        
        // Limpiar display de números llamados
        this.clearCalledNumbersDisplay();
        
        // Limpiar último número llamado
        this.updateLastNumber();
        
        // Limpiar estadísticas
        this.updateStats();
        
        console.log(`✅ Interfaz limpiada para nuevo modo`);
    }
    
    /**
     * ✨ NUEVO: Cambiar contenedores de números llamados (LIMPIEZA COMPLETA)
     */
    switchCalledNumbersContainerProfessional(modeId) {
        console.log(`🔄 Cambiando contenedores de números llamados PROFESIONALMENTE para: ${modeId}`);
        
        try {
            // 1. LIMPIAR COMPLETAMENTE TODOS LOS CONTENEDORES
            const allContainers = document.querySelectorAll('.mode-numbers');
            allContainers.forEach(container => {
                // Ocultar contenedor
                container.style.display = 'none';
                
                // Limpiar contenido HTML
                const numbersGrid = container.querySelector('.numbers-grid');
                if (numbersGrid) {
                    numbersGrid.innerHTML = '';
                }
                
                // Limpiar último número
                const lastNumber = container.querySelector('.last-number');
                if (lastNumber) {
                    lastNumber.textContent = '-';
                }
                
                console.log(`🗑️ Contenedor ${container.id} limpiado completamente`);
            });
            
            // 2. MOSTRAR SOLO EL CONTENEDOR DEL NUEVO MODO
            const targetContainer = document.getElementById(`calledNumbers-${modeId}`);
            if (targetContainer) {
                targetContainer.style.display = 'block';
                console.log(`✅ Contenedor de números llamados activado para modo: ${modeId}`);
            } else {
                console.log(`⚠️ Contenedor para modo ${modeId} no encontrado`);
                // Fallback: mostrar CLASSIC
                const fallbackContainer = document.getElementById('calledNumbers-CLASSIC');
                if (fallbackContainer) {
                    fallbackContainer.style.display = 'block';
                    console.log('✅ Usando contenedor CLASSIC como fallback');
                }
            }
            
            // 3. INICIALIZAR CONTENEDOR DESDE CERO
            this.initializeCalledNumbersContainer(modeId);
            
        } catch (error) {
            console.error('❌ Error cambiando contenedor de números llamados:', error);
        }
    }
    
    /**
     * ✨ NUEVO: Inicializar contenedor de números llamados desde cero
     */
    initializeCalledNumbersContainer(modeId) {
        console.log(`🎯 Inicializando contenedor de números llamados para modo: ${modeId}`);
        
        const container = document.getElementById(`calledNumbers-${modeId}`);
        if (!container) return;
        
        // Limpiar completamente el contenedor
        container.innerHTML = '';
        
        // Crear estructura básica
        const numbersGrid = document.createElement('div');
        numbersGrid.className = 'numbers-grid';
        numbersGrid.id = `numbers-grid-${modeId}`;
        
        // Crear grid de números del 1 al 90
        for (let i = 1; i <= 90; i++) {
            const numberCell = document.createElement('div');
            numberCell.className = 'number-cell';
            numberCell.id = `number-${i}-${modeId}`;
            numberCell.textContent = i;
            numbersGrid.appendChild(numberCell);
        }
        
        container.appendChild(numbersGrid);
        
        console.log(`✅ Contenedor de números llamados inicializado para modo: ${modeId}`);
    }
    
    /**
     * ✨ NUEVO: Inicializar nuevo modo desde cero
     */
    initializeNewModeFromScratch(modeId) {
        console.log(`🎯 Inicializando nuevo modo desde cero: ${modeId}`);
        
        // Renderizar números llamados del nuevo modo
        this.renderCalledNumbers();
        
        // Actualizar último número
        this.updateLastNumber();
        
        // Actualizar estadísticas
        this.updateStats();
        
        // Actualizar estado de botones de compra
        this.updatePurchaseButtonsStateFromCountdowns();
        
        console.log(`✅ Nuevo modo inicializado desde cero: ${modeId}`);
    }
    
    /**
     * ✨ NUEVO: Limpiar completamente cartones de un modo específico
     * SOLUCIONA: Eliminación completa de cartones de partidas anteriores
     */
    clearModeCardsCompletely(modeId) {
        console.log(`🗑️ Limpiando COMPLETAMENTE cartones del modo: ${modeId}`);
        
        try {
            // 1. Limpiar del localStorage
            const storageKey = `bingoroyal_user_cards_${modeId}`;
            localStorage.removeItem(storageKey);
            
            // 2. Limpiar del array en memoria
            this.userCards = this.userCards.filter(card => card.gameMode !== modeId);
            
            // 3. Limpiar cartones seleccionados
            this.selectedCards = this.selectedCards.filter(card => card.gameMode !== modeId);
            
            // 4. Limpiar interfaz
            this.renderCards();
            this.updateCardInfo();
            
            console.log(`✅ Cartones del modo ${modeId} eliminados COMPLETAMENTE`);
            
            // 5. Notificar al usuario
            this.showNotification(`🗑️ Cartones de ${this.gameModes[modeId]?.name || modeId} eliminados`, 'info');
            
        } catch (error) {
            console.error('❌ Error limpiando cartones del modo:', error);
        }
    }
    
    /**
     * 🎯 CORREGIDO: Forzar reset completo de todos los modos (SOLO MANUAL)
     * SOLUCIONA: Interferencias con sincronización automática
     */
    forceCompleteReset() {
        console.log('🚨 FORZANDO RESET COMPLETO DE TODOS LOS MODOS...');
        
        try {
            // 1. Limpiar cartones de todos los modos
            Object.keys(this.gameModes).forEach(modeId => {
                this.clearModeCardsCompletely(modeId);
            });
            
            // 2. Limpiar estado del juego
            this.gameState = 'waiting';
            this.isPlayerJoined = false;
            this.selectedCards = [];
            
            // 3. Limpiar números llamados
            this.calledNumbers.clear();
            this.callHistory = [];
            this.lastNumberCalled = null;
            this.lastCallTime = null;
            
            // 4. Limpiar interfaz
            this.clearCalledNumbersDisplay();
            this.renderCards();
            this.updateCardInfo();
            this.updateStats();
            
                    // 5. 🎯 NUEVO: SINCRONIZAR CON SERVIDOR DESPUÉS DEL RESET
        setTimeout(() => {
            this.syncGameStateWithServer();
        }, 500); // Esperar 500ms para que el reset se complete
            
            // 6. Notificar al usuario
            this.showNotification('🚨 Reset completo realizado - Todos los modos limpiados', 'warning');
            
            console.log('✅ RESET COMPLETO FORZADO - Todos los modos limpiados');
            
        } catch (error) {
            console.error('❌ Error en reset completo forzado:', error);
        }
    }

    /**
     * Obtener modo de juego actual
     */
    getCurrentGameMode() {
        // 🎯 CORREGIDO: this.currentGameMode ya es un objeto, no un string
        if (this.currentGameMode && this.currentGameMode.id) {
            return this.currentGameMode;
        }
        
        // 🎯 FALLBACK: Si no hay modo válido, usar CLASSIC
        console.log('⚠️ getCurrentGameMode: No hay modo válido, usando CLASSIC como fallback');
        return this.gameModes['CLASSIC'] || this.gameModes[Object.keys(this.gameModes)[0]];
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
        const cardsContainer = document.getElementById('cards-container');
        if (!cardsContainer) {
            console.log('❌ Contenedor de cartones no encontrado: cards-container');
            return;
        }
        
        console.log(`🎯 Renderizando ${this.userCards.length} cartones...`);
        cardsContainer.innerHTML = '';

        this.userCards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'bingo-card';
            cardElement.innerHTML = this.renderCardGrid(card);
            cardsContainer.appendChild(cardElement);
        });
        
        // Si el modal está abierto, ajustar altura después de renderizar
        if (document.getElementById('bingoCardsModal')?.style.display === 'flex') {
            setTimeout(() => this.adjustModalHeight(), 100);
        }
    }

    renderCardGrid(card) {
        let html = '';
        const logos = ['⭐', '🍀', '💎', '🎪', '🎰', '🏆', '🎨', '🌟', '✨', '💫'];
        let logoIndex = 0;
        
        console.log(`Renderizando cartón ${card.id}:`, card.numbers);
        console.log('Números llamados:', Array.from(this.calledNumbers));
        
        // 🎨 NUEVO: Header del cartón con información
        html += `
            <div class="bingo-card-header">
                <div class="card-id">Cartón #${card.id}</div>
                <div class="card-mode">${this.getCurrentGameMode()?.name || 'Bingo'}</div>
            </div>
        `;
        
        // 🎨 NUEVO: Contenedor principal del grid con mejor estructura
        html += '<div class="bingo-grid-container">';
        
        for (let row = 0; row < 3; row++) {
            html += '<div class="bingo-row">';
            for (let col = 0; col < 9; col++) {
                const number = card.numbers[col][row];
                const isMarked = number && this.calledNumbers.has(number);
                const isEmpty = !number;
                
                // 🎨 NUEVO: Mejor asignación de logotipos y estilos
                let logoClass = '';
                let displayContent = '';
                let cellClass = 'bingo-cell';
                
                if (isEmpty) {
                    const randomLogo = logos[Math.floor(Math.random() * logos.length)];
                    logoClass = `logo-${logoIndex % logos.length}`;
                    displayContent = `<span class="cell-logo">${randomLogo}</span>`;
                    cellClass += ' empty';
                    logoIndex++;
                } else {
                    displayContent = `<span class="cell-number">${number}</span>`;
                    if (isMarked) {
                        cellClass += ' marked';
                    }
                }
                
                // 🎨 NUEVO: Agregar clases adicionales para mejor styling
                if (isMarked) {
                    cellClass += ' marked';
                }
                
                // Debug: mostrar si el número está marcado
                if (number && isMarked) {
                    console.log(`Número ${number} marcado en cartón ${card.id}`);
                }
                
                html += `
                    <div class="${cellClass} ${logoClass}" 
                         data-card-id="${card.id}" 
                         data-row="${row}" 
                         data-col="${col}" 
                         data-number="${number || ''}"
                         title="${number ? `Número ${number}` : 'Celda vacía'}">
                        ${displayContent}
                        ${isMarked ? '<div class="mark-indicator">✓</div>' : ''}
                    </div>
                `;
            }
            html += '</div>';
        }
        
        html += '</div>'; // Cerrar bingo-grid-container
        
        // 🎨 NUEVO: Footer del cartón con estadísticas
        const markedCount = Array.from(this.calledNumbers).filter(num => 
            card.numbers.flat().includes(num)).length;
        html += `
            <div class="bingo-card-footer">
                <div class="card-stats">
                    <span class="stat-item">
                        <i class="fas fa-check-circle"></i>
                        ${markedCount} marcados
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-square"></i>
                        ${card.numbers.flat().filter(num => num).length} números
                    </span>
                </div>
            </div>
        `;
        
        console.log(`Cartón ${card.id} renderizado con ${markedCount} números marcados`);
        return html;
    }

    renderCalledNumbers() {
        console.log(`🎯 Renderizando números llamados para TODOS los modos (SOLUCIÓN OPCIÓN A)`);
        
        // 🎯 SOLUCIÓN: Renderizar en TODOS los contenedores, no solo en el activo
        const allModes = ['CLASSIC', 'RAPID', 'VIP', 'NIGHT'];
        
        allModes.forEach(modeId => {
            const container = document.getElementById(`calledNumbers-${modeId}`);
            if (container) {
                console.log(`✅ Renderizando números llamados para modo: ${modeId}`);
                
                // 🎨 Estructura HTML moderna con header y grid (IDÉNTICA para todos los modos)
                container.innerHTML = `
                    <div class="numbers-header">
                        <div class="numbers-title">
                            <i class="fas fa-bullhorn"></i>
                            NÚMEROS LLAMADOS
                        </div>
                        <div class="numbers-count">
                            ${this.calledNumbers.size}/90
                        </div>
                    </div>
                    <div class="numbers-grid">
                        ${this.generateNumbersGrid()}
                    </div>
                `;
                
                // Asegurar que el contenedor tenga las clases correctas
                container.className = 'numbers-container mode-numbers';
                container.setAttribute('data-mode', modeId);
                
                console.log(`✅ Panel de números llamados actualizado para modo ${modeId}`);
            } else {
                console.warn(`⚠️ Contenedor para modo ${modeId} no encontrado`);
            }
        });
        
        console.log(`✅ TODOS los modos tienen ahora el mismo grid de números llamados`);
    }
    
    // 🎯 NUEVO: Función para renderizar números llamados para un modo específico
    renderCalledNumbersForMode(modeId) {
        const container = document.getElementById(`calledNumbers-${modeId}`);
        if (!container) {
            console.warn(`⚠️ Contenedor para modo ${modeId} no encontrado`);
            return;
        }
        
        console.log(`🔧 Renderizando números llamados para modo específico: ${modeId}`);
        
        // 🎨 Estructura HTML IDÉNTICA para todos los modos
        container.innerHTML = `
            <div class="numbers-header">
                <div class="numbers-title">
                    <i class="fas fa-bullhorn"></i>
                    NÚMEROS LLAMADOS
                </div>
                <div class="numbers-count">
                    ${this.calledNumbers.size}/90
                </div>
            </div>
            <div class="numbers-grid">
                ${this.generateNumbersGrid()}
            </div>
        `;
        
        // Asegurar que el contenedor tenga las clases correctas
        container.className = 'numbers-container mode-numbers';
        container.setAttribute('data-mode', modeId);
        
        console.log(`✅ Modo ${modeId} renderizado con éxito`);
    }
    
    // 🎨 NUEVO: Función para generar el grid de números
    generateNumbersGrid() {
        let html = '';
        
        // Crear grid de 9x10 para los números del 1-90
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 10; col++) {
                const number = row * 10 + col + 1;
                if (number <= 90) {
                    const isCalled = this.calledNumbers.has(number);
                    const numberClass = `called-number ${isCalled ? 'called' : ''}`;
                    
                    html += `
                        <div class="${numberClass}" data-number="${number}">
                            ${number}
                        </div>
                    `;
                }
            }
        }
        
        return html;
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
        
        // 🎯 NUEVO: ACTUALIZAR NÚMEROS LLAMADOS EN TODOS LOS MODOS
        this.renderCalledNumbers();
        
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
        
        // ✨ NUEVO: Agregar experiencia por victoria
        switch (winType) {
            case 'line':
                this.addUserExperience('winLine');
                break;
            case 'twoLines':
                this.addUserExperience('winTwoLines');
                break;
            case 'bingo':
                this.addUserExperience('winBingo');
                // Verificar si es bote progresivo
                if (this.calledNumbers.size <= 36) { // Bingo temprano = jackpot
                    this.addUserExperience('winJackpot');
                }
                break;
        }
        
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

    /**
     * 🎯 FIN DE PARTIDA PROFESIONAL - LÓGICA DE BINGO ONLINE
     * SOLUCIONA: Reset de cartones y cronómetro para próxima partida
     */
    endGame() {
        console.log('🎯 Terminando partida con lógica profesional de bingo online...');
        
        // 1. 🎮 Cambiar estado del juego
        this.gameState = 'waiting';
        this.stopAutoPlay();
        
        // 2. 📊 Actualizar analytics
        this.updateAnalytics('game_end', {
            gameId: this.currentGameId,
            duration: this.gameStartTime ? Date.now() - this.gameStartTime.getTime() : 0,
            numbersCalled: this.calledNumbers.size,
            finalBalance: this.userBalance,
            cardsPlayed: this.userCards.length
        });
        
        // 3. ✨ NUEVO: RESETEAR COMPLETAMENTE LOS CARTONES DEL USUARIO
        this.resetUserCardsForNextGame();
        
        // 4. ✨ NUEVO: INICIAR CRONÓMETRO PARA PRÓXIMA PARTIDA
        this.startNextGameCountdown();
        
        // 5. ✨ NUEVO: RESETEAR ESTADO DEL JUGADOR
        this.resetPlayerStateForNextGame();
        
        // 6. ✨ NUEVO: ACTUALIZAR INTERFAZ PROFESIONALMENTE
        this.updateProfessionalInterface();
        
        // 7. ✨ NUEVO: MOSTRAR MODAL DE FIN DE PARTIDA MEJORADO
        this.showProfessionalGameOverModal();
        
        // 8. ✨ NUEVO: NOTIFICAR AL USUARIO SOBRE PRÓXIMA PARTIDA
        this.notifyUserAboutNextGame();
        
        console.log('✅ Partida terminada profesionalmente - Cartones reseteados y cronómetro iniciado');
    }
    
    /**
     * ✨ NUEVO: Resetear cartones del usuario para próxima partida
     * SOLUCIONA: Reset automático al cambiar de modo y al terminar partida
     */
    resetUserCardsForNextGame() {
        console.log('🔄 Reseteando cartones del usuario para próxima partida...');
        
        // 🎯 SISTEMA REAL DE BINGO ONLINE - RESET COMPLETO
        this.userCards = [];
        this.selectedCards = [];
        
        // 🎯 LIMPIAR CARTONES DEL MODO ACTUAL EN LOCALSTORAGE
        const currentMode = this.getCurrentGameMode();
        if (currentMode) {
            const storageKey = `bingoroyal_user_cards_${currentMode.id}`;
            localStorage.removeItem(storageKey);
            console.log(`🗑️ Cartones del modo ${currentMode.id} eliminados del localStorage`);
        }
        
        // 🎯 LIMPIAR TODOS LOS CARTONES DE TODOS LOS MODOS
        Object.keys(this.gameModes).forEach(modeId => {
            const storageKey = `bingoroyal_user_cards_${modeId}`;
            localStorage.removeItem(storageKey);
            console.log(`🗑️ Cartones de ${modeId} eliminados del localStorage`);
        });
        
        // 4. Limpiar números llamados
        this.calledNumbers.clear();
        this.callHistory = [];
        
        // 5. Resetear último número
        this.lastNumberCalled = null;
        this.lastCallTime = null;
        
        // 6. ✨ NUEVO: ACTUALIZAR INTERFAZ INMEDIATAMENTE
        this.renderCards();
        this.updateCardInfo();
        this.clearCalledNumbersDisplay();
        
        // 7. ✨ NUEVO: NOTIFICAR AL USUARIO
        this.showNotification('🔄 Cartones reseteados a 0 - Compra nuevos para la próxima partida', 'info');
        
        console.log(`✅ Cartones reseteados COMPLETAMENTE a 0 para próxima partida`);
    }
    
    /**
     * 🗑️ RESET COMPLETO DE CARTONES (FRONTEND + BACKEND)
     * SOLUCIONA: Cartones que persisten sin comprar
     */
    async forceResetCardsForMode(modeId) {
        console.log(`🚨 Forzando reset de cartones para modo: ${modeId}`);
        
        try {
            // 1. 🗑️ RESETEAR EN EL BACKEND PRIMERO
            const userId = this.getOrCreateUserId();
            const response = await fetch('/api/bingo/reset-cards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    mode: modeId
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`✅ Backend reset completado:`, result);
            } else {
                console.error(`❌ Error en backend reset:`, response.status);
            }
            
            // 2. 🗑️ LIMPIAR CARTONES DEL MODO EN MEMORIA
            this.userCards = this.userCards.filter(card => card.gameMode !== modeId);
            
            // 3. 🗑️ LIMPIAR CARTONES SELECCIONADOS DEL MODO
            this.selectedCards = this.selectedCards.filter(card => card.gameMode !== modeId);
            
            // 4. 🗑️ LIMPIAR CARTONES DEL MODO EN LOCALSTORAGE
            const storageKey = `bingoroyal_user_cards_${modeId}`;
            localStorage.removeItem(storageKey);
            
            // 5. 🎨 ACTUALIZAR INTERFAZ
            this.renderCards();
            this.updateCardInfo();
            
            // 6. 📢 NOTIFICAR AL USUARIO
            this.showNotification(`🗑️ Cartones de ${this.gameModes[modeId]?.name || modeId} reseteados a 0`, 'success');
            
            console.log(`✅ Reset forzado completado para modo: ${modeId}`);
            
        } catch (error) {
            console.error(`❌ Error en reset forzado para modo ${modeId}:`, error);
            // Fallback: solo reset local
            this.userCards = this.userCards.filter(card => card.gameMode !== modeId);
            this.selectedCards = this.selectedCards.filter(card => card.gameMode !== modeId);
            this.renderCards();
            this.updateCardInfo();
        }
    }
    
    /**
     * 🗑️ RESET COMPLETO DE TODOS LOS CARTONES (FRONTEND + BACKEND)
     * SOLUCIONA: Cartones persistentes en todos los modos
     */
    async forceCompleteReset() {
        console.log('🚨 RESET COMPLETO: Forzando reset de todos los cartones...');
        
        try {
            // 1. 🗑️ RESETEAR EN EL BACKEND PRIMERO
            const userId = this.getOrCreateUserId();
            const response = await fetch('/api/bingo/reset-all-cards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`✅ Backend reset completo:`, result);
            } else {
                console.error(`❌ Error en backend reset completo:`, response.status);
            }
            
            // 2. 🗑️ LIMPIAR TODOS LOS CARTONES EN MEMORIA
            this.userCards = [];
            this.selectedCards = [];
            
            // 3. 🗑️ LIMPIAR TODOS LOS CARTONES EN LOCALSTORAGE
            Object.keys(this.gameModes).forEach(modeId => {
                const storageKey = `bingoroyal_user_cards_${modeId}`;
                localStorage.removeItem(storageKey);
            });
            
            // 4. 🎨 ACTUALIZAR INTERFAZ
            this.renderCards();
            this.updateCardInfo();
            
            // 5. 📢 NOTIFICAR AL USUARIO
            this.showNotification('🗑️ RESET COMPLETO: Todos los cartones reseteados a 0', 'success');
            
            console.log('✅ Reset completo de todos los cartones finalizado');
            
        } catch (error) {
            console.error('❌ Error en reset completo:', error);
            // Fallback: solo reset local
            this.userCards = [];
            this.selectedCards = [];
            this.renderCards();
            this.updateCardInfo();
        }
    }
    
    /**
     * ✨ NUEVO: Verificar y corregir cartones incorrectos
     * SOLUCIONA: Cartones que aparecen sin comprar
     */
    verifyAndCorrectCards() {
        console.log('🔍 Verificando y corrigiendo cartones incorrectos...');
        
        try {
            // 1. VERIFICAR CARTONES EN MEMORIA
            const incorrectCards = this.userCards.filter(card => !card.gameMode);
            if (incorrectCards.length > 0) {
                console.log(`⚠️ Encontrados ${incorrectCards.length} cartones sin modo de juego`);
                this.userCards = this.userCards.filter(card => card.gameMode);
            }
            
            // 2. VERIFICAR CARTONES SELECCIONADOS
            const incorrectSelected = this.selectedCards.filter(card => !card.gameMode);
            if (incorrectSelected.length > 0) {
                console.log(`⚠️ Encontrados ${incorrectCards.length} cartones seleccionados sin modo`);
                this.selectedCards = this.selectedCards.filter(card => card.gameMode);
            }
            
            // 3. ACTUALIZAR INTERFAZ
            this.renderCards();
            this.updateCardInfo();
            
            console.log('✅ Verificación y corrección de cartones completada');
            
        } catch (error) {
            console.error('❌ Error verificando cartones:', error);
        }
    }
    
    /**
     * ✨ NUEVO: Iniciar cronómetro para próxima partida
     */
    startNextGameCountdown() {
        console.log('⏰ Iniciando cronómetro para próxima partida...');
        
        const currentMode = this.getCurrentGameMode();
        const breakTime = currentMode.breakTime;
        
        // Calcular tiempo hasta próxima partida
        const now = Date.now();
        const nextGameStart = now + breakTime;
        
        // Guardar tiempo de próxima partida
        this.nextGameStartTime = nextGameStart;
        
        // Iniciar countdown en tiempo real
        this.startRealTimeCountdown(currentMode.id, breakTime);
        
        console.log(`⏰ Próxima partida de ${currentMode.name} en ${Math.floor(breakTime / 60000)} minutos`);
    }
    
    /**
     * ✨ NUEVO: Countdown en tiempo real PROFESIONAL para próxima partida
     * SOLUCIONA: Countdowns no coordinados y estados inconsistentes
     */
    startRealTimeCountdown(modeId, totalTime) {
        console.log(`⏰ Iniciando countdown PROFESIONAL para ${modeId}: ${totalTime}ms`);
        
        // 1. LIMPIAR COUNTDOWN ANTERIOR
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        // 2. VERIFICAR ELEMENTO DEL DOM
        const countdownElement = document.getElementById(`countdown-${modeId}`);
        if (!countdownElement) {
            console.error(`❌ Elemento countdown-${modeId} no encontrado`);
            return;
        }
        
        // 3. CONFIGURAR SISTEMA DE COUNTDOWN COORDINADO
        this.countdownSystem.isActive = true;
        this.countdownSystem.currentMode = modeId;
        this.countdownSystem.startTime = Date.now();
        this.countdownSystem.endTime = Date.now() + totalTime;
        this.countdownSystem.breakTime = totalTime;
        
        // 🎯 NUEVO: ACTUALIZAR modeCycles PARA PERMITIR COMPRAS
        if (!this.modeCycles[modeId]) {
            this.modeCycles[modeId] = {};
        }
        this.modeCycles[modeId].isActive = false; // Durante descanso, NO hay partida activa
        this.modeCycles[modeId].countdownStart = Date.now();
        this.modeCycles[modeId].countdownEnd = Date.now() + totalTime;
        console.log(`✅ modeCycles[${modeId}] configurado para permitir compras durante descanso`);
        
        // 4. INICIAR COUNTDOWN EN TIEMPO REAL
        let timeLeft = totalTime;
        
        this.countdownInterval = setInterval(() => {
            timeLeft -= 1000; // Reducir 1 segundo
            
            if (timeLeft <= 0) {
                // ⏰ TIEMPO AGOTADO - PRÓXIMA PARTIDA DEBE COMENZAR
                this.handleCountdownComplete(modeId);
                return;
            }
            
            // ⏰ MOSTRAR TIEMPO RESTANTE
            this.updateCountdownDisplay(modeId, timeLeft);
            
        }, 1000); // Actualizar cada segundo
        
        // 5. ACTUALIZAR INTERFAZ INMEDIATAMENTE
        this.updateCountdownDisplay(modeId, timeLeft);
        
        console.log(`✅ Countdown PROFESIONAL iniciado para ${modeId}`);
    }
    
    /**
     * ✨ NUEVO: Manejo profesional del fin de countdown
     */
    handleCountdownComplete(modeId) {
        console.log(`🎮 Countdown completado para ${modeId} - Iniciando partida`);
        
        // 1. LIMPIAR INTERVALO
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        // 2. ACTUALIZAR INTERFAZ
        const countdownElement = document.getElementById(`countdown-${modeId}`);
        if (countdownElement) {
            countdownElement.textContent = 'En curso';
            countdownElement.className = 'countdown active-game';
            countdownElement.setAttribute('data-status', 'active');
        }
        
        // 3. ACTUALIZAR ESTADO DEL JUEGO
        this.gameState = 'playing';
        
        // 4. ACTUALIZAR SISTEMA DE COUNTDOWN
        this.countdownSystem.isActive = false;
        this.countdownSystem.currentMode = null;
        
        // 🎯 NUEVO: ACTUALIZAR modeCycles PARA BLOQUEAR COMPRAS DURANTE PARTIDA
        if (this.modeCycles[modeId]) {
            this.modeCycles[modeId].isActive = true; // Partida activa
            this.modeCycles[modeId].gameStart = Date.now();
            console.log(`✅ modeCycles[${modeId}] configurado para bloquear compras durante partida`);
        }
        
        // 5. 🔒 BLOQUEAR COMPRAS DURANTE PARTIDA ACTIVA
        this.blockPurchasesForMode(modeId, 'Partida en curso');
        
        // 6. NOTIFICAR AL USUARIO
        this.showNotification(`🎮 ¡Partida iniciada en ${this.gameModes[modeId]?.name || modeId}!`, 'success');
        
        console.log(`✅ Partida iniciada profesionalmente en ${modeId}`);
    }
    
    /**
     * ✨ NUEVO: Actualización profesional del display de countdown
     */
    updateCountdownDisplay(modeId, timeLeft) {
        const countdownElement = document.getElementById(`countdown-${modeId}`);
        if (!countdownElement) return;
        
        try {
            // 1. CALCULAR TIEMPO RESTANTE
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            const countdownText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // 2. ACTUALIZAR INTERFAZ
            countdownElement.textContent = countdownText;
            countdownElement.className = 'countdown next-game';
            countdownElement.setAttribute('data-status', 'waiting');
            
            // 3. ✅ PERMITIR COMPRAS DURANTE DESCANSO (SOLO SI NO HAY PARTIDA ACTIVA)
            if (!this.isGlobalGameActive(modeId)) {
            this.allowPurchasesForMode(modeId);
                console.log(`✅ Compras permitidas para ${modeId} durante descanso (sin partida activa)`);
            } else {
                console.log(`🔒 Compras bloqueadas para ${modeId} durante descanso (partida activa detectada)`);
            }
            
            // 4. ACTUALIZAR SISTEMA DE COUNTDOWN
            this.countdownSystem.lastUpdate = Date.now();
            
        } catch (error) {
            console.error(`❌ Error actualizando display de countdown ${modeId}:`, error);
        }
    }
    
    /**
     * ✨ NUEVO: Resetear estado del jugador para próxima partida
     */
    resetPlayerStateForNextGame() {
        console.log('🔄 Reseteando estado del jugador para próxima partida...');
        
        // Resetear estado de participación
        this.isPlayerJoined = false;
        
        // Resetear cartones seleccionados
        this.selectedCards = [];
        
        // Resetear estadísticas del juego
        this.gameStartTime = null;
        this.currentGameId = null;
        
        // Limpiar estado de victoria
        this.hasWon = false;
        this.winType = null;
        
        console.log('✅ Estado del jugador reseteado para próxima partida');
    }
    
    /**
     * ✨ NUEVO: Actualizar interfaz profesionalmente
     */
    updateProfessionalInterface() {
        console.log('🎨 Actualizando interfaz profesionalmente...');
        
        // Actualizar display principal
        this.updateDisplay();
        
        // Actualizar UI completa
        this.updateUI();
        
        // ✨ NUEVO: Actualizar estado de botones de compra
        this.updatePurchaseButtonsStateFromCountdowns();
        
        // ✨ NUEVO: Actualizar contadores de modo
        this.updateAllModeCountdowns();
        
        // ✨ NUEVO: Limpiar números llamados en la interfaz
        this.clearCalledNumbersDisplay();
        
        console.log('✅ Interfaz actualizada profesionalmente');
    }
    
    /**
     * ✨ NUEVO: Limpiar display de números llamados
     */
    clearCalledNumbersDisplay() {
        // Limpiar contenedor de números llamados
            const calledNumbersContainer = document.getElementById('calledNumbers');
            if (calledNumbersContainer) {
                calledNumbersContainer.innerHTML = '';
            }
            
            // Limpiar último número llamado
        const lastNumberDisplay = document.getElementById('lastNumber');
        if (lastNumberDisplay) {
            lastNumberDisplay.textContent = '-';
        }
        
        console.log('✅ Display de números llamados limpiado');
    }
    
    /**
     * ✨ NUEVO: Modal de fin de partida profesional
     */
    showProfessionalGameOverModal() {
        const modal = document.getElementById('winModal');
        const winDetails = document.getElementById('winDetails');
        
        if (winDetails) {
            const currentMode = this.getCurrentGameMode();
            const breakTimeMinutes = Math.floor(currentMode.breakTime / 60000);
            
            winDetails.innerHTML = `
                <div class="game-over-professional">
                    <div class="game-over-icon">
                        <i class="fas fa-flag-checkered"></i>
                    </div>
                    <h3>🎯 ¡Fin de Partida Profesional!</h3>
                    <p>La partida de <strong>${currentMode.name}</strong> ha terminado.</p>
                    
                    <div class="next-game-info">
                        <h4>⏰ Próxima Partida</h4>
                        <p>La siguiente partida comenzará en <strong>${breakTimeMinutes} minutos</strong>.</p>
                        <div class="countdown-display">
                            <span class="countdown-label">Tiempo restante:</span>
                            <span class="countdown-value" id="modal-countdown-${currentMode.id}">${breakTimeMinutes}:00</span>
                        </div>
                    </div>
                    
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
                    
                    <div class="next-game-actions">
                        <p>🔄 <strong>Los cartones han sido reseteados.</strong></p>
                        <p>📝 <strong>Puedes comprar nuevos cartones para la próxima partida.</strong></p>
                    </div>
                </div>
            `;
        }
        
        if (modal) {
            modal.style.display = 'block';
        }
        
        console.log('✅ Modal profesional de fin de partida mostrado');
    }
    
    /**
     * ✨ NUEVO: Notificar al usuario sobre próxima partida
     */
    notifyUserAboutNextGame() {
        const currentMode = this.getCurrentGameMode();
        const breakTimeMinutes = Math.floor(currentMode.breakTime / 60000);
        
        // Mensaje en el chat
        this.addChatMessage('system', `🎯 ¡Partida terminada! Los cartones han sido reseteados.`);
        this.addChatMessage('system', `⏰ La próxima partida de ${currentMode.name} comenzará en ${breakTimeMinutes} minutos.`);
        this.addChatMessage('system', `📝 Compra nuevos cartones para participar en la próxima partida.`);
        
        // Notificación visual
        this.showNotification(`🎯 Partida terminada - Próxima en ${breakTimeMinutes} min`, 'info');
        
        console.log(`✅ Usuario notificado sobre próxima partida en ${breakTimeMinutes} minutos`);
    }

    joinGame() {
        // 🔒 BLOQUEO: No permitir unirse durante partidas activas
        if (this.gameState === 'playing') {
            this.showNotification('❌ No puedes unirte a una partida que ya ha comenzado', 'error');
            return false;
        }

        // 🔒 BLOQUEO: Verificar que no haya partida global activa
        const currentMode = this.getCurrentGameMode();
        // 🚨 TEMPORALMENTE DESACTIVADO: BLOQUEOS PARA RESTAURAR FUNCIONALIDAD
        // if (this.isGlobalGameActive(currentMode.id)) {
        //     this.showNotification(`❌ No puedes unirte. Hay una partida activa en ${currentMode.name}`, 'error');
        //     return false;
        // }

        if (this.selectedCards.length === 0) {
            this.showNotification('❌ Debes comprar al menos 1 cartón para unirte a la partida', 'error');
            return false;
        }

        this.isPlayerJoined = true;
        
        // ✨ NUEVO: Agregar experiencia por participar en partida
        this.addUserExperience('playGame');
        
        this.addChatMessage('system', `¡Te has unido a la partida con ${this.selectedCards.length} cartón(es)!`);
        console.log('Jugador unido a la partida');
        return true;
    }

    /**
     * Comprar cartones para el modo de juego actual
     * ✅ BLOQUEADO durante partidas activas
     */
    // 🎯 MÉTODO UNIFICADO PARA COMPRAR CARTONES (ASÍNCRONO)
    async purchaseCards(quantity = 1) {
        // 🔒 USAR LA LÓGICA UNIFICADA DE BUYCARDS
        return this.buyCards(quantity);
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
        console.log('💬 Agregando mensaje al chat:', type, message);
        
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) {
            console.warn('⚠️ Contenedor de mensajes del chat no encontrado');
            return;
        }
        
        // ✨ NUEVO: Verificar si el mensaje ya existe para evitar duplicados
        const messageId = Date.now() + Math.random();
        const existingMessage = chatMessages.querySelector(`[data-message-id="${messageId}"]`);
        if (existingMessage) {
            console.log('⚠️ Mensaje duplicado detectado, saltando...');
            return;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        messageDiv.setAttribute('data-message-id', messageId);
        
        const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        // Formatear mensaje del bot con markdown básico
        let formattedMessage = message;
        if (type === 'bot') {
            // Convertir **texto** a <strong>texto</strong>
            formattedMessage = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            // Convertir • a <li>
            formattedMessage = message.replace(/•/g, '<li>');
            // Convertir saltos de línea a <br>
            formattedMessage = message.replace(/\n/g, '<br>');
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
        
        // ✨ NUEVO: Agregar mensaje y asegurar que permanezca visible
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // ✨ NUEVO: Marcar el mensaje como persistente para evitar que se elimine
        messageDiv.setAttribute('data-persistent', 'true');
        
        console.log('✅ Mensaje agregado al chat y marcado como persistente');
    }

    /**
     * Inicializar chat en vivo - VERSIÓN CORREGIDA
     */
    initializeLiveChat() {
        // Evitar inicialización múltiple
        if (this.chatInitialized) {
            console.log('🔧 Chat ya inicializado, saltando...');
            return;
        }

        console.log('🔧 Inicializando chat en vivo...');
        console.log('🔗 URL del chat:', this.chatApiUrl);
        
        // ✨ NUEVO: Preservar mensajes estáticos del HTML inmediatamente
        this.preserveStaticChatMessages();
        
        // Esperar a que el DOM esté completamente listo
        if (document.readyState !== 'complete') {
            console.log('⏳ DOM no está listo, esperando...');
            setTimeout(() => this.initializeLiveChat(), 100);
            return;
        }
        
        // Verificar que los elementos del chat existan
        const chatSection = document.getElementById('chatSectionFixed');
        const chatInput = document.getElementById('chatInput');
        const btnSend = document.querySelector('.btn-send');
        const toggleBtn = document.querySelector('.chat-toggle-btn-fixed');
        
        console.log('🔍 Elementos del chat encontrados:');
        console.log('- Chat section:', !!chatSection);
        console.log('- Chat input:', !!chatInput);
        console.log('- Botón enviar:', !!btnSend);
        console.log('- Botón toggle:', !!toggleBtn);
        
        if (!chatSection || !chatInput || !btnSend || !toggleBtn) {
            console.error('❌ Faltan elementos del chat, reintentando en 500ms...');
            setTimeout(() => this.initializeLiveChat(), 500);
            return;
        }
        
        // Detectar y corregir problemas de URL del chat
        this.detectChatUrlIssues();
        
        // Configurar input del chat ANTES de probar la conexión
        this.setupChatInput();
        
        // Probar conexión con la API
        this.testChatConnection();
        
        // Cargar mensajes existentes
        this.loadChatMessages();
        
        // Iniciar polling para nuevos mensajes
        this.startChatPolling();
        
        // Marcar como inicializado
        this.chatInitialized = true;
        
        console.log('✅ Chat en vivo inicializado correctamente');
    }
    
    /**
     * Configurar input del chat - VERSIÓN CORREGIDA
     */
    setupChatInput() {
        console.log('🔧 Configurando input del chat...');
        
        const chatInput = document.getElementById('chatInput');
        const btnSend = document.querySelector('.btn-send');
        
        if (!chatInput || !btnSend) {
            console.warn('⚠️ Elementos del chat no encontrados en setupChatInput');
            return;
        }
        
        // Configurar input
        chatInput.readOnly = false;
        chatInput.disabled = false;
        chatInput.style.pointerEvents = 'auto';
        chatInput.style.userSelect = 'text';
        chatInput.style.webkitUserSelect = 'text';
        chatInput.placeholder = 'Escribe tu mensaje...';
        
        // Configurar botón enviar
        btnSend.style.pointerEvents = 'auto';
        btnSend.style.cursor = 'pointer';
        btnSend.disabled = false;
        
        // Limpiar event listeners existentes para evitar duplicados
        const newChatInput = chatInput.cloneNode(true);
        const newBtnSend = btnSend.cloneNode(true);
        
        chatInput.parentNode.replaceChild(newChatInput, chatInput);
        btnSend.parentNode.replaceChild(newBtnSend, btnSend);
        
        // Obtener referencias actualizadas
        const updatedChatInput = document.getElementById('chatInput');
        const updatedBtnSend = document.querySelector('.btn-send');
        
        if (updatedChatInput && updatedBtnSend) {
            // Configurar event listeners del chat
            this.setupChatEventListeners(updatedChatInput, updatedBtnSend);
            console.log('✅ Input del chat configurado correctamente');
        } else {
            console.error('❌ Error configurando input del chat');
        }
    }
    
    /**
     * Configurar event listeners del chat - NUEVA FUNCIÓN
     */
    setupChatEventListeners(chatInput, btnSend) {
        console.log('🔧 Configurando event listeners del chat...');
        
        // Función para enviar mensaje
        const sendMessage = () => {
            const message = chatInput.value.trim();
            console.log('📤 Intentando enviar mensaje:', message);
            
            if (message) {
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
            console.log('📤 Click en botón enviar');
            sendMessage();
        });
        
        // Event listener para Enter en el input
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                console.log('⌨️ Enter presionado en chat');
                sendMessage();
            }
        });
        
        // Event listener para focus
        chatInput.addEventListener('focus', () => {
            console.log('🎯 Chat input enfocado');
        });
        
        console.log('✅ Event listeners del chat configurados');
    }

    /**
     * Probar conexión con la API del chat
     */
    async testChatConnection() {
        try {
            console.log('🔍 Probando conexión con la API del chat...');
            console.log('🔗 URL de la API:', this.chatApiUrl);
            console.log('🌐 Protocolo:', window.location.protocol);
            console.log('🏠 Origen:', window.location.origin);
            
            const response = await fetch(this.chatApiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Agregar timeout y evitar redirecciones
                signal: AbortSignal.timeout(15000), // 15 segundos de timeout
                redirect: 'error' // No seguir redirecciones
            });
            
            console.log('📡 Estado de la conexión:', response.status, response.statusText);
            
            if (response.ok) {
                console.log('✅ Conexión con la API del chat exitosa');
            } else if (response.status === 404) {
                console.warn('⚠️ Endpoint del chat no encontrado (404)');
            } else if (response.status >= 500) {
                console.error('❌ Error del servidor en la API del chat:', response.status);
            } else {
                console.error('❌ Error en la conexión con la API del chat:', response.status);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('❌ Timeout en la conexión con la API del chat');
            } else if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
                console.error('❌ Error de red en la conexión con la API del chat:', error.message);
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.error('❌ Error de fetch en la conexión con la API del chat:', error.message);
            } else {
                console.error('❌ Error probando conexión con la API del chat:', error);
            }
        }
    }

    /**
     * Cargar mensajes del chat
     */
    async loadChatMessages() {
        try {
            console.log('📥 Cargando mensajes del chat...');
            console.log('🔗 URL de la API:', this.chatApiUrl);
            
            const response = await fetch(this.chatApiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Agregar timeout y evitar redirecciones
                signal: AbortSignal.timeout(10000), // 10 segundos de timeout
                redirect: 'error' // No seguir redirecciones
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.messages) {
                    this.displayChatMessages(data.messages);
                }
            } else if (response.status === 404) {
                console.warn('⚠️ Endpoint del chat no encontrado al cargar mensajes');
                // ✨ NUEVO: Si la API no funciona, preservar mensajes estáticos del HTML
                this.preserveStaticChatMessages();
            } else if (response.status >= 500) {
                console.error('❌ Error del servidor al cargar mensajes del chat:', response.status);
                // ✨ NUEVO: También preservar mensajes estáticos en caso de error del servidor
                this.preserveStaticChatMessages();
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('⚠️ Timeout al cargar mensajes del chat');
                this.preserveStaticChatMessages();
            } else if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
                console.error('❌ Error de red al cargar mensajes del chat:', error.message);
                this.preserveStaticChatMessages();
            } else {
                console.error('❌ Error cargando mensajes del chat:', error);
                this.preserveStaticChatMessages();
            }
        }
    }

    /**
     * ✨ NUEVO: Preservar mensajes estáticos del HTML cuando la API falla
     */
    preserveStaticChatMessages() {
        console.log('🛡️ Preservando mensajes estáticos del HTML...');
        
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) {
            console.warn('⚠️ Contenedor de mensajes del chat no encontrado');
            return;
        }
        
        // Verificar si ya hay mensajes estáticos
        const staticMessages = chatMessages.querySelectorAll('.chat-message');
        if (staticMessages.length > 0) {
            console.log(`✅ Encontrados ${staticMessages.length} mensajes estáticos, preservándolos...`);
            
            // Marcar todos los mensajes estáticos como persistentes
            staticMessages.forEach((msg, index) => {
                // Generar ID único si no tiene uno
                if (!msg.getAttribute('data-message-id')) {
                    msg.setAttribute('data-message-id', `static-${Date.now()}-${index}`);
                }
                
                // Marcar como persistente y protegido
                msg.setAttribute('data-persistent', 'true');
                msg.setAttribute('data-protected', 'true');
                msg.setAttribute('data-static', 'true');
                
                // Agregar borde verde para indicar que está protegido
                msg.style.borderLeft = '3px solid #4CAF50';
                
                console.log(`🛡️ Mensaje estático protegido: ${msg.textContent?.substring(0, 50)}...`);
            });
            
            // Hacer scroll al final
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            console.log('✅ Mensajes estáticos preservados y protegidos correctamente');
        } else {
            console.log('📋 No hay mensajes estáticos para preservar');
        }
    }

    /**
     * ✨ NUEVO: Agregar solo mensajes nuevos del servidor sin borrar los existentes
     */
    addNewMessagesFromServer(messages) {
        // ✨ NUEVO: Protección contra eliminación de mensajes locales
        this.protectLocalChatMessages();
        
        console.log('📋 Agregando mensajes nuevos del servidor:', messages?.length || 0);
        
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) {
            console.warn('⚠️ Contenedor de mensajes del chat no encontrado');
            return;
        }
        
        // ✨ NUEVO: Contar mensajes antes de agregar nuevos
        const messagesBefore = chatMessages.querySelectorAll('.chat-message').length;
        
        // Solo agregar mensajes que no estén ya en el chat
        let newMessagesAdded = 0;
        messages.forEach(msg => {
            // Verificar si el mensaje ya existe (por ID o contenido)
            const existingMessage = chatMessages.querySelector(`[data-message-id="${msg.id}"]`);
            if (!existingMessage) {
                const messageDiv = document.createElement('div');
                messageDiv.className = `chat-message ${msg.type}`;
                messageDiv.setAttribute('data-message-id', msg.id || Date.now() + Math.random());
                
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
                    // Obtener información del usuario desde la sesión
                    const sessionData = localStorage.getItem('bingoroyal_session');
                    let currentUserId = 'anonymous';
                    
                    if (sessionData) {
                        try {
                            const session = JSON.parse(sessionData);
                            if (session.user) {
                                currentUserId = session.user.id || session.user.email || 'user_' + Date.now();
                            }
                        } catch (e) {
                            console.warn('⚠️ Error parseando sesión:', e);
                        }
                    }
                    
                    const displayName = msg.userId === currentUserId ? 'Tú' : msg.userName;
                    messageDiv.innerHTML = `
                        <span class="message-time">${msg.time}</span>
                        <span class="message-user">${displayName}:</span>
                        <span class="message-text">${msg.message}</span>
                    `;
                }
                
                chatMessages.appendChild(messageDiv);
                newMessagesAdded++;
            }
        });
        
        // ✨ NUEVO: Solo hacer scroll si se agregaron mensajes nuevos
        if (newMessagesAdded > 0) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
            console.log(`✅ ${newMessagesAdded} mensajes nuevos agregados del servidor`);
        } else {
            console.log('📋 No hay mensajes nuevos del servidor');
        }
        
        // ✨ NUEVO: Verificar que los mensajes locales persistan
        const messagesAfter = chatMessages.querySelectorAll('.chat-message').length;
        const expectedMessages = messagesBefore + newMessagesAdded;
        
        if (messagesAfter !== expectedMessages) {
            console.warn(`⚠️ Inconsistencia en el conteo de mensajes: esperado ${expectedMessages}, actual ${messagesAfter}`);
        }
    }

    /**
     * Mostrar mensajes en el chat - SOLO AL INICIALIZAR
     */
    displayChatMessages(messages) {
        console.log('📋 Cargando mensajes iniciales del chat:', messages?.length || 0);
        
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) {
            console.warn('⚠️ Contenedor de mensajes del chat no encontrado');
            return;
        }
        
        // ✨ NUEVO: Solo limpiar si no hay mensajes locales
        const hasLocalMessages = chatMessages.querySelectorAll('.chat-message').length > 0;
        if (hasLocalMessages) {
            console.log('📋 Chat ya tiene mensajes locales, saltando carga inicial');
            return;
        }
        
        // ✨ NUEVO: Verificar si hay mensajes estáticos del HTML
        const hasStaticMessages = chatMessages.querySelectorAll('.chat-message[data-static="true"]').length > 0;
        if (hasStaticMessages) {
            console.log('📋 Chat ya tiene mensajes estáticos preservados, saltando carga inicial');
            return;
        }
        
        // Solo limpiar si es la primera carga y no hay mensajes estáticos
        chatMessages.innerHTML = '';
        
        // Mostrar mensajes en orden cronológico
        messages.reverse().forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${msg.type}`;
            messageDiv.setAttribute('data-message-id', msg.id || Date.now() + Math.random());
            
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
                // Obtener información del usuario desde la sesión
                const sessionData = localStorage.getItem('bingoroyal_session');
                let currentUserId = 'anonymous';
                
                if (sessionData) {
                    try {
                        const session = JSON.parse(sessionData);
                        if (session.user) {
                            currentUserId = session.user.id || session.user.email || 'user_' + Date.now();
                        }
                    } catch (e) {
                        console.warn('⚠️ Error parseando sesión:', e);
                    }
                }
                
                const displayName = msg.userId === currentUserId ? 'Tú' : msg.userName;
                messageDiv.innerHTML = `
                    <span class="message-time">${msg.time}</span>
                    <span class="message-user">${displayName}:</span>
                    <span class="message-text">${msg.message}</span>
                `;
            }
            
            chatMessages.appendChild(messageDiv);
        });
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
        console.log('✅ Mensajes iniciales del chat cargados correctamente');
    }

    /**
     * Enviar mensaje al chat
     */
    async sendChatMessage(message) {
        try {
            console.log('📤 Enviando mensaje a la API:', message);
            console.log('🔗 URL de la API:', this.chatApiUrl);
            
            // Obtener información del usuario desde la sesión
            const sessionData = localStorage.getItem('bingoroyal_session');
            let userId = 'anonymous';
            let userName = 'Jugador';
            
            if (sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    if (session.user) {
                        userId = session.user.id || session.user.email || 'user_' + Date.now();
                        userName = session.user.firstName || session.user.email || 'Jugador';
                    }
                } catch (e) {
                    console.warn('⚠️ Error parseando sesión:', e);
                }
            }
            
            console.log('👤 User ID:', userId);
            console.log('👤 User Name:', userName);
            
            const response = await fetch(this.chatApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    userId: userId,
                    userName: userName
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
        console.log('🔄 Iniciando polling del chat...');
        console.log('🔗 URL del chat:', this.chatApiUrl);
        
        this.chatPollingInterval = setInterval(async () => {
            try {
                // Verificar que la URL sea válida
                if (!this.chatApiUrl || this.chatApiUrl === '') {
                    console.warn('⚠️ URL del chat no configurada, deteniendo polling');
                    this.stopChatPolling();
                    return;
                }

                const response = await fetch(this.chatApiUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    // Agregar timeout para evitar bloqueos
                    signal: AbortSignal.timeout(10000) // 10 segundos de timeout
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.messages && data.messages.length > 0) {
                        const latestMessage = data.messages[0];
                        if (this.lastMessageId !== latestMessage.id) {
                            this.lastMessageId = latestMessage.id;
                            // ✨ NUEVO: Solo agregar mensajes nuevos, no recargar todo
                            this.addNewMessagesFromServer(data.messages);
                        }
                    }
                } else if (response.status === 404) {
                    console.warn('⚠️ Endpoint del chat no encontrado (404)');
                    this.stopChatPolling();
                } else if (response.status >= 500) {
                    console.error('❌ Error del servidor en el chat:', response.status);
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.warn('⚠️ Timeout en polling del chat');
                } else if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
                    console.error('❌ Error de red en polling del chat:', error.message);
                    // Reintentar después de un delay más largo
                    setTimeout(() => {
                        if (this.chatPollingInterval) {
                            this.startChatPolling();
                        }
                    }, 30000); // 30 segundos
                } else {
                    console.error('❌ Error en polling del chat:', error);
                }
            }
        }, 3000); // Polling cada 3 segundos
    }

    /**
     * Detener polling del chat
     */
    stopChatPolling() {
        if (this.chatPollingInterval) {
            console.log('🛑 Deteniendo polling del chat...');
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
        
        // 🔒 BLOQUEO: Verificar que no haya partida activa
        if (this.gameState === 'playing') {
            console.log('⚠️ Ya hay una partida en curso');
            this.showNotification('❌ Ya hay una partida activa. Espera a que termine.', 'warning');
            return;
        }
        
        // Obtener configuración del modo de juego actual
        const currentMode = this.getCurrentGameMode();
        console.log(`🎮 Modo de juego: ${currentMode.name}`);
        
        // 🔒 BLOQUEO: Verificar que no haya partida global activa en este modo
        // 🚨 TEMPORALMENTE DESACTIVADO: BLOQUEOS PARA RESTAURAR FUNCIONALIDAD
        // if (this.isGlobalGameActive(currentMode.id)) {
        //     console.log('⚠️ Ya hay una partida global activa en este modo');
        //     this.showNotification(`❌ Ya hay una partida activa en ${currentMode.name}. Espera a que termine.`, 'warning');
        //     return;
        // }
        
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
            numbersCalled: 0,
            gameMode: currentMode.id // Agregar modo de juego
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
            basePrize: dynamicPrizes.basePrize,
            gameMode: currentMode.id
        });
        
        // Agregar mensaje al chat
        const prizeMessage = dynamicPrizes.isSpecialGame 
            ? `🎉 ¡PARTIDA ESPECIAL! Premio total: €${dynamicPrizes.basePrize}`
            : `🎮 ¡Nueva partida iniciada! Premio total: €${dynamicPrizes.basePrize}`;
        
        this.addChatMessage('system', prizeMessage);
        
        // Iniciar llamada automática de números
        this.startAutoCalling();
        
        console.log('Nueva partida global iniciada correctamente');
        
        // 🔄 Sincronizar con el servidor
        this.syncGameStateWithServer();
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
        
        // ✨ NUEVO: Configurar event listeners del chat
        this.setupEventListeners();
        
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
        
        // 🔒 Actualizar estado de botones de compra
        this.updatePurchaseButtonsState();
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
            
            // Botones de compra con validaciones mejoradas
            else if (e.target.closest('.btn-buy')) {
                const btn = e.target.closest('.btn-buy');
                const packageType = btn.getAttribute('data-package');
                console.log('Botón comprar clickeado:', packageType);
                
                // 🔒 Verificar si se puede comprar en este momento
                const currentMode = this.getCurrentGameMode();
                const canPurchase = this.canPurchaseCards(currentMode.id);
                
                if (!canPurchase.canPurchase) {
                    this.showNotification(`❌ ${canPurchase.reason}`, 'error');
                    return;
                }
                
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
            
            // ✨ NUEVO: Event listeners del chat
            else if (e.target.closest('.chat-toggle-btn-fixed')) {
                console.log('Botón toggle del chat clickeado');
                toggleChat();
            } else if (e.target.closest('.btn-send')) {
                console.log('Botón enviar del chat clickeado');
                sendChatMessage();
            } else if (e.target.closest('#chatInput')) {
                console.log('Input del chat clickeado');
                const chatInput = document.getElementById('chatInput');
                if (chatInput) {
                    chatInput.focus();
                    chatInput.select();
                }
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

        // Chat - Event listeners ya configurados en setupChatInput
        console.log('🔧 Chat event listeners configurados en setupChatInput');

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
            console.log('🔍 connectToGlobalBingo - this.userId:', this.userId);
            
            // Unirse al juego global del modo actual
            await this.joinGlobalGame();
            
            // 🎯 CORREGIDO: Obtener estado actual del juego global usando el endpoint correcto
            const response = await fetch('/api/bingo/global-stats');
            const data = await response.json();
            
            if (data.success && data.stats) {
                const modeStats = data.stats[currentMode.id];
                if (modeStats) {
                    console.log(`✅ Conectado al bingo global (${currentMode.name}):`, modeStats.isActive ? 'playing' : 'waiting');
                
                // Sincronizar números llamados del servidor global SOLO si hay números nuevos
                    if (modeStats.calledNumbers && modeStats.calledNumbers.length > 0) {
                    // Solo actualizar si hay más números que los actuales
                        if (modeStats.calledNumbers.length > this.calledNumbers.size) {
                            this.calledNumbers = new Set(modeStats.calledNumbers);
                            this.lastNumberCalled = modeStats.lastNumberCalled;
                            console.log('🔄 Números sincronizados del servidor global:', modeStats.calledNumbers);
                        
                        // Actualizar la UI con los números del servidor
                        this.renderCalledNumbers();
                        this.updateLastNumber();
                        this.renderCards(); // Actualizar cartones con nuevos números marcados
                        
                        // Guardar estado actualizado
                        this.saveGameState();
                    }
                }
                
                // Actualizar contador de jugadores
                    this.updatePlayerCount(modeStats);
                
                }
                
                // Iniciar sincronización con el servidor
                this.syncWithServerState();
                
                // Sincronización adicional cada 3 segundos para datos no críticos
                // 🎯 CORREGIDO: NO sincronizar automáticamente cada 3 segundos
                // setInterval(async () => {
                //     await this.syncWithGlobalServer();
                // }, 3000);
                
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
            
            // 🎯 NUEVO: Obtener userId válido
            const userId = this.getOrCreateUserId();
            console.log('🔍 joinGlobalGame - userId obtenido:', userId);
            console.log('🔍 joinGlobalGame - currentMode:', currentMode);
            console.log('🔍 joinGlobalGame - userCards:', this.userCards);
            
            const response = await fetch('/api/bingo/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    cards: this.userCards,
                    mode: currentMode.id
                })
            });
            
            const data = await response.json();
            if (data.success) {
                console.log(`👤 Unido al juego global (${currentMode.name}) como jugador`);
                return true;
            } else {
                console.log('⚠️ No se pudo unir al juego global:', data.error);
                return false;
            }
        } catch (error) {
            console.error('❌ Error uniéndose al juego global:', error);
            return false;
        }
    }
    
    /**
     * 🎯 CORREGIDO: Sincronizar con el servidor global usando el endpoint correcto
     */
    async syncWithGlobalServer() {
        try {
            // 🎯 CORREGIDO: Usar el endpoint correcto global-stats
            const response = await fetch('/api/bingo/global-stats');
            const data = await response.json();
            
            if (data.success && data.stats) {
                const currentMode = this.getCurrentGameMode();
                const modeStats = data.stats[currentMode.id];
                
                if (modeStats) {
                // Sincronizar números llamados SOLO si hay números nuevos
                    if (modeStats.calledNumbers && modeStats.calledNumbers.length > 0) {
                    // Solo actualizar si hay más números que los actuales o si el estado del juego cambió
                        if (modeStats.calledNumbers.length > this.calledNumbers.size || 
                            modeStats.isActive !== (this.gameState === 'playing')) {
                            
                            this.calledNumbers = new Set(modeStats.calledNumbers);
                            this.lastNumberCalled = modeStats.lastNumberCalled;
                            this.gameState = modeStats.isActive ? 'playing' : 'waiting';
                            
                            console.log('🔄 Nuevos números del servidor global:', modeStats.calledNumbers);
                        
                        // Actualizar UI
                        this.renderCalledNumbers();
                        this.updateLastNumber();
                        this.renderCards(); // Actualizar cartones con nuevos números marcados
                        
                        // Reproducir sonido de nuevo número
                        this.playNumberSound();
                    }
                }
                
                // Actualizar contador de jugadores
                    console.log('🔍 DEBUG: syncWithGlobalServer - estado del servidor:', modeStats);
                    this.updatePlayerCount(modeStats);
                
                // Actualizar cartones del usuario en el servidor si han cambiado
                if (this.userCards.length > 0) {
                    await this.updateGlobalCards();
                    }
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
     * 🎯 SISTEMA INTELIGENTE DE COUNTDOWN PARA PRÓXIMAS PARTIDAS
     * SOLUCIONA: Sección "Próxima" no funciona y no se sabe cuándo comienza
     */
    async updateAllModeCountdowns() {
        try {
            console.log('🔄 Actualizando countdowns inteligentes para próximas partidas...');
            
            // ✨ NUEVO: Obtener datos del servidor (INTELIGENTE)
            const serverData = await this.getGlobalStatsIntelligent();
            
            const modes = ['CLASSIC', 'RAPID', 'VIP', 'NIGHT'];
            let updatedCount = 0;
            
            for (const mode of modes) {
                const countdownElement = document.getElementById(`countdown-${mode}`);
                if (!countdownElement) {
                    console.log(`⚠️ Elemento countdown-${mode} no encontrado`);
                    continue;
                }
                
                // ✨ NUEVO: Lógica inteligente para determinar estado y próxima partida
                const countdownInfo = this.calculateNextGameCountdown(mode, serverData);
                
                if (countdownInfo.isActive) {
                    // 🎮 Partida activa
                    countdownElement.textContent = 'En curso';
                    countdownElement.className = 'countdown active-game';
                    console.log(`🎮 Countdown ${mode}: En curso`);
                } else if (countdownInfo.nextGameIn) {
                    // ⏰ Próxima partida en X tiempo
                    countdownElement.textContent = countdownInfo.nextGameIn;
                    countdownElement.className = 'countdown next-game';
                    console.log(`⏰ Countdown ${mode}: Próxima en ${countdownInfo.nextGameIn}`);
                } else {
                    // ❓ Estado desconocido
                    countdownElement.textContent = '--:--';
                    countdownElement.className = 'countdown unknown';
                    console.log(`❓ Countdown ${mode}: Estado desconocido`);
                }
                
                updatedCount++;
            }
            
            console.log(`✅ Countdowns inteligentes actualizados: ${updatedCount}/${modes.length}`);
            
            // ✨ NUEVO: Actualizar estado de botones de compra basado en countdowns
            this.updatePurchaseButtonsStateFromCountdowns();
            
        } catch (error) {
            console.log('⚠️ Error en countdowns inteligentes:', error);
            this.updateCountdownsFallback();
        }
    }
    
    /**
     * ✨ NUEVO: Calcular countdown inteligente para próxima partida
     */
    calculateNextGameCountdown(modeId, serverData = null) {
        const modeConfig = this.gameModes[modeId];
        if (!modeConfig) return { isActive: false, nextGameIn: null };
        
        // 🎯 SOLUCIÓN: Calcular cuándo comienza la próxima partida
        
        // 1. Verificar si hay partida activa
        if (this.isGlobalGameActive(modeId)) {
            return { isActive: true, nextGameIn: null };
        }
        
        // 2. ✨ NUEVO: Calcular tiempo hasta próxima partida basado en duración + descanso
        const totalCycleTime = modeConfig.duration + modeConfig.breakTime;
        const now = Date.now();
        
        // Simular ciclo de partidas (en producción esto vendría del servidor)
        const lastGameEnd = this.getLastGameEndTime(modeId);
        const nextGameStart = lastGameEnd + totalCycleTime;
        const timeUntilNextGame = nextGameStart - now;
        
        if (timeUntilNextGame > 0) {
            // ⏰ Calcular tiempo restante
            const minutes = Math.floor(timeUntilNextGame / 60000);
            const seconds = Math.floor((timeUntilNextGame % 60000) / 1000);
            
            if (minutes > 0) {
                return { 
                    isActive: false, 
                    nextGameIn: `${minutes}:${seconds.toString().padStart(2, '0')}` 
                };
            } else {
                return { 
                    isActive: false, 
                    nextGameIn: `0:${seconds.toString().padStart(2, '0')}` 
                };
            }
        } else {
            // 🎮 Partida debería estar activa
            return { isActive: true, nextGameIn: null };
        }
    }
    
    /**
     * ✨ NUEVO: Obtener tiempo de fin de última partida (simulado)
     */
    /**
     * 🎯 SISTEMA DE CICLOS INDEPENDIENTES POR MODO
     * SOLUCIONA: Countdowns que "saltan" y lógica no independiente
     */
    getLastGameEndTime(modeId) {
        console.log(`🎯 Calculando tiempo de última partida para modo: ${modeId}`);
        
        // 1. ✨ NUEVO: SISTEMA DE CICLOS INDEPENDIENTES POR MODO
        if (!this.modeCycles) {
            this.modeCycles = {};
        }
        
        // 2. ✨ NUEVO: INICIALIZAR CICLO DEL MODO SI NO EXISTE
        if (!this.modeCycles[modeId]) {
            this.initializeModeCycle(modeId);
        }
        
        // 3. ✨ NUEVO: CALCULAR TIEMPO DE ÚLTIMA PARTIDA BASADO EN CICLO REAL
        const cycle = this.modeCycles[modeId];
        const now = Date.now();
        
        // 4. ✨ NUEVO: SIMULAR CICLO CONTINUO DE PARTIDAS
        const totalCycleTime = cycle.duration + cycle.breakTime;
        const cyclesCompleted = Math.floor((now - cycle.startTime) / totalCycleTime);
        const lastGameEnd = cycle.startTime + (cyclesCompleted * totalCycleTime) + cycle.duration;
        
        console.log(`✅ Tiempo de última partida para ${modeId}: ${new Date(lastGameEnd).toLocaleTimeString()}`);
        return lastGameEnd;
    }
    
    /**
     * 🎯 INICIALIZACIÓN AUTOMÁTICA DE CICLOS INDEPENDIENTES
     * SOLUCIONA: Secciones "Próxima" que no funcionan
     */
    initializeModeCycle(modeId) {
        const modeConfig = this.gameModes[modeId];
        if (!modeConfig) return;
        
        // 🎯 SISTEMA REAL DE PERSISTENCIA - CARGAR ESTADO GUARDADO
        const savedState = this.loadModeCycleState(modeId);
        if (savedState && savedState.isValid) {
            console.log(`🎯 Estado persistido cargado para ${modeId}:`, savedState);
            this.modeCycles[modeId] = savedState;
            return;
        }
        
        // 🎯 SIMPLIFICADO: TODOS LOS MODOS TIENEN 2 MINUTOS PARA COMPRAR
        const modeOffset = {
            'CLASSIC': 0,      // Empieza inmediatamente
            'RAPID': 0,        // Empieza inmediatamente
            'VIP': 0,          // Empieza inmediatamente
            'NIGHT': 0         // Empieza inmediatamente
        };
        
        const offset = modeOffset[modeId] || 0;
        const startTime = Date.now() + (offset * 1000);
        
        this.modeCycles[modeId] = {
            startTime: startTime,
            duration: modeConfig.duration,
            breakTime: 2 * 60 * 1000, // 🎯 SIMPLIFICADO: 2 MINUTOS PARA TODOS
            totalCycleTime: modeConfig.duration + (2 * 60 * 1000),
            lastGameEnd: null,
            nextGameStart: null,
            isActive: false,
            // 🎯 NUEVO: ESTADO REAL DE LA PARTIDA
            gameState: 'waiting', // waiting, playing, finished
            players: [],
            calledNumbers: [],
            winner: null,
            gameStartTime: null,
            gameEndTime: null,
            // 🎯 NUEVO: CARTONES DEL USUARIO PARA ESTE MODO
            userCards: [],
            selectedCards: []
        };
        
        // 2. ✨ NUEVO: CALCULAR PRIMERA PARTIDA
        this.updateModeCycle(modeId);
        
        console.log(`🎯 Ciclo REAL inicializado para modo: ${modeId} con offset de ${offset}s`);
        
        // 🎯 NUEVO: GUARDAR ESTADO INMEDIATAMENTE
        this.saveModeCycleState(modeId);
    }
    
    /**
     * 🎯 NUEVO: GUARDAR ESTADO DEL CICLO DEL MODO
     */
    saveModeCycleState(modeId) {
        const cycle = this.modeCycles[modeId];
        if (!cycle) return;
        
        const stateToSave = {
            ...cycle,
            savedAt: Date.now(),
            isValid: true
        };
        
        const storageKey = `bingoroyal_mode_cycle_${modeId}`;
        localStorage.setItem(storageKey, JSON.stringify(stateToSave));
        console.log(`💾 Estado del ciclo ${modeId} guardado en localStorage`);
    }
    
    /**
     * 🎯 NUEVO: CARGAR ESTADO DEL CICLO DEL MODO
     */
    loadModeCycleState(modeId) {
        const storageKey = `bingoroyal_mode_cycle_${modeId}`;
        const savedData = localStorage.getItem(storageKey);
        
        if (!savedData) return null;
        
        try {
            const savedState = JSON.parse(savedData);
            const now = Date.now();
            
            // 🎯 VERIFICAR SI EL ESTADO SIGUE SIENDO VÁLIDO
            if (savedState.savedAt && (now - savedState.savedAt) < (24 * 60 * 60 * 1000)) { // 24 horas
                console.log(`📂 Estado persistido válido cargado para ${modeId}`);
                return savedState;
            } else {
                console.log(`⏰ Estado persistido expirado para ${modeId}, creando nuevo`);
                localStorage.removeItem(storageKey);
                return null;
            }
        } catch (error) {
            console.error(`❌ Error cargando estado persistido para ${modeId}:`, error);
            localStorage.removeItem(storageKey);
            return null;
        }
    }
    
    /**
     * ✨ NUEVO: Actualizar ciclo de un modo específico
     */
    updateModeCycle(modeId) {
        // 🚨 NUEVO: VERIFICACIÓN DE SEGURIDAD
        if (!this.modeCycles) {
            console.log('⚠️ modeCycles no inicializado, inicializando...');
            this.modeCycles = {};
        }
        
        const cycle = this.modeCycles[modeId];
        if (!cycle) return;
        
        const now = Date.now();
        const totalCycleTime = cycle.duration + cycle.breakTime;
        
        // 1. CALCULAR CICLOS COMPLETADOS
        const cyclesCompleted = Math.floor((now - cycle.startTime) / totalCycleTime);
        
        // 2. CALCULAR TIEMPO DE ÚLTIMA PARTIDA
        cycle.lastGameEnd = cycle.startTime + (cyclesCompleted * totalCycleTime) + cycle.duration;
        
        // 3. CALCULAR TIEMPO DE PRÓXIMA PARTIDA
        cycle.nextGameStart = cycle.startTime + ((cyclesCompleted + 1) * totalCycleTime);
        
        // 4. DETERMINAR SI HAY PARTIDA ACTIVA
        const timeSinceLastGame = now - cycle.lastGameEnd;
        cycle.isActive = timeSinceLastGame >= 0 && timeSinceLastGame < cycle.duration;
        
        // 🎯 NUEVO: ACTUALIZAR ESTADO DE LA PARTIDA
        const wasActive = cycle.gameState === 'playing';
        
        if (cycle.isActive) {
            cycle.gameState = 'playing';
        } else {
            cycle.gameState = 'waiting';
            
            // 🎯 NUEVO: MOSTRAR POP-UP CUANDO TERMINE LA PARTIDA
            if (wasActive && cycle.gameState === 'waiting') {
                this.showBuyCardsPopup(modeId);
            }
        }
        
        // 🎯 NUEVO: GUARDAR ESTADO ACTUALIZADO
        this.saveModeCycleState(modeId);
        
        console.log(`🔄 Ciclo actualizado para ${modeId}: Activo=${cycle.isActive}, Estado=${cycle.gameState}, Próxima=${new Date(cycle.nextGameStart).toLocaleTimeString()}`);
    }
    
    /**
     * ✨ NUEVO: Actualizar estado de botones de compra basado en countdowns
     */
    updatePurchaseButtonsStateFromCountdowns() {
        const modes = ['CLASSIC', 'RAPID', 'VIP', 'NIGHT'];
        
        modes.forEach(modeId => {
            const countdownElement = document.getElementById(`countdown-${modeId}`);
            if (countdownElement && countdownElement.textContent === 'En curso') {
                // 🎮 Partida activa - BLOQUEAR compras
                this.blockPurchasesForMode(modeId, 'Partida en curso');
            } else if (countdownElement && countdownElement.textContent !== '--:--') {
                // ⏰ Próxima partida - PERMITIR compras
                this.allowPurchasesForMode(modeId);
            }
        });
    }
    
    /**
     * ✨ NUEVO: Bloquear compras para un modo específico
     */
    blockPurchasesForMode(modeId, reason) {
        const buyButtons = document.querySelectorAll(`[data-mode="${modeId}"] .btn-buy, [data-mode="${modeId}"] .btn-buy-cards`);
        
        buyButtons.forEach(button => {
            button.disabled = true;
            button.title = `❌ ${reason} - No puedes comprar cartones`;
            button.classList.add('disabled', 'game-blocked');
        });
        
        console.log(`🔒 Compras bloqueadas para ${modeId}: ${reason}`);
    }
    
    /**
     * ✨ NUEVO: Permitir compras para un modo específico
     */
    allowPurchasesForMode(modeId) {
        const buyButtons = document.querySelectorAll(`[data-mode="${modeId}"] .btn-buy, [data-mode="${modeId}"] .btn-buy-cards`);
        
        buyButtons.forEach(button => {
            button.disabled = false;
            button.title = '✅ Puedes comprar cartones';
            button.classList.remove('disabled', 'game-blocked');
        });
        
        console.log(`✅ Compras permitidas para ${modeId}`);
    }

    /**
     * Actualizar contadores usando configuración local como fallback
     */
    updateCountdownsFallback() {
        console.log('🔄 Usando fallback para contadores...');
        const modes = ['CLASSIC', 'RAPID', 'VIP', 'NIGHT'];
        
        for (const mode of modes) {
            const countdownElement = document.getElementById(`countdown-${mode}`);
            const modeConfig = this.gameModes[mode];
            
            if (countdownElement && modeConfig) {
                const duration = modeConfig.duration;
                const minutes = Math.floor(duration / 60000);
                const seconds = Math.floor((duration % 60000) / 1000);
                const fallbackText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                countdownElement.textContent = fallbackText;
                console.log(`🔄 Fallback countdown ${mode}: ${fallbackText}`);
            }
        }
    }

    /**
     * Cambiar la visibilidad de los contenedores de números llamados por modo
     */
    switchCalledNumbersContainer(modeId) {
        try {
            console.log(`🔄 Cambiando contenedor de números llamados a modo: ${modeId}`);
            
            // Ocultar todos los contenedores de modo
            const allContainers = document.querySelectorAll('.mode-numbers');
            allContainers.forEach(el => {
                el.style.display = 'none';
            });
            
            // Mostrar solo el contenedor del modo seleccionado
            const targetContainer = document.getElementById(`calledNumbers-${modeId}`);
            if (targetContainer) {
                targetContainer.style.display = 'block';
                
                // 🎯 NUEVO: Verificar que el contenedor tenga contenido
                if (!targetContainer.innerHTML.trim() || !targetContainer.querySelector('.numbers-grid')) {
                    console.log(`🔧 Contenedor ${modeId} está vacío, renderizando contenido...`);
                    // Renderizar números llamados para este modo específico
                    this.renderCalledNumbersForMode(modeId);
                }
                
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

    /**
     * ===== SISTEMA DE PROGRESIÓN DE USUARIO =====
     */

    /**
     * Calcular nivel del usuario basado en XP
     */
    calculateUserLevel(xp) {
        let level = 1;
        for (let i = 10; i >= 1; i--) {
            if (xp >= this.userProgression.levels[i].requiredXP) {
                level = i;
                break;
            }
        }
        return level;
    }

    /**
     * Obtener información del nivel actual
     */
    getCurrentLevelInfo(xp) {
        const currentLevel = this.calculateUserLevel(xp);
        const levelData = this.userProgression.levels[currentLevel];
        const nextLevelData = this.userProgression.levels[currentLevel + 1];
        
        return {
            level: currentLevel,
            name: levelData.name,
            color: levelData.color,
            icon: levelData.icon,
            benefits: levelData.benefits,
            currentXP: xp,
            requiredXP: levelData.requiredXP,
            nextLevelXP: nextLevelData ? nextLevelData.requiredXP : null,
            xpToNext: nextLevelData ? nextLevelData.requiredXP - xp : 0,
            isMaxLevel: !nextLevelData
        };
    }

    /**
     * Agregar experiencia al usuario
     */
    addUserExperience(action, amount = null) {
        try {
            // Obtener usuario actual
            const userInfo = this.getUserInfo();
            if (!userInfo) {
                console.log('⚠️ No hay usuario logueado para agregar XP');
                return;
            }

            // Calcular XP a agregar
            const xpAmount = amount || this.userProgression.xpRewards[action] || 0;
            if (xpAmount <= 0) {
                console.log(`⚠️ No hay XP configurado para la acción: ${action}`);
                return;
            }

            // XP actual y nivel antes
            const currentXP = userInfo.experience || 0;
            const oldLevel = this.calculateUserLevel(currentXP);

            // Nuevo XP y nivel
            const newXP = currentXP + xpAmount;
            const newLevel = this.calculateUserLevel(newXP);

            // Actualizar usuario
            userInfo.experience = newXP;
            userInfo.level = newLevel;

            // Verificar si ha subido de nivel
            if (newLevel > oldLevel) {
                this.handleLevelUp(oldLevel, newLevel, userInfo);
            }

            // Verificar acceso VIP
            if (newLevel >= 7 && !userInfo.vipStatus) {
                userInfo.vipStatus = true;
                this.handleVIPUnlock(userInfo);
            }

            // Guardar en localStorage
            localStorage.setItem('userInfo', JSON.stringify(userInfo));

            // Actualizar UI
            this.updateUserDisplay(userInfo);

            // Log de la acción
            console.log(`✨ +${xpAmount} XP por ${action}. Total: ${newXP} XP (Nivel ${newLevel})`);

            // Mostrar notificación
            this.showXPNotification(action, xpAmount);

        } catch (error) {
            console.error('❌ Error agregando experiencia:', error);
        }
    }

    /**
     * Manejar subida de nivel
     */
    handleLevelUp(oldLevel, newLevel, userInfo) {
        const levelInfo = this.getCurrentLevelInfo(userInfo.experience);
        
        console.log(`🎉 ¡SUBIDA DE NIVEL! ${oldLevel} → ${newLevel} (${levelInfo.name})`);
        
        // Mostrar modal de subida de nivel
        this.showLevelUpModal(oldLevel, newLevel, levelInfo);
        
        // Agregar bonus por subir de nivel
        const levelBonus = newLevel * 50; // 50€ por nivel
        this.userBalance += levelBonus;
        this.updateBalanceDisplay();
        
        // Sonido de victoria
        this.playLevelUpSound();
        
        // Analytics
        this.gameAnalytics.levelUps++;
        this.saveAnalytics();
    }

    /**
     * Manejar desbloqueo de VIP
     */
    handleVIPUnlock(userInfo) {
        console.log('💎 ¡ACCESO VIP DESBLOQUEADO!');
        
        // Mostrar modal VIP
        this.showVIPUnlockModal();
        
        // Bonus VIP de bienvenida
        const vipBonus = 500; // 500€ de bonus VIP
        this.userBalance += vipBonus;
        this.updateBalanceDisplay();
        
        // Mensaje en chat
        this.addChatMessage('system', '💎 ¡Has desbloqueado el acceso VIP! Disfruta de premios exclusivos y beneficios especiales.');
    }

    /**
     * Actualizar visualización del usuario
     */
    updateUserDisplay(userInfo) {
        const levelInfo = this.getCurrentLevelInfo(userInfo.experience || 0);
        
        // Actualizar nombre de usuario
        const usernameElement = document.querySelector('.username');
        if (usernameElement) {
            usernameElement.textContent = userInfo.firstName || 'Jugador';
        }
        
        // Actualizar nivel con nuevo estilo
        const levelElement = document.querySelector('.user-level');
        if (levelElement) {
            levelElement.innerHTML = `
                <i class="fas ${levelInfo.icon}" style="color: ${levelInfo.color}"></i>
                <span>${levelInfo.name}</span>
                ${userInfo.vipStatus ? '<i class="fas fa-crown" style="color: gold; margin-left: 4px;" title="VIP"></i>' : ''}
            `;
            levelElement.style.color = levelInfo.color;
        }
        
        // Actualizar avatar con color del nivel
        const avatarElement = document.querySelector('.user-avatar');
        if (avatarElement) {
            avatarElement.style.background = `linear-gradient(135deg, ${levelInfo.color}20, ${levelInfo.color}40)`;
            avatarElement.style.borderColor = levelInfo.color;
        }
        
        // Actualizar barra de progreso (si existe)
        this.updateProgressBar(levelInfo);
    }

    /**
     * Actualizar barra de progreso de nivel
     */
    updateProgressBar(levelInfo) {
        const progressContainer = document.getElementById('levelProgress');
        if (!progressContainer && !levelInfo.isMaxLevel) {
            // Crear barra de progreso si no existe
            this.createProgressBar();
        }
        
        if (progressContainer && !levelInfo.isMaxLevel) {
            const progress = ((levelInfo.currentXP - levelInfo.requiredXP) / (levelInfo.nextLevelXP - levelInfo.requiredXP)) * 100;
            const progressBar = progressContainer.querySelector('.progress-fill');
            const progressText = progressContainer.querySelector('.progress-text');
            
            if (progressBar) {
                progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
                progressBar.style.background = levelInfo.color;
            }
            
            if (progressText) {
                progressText.textContent = `${levelInfo.xpToNext} XP para ${this.userProgression.levels[levelInfo.level + 1].name}`;
            }
        }
    }

    /**
     * Mostrar notificación de XP
     */
    showXPNotification(action, amount) {
        const notification = document.createElement('div');
        notification.className = 'xp-notification';
        notification.innerHTML = `
            <i class="fas fa-star"></i>
            <span>+${amount} XP</span>
            <small>${this.getActionName(action)}</small>
        `;
        
        document.body.appendChild(notification);
        
        // Animación
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    /**
     * Obtener nombre amigable de la acción
     */
    getActionName(action) {
        const names = {
            playGame: 'Participar en partida',
            buyCard: 'Comprar cartón',
            markNumber: 'Marcar número',
            winLine: '¡Línea!',
            winTwoLines: '¡Dos líneas!',
            winBingo: '¡BINGO!',
            winJackpot: '¡BOTE PROGRESIVO!',
            dailyLogin: 'Login diario',
            weeklyBonus: 'Bonus semanal',
            monthlyBonus: 'Bonus mensual',
            referFriend: 'Referir amigo'
        };
        return names[action] || action;
    }

    /**
     * Reproducir sonido de subida de nivel
     */
    playLevelUpSound() {
        if (this.soundsEnabled && this.audioContext) {
            try {
                // Sonido épico de subida de nivel
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // Secuencia de notas ascendentes
                const notes = [261.63, 329.63, 392.00, 523.25]; // C, E, G, C (una octava más alta)
                let currentNote = 0;
                
                const playNote = () => {
                    if (currentNote < notes.length) {
                        oscillator.frequency.setValueAtTime(notes[currentNote], this.audioContext.currentTime);
                        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                        
                        currentNote++;
                        if (currentNote < notes.length) {
                            setTimeout(playNote, 200);
                        } else {
                            oscillator.stop(this.audioContext.currentTime + 0.2);
                        }
                    }
                };
                
                oscillator.start();
                playNote();
                
            } catch (error) {
                console.log('⚠️ Error reproduciendo sonido de nivel:', error);
            }
        }
    }

    // 🚀 NUEVO: Método para agregar números llamados al estado central
    addCalledNumber(number) {
        console.log(`🎯 addCalledNumber() ejecutándose para número: ${number}`);
        
        if (!this.calledNumbers.has(number)) {
            this.calledNumbers.add(number);
            console.log(`✅ Número ${number} agregado a calledNumbers. Total: ${this.calledNumbers.size}`);
            
            // 🎯 MARCAR NÚMEROS EN CARTAS SELECCIONADAS
            this.markNumberOnSelectedCards(number);
            
            // 🔄 ACTUALIZAR VISUALIZACIÓN
            this.renderCalledNumbers();
            this.renderCards();
            
            // 💾 GUARDAR ESTADO
            this.saveCalledNumbers();
            
            // 🎯 VERIFICAR CONDICIONES DE VICTORIA
            this.checkVictoryConditions();
            
            console.log(`✅ Número ${number} procesado completamente`);
        } else {
            console.log(`ℹ️ Número ${number} ya estaba en calledNumbers`);
        }
    }
    
    // 🚀 NUEVO: Método para marcar números en cartas seleccionadas (SIN RENDERIZAR)
    markNumberOnSelectedCards(number) {
        console.log(`🎯 Marcando número ${number} en cartas seleccionadas...`);
        
        let marked = false;
        this.selectedCards.forEach(cardId => {
            const card = this.userCards.find(c => c.id === cardId);
            if (card && card.markedNumbers && !card.markedNumbers.has(number)) {
                // Verificar si el número está en el cartón
                const hasNumber = card.numbers.flat().includes(number);
                if (hasNumber) {
                    card.markedNumbers.add(number);
                    marked = true;
                    console.log(`✅ Número ${number} marcado en cartón ${card.id}`);
                    
                    // ✨ NUEVO: Agregar experiencia por marcar número
                    this.addUserExperience('markNumber');
                }
            }
        });
        
        // 🚀 NUEVO: NO RENDERIZAR AQUÍ - Se hará desde el método padre
        if (marked) {
            console.log(`✅ Números marcados en cartas (sin renderizar)`);
        }
        
        return marked;
    }

    markNumber(number) {
        console.log(`🎯 Marcando número: ${number}`);
        
        let marked = false;
        this.selectedCards.forEach(cardId => {
            const card = this.userCards.find(c => c.id === cardId);
            if (card && card.markedNumbers && !card.markedNumbers.has(number)) {
                // Verificar si el número está en el cartón
                const hasNumber = card.numbers.flat().includes(number);
                if (hasNumber) {
                    card.markedNumbers.add(number);
                    marked = true;
                    console.log(`✅ Número ${number} marcado en cartón ${card.id}`);
                    
                    // ✨ NUEVO: Agregar experiencia por marcar número
                    this.addUserExperience('markNumber');
                }
            }
        });

        if (marked) {
            this.checkWin();
            this.updateCards();
            this.saveUserCards();
        }

        return marked;
    }

    /**
     * Inicializar sistema de progresión de usuario
     */
    initializeUserProgression() {
        try {
            console.log('🚀 Inicializando sistema de progresión...');
            
            // Obtener información del usuario
            const userInfo = this.getUserInfo();
            if (!userInfo) {
                console.log('⚠️ No hay usuario logueado');
                return;
            }
            
            // Inicializar campos si no existen
            if (typeof userInfo.experience === 'undefined') {
                userInfo.experience = 0;
                userInfo.level = 1;
                userInfo.lastLogin = null;
                userInfo.vipStatus = false;
            }
            
            // Verificar login diario
            const today = new Date().toDateString();
            const lastLogin = userInfo.lastLogin ? new Date(userInfo.lastLogin).toDateString() : null;
            
            if (lastLogin !== today) {
                // Nuevo día, dar XP de login diario
                this.addUserExperience('dailyLogin');
                userInfo.lastLogin = new Date().toISOString();
                localStorage.setItem('userInfo', JSON.stringify(userInfo));
                console.log('🎁 Bonus de login diario otorgado');
            }
            
            // Actualizar visualización del usuario
            this.updateUserDisplay(userInfo);
            
            // Verificar logros semanales/mensuales
            this.checkBonusRewards(userInfo);
            
            console.log('✅ Sistema de progresión inicializado');
            
        } catch (error) {
            console.error('❌ Error inicializando progresión:', error);
        }
    }

    /**
     * Verificar y otorgar recompensas bonus
     */
    checkBonusRewards(userInfo) {
        try {
            const now = new Date();
            const lastWeeklyBonus = userInfo.lastWeeklyBonus ? new Date(userInfo.lastWeeklyBonus) : null;
            const lastMonthlyBonus = userInfo.lastMonthlyBonus ? new Date(userInfo.lastMonthlyBonus) : null;
            
            // Bonus semanal (cada 7 días)
            if (!lastWeeklyBonus || (now.getTime() - lastWeeklyBonus.getTime()) >= 7 * 24 * 60 * 60 * 1000) {
                this.addUserExperience('weeklyBonus');
                userInfo.lastWeeklyBonus = now.toISOString();
                this.showNotification('🎁 ¡Bonus semanal recibido! +100 XP', 'success');
                console.log('🎁 Bonus semanal otorgado');
            }
            
            // Bonus mensual (cada 30 días)
            if (!lastMonthlyBonus || (now.getTime() - lastMonthlyBonus.getTime()) >= 30 * 24 * 60 * 60 * 1000) {
                this.addUserExperience('monthlyBonus');
                userInfo.lastMonthlyBonus = now.toISOString();
                const monthlyBonus = 1000; // 1000€ bonus mensual
                this.userBalance += monthlyBonus;
                this.updateBalanceDisplay();
                this.showNotification('💎 ¡Bonus mensual recibido! +300 XP + €1000', 'success');
                console.log('💎 Bonus mensual otorgado');
            }
            
            // Guardar cambios
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            
        } catch (error) {
            console.error('❌ Error verificando bonus:', error);
        }
    }

    // ✅ FUNCIÓN UPDATEBALANCEDISPLAY FALTANTE
    updateBalanceDisplay() {
        const balanceElement = document.getElementById('userBalance');
        if (balanceElement) {
            balanceElement.textContent = `€${this.userBalance.toFixed(2)}`;
            console.log('💰 Balance actualizado en UI:', this.userBalance);
        } else {
            console.warn('⚠️ Elemento userBalance no encontrado en DOM');
        }
    }

    // 🎯 MÉTODO UNIFICADO PARA COMPRAR CARTONES
    buyCards(quantity = 1) {
        console.log(`🛒 Comprando ${quantity} cartón(es)...`);
        
        try {
            // 🔒 BLOQUEO PRINCIPAL: Verificar estado del juego
            console.log('🔍 Verificando modo de juego actual...');
            console.log('🔍 this.currentGameMode:', this.currentGameMode);
            console.log('🔍 this.gameModes:', this.gameModes);
            
            const currentMode = this.getCurrentGameMode();
            console.log('🔍 currentMode obtenido:', currentMode);
            
            if (!currentMode) {
                console.error('❌ Error: Modo de juego no válido');
                this.showNotification('❌ Error: Modo de juego no válido', 'error');
                return false;
            }
        
        // 🔒 BLOQUEO: No permitir compra durante partidas activas
        if (this.gameState === 'playing') {
            this.showNotification('❌ No puedes comprar cartones durante una partida activa', 'error');
            return false;
        }
        
        // 🔒 BLOQUEO: Verificar que no haya partida global activa
        const isGlobalActive = this.isGlobalGameActive(currentMode.id);
        console.log(`🔍 Verificación de partida global para ${currentMode.id}:`, isGlobalActive);
        
        if (isGlobalActive) {
            this.showNotification(`❌ No puedes comprar cartones. ${currentMode.name} está en curso`, 'error');
            return false;
        }
        
        // 🔒 BLOQUEO: Verificar que el modo esté disponible
        console.log(`🔍 Verificando si se pueden comprar cartones para ${currentMode?.id}...`);
        console.log('🔍 currentMode.id:', currentMode?.id);
        console.log('🔍 currentMode.name:', currentMode?.name);
        console.log('🔍 currentMode completo:', currentMode);
        
        if (!currentMode || !currentMode.id) {
            console.log('❌ currentMode no válido en buyCards');
            this.showNotification('❌ Error: Modo de juego no válido', 'error');
            return false;
        }
        
        const canPurchase = this.canPurchaseCards(currentMode.id);
        console.log(`🔍 Resultado de canPurchaseCards:`, canPurchase);
        
        if (!canPurchase.canPurchase) {
            this.showNotification(`❌ ${canPurchase.reason}`, 'error');
            return false;
        }
        
        // ✅ TODAS LAS VALIDACIONES PASARON - PROCEDER CON LA COMPRA
        return this.processCardPurchase(quantity, currentMode);
        
        } catch (error) {
            console.error('❌ Error en buyCards:', error);
            console.error('❌ Stack trace:', error.stack);
            this.showNotification('Error al procesar la compra', 'error');
            return false;
        }
    }
    
    // 🎯 MÉTODO PRIVADO PARA PROCESAR COMPRA
    processCardPurchase(quantity, currentMode) {
        const cardPrice = currentMode.cardPrice;
        const totalCost = quantity * cardPrice;
        
        // Validaciones de cantidad y saldo
        if (quantity < 1 || quantity > 50) {
            this.showNotification('❌ Cantidad inválida (1-50 cartones)', 'error');
            return false;
        }
        
        if (this.userBalance < totalCost) {
            this.showNotification(`❌ Saldo insuficiente. Necesitas €${totalCost.toFixed(2)}`, 'error');
            return false;
        }
        
        // Verificar límite de cartones por modo
        const currentCardsInMode = this.userCards.filter(card => card.gameMode === currentMode.id).length;
        const maxCardsPerMode = currentMode.maxCards || 10;
        
        if (currentCardsInMode + quantity > maxCardsPerMode) {
            this.showNotification(`❌ Máximo ${maxCardsPerMode} cartones en ${currentMode.name}`, 'error');
            return false;
        }
        
        try {
            // Descontar dinero
            this.userBalance -= totalCost;
            this.updateBalanceDisplay();
            
            // Crear cartones
            for (let i = 0; i < quantity; i++) {
                const card = this.addCard();
                if (card) {
                    card.purchasePrice = cardPrice;
                    card.gameMode = currentMode.id;
                    card.purchaseTime = new Date();
                    this.selectedCards.push(card.id);
                    this.addUserExperience('buyCard');
                }
            }
            
            // Guardar y actualizar
            this.saveUserCards();
            this.renderCards();
            this.updateCardInfo();
            
            // Notificaciones
            this.showNotification(`✅ ${quantity} cartón(es) comprado(s) por €${totalCost.toFixed(2)}`, 'success');
            this.showPurchaseConfirmation(quantity, totalCost);
            this.addChatMessage('system', `💳 Compra exitosa: ${quantity} cartón(es) para ${currentMode.name}`);
            
            console.log(`✅ Compra exitosa: ${quantity} cartones por €${totalCost}`);
            return true;
            
        } catch (error) {
            console.error('❌ Error en la compra:', error);
            this.showNotification('Error al procesar la compra', 'error');
            return false;
        }
    }

    // ✅ MÉTODO SHOWNOTIFICATION FUNCIONANDO
    showNotification(message, type = 'info') {
        console.log(`📢 Notificación ${type}:`, message);
        
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `game-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Agregar al DOM
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto remove
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
        console.log(`✅ Notificación mostrada: ${message}`);
        return true;
    }

    // ✅ MÉTODO SHOWPURCHASECONFIRMATION FALTANTE
    showPurchaseConfirmation(quantity, totalCost) {
        console.log(`🎉 Confirmación de compra: ${quantity} cartones por €${totalCost}`);
        
        const confirmation = document.createElement('div');
        confirmation.className = 'purchase-confirmation-notification';
        confirmation.innerHTML = `
            <div class="confirmation-content">
                <div class="confirmation-icon">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <h3>¡Compra Exitosa!</h3>
                <p><strong>${quantity}</strong> cartón${quantity > 1 ? 'es' : ''} comprado${quantity > 1 ? 's' : ''}</p>
                <p class="price">Total: <span>€${totalCost.toFixed(2)}</span></p>
                <button class="btn-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(confirmation);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (confirmation.parentNode) {
                confirmation.remove();
            }
        }, 5000);
        
        return true;
    }

    // ✅ MÉTODO CREATEPROGRESSBAR FALTANTE
    createProgressBar() {
        console.log('🎯 Creando barra de progreso...');
        
        const progressContainer = document.getElementById('userProgressContainer');
        if (!progressContainer) {
            console.warn('⚠️ Contenedor de progreso no encontrado');
            return;
        }
        
        const progressHtml = `
            <div class="progress-bar-container">
                <div class="progress-info">
                    <span class="level-text">Nivel ${this.userLevel}</span>
                    <span class="xp-text">${this.userExperience}/${this.getXpForLevel(this.userLevel + 1)} XP</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${this.getProgressPercentage()}%"></div>
                </div>
            </div>
        `;
        
        progressContainer.innerHTML = progressHtml;
        console.log('✅ Barra de progreso creada');
    }

    // ✅ MÉTODO GETPROGRESSPERCENTAGE AUXILIAR
    getProgressPercentage() {
        const currentLevelXp = this.getXpForLevel(this.userLevel);
        const nextLevelXp = this.getXpForLevel(this.userLevel + 1);
        const progressInLevel = this.userExperience - currentLevelXp;
        const xpNeededForLevel = nextLevelXp - currentLevelXp;
        
        return Math.min(100, (progressInLevel / xpNeededForLevel) * 100);
    }

    // ✅ MÉTODO GETXPFORLEVEL AUXILIAR
    getXpForLevel(level) {
        // Sistema de XP exponencial
        return Math.floor(100 * Math.pow(1.5, level - 1));
    }

    // ✅ MÉTODO UPDATECARDINFO FALTANTE
    updateCardInfo() {
        console.log('📊 Actualizando información de cartones...');
        
        const cardsCountElement = document.getElementById('cards-count');
        const selectedCountElement = document.getElementById('selected-count');
        
        if (cardsCountElement) {
            cardsCountElement.textContent = `${this.userCards.length} cartones`;
        }
        
        if (selectedCountElement) {
            const selectedCount = this.selectedCards ? this.selectedCards.length : 0;
            selectedCountElement.textContent = `${selectedCount} seleccionados`;
        }
        
        console.log(`✅ Info actualizada: ${this.userCards.length} cartones, ${this.selectedCards?.length || 0} seleccionados`);
    }

    // ✅ MÉTODO SHOWLEVELUPMODAL FALTANTE
    showLevelUpModal(newLevel) {
        console.log(`🎉 ¡Subida de nivel! Nuevo nivel: ${newLevel}`);
        
        // Crear modal de subida de nivel
        const levelUpModal = document.createElement('div');
        levelUpModal.className = 'level-up-modal';
        levelUpModal.innerHTML = `
            <div class="level-up-content">
                <!-- Botón de cerrar -->
                <button class="level-up-close" onclick="this.closest('.level-up-modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
                
                <div class="level-up-celebration">
                    <div class="celebration-icon">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <div class="fireworks">
                        <div class="firework"></div>
                        <div class="firework"></div>
                        <div class="firework"></div>
                    </div>
                </div>
                <h2>¡NIVEL ALCANZADO!</h2>
                <div class="new-level">
                    <span class="level-number">${newLevel}</span>
                </div>
                <p class="level-message">¡Felicidades por tu progreso!</p>
                <div class="level-rewards">
                    <div class="reward-item">
                        <i class="fas fa-coins"></i>
                        <span>+${newLevel * 100} Monedas Bonus</span>
                    </div>
                    <div class="reward-item">
                        <i class="fas fa-star"></i>
                        <span>Nuevos beneficios desbloqueados</span>
                    </div>
                </div>
                <button class="btn-level-continue" onclick="this.closest('.level-up-modal').remove()">
                    <i class="fas fa-arrow-right"></i>
                    Continuar
                </button>
            </div>
            <div class="level-up-overlay" onclick="this.closest('.level-up-modal').remove()"></div>
        `;
        
        // Agregar al DOM
        document.body.appendChild(levelUpModal);
        
        // Trigger animation
        setTimeout(() => levelUpModal.classList.add('show'), 100);
        
        // Auto remove after 8 seconds
        setTimeout(() => {
            if (levelUpModal.parentNode) {
                levelUpModal.remove();
            }
        }, 8000);
        
        // Agregar bonus de monedas por nivel
        this.userBalance += (newLevel * 100);
        this.updateBalanceDisplay();
        
        return true;
    }

    /**
     * Detectar y corregir problemas de URL del chat - VERSIÓN MEJORADA
     */
    detectChatUrlIssues() {
        try {
            console.log('🔧 Detectando problemas de URL del chat...');
            console.log('📍 Protocolo actual:', window.location.protocol);
            console.log('🌐 Origin actual:', window.location.origin);
            console.log('🔗 URL del chat actual:', this.chatApiUrl);
            
            // Verificar si estamos en HTTPS y si la URL del chat es relativa
            if (window.location.protocol === 'https:' && this.chatApiUrl.startsWith('/')) {
                // Si estamos en HTTPS, usar la URL completa del servidor
                const serverUrl = window.location.origin;
                this.chatApiUrl = `${serverUrl}/api/chat`;
                console.log('🔧 URL del chat corregida para HTTPS:', this.chatApiUrl);
            }
            
            // Verificar si la URL es válida
            try {
                const url = new URL(this.chatApiUrl, window.location.origin);
                console.log('✅ URL del chat válida:', url.href);
            } catch (e) {
                console.warn('⚠️ URL del chat inválida, usando URL por defecto');
                this.chatApiUrl = '/api/chat';
                console.log('🔧 URL del chat establecida por defecto:', this.chatApiUrl);
            }
            
            // Verificar que la URL termine en /api/chat
            if (!this.chatApiUrl.endsWith('/api/chat')) {
                console.warn('⚠️ URL del chat no termina en /api/chat, corrigiendo...');
                if (this.chatApiUrl.includes('/api/')) {
                    // Si ya tiene /api/, solo cambiar la parte final
                    this.chatApiUrl = this.chatApiUrl.replace(/\/[^\/]*$/, '/chat');
                } else {
                    // Si no tiene /api/, agregarlo
                    this.chatApiUrl = this.chatApiUrl.replace(/\/?$/, '/api/chat');
                }
                console.log('🔧 URL del chat corregida:', this.chatApiUrl);
            }
            
            console.log('✅ URL del chat final:', this.chatApiUrl);
        } catch (error) {
            console.error('❌ Error detectando problemas de URL del chat:', error);
            // Fallback a URL por defecto
            this.chatApiUrl = '/api/chat';
            console.log('🔧 URL del chat establecida por defecto debido a error:', this.chatApiUrl);
        }
    }

    /**
     * ✨ NUEVO: Proteger mensajes locales del chat contra eliminación
     */
    protectLocalChatMessages() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        // Verificar que los mensajes locales persistan
        const localMessages = chatMessages.querySelectorAll('[data-persistent="true"]');
        if (localMessages.length > 0) {
            console.log(`🛡️ Protegiendo ${localMessages.length} mensajes locales del chat`);
            
            // Marcar todos los mensajes como protegidos
            localMessages.forEach(msg => {
                msg.setAttribute('data-protected', 'true');
                msg.style.borderLeft = '3px solid #4CAF50';
            });
        }
    }

    /**
     * Mostrar mensajes en el chat - SOLO AL INICIALIZAR
     */
    displayChatMessages(messages) {
        console.log('📋 Cargando mensajes iniciales del chat:', messages?.length || 0);
        
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) {
            console.warn('⚠️ Contenedor de mensajes del chat no encontrado');
            return;
        }
        
        // ✨ NUEVO: Solo limpiar si no hay mensajes locales
        const hasLocalMessages = chatMessages.querySelectorAll('.chat-message').length > 0;
        if (hasLocalMessages) {
            console.log('📋 Chat ya tiene mensajes locales, saltando carga inicial');
            return;
        }
        
        // ✨ NUEVO: Verificar si hay mensajes estáticos del HTML
        const hasStaticMessages = chatMessages.querySelectorAll('.chat-message[data-static="true"]').length > 0;
        if (hasStaticMessages) {
            console.log('📋 Chat ya tiene mensajes estáticos preservados, saltando carga inicial');
            return;
        }
        
        // Solo limpiar si es la primera carga y no hay mensajes estáticos
        chatMessages.innerHTML = '';
        
        // Mostrar mensajes en orden cronológico
        messages.reverse().forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${msg.type}`;
            messageDiv.setAttribute('data-message-id', msg.id || Date.now() + Math.random());
            
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
                // Obtener información del usuario desde la sesión
                const sessionData = localStorage.getItem('bingoroyal_session');
                let currentUserId = 'anonymous';
                
                if (sessionData) {
                    try {
                        const session = JSON.parse(sessionData);
                        if (session.user) {
                            currentUserId = session.user.id || session.user.email || 'user_' + Date.now();
                        }
                    } catch (e) {
                        console.warn('⚠️ Error parseando sesión:', e);
                    }
                }
                
                const displayName = msg.userId === currentUserId ? 'Tú' : msg.userName;
                messageDiv.innerHTML = `
                    <span class="message-time">${msg.time}</span>
                    <span class="message-user">${displayName}:</span>
                    <span class="message-text">${msg.message}</span>
                `;
            }
            
            chatMessages.appendChild(messageDiv);
        });
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
        console.log('✅ Mensajes iniciales del chat cargados correctamente');
    }

    /**
     * ✨ NUEVO: Configurar escucha para sincronización automática de userId
     */
    setupUserIdSyncListener() {
        // 🎯 SOLUCIÓN: Escuchar cambios en localStorage para sincronización automática
        
        // Escuchar cambios en localStorage
        window.addEventListener('storage', (e) => {
            if (e.key === 'bingoroyal_real_userId' || e.key === 'bingoroyal_user_sync') {
                console.log('🔄 Cambio detectado en userId, sincronizando...');
                this.handleUserIdChange(e.newValue, e.oldValue);
            }
        });
        
        // Escuchar mensajes de BroadcastChannel
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const channel = new BroadcastChannel('bingoroyal_user_sync');
                channel.onmessage = (event) => {
                    if (event.data.type === 'USER_ID_SYNC') {
                        console.log('🔄 Mensaje de sincronización recibido:', event.data.userId);
                        this.handleUserIdChange(event.data.userId, this.userId);
                    }
                };
            } catch (error) {
                console.log('⚠️ BroadcastChannel no disponible para escucha');
            }
        }
        
        // ✨ NUEVO: Verificar si hay un userId real disponible al inicializar
        const realUserId = localStorage.getItem('bingoroyal_real_userId');
        if (realUserId && realUserId !== this.userId) {
            console.log('🔄 userId real encontrado al inicializar, sincronizando...');
            this.handleUserIdChange(realUserId, this.userId);
        }
    }
    
    /**
     * ✨ NUEVO: Manejar cambios de userId para sincronización
     */
    handleUserIdChange(newUserId, oldUserId) {
        if (newUserId === oldUserId) return;
        
        console.log('🔄 Sincronizando userId:', oldUserId, '→', newUserId);
        
        // Actualizar el userId actual
        this.userId = newUserId;
        
        // Guardar en localStorage local
        localStorage.setItem('bingoroyal_current_userId', newUserId);
        
        // ✨ NUEVO: Notificar al servidor del cambio de userId
        this.notifyServerUserIdChange(newUserId, oldUserId);
        
        // ✨ NUEVO: Actualizar UI si es necesario
        this.updateUIForUserIdChange(newUserId);
        
        console.log('✅ userId sincronizado correctamente:', newUserId);
    }
    
    /**
     * ✨ NUEVO: Notificar al servidor del cambio de userId
     */
    async notifyServerUserIdChange(newUserId, oldUserId) {
        try {
            // Solo notificar si hay un userId real (no anónimo)
            if (newUserId.startsWith('user_')) {
                const response = await fetch('/api/user/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        newUserId: newUserId,
                        oldUserId: oldUserId,
                        timestamp: Date.now()
                    })
                });
                
                if (response.ok) {
                    console.log('✅ Servidor notificado del cambio de userId');
                }
            }
        } catch (error) {
            console.log('⚠️ Error notificando al servidor:', error);
        }
    }
    
    /**
     * ✨ NUEVO: Actualizar UI para el cambio de userId
     */
    updateUIForUserIdChange(newUserId) {
        // Actualizar elementos de la UI que muestren información del usuario
        const userDisplayElements = document.querySelectorAll('[data-user-id]');
        userDisplayElements.forEach(element => {
            element.setAttribute('data-user-id', newUserId);
        });
        
        // Si hay un cambio de usuario autenticado, actualizar la información
        if (newUserId.startsWith('user_')) {
            this.updateUserDisplayFromSync();
        }
    }
    
    /**
     * ✨ NUEVO: Actualizar información del usuario desde sincronización
     */
    updateUserDisplayFromSync() {
        const userSyncData = localStorage.getItem('bingoroyal_user_sync');
        if (userSyncData) {
            try {
                const syncData = JSON.parse(userSyncData);
                if (syncData.userInfo) {
                    // Actualizar la información del usuario en la UI
                    this.updateUserDisplay(syncData.userInfo);
                }
            } catch (error) {
                console.log('⚠️ Error parseando datos de sincronización:', error);
            }
        }
    }
}

// Exportar la clase BingoPro al objeto window para reinicialización
window.BingoPro = BingoPro;

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
            console.log('🚨🚨🚨 INSTANCIANDO BINGOPRO 🚨🚨🚨');
            window.bingoGame = new BingoPro();
            console.log('🚨🚨🚨 BINGOPRO INSTANCIADO, LLAMANDO initializeGame() 🚨🚨🚨');
            window.bingoGame.initializeGame();
            
            // ✨ NUEVO: Inicializar modo de tarjetas después del juego
            setTimeout(() => {
                initializeModeCards();
            }, 500);
            
            // ✨ NUEVO: Asegurar que el chat se inicialice
            setTimeout(() => {
                if (window.bingoGame && !window.bingoGame.chatInitialized) {
                    console.log('🔧 Reinicializando chat...');
                    window.bingoGame.initializeLiveChat();
                    window.bingoGame.chatInitialized = true;
                }
            }, 1000);
            
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
        
        // ✨ NUEVO: Inicializar modo de tarjetas después del juego
        setTimeout(() => {
            initializeModeCards();
        }, 500);
        
        // ✨ NUEVO: Asegurar que el chat se inicialice
        setTimeout(() => {
            if (window.bingoGame && !window.bingoGame.chatInitialized) {
                console.log('🔧 Reinicializando chat...');
                window.bingoGame.initializeLiveChat();
                window.bingoGame.chatInitialized = true;
            }
        }, 1000);
        
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
        
        // ✨ NUEVO: Inicializar modo de tarjetas después del juego
        setTimeout(() => {
            initializeModeCards();
        }, 500);
        
        // ✨ NUEVO: Asegurar que el chat se inicialice
        setTimeout(() => {
            if (window.bingoGame && !window.bingoGame.chatInitialized) {
                console.log('🔧 Reinicializando chat...');
                window.bingoGame.initializeLiveChat();
                window.bingoGame.chatInitialized = true;
            }
        }, 1000);
    }
    
    // ✨ NUEVO: INICIALIZACIÓN DE RESERVA - Asegurar que bingoGame siempre esté disponible
    if (!window.bingoGame) {
        console.log('🔄 Inicialización de reserva: creando BingoGame...');
        window.bingoGame = new BingoPro();
        window.bingoGame.initializeGame();
        
        setTimeout(() => {
            initializeModeCards();
        }, 500);
    }
});

// Función para actualizar información del usuario en la UI
function closeBingoCardsModal() {
    if (window.bingoGame) {
        window.bingoGame.closeBingoCardsModal();
    }
}

// ✨ NUEVO: Función para actualizar información del usuario en el header
window.updateHeaderUserInfo = function() {
    console.log('🚨🚨🚨 FUNCIÓN updateHeaderUserInfo() EJECUTÁNDOSE 🚨🚨🚨');
    console.log('🚨🚨🚨 ESTA FUNCIÓN SE ESTÁ EJECUTANDO AHORA MISMO 🚨🚨🚨');
    
    const usernameElement = document.getElementById('headerUsername');
    const levelElement = document.getElementById('headerUserLevel');
    
    console.log('🔍 Elementos del header encontrados:', {
        usernameElement: !!usernameElement,
        levelElement: !!levelElement
    });
    
    // 🔍 DEBUG: Verificar el contenido actual del header
    if (usernameElement) {
        console.log('🔍 Contenido ACTUAL del headerUsername:', usernameElement.textContent);
        console.log('🔍 Contenido ACTUAL del headerUserLevel:', levelElement ? levelElement.textContent : 'NO ENCONTRADO');
    }
    
    if (usernameElement && levelElement) {
        // Obtener datos del usuario desde localStorage
        const sessionData = localStorage.getItem('bingoroyal_session');
        console.log('🔍 Session data en updateHeaderUserInfo:', sessionData ? 'SÍ' : 'NO');
        
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                const user = session.user;
                
                console.log('🔍 Actualizando header con usuario real:', user);
                console.log('🔍 Datos del usuario:', {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    name: user.name,
                    email: user.email,
                    level: user.level
                });
                
                // Actualizar nombre de usuario
                if (user.firstName && user.lastName) {
                    const fullName = `${user.firstName} ${user.lastName}`;
                    usernameElement.textContent = fullName;
                    console.log('✅ Nombre actualizado:', fullName);
                    console.log('🔍 Elemento username actualizado con:', usernameElement.textContent);
                } else if (user.name) {
                    usernameElement.textContent = user.name;
                    console.log('✅ Nombre actualizado:', user.name);
                    console.log('🔍 Elemento username actualizado con:', usernameElement.textContent);
                } else if (user.email) {
                    // Si solo tenemos email, extraer nombre del email
                    const emailName = user.email.split('@')[0];
                    const displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
                    usernameElement.textContent = displayName;
                    console.log('✅ Nombre extraído del email:', displayName);
                    console.log('🔍 Elemento username actualizado con:', usernameElement.textContent);
                } else {
                    usernameElement.textContent = 'Usuario';
                    console.log('⚠️ Usando nombre por defecto');
                    console.log('🔍 Elemento username actualizado con:', usernameElement.textContent);
                }
                
                // Actualizar nivel
                if (user.level) {
                    levelElement.textContent = `Nivel ${user.level}`;
                } else {
                    levelElement.textContent = 'Nivel 1';
                }
                
                // Actualizar balance si existe
                const balanceElement = document.getElementById('userBalance');
                if (balanceElement && user.balance !== undefined) {
                    balanceElement.textContent = `€${user.balance.toFixed(2)}`;
                }
                
                console.log('✅ Header actualizado con datos reales del usuario');
                
                // 🔍 DEBUG: Verificar el contenido DESPUÉS de actualizar
                console.log('🔍 Contenido DESPUÉS de actualizar headerUsername:', usernameElement.textContent);
                console.log('🔍 Contenido DESPUÉS de actualizar headerUserLevel:', levelElement.textContent);
                
            } catch (error) {
                console.warn('⚠️ Error al actualizar header:', error);
                // Solo usar valores por defecto si no hay datos reales
                if (usernameElement.textContent === 'Jugador' || usernameElement.textContent === 'Usuario') {
                    usernameElement.textContent = 'Usuario';
                    levelElement.textContent = 'Nivel 1';
                    console.log('⚠️ Usando valores por defecto por error');
                } else {
                    console.log('✅ Header ya tiene datos reales, no sobrescribiendo por error');
                }
            }
        } else {
            // Si no hay sesión, verificar si ya hay datos reales antes de usar valores por defecto
            console.log('ℹ️ No hay sesión activa');
            console.log('🔍 Verificando localStorage completo...');
            console.log('🔍 bingoroyal_session:', localStorage.getItem('bingoroyal_session'));
            console.log('🔍 bingoroyal_user_profile:', localStorage.getItem('bingoroyal_user_profile'));
            console.log('🔍 Todas las claves de localStorage:', Object.keys(localStorage));
            
            // Solo usar valores por defecto si no hay datos reales
            if (usernameElement.textContent === 'Jugador' || usernameElement.textContent === 'Usuario') {
                usernameElement.textContent = 'Usuario';
                levelElement.textContent = 'Nivel 1';
                console.log('⚠️ Usando valores por defecto');
            } else {
                console.log('✅ Header ya tiene datos reales, no sobrescribiendo');
            }
        }
    } else {
        console.warn('⚠️ Elementos del header no encontrados');
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
    
    // ✨ NUEVO: Actualizar también el header (solo si no está ya actualizado)
    if (typeof updateHeaderUserInfo === 'function') {
        // Verificar si el header ya tiene datos reales
        const usernameElement = document.querySelector('.username, #headerUsername');
        if (usernameElement && usernameElement.textContent === 'Usuario') {
            console.log('🔄 Header no actualizado, llamando a updateHeaderUserInfo...');
            updateHeaderUserInfo();
        } else {
            console.log('✅ Header ya actualizado, saltando updateHeaderUserInfo');
        }
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
    
    // ✨ NUEVO: Actualizar también el header (solo si no está ya actualizado)
    if (typeof updateHeaderUserInfo === 'function') {
        // Verificar si el header ya tiene datos reales
        const usernameElement = document.querySelector('.username, #headerUsername');
        if (usernameElement && usernameElement.textContent === 'Usuario') {
            console.log('🔄 Header no actualizado, llamando a updateHeaderUserInfo...');
            updateHeaderUserInfo();
        } else {
            console.log('✅ Header ya actualizado, saltando updateHeaderUserInfo');
        }
    }
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
    console.log('🛒 Intentando comprar cartones...');
    console.log('🔍 Verificando elementos necesarios...');
    
    // 🔍 VERIFICACIÓN COMPLETA DEL ESTADO DEL JUEGO
    console.log('🔍 === ESTADO COMPLETO DEL JUEGO ===');
    console.log('🔍 window.bingoGame:', window.bingoGame);
    console.log('🔍 typeof window.bingoGame:', typeof window.bingoGame);
    console.log('🔍 window.bingoGame === null:', window.bingoGame === null);
    console.log('🔍 window.bingoGame === undefined:', window.bingoGame === undefined);
    console.log('🔍 "bingoGame" in window:', 'bingoGame' in window);
    console.log('🔍 window.hasOwnProperty("bingoGame"):', window.hasOwnProperty('bingoGame'));
    
    // 🔍 VERIFICACIÓN DE LA CLASE BINGOPRO
    if (window.bingoGame) {
        console.log('🔍 window.bingoGame.constructor.name:', window.bingoGame.constructor.name);
        console.log('🔍 window.bingoGame instanceof BingoPro:', window.bingoGame instanceof BingoPro);
        console.log('🔍 Métodos disponibles:', Object.getOwnPropertyNames(window.bingoGame));
    }
    
    const quantityInput = document.getElementById('cardQuantity');
    console.log('🔍 quantityInput encontrado:', quantityInput);
    console.log('🔍 window.bingoGame disponible:', !!window.bingoGame);
    
    if (quantityInput && window.bingoGame) {
        try {
            const quantity = parseInt(quantityInput.value);
            console.log(`✅ Comprando ${quantity} cartones...`);
            
            // Verificar que la cantidad sea válida
            if (isNaN(quantity) || quantity < 1) {
                console.error('❌ Cantidad inválida:', quantity);
                return;
            }
            
            // Verificar que bingoGame.buyCards existe
            if (typeof window.bingoGame.buyCards === 'function') {
                const result = window.bingoGame.buyCards(quantity);
                console.log('✅ Resultado de la compra:', result);
            } else {
                console.error('❌ buyCards no es una función:', typeof window.bingoGame.buyCards);
            }
        } catch (error) {
            console.error('❌ Error al ejecutar buyCards:', error);
            console.error('❌ Stack trace:', error.stack);
        }
    } else {
        console.error('❌ Error al comprar cartones:');
        console.log('🔍 quantityInput:', quantityInput);
        console.log('🔍 window.bingoGame:', window.bingoGame);
        console.log('🔍 typeof window.bingoGame:', typeof window.bingoGame);
        console.log('🔍 window.bingoGame === null:', window.bingoGame === null);
        console.log('🔍 window.bingoGame === undefined:', window.bingoGame === undefined);
        
        if (window.bingoGame) {
            console.log('🔍 Métodos disponibles en bingoGame:', Object.getOwnPropertyNames(window.bingoGame));
        } else {
            console.log('🔍 window.bingoGame NO está disponible');
            console.log('🔍 Verificando si existe en window:', 'bingoGame' in window);
            console.log('🔍 Verificando si existe en window con hasOwnProperty:', window.hasOwnProperty('bingoGame'));
            console.log('🔍 window.BingoPro disponible:', typeof window.BingoPro);
            console.log('🔍 Intentando reinicializar para compra...');
            
            // Intentar reinicializar si es posible
            try {
                if (typeof window.BingoPro === 'function') {
                    console.log('🔧 Reinicializando BingoGame para compra...');
                    window.bingoGame = new window.BingoPro();
                    window.bingoGame.initializeGame();
                    console.log('✅ BingoGame reinicializado exitosamente para compra');
                    
                    // Reintentar la compra
                    if (window.bingoGame && quantityInput) {
                        const quantity = parseInt(quantityInput.value);
                        if (!isNaN(quantity) && quantity > 0) {
                            console.log('🔄 Reintentando compra después de reinicialización...');
                            const result = window.bingoGame.buyCards(quantity);
                            if (result) {
                                console.log('✅ Compra exitosa después de reinicialización');
                                return;
                            }
                        }
                    }
                } else {
                    console.error('❌ Clase BingoPro no disponible para reinicialización');
                }
            } catch (error) {
                console.error('❌ Error al reinicializar BingoGame para compra:', error);
            }
        }
    }
}

function joinCurrentGame() {
    if (window.bingoGame) {
        window.bingoGame.joinGame();
    }
}

// Función para alternar el chat - VERSIÓN MEJORADA PARA FIREFOX
function toggleChat() {
    const chatSection = document.getElementById('chatSectionFixed');
    const toggleBtn = document.getElementById('chatToggleBtn');
    
    // ✨ NUEVO: Reducir logging para evitar advertencias de debug en Firefox
    
    if (!chatSection || !toggleBtn) {
        console.error('❌ Chat elements not found');
        return;
    }
    
    const isExpanded = chatSection.classList.contains('expanded');
    
    if (isExpanded) {
        // Colapsar el chat
        chatSection.classList.remove('expanded');
        toggleBtn.classList.remove('active');
        
        // Limpiar el input cuando se colapsa
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.blur();
        }
    } else {
        // Expandir el chat
        chatSection.classList.add('expanded');
        toggleBtn.classList.add('active');
        
        // ✨ NUEVO: Configuración mejorada para Firefox
        setTimeout(() => {
            const chatInput = document.getElementById('chatInput');
            const btnSend = document.querySelector('.btn-send');
            
            if (chatInput && btnSend) {
                // ✨ NUEVO: Configuración específica para Firefox
                chatInput.readOnly = false;
                chatInput.disabled = false;
                chatInput.style.pointerEvents = 'auto';
                chatInput.style.userSelect = 'text';
                chatInput.style.webkitUserSelect = 'text';
                chatInput.style.mozUserSelect = 'text'; // ✨ NUEVO: Soporte específico para Firefox
                
                // Enfocar y seleccionar
                try {
                    chatInput.focus();
                    chatInput.select();
                } catch (e) {
                    // ✨ NUEVO: Fallback para Firefox si focus/select fallan
                    console.warn('⚠️ Fallback para Firefox en focus/select del chat');
                }
                
                // Función para enviar mensaje
                const sendMessage = () => {
                    const message = chatInput.value.trim();
                    if (message && window.bingoGame) {
                        window.bingoGame.sendChatMessage(message);
                        chatInput.value = '';
                        try {
                            chatInput.focus();
                        } catch (e) {
                            // Fallback para Firefox
                        }
                    }
                };
                
                // ✨ NUEVO: Event listeners mejorados para Firefox
                const keypressHandler = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        sendMessage();
                        return false;
                    }
                };
                
                const clickHandler = function() {
                    try {
                        this.focus();
                        this.select();
                    } catch (e) {
                        // Fallback para Firefox
                    }
                };
                
                const sendClickHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    sendMessage();
                };
                
                // Remover event listeners anteriores para evitar duplicados
                chatInput.removeEventListener('keypress', keypressHandler);
                chatInput.removeEventListener('click', clickHandler);
                btnSend.removeEventListener('click', sendClickHandler);
                
                // Agregar nuevos event listeners
                chatInput.addEventListener('keypress', keypressHandler);
                chatInput.addEventListener('click', clickHandler);
                btnSend.addEventListener('click', sendClickHandler);
                
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
    console.log(`🎯 markNumberAsCalled() ejecutándose para número: ${number}`);
    
    // 🚀 ACTUALIZAR ESTADO CENTRAL DEL JUEGO
    if (window.bingoGame && typeof window.bingoGame.addCalledNumber === 'function') {
        window.bingoGame.addCalledNumber(number);
        console.log(`✅ Número ${number} agregado al estado central del juego`);
    } else {
        console.warn('⚠️ BingoGame no disponible o método addCalledNumber no encontrado');
    }
    
    // 🎨 ACTUALIZAR VISUALIZACIÓN
    const numberElement = document.querySelector(`[data-number="${number}"]`);
    if (numberElement) {
        numberElement.classList.add('called', 'recent');
        setTimeout(() => {
            numberElement.classList.remove('recent');
        }, 1000);
        console.log(`✅ Número ${number} marcado visualmente`);
    } else {
        console.warn(`⚠️ Elemento del número ${number} no encontrado en el DOM`);
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
    console.log(`🎮 Intentando cambiar modo de juego a: ${modeId}`);
    console.log('🔍 DIAGNÓSTICO COMPLETO DE selectGameMode:');
    console.log('🔍 modeId recibido:', modeId);
    console.log('🔍 typeof window.bingoGame:', typeof window.bingoGame);
    console.log('🔍 window.bingoGame existe:', !!window.bingoGame);
    console.log('🔍 window.bingoGame.constructor:', window.bingoGame?.constructor?.name);
    
    if (typeof window.bingoGame !== 'undefined' && window.bingoGame) {
        console.log('✅ BingoGame encontrado, ejecutando changeGameMode...');
        
        // 🎯 VERIFICAR MÉTODO changeGameMode
        if (typeof window.bingoGame.changeGameMode !== 'function') {
            console.error('❌ changeGameMode no es una función');
            console.log('🔍 Métodos disponibles:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.bingoGame)));
            return false;
        }
        
        try {
        const success = window.bingoGame.changeGameMode(modeId);
            console.log('🔍 Resultado de changeGameMode:', success);
            
        if (success) {
            console.log('✅ Modo de juego cambiado exitosamente');
            // Actualizar estado visual de las tarjetas
                if (typeof updateModeCardsVisualState === 'function') {
            updateModeCardsVisualState();
        } else {
                    console.warn('⚠️ updateModeCardsVisualState no está disponible');
                }
                return true;
            } else {
                console.error('❌ changeGameMode retornó false');
                return false;
            }
        } catch (error) {
            console.error('❌ Error ejecutando changeGameMode:', error);
            return false;
        }
    } else {
        console.error('❌ BingoGame no está inicializado');
        console.log('🔍 Estado de window.bingoGame:', typeof window.bingoGame, window.bingoGame);
        console.log('🔍 Verificando inicialización...');
        console.log('🔍 "bingoGame" in window:', 'bingoGame' in window);
        console.log('🔍 window.hasOwnProperty("bingoGame"):', window.hasOwnProperty('bingoGame'));
        console.log('🔍 window.BingoPro disponible:', typeof window.BingoPro);
        console.log('🔍 Intentando reinicializar...');
        
        // Intentar reinicializar si es posible
        try {
            if (typeof window.BingoPro === 'function') {
                console.log('🔧 Reinicializando BingoGame...');
                window.bingoGame = new window.BingoPro();
                window.bingoGame.initializeGame();
                console.log('✅ BingoGame reinicializado exitosamente');
                
                // Reintentar la operación
                if (window.bingoGame) {
                    const success = window.bingoGame.changeGameMode(modeId);
                    if (success) {
                        console.log('✅ Modo de juego cambiado exitosamente después de reinicialización');
                        if (typeof updateModeCardsVisualState === 'function') {
                        updateModeCardsVisualState();
                        }
                        return true;
                    }
                }
            } else {
                console.error('❌ Clase BingoPro no disponible');
            }
        } catch (error) {
            console.error('❌ Error al reinicializar BingoGame:', error);
        }
        
        return false;
    }
}

/**
 * Actualizar estado visual de las tarjetas de modo
 */
function updateModeCardsVisualState() {
    const modeCards = document.querySelectorAll('.mode-card');
    const currentMode = window.bingoGame ? window.bingoGame.getCurrentGameMode() : null;
    
    modeCards.forEach(card => {
        const modeId = card.dataset.mode;
        const availableModes = window.bingoGame ? window.bingoGame.getAvailableGameModes() : [];
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
    // Verificar si bingoGame está disponible
    if (window.bingoGame) {
        updateModeCardsVisualState();
    } else {
        // Si no está disponible, esperar y reintentar
        setTimeout(() => {
            if (window.bingoGame) {
                updateModeCardsVisualState();
            } else {
                console.warn('⚠️ bingoGame no disponible para inicializar modo de tarjetas');
            }
        }, 2000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM cargado, verificando inicialización de BingoGame...');
    
    // ✨ NUEVO: Verificar y esperar a que bingoGame esté disponible
    const checkBingoGame = () => {
        if (window.bingoGame) {
            console.log('✅ BingoGame disponible, inicializando modo de tarjetas...');
            initializeModeCards();
            updateModeCardsVisualState();
        } else {
            console.log('⏳ BingoGame no disponible aún, reintentando en 1 segundo...');
            setTimeout(checkBingoGame, 1000);
        }
    };
    
    // Iniciar verificación
    checkBingoGame();
    
    // ✨ NUEVO: Configurar event listeners del chat
    console.log('🔧 Configurando event listeners del chat...');
    
    // Event listener para el botón toggle del chat
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    if (chatToggleBtn) {
        // ✨ NUEVO: Reducir logging para evitar advertencias de debug en Firefox
        chatToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleChat();
        });
    } else {
        console.error('❌ Botón toggle del chat no encontrado');
    }
    
    // Event listener para el botón enviar del chat
    const chatSendBtn = document.querySelector('.btn-send');
    if (chatSendBtn) {
        console.log('✅ Botón enviar del chat encontrado, configurando event listener...');
        chatSendBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔧 Click en botón enviar del chat detectado');
            sendChatMessage();
        });
    } else {
        console.warn('⚠️ Botón enviar del chat no encontrado, reintentando en 1 segundo...');
        // Reintentar después de un delay
        setTimeout(() => {
            const retryBtn = document.querySelector('.btn-send');
            if (retryBtn) {
                console.log('✅ Botón enviar del chat encontrado en reintento, configurando...');
                retryBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    sendChatMessage();
                });
            } else {
                console.error('❌ Botón enviar del chat no encontrado después del reintento');
            }
        }, 1000);
    }
    
    // Event listener para el botón cerrar del chat
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    if (chatCloseBtn) {
        console.log('✅ Botón cerrar del chat encontrado, configurando event listener...');
        chatCloseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔧 Click en botón cerrar del chat detectado');
            toggleChat();
        });
    } else {
        console.warn('⚠️ Botón cerrar del chat no encontrado, reintentando en 1 segundo...');
        // Reintentar después de un delay
        setTimeout(() => {
            const retryBtn = document.getElementById('chatCloseBtn');
            if (retryBtn) {
                console.log('✅ Botón cerrar del chat encontrado en reintento, configurando...');
                retryBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleChat();
                });
            } else {
                console.error('❌ Botón cerrar del chat no encontrado después del reintento');
            }
        }, 1000);
    }
    
    // Event listener para el input del chat (Enter key)
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        console.log('✅ Input del chat encontrado, configurando event listener...');
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔧 Enter presionado en input del chat');
                sendChatMessage();
            }
        });
        
        // Event listener para click en el input
        chatInput.addEventListener('click', function() {
            this.focus();
            this.select();
        });
    } else {
        console.warn('⚠️ Input del chat no encontrado, reintentando en 1 segundo...');
        // Reintentar después de un delay
        setTimeout(() => {
            const retryInput = document.getElementById('chatInput');
            if (retryInput) {
                console.log('✅ Input del chat encontrado en reintento, configurando...');
                retryInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        sendChatMessage();
                    }
                });
                
                retryInput.addEventListener('click', function() {
                    this.focus();
                    this.select();
                });
            } else {
                console.error('❌ Input del chat no encontrado después del reintento');
            }
        }, 1000);
    }
    
    console.log('✅ Event listeners del chat configurados correctamente');
    
    // ✨ NUEVO: Agregar mensaje de bienvenida cuando se expanda el chat
    const chatSection = document.getElementById('chatSectionFixed');
    if (chatSection && !chatSection.dataset.welcomeSent) {
        chatSection.dataset.welcomeSent = 'true';
        console.log('🎉 Chat configurado para mostrar mensaje de bienvenida');
    }
});

// ===== PRELOADER Y TRANSICIONES SUAVES =====
// Función para ocultar el preloader
function hidePreloader() {
    const preloader = document.getElementById('pagePreloader');
    if (preloader) {
        preloader.classList.add('fade-out');
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    }
}

// Ocultar preloader cuando la página esté completamente cargada
window.addEventListener('load', function() {
    // Pequeño delay para asegurar que todo esté renderizado
    setTimeout(hidePreloader, 300);
});

// También ocultar si el DOM está listo y no hay imágenes pesadas
document.addEventListener('DOMContentLoaded', function() {
    // Si no hay imágenes, ocultar inmediatamente
    const images = document.querySelectorAll('img');
    if (images.length === 0) {
        setTimeout(hidePreloader, 200);
    }
});

// ===== ELIMINACIÓN DE MODALES/OVERLAYS NO DESEADOS =====
// Eliminar cualquier modal o overlay que se esté mostrando por defecto
document.addEventListener('DOMContentLoaded', function() {
    // Eliminar cualquier modal que se esté mostrando
    const visibleModals = document.querySelectorAll('.modal.show, .modal[style*="display: block"], .modal[style*="opacity: 1"]');
    visibleModals.forEach(modal => {
        console.log('🔧 Eliminando modal visible no deseado:', modal);
        modal.remove();
    });
    
    // Eliminar cualquier overlay que se esté mostrando
    const visibleOverlays = document.querySelectorAll('.modal-overlay.show, .overlay.show, [class*="overlay"][style*="display: block"], [class*="overlay"][style*="opacity: 1"]');
    visibleOverlays.forEach(overlay => {
        console.log('🔧 Eliminando overlay visible no deseado:', overlay);
        overlay.remove();
    });
    
    // Eliminar cualquier elemento con backdrop-filter que se esté mostrando
    const backdropElements = document.querySelectorAll('[style*="backdrop-filter"], [style*="filter: blur"]');
    backdropElements.forEach(element => {
        if (element.style.backdropFilter || element.style.filter) {
            console.log('🔧 Limpiando backdrop-filter no deseado:', element);
            element.style.backdropFilter = '';
            element.style.filter = '';
        }
    });
    
    // Asegurar que el body y app-container no tengan opacidad 0
    if (document.body.style.opacity === '0') {
        document.body.style.opacity = '1';
        console.log('🔧 Corrigiendo opacidad del body');
    }
    
    const appContainer = document.querySelector('.app-container');
    if (appContainer && appContainer.style.opacity === '0') {
        appContainer.style.opacity = '1';
        console.log('🔧 Corrigiendo opacidad del app-container');
    }
});

// ===== PRELOADER Y TRANSICIONES SUAVES =====
// ===== PRELOADER Y TRANSICIONES SUAVES =====

    // 🚨 FUNCIÓN DE PRUEBA PARA VERIFICAR EL HEADER
    window.testHeaderUpdate = function() {
        console.log('🚨🚨🚨 FUNCIÓN DE PRUEBA EJECUTÁNDOSE 🚨🚨🚨');

        const usernameElement = document.getElementById('headerUsername');
        const levelElement = document.getElementById('headerUserLevel');

        if (usernameElement && levelElement) {
            console.log('🔍 Elementos del header encontrados en prueba');
            console.log('🔍 Contenido ACTUAL del headerUsername:', usernameElement.textContent);
            console.log('🔍 Contenido ACTUAL del headerUserLevel:', levelElement.textContent);

            // Intentar actualizar con datos de prueba
            usernameElement.textContent = 'USUARIO DE PRUEBA';
            levelElement.textContent = 'NIVEL DE PRUEBA';

            console.log('🔍 Contenido DESPUÉS de prueba headerUsername:', usernameElement.textContent);
            console.log('🔍 Contenido DESPUÉS de prueba headerUserLevel:', levelElement.textContent);

            // Verificar si se mantiene
            setTimeout(() => {
                console.log('🔍 Contenido DESPUÉS de 2 segundos headerUsername:', usernameElement.textContent);
                console.log('🔍 Contenido DESPUÉS de 2 segundos headerUserLevel:', levelElement.textContent);
            }, 2000);

        } else {
            console.log('❌ Elementos del header NO encontrados en prueba');
        }
    };
    
    // 🚀 NUEVO: Función para simular llamado de números (testing)
    window.simulateNumberCall = function(number) {
        console.log(`🎲 Simulando llamado del número: ${number}`);
        
        if (window.bingoGame && typeof window.bingoGame.addCalledNumber === 'function') {
            window.bingoGame.addCalledNumber(number);
            console.log(`✅ Número ${number} simulado correctamente`);
        } else {
            console.error('❌ BingoGame no disponible o método addCalledNumber no encontrado');
        }
    };
    
    // 🚀 NUEVO: Función para verificar estado del juego
    window.checkGameState = function() {
        console.log('🔍 Verificando estado del juego...');
        
        if (window.bingoGame) {
            console.log('✅ BingoGame disponible');
            console.log('🔍 Números llamados:', Array.from(window.bingoGame.calledNumbers || []));
            console.log('🔍 Cartas del usuario:', window.bingoGame.userCards?.length || 0);
            console.log('🔍 Modo actual:', window.bingoGame.getCurrentGameMode()?.id || 'N/A');
        } else {
            console.error('❌ BingoGame no disponible');
        }
    };

// 🚀 SISTEMA ROBUSTO DE ESTADO CENTRAL
window.BingoAppState = {
    // Estado central de la aplicación
    user: null,
    isInitialized: false,
    
    // Inicializar estado
    init() {
        console.log('🚀 Inicializando BingoAppState...');
        this.loadFromSession();
        this.isInitialized = true;
        console.log('✅ BingoAppState inicializado:', this.user);
    },
    
    // Cargar datos de la sesión
    loadFromSession() {
        try {
            const sessionData = localStorage.getItem('bingoroyal_session');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                this.user = session.user || null;
                console.log('✅ Usuario cargado desde sesión:', this.user);
            }
        } catch (error) {
            console.error('❌ Error cargando sesión:', error);
        }
    },
    
    // Actualizar usuario
    updateUser(userData) {
        console.log('🔄 Actualizando usuario en estado central:', userData);
        this.user = { ...this.user, ...userData };
        
        // Guardar en localStorage
        this.saveToSession();
        
        // Disparar evento de cambio
        this.notifyUserUpdate();
        
        console.log('✅ Usuario actualizado en estado central:', this.user);
    },
    
    // Guardar en sesión
    saveToSession() {
        try {
            const sessionData = localStorage.getItem('bingoroyal_session');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                session.user = this.user;
                localStorage.setItem('bingoroyal_session', JSON.stringify(session));
                console.log('✅ Sesión actualizada en localStorage');
            }
        } catch (error) {
            console.error('❌ Error guardando sesión:', error);
        }
    },
    
    // Notificar cambio de usuario
    notifyUserUpdate() {
        const event = new CustomEvent('userUpdated', { 
            detail: { user: this.user } 
        });
        document.dispatchEvent(event);
        console.log('📡 Evento userUpdated disparado');
    },
    
    // Obtener datos del usuario
    getUser() {
        return this.user;
    },
    
    // Verificar si hay usuario
    hasUser() {
        return this.user !== null;
    }
};

// 🚀 SISTEMA ROBUSTO DE HEADER
window.HeaderManager = {
    // Estado del header
    isLocked: false,
    lastUpdate: null,
    
    // Inicializar header
    init() {
        console.log('🚀 Inicializando HeaderManager...');
        this.bindEvents();
        this.updateFromState();
        console.log('✅ HeaderManager inicializado');
    },
    
    // Vincular eventos
    bindEvents() {
        // Escuchar cambios de usuario
        document.addEventListener('userUpdated', (event) => {
            console.log('📡 HeaderManager recibió evento userUpdated:', event.detail);
            this.updateFromState();
        });
        
        // Proteger contra cambios externos
        this.protectHeader();
        
        console.log('✅ Eventos vinculados en HeaderManager');
    },
    
    // Proteger header contra cambios externos
    protectHeader() {
        const usernameElement = document.getElementById('headerUsername');
        const levelElement = document.getElementById('headerUserLevel');
        
        if (usernameElement && levelElement) {
            // Observar cambios en el DOM
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                        // Verificar si el cambio no viene de nosotros
                        if (!this.isLocked && this.lastUpdate) {
                            const timeSinceUpdate = Date.now() - this.lastUpdate;
                            if (timeSinceUpdate < 1000) { // Cambio reciente, ignorar
                                return;
                            }
                            
                            // Cambio externo detectado, restaurar
                            console.log('🚨 Cambio externo detectado en header, restaurando...');
                            this.updateFromState();
                        }
                    }
                });
            });
            
            observer.observe(usernameElement, { 
                childList: true, 
                characterData: true, 
                subtree: true 
            });
            
            observer.observe(levelElement, { 
                childList: true, 
                characterData: true, 
                subtree: true 
            });
            
            console.log('✅ Header protegido contra cambios externos');
        }
    },
    
    // Actualizar header desde estado central
    updateFromState() {
        console.log('🔄 HeaderManager actualizando desde estado central...');
        
        const user = window.BingoAppState.getUser();
        if (!user) {
            console.log('⚠️ No hay usuario en estado central');
            return;
        }
        
        const usernameElement = document.getElementById('headerUsername');
        const levelElement = document.getElementById('headerUserLevel');
        const balanceElement = document.getElementById('userBalance');
        
        if (usernameElement && levelElement) {
            // Bloquear actualizaciones
            this.isLocked = true;
            
            // Actualizar username
            let displayName = 'Usuario';
            if (user.firstName && user.lastName) {
                displayName = `${user.firstName} ${user.lastName}`;
            } else if (user.email) {
                const emailName = user.email.split('@')[0];
                displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
            }
            
            usernameElement.textContent = displayName;
            console.log('✅ Username actualizado:', displayName);
            
            // Actualizar nivel
            const level = user.level || 1;
            levelElement.textContent = `Nivel ${level}`;
            console.log('✅ Nivel actualizado:', level);
            
            // Actualizar balance
            if (balanceElement && user.balance !== undefined) {
                balanceElement.textContent = `€${user.balance.toFixed(2)}`;
                console.log('✅ Balance actualizado:', user.balance);
            }
            
            // Marcar última actualización
            this.lastUpdate = Date.now();
            
            // Desbloquear
            this.isLocked = false;
            
            console.log('✅ Header actualizado desde estado central');
        } else {
            console.warn('⚠️ Elementos del header no encontrados');
        }
    },
    
    // Forzar actualización
    forceUpdate() {
        console.log('🚨 Forzando actualización del header...');
        this.updateFromState();
    }
};