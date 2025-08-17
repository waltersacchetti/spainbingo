/* ===== SISTEMA SOCIAL AVANZADO v3.0 ===== */
/* Sistema completo de amigos, clanes, salas privadas y competencias */

class SocialSystem {
    constructor(bingoGame) {
        this.bingoGame = bingoGame;
        this.socialData = {
            friends: new Map(),
            friendRequests: new Map(),
            clan: null,
            clanInvites: [],
            gifts: [],
            socialStats: {
                friendsAdded: 0,
                giftsReceived: 0,
                giftsSent: 0,
                clanContributions: 0,
                socialScore: 0
            }
        };
        
        // Configuraciones del sistema
        this.maxFriends = 100;
        this.maxClanMembers = 50;
        this.giftTypes = this.initializeGiftTypes();
        this.clanBenefits = this.initializeClanBenefits();
        
        console.log('👥 Social System inicializando...');
        this.loadSocialData();
        this.createInterface();
        this.simulateOnlineFriends();
        this.initializeSocialFeatures();
    }

    /**
     * Inicializar tipos de regalos
     */
    initializeGiftTypes() {
        return {
            free_card: {
                id: 'free_card',
                name: 'Cartón Gratis',
                description: 'Un cartón gratuito para tu amigo',
                icon: 'fa-gift',
                cost: 0,
                cooldown: 24 * 60 * 60 * 1000, // 24 horas
                value: 2.50
            },
            bonus_xp: {
                id: 'bonus_xp',
                name: 'Bonus XP',
                description: '+100 XP para tu amigo',
                icon: 'fa-star',
                cost: 0,
                cooldown: 12 * 60 * 60 * 1000, // 12 horas
                value: 100
            },
            lucky_charm: {
                id: 'lucky_charm',
                name: 'Amuleto de la Suerte',
                description: '+10% suerte en la próxima partida',
                icon: 'fa-clover',
                cost: 50, // BingoCoins
                cooldown: 6 * 60 * 60 * 1000, // 6 horas
                value: 0,
                effect: 'luck_boost'
            },
            premium_coins: {
                id: 'premium_coins',
                name: '500 BingoCoins',
                description: 'Monedas premium para tu amigo',
                icon: 'fa-coins',
                cost: 100, // BingoCoins
                cooldown: 48 * 60 * 60 * 1000, // 48 horas
                value: 500
            },
            energy_boost: {
                id: 'energy_boost',
                name: 'Boost de Energía',
                description: 'Regenera energía completamente',
                icon: 'fa-bolt',
                cost: 25, // BingoCoins
                cooldown: 8 * 60 * 60 * 1000, // 8 horas
                value: 0,
                effect: 'energy_full'
            }
        };
    }

    /**
     * Inicializar beneficios de clan
     */
    initializeClanBenefits() {
        return {
            level_1: {
                level: 1,
                membersRequired: 5,
                benefits: {
                    xpBonus: 5,
                    coinBonus: 5,
                    dailyGifts: 1
                },
                perks: [
                    'Chat privado de clan',
                    '+5% XP y monedas',
                    '1 regalo diario gratis'
                ]
            },
            level_2: {
                level: 2,
                membersRequired: 15,
                benefits: {
                    xpBonus: 10,
                    coinBonus: 10,
                    dailyGifts: 2,
                    tournamentDiscount: 10
                },
                perks: [
                    'Beneficios nivel 1',
                    '+10% XP y monedas',
                    '2 regalos diarios gratis',
                    '10% descuento en torneos'
                ]
            },
            level_3: {
                level: 3,
                membersRequired: 30,
                benefits: {
                    xpBonus: 15,
                    coinBonus: 15,
                    dailyGifts: 3,
                    tournamentDiscount: 15,
                    exclusiveRooms: 1
                },
                perks: [
                    'Beneficios nivel 2',
                    '+15% XP y monedas',
                    '3 regalos diarios gratis',
                    '15% descuento en torneos',
                    'Sala exclusiva de clan'
                ]
            },
            level_4: {
                level: 4,
                membersRequired: 45,
                benefits: {
                    xpBonus: 20,
                    coinBonus: 20,
                    dailyGifts: 5,
                    tournamentDiscount: 20,
                    exclusiveRooms: 2,
                    weeklyBonus: 1000
                },
                perks: [
                    'Beneficios nivel 3',
                    '+20% XP y monedas',
                    '5 regalos diarios gratis',
                    '20% descuento en torneos',
                    '2 salas exclusivas',
                    'Bonus semanal de 1000 coins'
                ]
            }
        };
    }

    /**
     * Crear interfaz social
     */
    createInterface() {
        const socialPanel = document.createElement('div');
        socialPanel.id = 'socialSystemPanel';
        socialPanel.className = 'social-system-panel card-premium';
        
        socialPanel.innerHTML = `
            <div class="social-header">
                <div class="social-title">
                    <h3><i class="fas fa-users"></i> Centro Social</h3>
                    <div class="social-status">
                        <span class="friend-count">${this.socialData.friends.size} amigos</span>
                        <span class="clan-status">${this.socialData.clan ? this.socialData.clan.name : 'Sin clan'}</span>
                    </div>
                </div>
                <button class="social-toggle" id="toggleSocial">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            
            <div class="social-content" id="socialContent">
                <div class="social-tabs">
                    <button class="tab-btn active" data-tab="friends">Amigos</button>
                    <button class="tab-btn" data-tab="clan">Clan</button>
                    <button class="tab-btn" data-tab="gifts">Regalos</button>
                    <button class="tab-btn" data-tab="rooms">Salas</button>
                </div>
                
                <div class="tab-content active" id="friendsTab">
                    ${this.generateFriendsHTML()}
                </div>
                
                <div class="tab-content" id="clanTab">
                    ${this.generateClanHTML()}
                </div>
                
                <div class="tab-content" id="giftsTab">
                    ${this.generateGiftsHTML()}
                </div>
                
                <div class="tab-content" id="roomsTab">
                    ${this.generateRoomsHTML()}
                </div>
            </div>
        `;
        
        // Insertar en el DOM
        const sidebar = document.querySelector('.game-sidebar');
        if (sidebar) {
            sidebar.appendChild(socialPanel);
        } else {
            document.body.appendChild(socialPanel);
        }
        
        this.bindSocialEvents();
    }

    /**
     * Generar HTML de amigos
     */
    generateFriendsHTML() {
        const friendRequests = Array.from(this.socialData.friendRequests.values());
        const friends = Array.from(this.socialData.friends.values());
        
        return `
            <div class="friends-section">
                <div class="add-friend-section">
                    <h4>Agregar Amigo</h4>
                    <div class="add-friend-form">
                        <input type="text" id="friendUsername" placeholder="Nombre de usuario" maxlength="20">
                        <button class="social-btn" id="addFriendBtn">
                            <i class="fas fa-user-plus"></i> Agregar
                        </button>
                    </div>
                </div>
                
                ${friendRequests.length > 0 ? `
                    <div class="friend-requests">
                        <h4>Solicitudes Pendientes (${friendRequests.length})</h4>
                        <div class="requests-list">
                            ${friendRequests.map(request => `
                                <div class="request-item">
                                    <div class="request-info">
                                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${request.username}" 
                                             alt="Avatar" class="user-avatar">
                                        <div class="user-details">
                                            <span class="username">${request.username}</span>
                                            <span class="user-level">Nivel ${request.level}</span>
                                        </div>
                                    </div>
                                    <div class="request-actions">
                                        <button class="accept-btn" data-username="${request.username}">
                                            <i class="fas fa-check"></i>
                                        </button>
                                        <button class="reject-btn" data-username="${request.username}">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="friends-list">
                    <h4>Mis Amigos (${friends.length}/${this.maxFriends})</h4>
                    ${friends.length === 0 ? 
                        '<div class="no-friends">No tienes amigos agregados aún. ¡Comienza a socializar!</div>' :
                        `<div class="friends-grid">
                            ${friends.map(friend => `
                                <div class="friend-item ${friend.online ? 'online' : 'offline'}">
                                    <div class="friend-info">
                                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}" 
                                             alt="Avatar" class="user-avatar">
                                        <div class="friend-details">
                                            <span class="username">${friend.username}</span>
                                            <span class="status">${friend.online ? 'En línea' : 'Desconectado'}</span>
                                            <span class="level">Nivel ${friend.level}</span>
                                        </div>
                                        <div class="online-indicator ${friend.online ? 'online' : 'offline'}"></div>
                                    </div>
                                    <div class="friend-actions">
                                        <button class="action-btn invite-btn" data-username="${friend.username}" 
                                                title="Invitar a partida" ${!friend.online ? 'disabled' : ''}>
                                            <i class="fas fa-gamepad"></i>
                                        </button>
                                        <button class="action-btn gift-btn" data-username="${friend.username}" title="Enviar regalo">
                                            <i class="fas fa-gift"></i>
                                        </button>
                                        <button class="action-btn chat-btn" data-username="${friend.username}" title="Chat privado">
                                            <i class="fas fa-comment"></i>
                                        </button>
                                        <button class="action-btn remove-btn" data-username="${friend.username}" title="Eliminar amigo">
                                            <i class="fas fa-user-minus"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>`
                    }
                </div>
            </div>
        `;
    }

    /**
     * Generar HTML de clan
     */
    generateClanHTML() {
        if (!this.socialData.clan) {
            return this.generateNoClanHTML();
        }
        
        return this.generateClanDetailsHTML();
    }

    /**
     * Generar HTML cuando no hay clan
     */
    generateNoClanHTML() {
        const availableClans = this.getAvailableClans();
        
        return `
            <div class="no-clan-section">
                <div class="create-clan-section">
                    <h4>Crear Clan</h4>
                    <div class="create-clan-form">
                        <input type="text" id="clanName" placeholder="Nombre del clan" maxlength="25">
                        <input type="text" id="clanTag" placeholder="TAG (3-5 chars)" maxlength="5">
                        <textarea id="clanDescription" placeholder="Descripción del clan" maxlength="200"></textarea>
                        <div class="clan-options">
                            <label>
                                <input type="checkbox" id="clanPrivate"> Clan privado (solo por invitación)
                            </label>
                            <label>
                                Nivel mínimo requerido:
                                <select id="clanMinLevel">
                                    <option value="1">Nivel 1</option>
                                    <option value="5">Nivel 5</option>
                                    <option value="10">Nivel 10</option>
                                    <option value="15">Nivel 15</option>
                                    <option value="20">Nivel 20</option>
                                </select>
                            </label>
                        </div>
                        <button class="social-btn" id="createClanBtn">
                            <i class="fas fa-flag"></i> Crear Clan (1000 coins)
                        </button>
                    </div>
                </div>
                
                <div class="join-clan-section">
                    <h4>Unirse a Clan</h4>
                    <div class="clan-search">
                        <input type="text" id="clanSearchInput" placeholder="Buscar clanes...">
                        <button class="social-btn" id="searchClansBtn">
                            <i class="fas fa-search"></i> Buscar
                        </button>
                    </div>
                    
                    <div class="available-clans">
                        ${availableClans.map(clan => `
                            <div class="clan-item">
                                <div class="clan-info">
                                    <div class="clan-header">
                                        <span class="clan-name">${clan.name}</span>
                                        <span class="clan-tag">[${clan.tag}]</span>
                                        <span class="clan-level">Nv.${clan.level}</span>
                                    </div>
                                    <div class="clan-details">
                                        <span class="member-count">${clan.members}/${this.maxClanMembers} miembros</span>
                                        <span class="clan-score">${clan.score} puntos</span>
                                    </div>
                                    <p class="clan-description">${clan.description}</p>
                                </div>
                                <div class="clan-actions">
                                    <button class="join-btn" data-clan-id="${clan.id}" 
                                            ${clan.private ? 'data-private="true"' : ''}>
                                        <i class="fas fa-sign-in-alt"></i>
                                        ${clan.private ? 'Solicitar' : 'Unirse'}
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generar HTML de detalles del clan
     */
    generateClanDetailsHTML() {
        const clan = this.socialData.clan;
        const clanLevel = this.calculateClanLevel(clan);
        const benefits = this.clanBenefits[`level_${clanLevel}`];
        
        return `
            <div class="clan-details">
                <div class="clan-header-info">
                    <div class="clan-banner" style="background: ${clan.color}">
                        <h3>${clan.name} [${clan.tag}]</h3>
                        <div class="clan-stats">
                            <span class="clan-level">Nivel ${clanLevel}</span>
                            <span class="clan-score">${clan.score} puntos</span>
                            <span class="member-count">${clan.members.length}/${this.maxClanMembers}</span>
                        </div>
                    </div>
                    <p class="clan-description">${clan.description}</p>
                </div>
                
                <div class="clan-benefits">
                    <h4>Beneficios Activos</h4>
                    <div class="benefits-grid">
                        ${benefits.perks.map(perk => `
                            <div class="benefit-item">
                                <i class="fas fa-check-circle"></i>
                                <span>${perk}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="clan-members">
                    <h4>Miembros del Clan</h4>
                    <div class="members-list">
                        ${clan.members.map(member => `
                            <div class="member-item ${member.online ? 'online' : 'offline'}">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}" 
                                     alt="Avatar" class="user-avatar">
                                <div class="member-info">
                                    <span class="username">${member.username}</span>
                                    <span class="member-role">${member.role}</span>
                                    <span class="member-contribution">${member.contribution} pts</span>
                                </div>
                                <div class="member-actions">
                                    ${member.username !== this.bingoGame.username ? `
                                        <button class="action-btn" data-action="promote" data-username="${member.username}">
                                            <i class="fas fa-arrow-up"></i>
                                        </button>
                                        <button class="action-btn" data-action="kick" data-username="${member.username}">
                                            <i class="fas fa-user-times"></i>
                                        </button>
                                    ` : ''}
                                </div>
                                <div class="online-indicator ${member.online ? 'online' : 'offline'}"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="clan-chat">
                    <h4>Chat del Clan</h4>
                    <div class="clan-chat-messages" id="clanChatMessages">
                        ${this.generateClanChatHTML()}
                    </div>
                    <div class="clan-chat-input">
                        <input type="text" id="clanChatInput" placeholder="Mensaje para el clan..." maxlength="200">
                        <button class="send-btn" id="sendClanMessage">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
                
                <div class="clan-actions">
                    <button class="social-btn danger" id="leaveClanBtn">
                        <i class="fas fa-sign-out-alt"></i> Abandonar Clan
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Vincular eventos sociales
     */
    bindSocialEvents() {
        // Toggle panel
        document.getElementById('toggleSocial')?.addEventListener('click', () => {
            this.toggleSocialPanel();
        });
        
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Agregar amigo
        document.getElementById('addFriendBtn')?.addEventListener('click', () => {
            this.addFriend();
        });
        
        // Aceptar/rechazar solicitudes
        document.querySelectorAll('.accept-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.acceptFriendRequest(e.target.dataset.username);
            });
        });
        
        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.rejectFriendRequest(e.target.dataset.username);
            });
        });
        
        // Acciones de amigos
        document.querySelectorAll('.gift-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showGiftModal(e.target.dataset.username);
            });
        });
        
        // Crear clan
        document.getElementById('createClanBtn')?.addEventListener('click', () => {
            this.createClan();
        });
    }

    /**
     * Funcionalidades principales
     */
    
    addFriend() {
        const username = document.getElementById('friendUsername').value.trim();
        if (!username) {
            this.showError('Ingresa un nombre de usuario');
            return;
        }
        
        if (username === this.bingoGame.username) {
            this.showError('No puedes agregarte a ti mismo');
            return;
        }
        
        if (this.socialData.friends.has(username)) {
            this.showError('Este usuario ya es tu amigo');
            return;
        }
        
        // Simular envío de solicitud
        this.sendFriendRequest(username);
        document.getElementById('friendUsername').value = '';
        this.showSuccess(`Solicitud enviada a ${username}`);
    }
    
    sendFriendRequest(username) {
        // En implementación real, esto enviaría al servidor
        console.log(`📨 Solicitud de amistad enviada a: ${username}`);
        
        // Simular respuesta automática para demo
        setTimeout(() => {
            this.simulateFriendRequestResponse(username);
        }, 2000);
    }
    
    simulateFriendRequestResponse(username) {
        // 70% de probabilidad de aceptar
        if (Math.random() < 0.7) {
            this.addFriendToList(username);
            this.showSuccess(`${username} aceptó tu solicitud de amistad!`);
        } else {
            this.showError(`${username} rechazó tu solicitud`);
        }
    }
    
    addFriendToList(username) {
        const friend = {
            username: username,
            level: Math.floor(Math.random() * 30) + 1,
            online: Math.random() < 0.4, // 40% online
            addedAt: new Date(),
            gamesPlayed: Math.floor(Math.random() * 1000),
            lastSeen: new Date()
        };
        
        this.socialData.friends.set(username, friend);
        this.socialData.socialStats.friendsAdded++;
        this.saveSocialData();
        this.updateInterface();
    }
    
    /**
     * Sistema de clanes
     */
    createClan() {
        const name = document.getElementById('clanName').value.trim();
        const tag = document.getElementById('clanTag').value.trim().toUpperCase();
        const description = document.getElementById('clanDescription').value.trim();
        const isPrivate = document.getElementById('clanPrivate').checked;
        const minLevel = parseInt(document.getElementById('clanMinLevel').value);
        
        if (!name || !tag || !description) {
            this.showError('Completa todos los campos');
            return;
        }
        
        if (tag.length < 3 || tag.length > 5) {
            this.showError('El TAG debe tener entre 3 y 5 caracteres');
            return;
        }
        
        if (this.bingoGame.userBalance < 1000) {
            this.showError('Necesitas 1000 coins para crear un clan');
            return;
        }
        
        // Crear clan
        const clan = {
            id: Date.now().toString(),
            name: name,
            tag: tag,
            description: description,
            private: isPrivate,
            minLevel: minLevel,
            creator: this.bingoGame.username,
            members: [{
                username: this.bingoGame.username,
                role: 'leader',
                joinedAt: new Date(),
                contribution: 0,
                online: true
            }],
            score: 0,
            level: 1,
            color: this.generateClanColor(),
            createdAt: new Date()
        };
        
        this.socialData.clan = clan;
        this.bingoGame.userBalance -= 1000;
        
        this.saveSocialData();
        this.updateInterface();
        this.showSuccess(`Clan "${name}" creado exitosamente!`);
        
        console.log('🏴 Clan creado:', clan);
    }
    
    /**
     * Utilidades
     */
    getAvailableClans() {
        // Simular clanes disponibles
        return [
            {
                id: '1',
                name: 'Reyes del Bingo',
                tag: 'REY',
                description: 'Los mejores jugadores de España',
                members: 35,
                score: 15420,
                level: 3,
                private: false
            },
            {
                id: '2',
                name: 'Números Dorados',
                tag: 'GOLD',
                description: 'Clan VIP para jugadores serios',
                members: 28,
                score: 12800,
                level: 2,
                private: true
            },
            {
                id: '3',
                name: 'Cazadores de Premios',
                tag: 'HUNT',
                description: 'Especialistas en grandes victorias',
                members: 42,
                score: 18750,
                level: 4,
                private: false
            }
        ];
    }
    
    calculateClanLevel(clan) {
        const memberCount = clan.members.length;
        if (memberCount >= 45) return 4;
        if (memberCount >= 30) return 3;
        if (memberCount >= 15) return 2;
        return 1;
    }
    
    generateClanColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    /**
     * Persistencia
     */
    loadSocialData() {
        try {
            const saved = localStorage.getItem('bingoroyal_social_data');
            if (saved) {
                const data = JSON.parse(saved);
                this.socialData = { ...this.socialData, ...data };
                
                // Convertir Maps
                if (data.friends && Array.isArray(data.friends)) {
                    this.socialData.friends = new Map(data.friends);
                }
                if (data.friendRequests && Array.isArray(data.friendRequests)) {
                    this.socialData.friendRequests = new Map(data.friendRequests);
                }
            }
        } catch (error) {
            console.log('⚠️ Error cargando datos sociales:', error);
        }
    }
    
    saveSocialData() {
        try {
            const data = {
                ...this.socialData,
                friends: Array.from(this.socialData.friends.entries()),
                friendRequests: Array.from(this.socialData.friendRequests.entries())
            };
            localStorage.setItem('bingoroyal_social_data', JSON.stringify(data));
        } catch (error) {
            console.log('⚠️ Error guardando datos sociales:', error);
        }
    }
    
    updateInterface() {
        document.getElementById('friendsTab').innerHTML = this.generateFriendsHTML();
        document.getElementById('clanTab').innerHTML = this.generateClanHTML();
        this.bindSocialEvents();
    }
    
    /**
     * Simular amigos online
     */
    simulateOnlineFriends() {
        setInterval(() => {
            this.socialData.friends.forEach(friend => {
                // Cambio aleatorio de estado online
                if (Math.random() < 0.1) { // 10% posibilidad cada minuto
                    friend.online = !friend.online;
                    if (friend.online) {
                        friend.lastSeen = new Date();
                    }
                }
            });
            
            if (this.socialData.friends.size > 0) {
                this.updateInterface();
            }
        }, 60000); // Cada minuto
    }
    
    /**
     * Destruir sistema
     */
    destroy() {
        document.getElementById('socialSystemPanel')?.remove();
        console.log('👥 Social System destruido');
    }
}

// CSS básico para sistema social
const socialSystemCSS = `
.social-system-panel {
    margin-bottom: var(--spacing-lg);
    animation: slideInUp 1s ease-out;
}

.social-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.social-status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--spacing-xs);
    font-size: 0.9rem;
}

.friend-count {
    color: #90EE90;
    font-weight: 600;
}

.clan-status {
    color: #FFD700;
    font-weight: 600;
}

.social-content {
    padding: var(--spacing-md);
    background: var(--glass-bg);
    color: white;
}

.add-friend-form {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
}

.add-friend-form input {
    flex: 1;
    padding: var(--spacing-sm);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    background: rgba(255, 255, 255, 0.1);
    color: white;
}

.friends-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
}

.friend-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-left: 4px solid transparent;
    transition: all var(--transition-medium);
}

.friend-item.online {
    border-left-color: #00ff00;
}

.friend-item.offline {
    border-left-color: #666;
    opacity: 0.7;
}

.friend-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    position: relative;
}

.user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid var(--premium-gold);
}

.friend-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.username {
    font-weight: 600;
    color: white;
}

.status {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.8);
}

.level {
    font-size: 0.8rem;
    color: var(--premium-gold);
}

.online-indicator {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--glass-bg);
}

.online-indicator.online {
    background: #00ff00;
}

.online-indicator.offline {
    background: #666;
}

.friend-actions {
    display: flex;
    gap: var(--spacing-xs);
}

.action-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.1);
    color: white;
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
}

.action-btn:hover:not(:disabled) {
    background: var(--premium-gold);
    color: var(--premium-royal-blue-dark);
    transform: translateY(-2px);
}

.action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.clan-banner {
    padding: var(--spacing-lg);
    border-radius: var(--radius-md);
    text-align: center;
    margin-bottom: var(--spacing-md);
    position: relative;
    overflow: hidden;
}

.clan-banner::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, 
        rgba(255,255,255,0.1) 25%, 
        transparent 25%, 
        transparent 75%, 
        rgba(255,255,255,0.1) 75%);
    background-size: 30px 30px;
}

.clan-stats {
    display: flex;
    justify-content: center;
    gap: var(--spacing-lg);
    margin-top: var(--spacing-md);
}

.clan-stats span {
    background: rgba(0,0,0,0.3);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
}

.benefits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
}

.benefit-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    background: rgba(255, 255, 255, 0.05);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
}

.benefit-item i {
    color: #00ff00;
}

@media (max-width: 768px) {
    .friend-item {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
    }
    
    .friend-actions {
        align-self: stretch;
        justify-content: space-around;
    }
    
    .clan-stats {
        flex-direction: column;
        gap: var(--spacing-sm);
    }
}
`;

// Inyectar CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = socialSystemCSS;
document.head.appendChild(styleSheet);

// Exportar clase
window.SocialSystem = SocialSystem; 