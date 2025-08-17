/* ===== SISTEMA VIP MULTINIVEL AVANZADO v3.0 ===== */
/* Sistema VIP premium para máxima conversión y retención */

class AdvancedVipSystem {
    constructor(bingoGame) {
        this.bingoGame = bingoGame;
        this.currentVipTier = 'none';
        this.vipData = {
            tier: 'none',
            points: 0,
            totalSpent: 0,
            joinDate: null,
            benefits: [],
            cashbackAccumulated: 0,
            exclusiveAccess: [],
            personalManager: null
        };
        
        // Configuración de tiers VIP
        this.vipTiers = this.initializeVipTiers();
        this.vipBenefits = this.initializeVipBenefits();
        this.vipEvents = new Map();
        this.vipNotifications = [];
        
        console.log('👑 Advanced VIP System inicializando...');
        this.loadVipData();
        this.createInterface();
        this.initializeVipFeatures();
    }

    /**
     * Inicializar tiers VIP
     */
    initializeVipTiers() {
        return {
            bronze: {
                id: 'bronze',
                name: 'VIP Bronze',
                icon: 'fa-medal',
                color: '#CD7F32',
                gradient: 'linear-gradient(135deg, #CD7F32, #DEB887)',
                requirements: {
                    minimumSpent: 50,
                    minimumGames: 25,
                    timeframe: 30 // días
                },
                benefits: {
                    discount: 20,           // 20% descuento
                    potBonus: 50,           // +50% en botes
                    cashback: 5,            // 5% cashback mensual
                    exclusiveRooms: 1,      // Acceso a 1 sala exclusiva
                    personalSupport: false,
                    freeCards: 5,           // 5 cartones gratis/mes
                    prioritySupport: true,
                    exclusiveEvents: true,
                    bonusXP: 25            // +25% XP
                },
                perks: [
                    'Descuento 20% en todos los cartones',
                    'Botes aumentados +50%',
                    'Cashback mensual del 5%',
                    'Sala VIP Bronze exclusiva',
                    '5 cartones gratis al mes',
                    'Soporte prioritario',
                    'Eventos exclusivos VIP'
                ]
            },

            silver: {
                id: 'silver',
                name: 'VIP Silver',
                icon: 'fa-star',
                color: '#C0C0C0',
                gradient: 'linear-gradient(135deg, #C0C0C0, #E8E8E8)',
                requirements: {
                    minimumSpent: 150,
                    minimumGames: 75,
                    timeframe: 30
                },
                benefits: {
                    discount: 30,
                    potBonus: 75,
                    cashback: 7,
                    exclusiveRooms: 2,
                    personalSupport: false,
                    freeCards: 10,
                    prioritySupport: true,
                    exclusiveEvents: true,
                    bonusXP: 40,
                    weeklyBonus: 25        // €25 bonus semanal
                },
                perks: [
                    'Descuento 30% en todos los cartones',
                    'Botes aumentados +75%',
                    'Cashback mensual del 7%',
                    '2 salas VIP exclusivas',
                    '10 cartones gratis al mes',
                    'Bonus semanal de €25',
                    'Invitaciones a eventos especiales',
                    'Acceso anticipado a nuevas salas'
                ]
            },

            gold: {
                id: 'gold',
                name: 'VIP Gold',
                icon: 'fa-crown',
                color: '#FFD700',
                gradient: 'linear-gradient(135deg, #FFD700, #FFF8DC)',
                requirements: {
                    minimumSpent: 400,
                    minimumGames: 200,
                    timeframe: 30
                },
                benefits: {
                    discount: 40,
                    potBonus: 100,
                    cashback: 10,
                    exclusiveRooms: 3,
                    personalSupport: true,
                    freeCards: 20,
                    prioritySupport: true,
                    exclusiveEvents: true,
                    bonusXP: 60,
                    weeklyBonus: 50,
                    monthlyGift: true       // Regalo físico mensual
                },
                perks: [
                    'Descuento 40% en todos los cartones',
                    'Botes aumentados +100%',
                    'Cashback mensual del 10%',
                    '3 salas VIP exclusivas',
                    '20 cartones gratis al mes',
                    'Manager VIP personal',
                    'Bonus semanal de €50',
                    'Regalo físico mensual',
                    'Torneos Gold exclusivos',
                    'Chat directo con soporte'
                ]
            },

            platinum: {
                id: 'platinum',
                name: 'VIP Platinum',
                icon: 'fa-gem',
                color: '#E5E4E2',
                gradient: 'linear-gradient(135deg, #E5E4E2, #F8F8FF)',
                requirements: {
                    minimumSpent: 1000,
                    minimumGames: 500,
                    timeframe: 30
                },
                benefits: {
                    discount: 50,
                    potBonus: 150,
                    cashback: 12,
                    exclusiveRooms: 4,
                    personalSupport: true,
                    freeCards: 35,
                    prioritySupport: true,
                    exclusiveEvents: true,
                    bonusXP: 80,
                    weeklyBonus: 100,
                    monthlyGift: true,
                    customization: true,    // Personalización avanzada
                    vipConcierge: true     // Servicio de conserjería
                },
                perks: [
                    'Descuento 50% en todos los cartones',
                    'Botes aumentados +150%',
                    'Cashback mensual del 12%',
                    '4 salas VIP exclusivas',
                    '35 cartones gratis al mes',
                    'Manager VIP dedicado',
                    'Bonus semanal de €100',
                    'Regalos físicos premium',
                    'Personalización completa',
                    'Servicio de conserjería VIP',
                    'Acceso a beta features',
                    'Invitaciones a eventos en vivo'
                ]
            },

            diamond: {
                id: 'diamond',
                name: 'VIP Diamond',
                icon: 'fa-diamond',
                color: '#B9F2FF',
                gradient: 'linear-gradient(135deg, #B9F2FF, #E0FFFF)',
                requirements: {
                    minimumSpent: 2500,
                    minimumGames: 1000,
                    timeframe: 30
                },
                benefits: {
                    discount: 60,
                    potBonus: 200,
                    cashback: 15,
                    exclusiveRooms: 5,
                    personalSupport: true,
                    freeCards: 50,
                    prioritySupport: true,
                    exclusiveEvents: true,
                    bonusXP: 100,
                    weeklyBonus: 200,
                    monthlyGift: true,
                    customization: true,
                    vipConcierge: true,
                    privateEvents: true,    // Eventos privados
                    physicalMeetings: true  // Encuentros físicos
                },
                perks: [
                    'Descuento 60% en todos los cartones',
                    'Botes aumentados +200%',
                    'Cashback mensual del 15%',
                    '5 salas Diamond exclusivas',
                    '50 cartones gratis al mes',
                    'Manager VIP 24/7 dedicado',
                    'Bonus semanal de €200',
                    'Regalos físicos de lujo',
                    'Eventos privados exclusivos',
                    'Encuentros VIP presenciales',
                    'Acceso total a features',
                    'Línea directa con CEO',
                    'Participación en desarrollo',
                    'Experiencias únicas personalizadas'
                ]
            }
        };
    }

    /**
     * Inicializar beneficios VIP
     */
    initializeVipBenefits() {
        return {
            instantBenefits: [
                'Descuentos inmediatos',
                'Acceso a salas exclusivas',
                'Soporte prioritario'
            ],
            monthlyBenefits: [
                'Cashback automático',
                'Cartones gratis',
                'Bonus semanales'
            ],
            exclusiveBenefits: [
                'Manager personal',
                'Eventos privados',
                'Regalos físicos'
            ],
            growthBenefits: [
                'XP multiplicado',
                'Botes aumentados',
                'Acceso anticipado'
            ]
        };
    }

    /**
     * Crear interfaz VIP
     */
    createInterface() {
        const vipPanel = document.createElement('div');
        vipPanel.id = 'advancedVipPanel';
        vipPanel.className = 'advanced-vip-panel card-premium';
        
        vipPanel.innerHTML = `
            <div class="vip-header">
                <div class="vip-title">
                    <h3><i class="fas fa-crown"></i> Sistema VIP Royal</h3>
                    <div class="vip-current-tier" id="currentVipTier">
                        ${this.generateCurrentTierHTML()}
                    </div>
                </div>
                <button class="vip-upgrade-btn" id="vipUpgradeBtn">
                    <i class="fas fa-arrow-up"></i> Mejorar VIP
                </button>
            </div>
            
            <div class="vip-content">
                <div class="vip-progress" id="vipProgress">
                    ${this.generateProgressHTML()}
                </div>
                
                <div class="vip-tiers" id="vipTiers">
                    ${this.generateTiersHTML()}
                </div>
                
                <div class="vip-benefits" id="vipBenefits">
                    ${this.generateBenefitsHTML()}
                </div>
                
                <div class="vip-stats" id="vipStats">
                    ${this.generateStatsHTML()}
                </div>
                
                <div class="vip-actions" id="vipActions">
                    <button class="vip-action-btn" id="claimCashback">
                        <i class="fas fa-money-bill-wave"></i>
                        Reclamar Cashback
                        <span class="cashback-amount">€${this.vipData.cashbackAccumulated.toFixed(2)}</span>
                    </button>
                    
                    <button class="vip-action-btn" id="contactManager">
                        <i class="fas fa-user-tie"></i>
                        Contactar Manager
                    </button>
                    
                    <button class="vip-action-btn" id="vipEvents">
                        <i class="fas fa-calendar-star"></i>
                        Eventos VIP
                        <span class="event-count" id="eventCount">3</span>
                    </button>
                </div>
            </div>
        `;
        
        // Insertar en el DOM
        const sidebar = document.querySelector('.game-sidebar');
        if (sidebar) {
            sidebar.insertBefore(vipPanel, sidebar.firstChild);
        } else {
            document.body.appendChild(vipPanel);
        }
        
        this.bindVipEvents();
    }

    /**
     * Generar HTML del tier actual
     */
    generateCurrentTierHTML() {
        if (this.currentVipTier === 'none') {
            return `
                <div class="current-tier-none">
                    <span class="tier-status">Sin membresía VIP</span>
                    <span class="tier-cta">¡Únete ahora!</span>
                </div>
            `;
        }
        
        const tier = this.vipTiers[this.currentVipTier];
        return `
            <div class="current-tier" style="background: ${tier.gradient}">
                <i class="fas ${tier.icon}"></i>
                <span class="tier-name">${tier.name}</span>
                <span class="tier-benefits">${tier.benefits.discount}% descuento</span>
            </div>
        `;
    }

    /**
     * Generar HTML de progreso
     */
    generateProgressHTML() {
        if (this.currentVipTier === 'none') {
            return this.generateUpgradePathHTML();
        }
        
        return this.generateTierProgressHTML();
    }

    /**
     * Generar HTML de path de upgrade
     */
    generateUpgradePathHTML() {
        const bronzeReq = this.vipTiers.bronze.requirements;
        const userSpent = this.vipData.totalSpent;
        const userGames = this.bingoGame.gameHistory?.length || 0;
        
        return `
            <div class="upgrade-path">
                <h4>Camino a VIP Bronze</h4>
                <div class="progress-items">
                    <div class="progress-item ${userSpent >= bronzeReq.minimumSpent ? 'completed' : ''}">
                        <div class="progress-info">
                            <span class="progress-label">Gasto Total</span>
                            <span class="progress-value">€${userSpent.toFixed(2)} / €${bronzeReq.minimumSpent}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(100, (userSpent / bronzeReq.minimumSpent) * 100)}%"></div>
                        </div>
                    </div>
                    
                    <div class="progress-item ${userGames >= bronzeReq.minimumGames ? 'completed' : ''}">
                        <div class="progress-info">
                            <span class="progress-label">Partidas Jugadas</span>
                            <span class="progress-value">${userGames} / ${bronzeReq.minimumGames}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(100, (userGames / bronzeReq.minimumGames) * 100)}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generar HTML de progreso de tier
     */
    generateTierProgressHTML() {
        const currentTier = this.vipTiers[this.currentVipTier];
        const nextTierKey = this.getNextTier(this.currentVipTier);
        
        if (!nextTierKey) {
            return `
                <div class="max-tier">
                    <h4><i class="fas fa-trophy"></i> Tier Máximo Alcanzado</h4>
                    <p>¡Eres parte de la élite VIP Diamond!</p>
                </div>
            `;
        }
        
        const nextTier = this.vipTiers[nextTierKey];
        const progressToNext = this.calculateProgressToNext(nextTier);
        
        return `
            <div class="tier-progress">
                <h4>Progreso a ${nextTier.name}</h4>
                <div class="progress-items">
                    <div class="progress-item">
                        <div class="progress-info">
                            <span class="progress-label">Gasto Requerido</span>
                            <span class="progress-value">€${this.vipData.totalSpent.toFixed(2)} / €${nextTier.requirements.minimumSpent}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressToNext.spentProgress}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generar HTML de tiers
     */
    generateTiersHTML() {
        let html = '<div class="tiers-grid">';
        
        Object.values(this.vipTiers).forEach(tier => {
            const isCurrentTier = tier.id === this.currentVipTier;
            const isAvailable = this.canUpgradeToTier(tier.id);
            
            html += `
                <div class="tier-card ${isCurrentTier ? 'current' : ''} ${isAvailable ? 'available' : 'locked'}" 
                     data-tier="${tier.id}">
                    <div class="tier-header" style="background: ${tier.gradient}">
                        <i class="fas ${tier.icon}"></i>
                        <h4>${tier.name}</h4>
                        ${isCurrentTier ? '<div class="current-badge">ACTUAL</div>' : ''}
                    </div>
                    
                    <div class="tier-body">
                        <div class="tier-benefits-summary">
                            <div class="benefit-item">
                                <span class="benefit-label">Descuento:</span>
                                <span class="benefit-value">${tier.benefits.discount}%</span>
                            </div>
                            <div class="benefit-item">
                                <span class="benefit-label">Botes:</span>
                                <span class="benefit-value">+${tier.benefits.potBonus}%</span>
                            </div>
                            <div class="benefit-item">
                                <span class="benefit-label">Cashback:</span>
                                <span class="benefit-value">${tier.benefits.cashback}%</span>
                            </div>
                        </div>
                        
                        <div class="tier-perks">
                            ${tier.perks.slice(0, 3).map(perk => `<div class="perk-item">• ${perk}</div>`).join('')}
                            ${tier.perks.length > 3 ? `<div class="perk-more">+${tier.perks.length - 3} más...</div>` : ''}
                        </div>
                        
                        <div class="tier-requirements">
                            <div class="req-item">
                                <i class="fas fa-coins"></i>
                                €${tier.requirements.minimumSpent}+ gastados
                            </div>
                            <div class="req-item">
                                <i class="fas fa-gamepad"></i>
                                ${tier.requirements.minimumGames}+ partidas
                            </div>
                        </div>
                    </div>
                    
                    <div class="tier-footer">
                        ${isCurrentTier ? 
                            '<button class="tier-btn current-btn">TIER ACTUAL</button>' :
                            isAvailable ? 
                                `<button class="tier-btn upgrade-btn" data-tier="${tier.id}">MEJORAR AHORA</button>` :
                                '<button class="tier-btn locked-btn" disabled>BLOQUEADO</button>'
                        }
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Generar HTML de beneficios actuales
     */
    generateBenefitsHTML() {
        if (this.currentVipTier === 'none') {
            return '<div class="no-benefits">¡Únete al programa VIP para obtener beneficios exclusivos!</div>';
        }
        
        const tier = this.vipTiers[this.currentVipTier];
        
        return `
            <div class="current-benefits">
                <h4>Tus Beneficios VIP Activos</h4>
                <div class="benefits-grid">
                    ${tier.perks.map(perk => `
                        <div class="benefit-card">
                            <i class="fas fa-check-circle"></i>
                            <span>${perk}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Generar HTML de estadísticas VIP
     */
    generateStatsHTML() {
        return `
            <div class="vip-statistics">
                <h4>Estadísticas VIP</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-label">Miembro desde</span>
                            <span class="stat-value">${this.vipData.joinDate ? this.formatDate(this.vipData.joinDate) : 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-coins"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-label">Total gastado</span>
                            <span class="stat-value">€${this.vipData.totalSpent.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-money-bill-wave"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-label">Cashback total</span>
                            <span class="stat-value">€${(this.vipData.totalSpent * this.getCurrentCashbackRate() / 100).toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-star"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-label">Puntos VIP</span>
                            <span class="stat-value">${this.vipData.points}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Vincular eventos VIP
     */
    bindVipEvents() {
        // Botón de upgrade principal
        document.getElementById('vipUpgradeBtn')?.addEventListener('click', () => {
            this.showUpgradeModal();
        });
        
        // Botones de upgrade de tier
        document.querySelectorAll('.upgrade-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tier = e.target.dataset.tier;
                this.upgradeToTier(tier);
            });
        });
        
        // Reclamar cashback
        document.getElementById('claimCashback')?.addEventListener('click', () => {
            this.claimCashback();
        });
        
        // Contactar manager
        document.getElementById('contactManager')?.addEventListener('click', () => {
            this.contactManager();
        });
        
        // Eventos VIP
        document.getElementById('vipEvents')?.addEventListener('click', () => {
            this.showVipEvents();
        });
        
        // Clicks en tarjetas de tier
        document.querySelectorAll('.tier-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.tier-btn')) {
                    const tier = card.dataset.tier;
                    this.showTierDetails(tier);
                }
            });
        });
    }

    /**
     * Mostrar modal de upgrade
     */
    showUpgradeModal() {
        const modal = document.createElement('div');
        modal.className = 'vip-upgrade-modal';
        modal.innerHTML = `
            <div class="modal-overlay" id="vipModalOverlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Mejorar Membresía VIP</h3>
                    <button class="modal-close" id="closeVipModal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="upgrade-options">
                        ${this.generateUpgradeOptionsHTML()}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Eventos del modal
        document.getElementById('closeVipModal').addEventListener('click', () => {
            modal.remove();
        });
        
        document.getElementById('vipModalOverlay').addEventListener('click', () => {
            modal.remove();
        });
        
        // Mostrar modal
        setTimeout(() => modal.classList.add('show'), 100);
    }

    /**
     * Métodos de funcionalidad VIP
     */
    
    canUpgradeToTier(tierKey) {
        const tier = this.vipTiers[tierKey];
        const userSpent = this.vipData.totalSpent;
        const userGames = this.bingoGame.gameHistory?.length || 0;
        
        return userSpent >= tier.requirements.minimumSpent && 
               userGames >= tier.requirements.minimumGames;
    }
    
    upgradeToTier(tierKey) {
        if (!this.canUpgradeToTier(tierKey)) {
            this.showUpgradeError(tierKey);
            return;
        }
        
        this.currentVipTier = tierKey;
        this.vipData.tier = tierKey;
        this.vipData.joinDate = this.vipData.joinDate || new Date();
        
        this.saveVipData();
        this.updateInterface();
        this.showUpgradeSuccess(tierKey);
        
        // Notificar a otros sistemas
        this.bingoGame.onVipUpgrade?.(tierKey);
    }
    
    claimCashback() {
        if (this.vipData.cashbackAccumulated <= 0) {
            this.showError('No tienes cashback disponible');
            return;
        }
        
        const amount = this.vipData.cashbackAccumulated;
        this.bingoGame.userBalance += amount;
        this.vipData.cashbackAccumulated = 0;
        
        this.saveVipData();
        this.updateInterface();
        this.showCashbackSuccess(amount);
    }
    
    contactManager() {
        if (!this.hasPersonalManager()) {
            this.showError('Tu tier VIP no incluye manager personal');
            return;
        }
        
        this.openManagerChat();
    }
    
    /**
     * Verificar si tiene manager personal
     */
    hasPersonalManager() {
        if (this.currentVipTier === 'none') return false;
        const tier = this.vipTiers[this.currentVipTier];
        return tier.benefits.personalSupport;
    }
    
    /**
     * Obtener tasa de cashback actual
     */
    getCurrentCashbackRate() {
        if (this.currentVipTier === 'none') return 0;
        return this.vipTiers[this.currentVipTier].benefits.cashback;
    }
    
    /**
     * Obtener próximo tier
     */
    getNextTier(currentTier) {
        const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
        const currentIndex = tiers.indexOf(currentTier);
        return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
    }
    
    /**
     * Calcular progreso al siguiente tier
     */
    calculateProgressToNext(nextTier) {
        const spentProgress = Math.min(100, (this.vipData.totalSpent / nextTier.requirements.minimumSpent) * 100);
        const gamesProgress = Math.min(100, ((this.bingoGame.gameHistory?.length || 0) / nextTier.requirements.minimumGames) * 100);
        
        return { spentProgress, gamesProgress };
    }
    
    /**
     * Métodos de utilidad
     */
    formatDate(date) {
        return new Date(date).toLocaleDateString('es-ES');
    }
    
    updateInterface() {
        document.getElementById('currentVipTier').innerHTML = this.generateCurrentTierHTML();
        document.getElementById('vipProgress').innerHTML = this.generateProgressHTML();
        document.getElementById('vipBenefits').innerHTML = this.generateBenefitsHTML();
        document.getElementById('vipStats').innerHTML = this.generateStatsHTML();
    }
    
    /**
     * Persistencia de datos VIP
     */
    loadVipData() {
        try {
            const saved = localStorage.getItem('bingoroyal_vip_data');
            if (saved) {
                this.vipData = { ...this.vipData, ...JSON.parse(saved) };
                this.currentVipTier = this.vipData.tier;
            }
        } catch (error) {
            console.log('⚠️ Error cargando datos VIP:', error);
        }
    }
    
    saveVipData() {
        try {
            localStorage.setItem('bingoroyal_vip_data', JSON.stringify(this.vipData));
        } catch (error) {
            console.log('⚠️ Error guardando datos VIP:', error);
        }
    }
    
    /**
     * Inicializar características VIP
     */
    initializeVipFeatures() {
        this.updateQualitySettings();
        
        // Configurar beneficios actuales
        if (this.currentVipTier !== 'none') {
            this.applyVipBenefits();
        }
    }
    
    /**
     * Aplicar beneficios VIP al juego
     */
    applyVipBenefits() {
        const tier = this.vipTiers[this.currentVipTier];
        if (!tier) return;
        
        // Aplicar descuentos
        this.bingoGame.vipDiscount = tier.benefits.discount;
        
        // Aplicar bonus de botes
        this.bingoGame.vipPotBonus = tier.benefits.potBonus;
        
        // Aplicar bonus de XP
        this.bingoGame.vipXpBonus = tier.benefits.bonusXP;
        
        console.log(`👑 Beneficios VIP ${tier.name} aplicados`);
    }
    
    /**
     * Destruir sistema
     */
    destroy() {
        document.getElementById('advancedVipPanel')?.remove();
        console.log('👑 Advanced VIP System destruido');
    }
}

// CSS para el sistema VIP (básico, se expandirá)
const advancedVipCSS = `
.advanced-vip-panel {
    background: var(--glass-bg-strong);
    backdrop-filter: var(--glass-backdrop);
    border: 2px solid var(--premium-gold);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-glow);
    margin-bottom: var(--spacing-xl);
    animation: vipEntrance 1s ease-out;
}

@keyframes vipEntrance {
    from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.vip-header {
    background: var(--gradient-gold);
    color: var(--premium-royal-blue-dark);
    padding: var(--spacing-lg);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.vip-title h3 {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: var(--spacing-xs);
}

.current-tier {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    font-weight: 600;
    color: var(--premium-royal-blue-dark);
}

.vip-upgrade-btn {
    background: var(--premium-royal-blue);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    padding: var(--spacing-sm) var(--spacing-lg);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.vip-upgrade-btn:hover {
    background: var(--premium-royal-blue-dark);
    transform: translateY(-2px);
}

.vip-content {
    padding: var(--spacing-lg);
}

.tiers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
    margin: var(--spacing-lg) 0;
}

.tier-card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: all var(--transition-medium);
    cursor: pointer;
}

.tier-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-strong);
}

.tier-card.current {
    border-color: var(--premium-gold);
    box-shadow: var(--shadow-glow);
}

.tier-header {
    padding: var(--spacing-md);
    text-align: center;
    color: white;
    position: relative;
}

.tier-header h4 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-top: var(--spacing-sm);
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

.tier-body {
    padding: var(--spacing-md);
    color: white;
}

.tier-benefits-summary {
    margin-bottom: var(--spacing-md);
}

.benefit-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-xs);
}

.benefit-value {
    color: var(--premium-gold);
    font-weight: 600;
}

.tier-perks {
    margin-bottom: var(--spacing-md);
    font-size: 0.85rem;
}

.perk-item {
    margin-bottom: var(--spacing-xs);
    color: rgba(255, 255, 255, 0.9);
}

.perk-more {
    color: var(--premium-gold);
    font-style: italic;
}

.tier-requirements {
    background: rgba(0, 0, 0, 0.2);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
}

.req-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
    font-size: 0.85rem;
}

.tier-footer {
    padding: var(--spacing-md);
    border-top: 1px solid var(--glass-border);
}

.tier-btn {
    width: 100%;
    padding: var(--spacing-sm);
    border: none;
    border-radius: var(--radius-md);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.upgrade-btn {
    background: var(--gradient-gold);
    color: var(--premium-royal-blue-dark);
}

.upgrade-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-medium);
}

.current-btn {
    background: var(--premium-royal-blue);
    color: white;
}

.locked-btn {
    background: var(--glass-bg);
    color: rgba(255, 255, 255, 0.5);
    cursor: not-allowed;
}

@media (max-width: 768px) {
    .tiers-grid {
        grid-template-columns: 1fr;
    }
    
    .vip-header {
        flex-direction: column;
        gap: var(--spacing-md);
        text-align: center;
    }
}
`;

// Inyectar CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = advancedVipCSS;
document.head.appendChild(styleSheet);

// Exportar clase
window.AdvancedVipSystem = AdvancedVipSystem; 