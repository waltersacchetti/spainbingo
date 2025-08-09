/* ===== SISTEMA MONETARIO VIRTUAL v3.0 ===== */
/* Sistema completo de BingoCoins, shop virtual y economía interna */

class VirtualCurrencySystem {
    constructor(bingoGame) {
        this.bingoGame = bingoGame;
        this.currencyData = {
            bingoCoins: 100, // Monedas iniciales
            premiumCoins: 0,  // Monedas premium compradas
            totalEarned: 0,
            totalSpent: 0,
            exchangeHistory: [],
            purchaseHistory: [],
            dailyEarnings: 0,
            lastDailyReset: new Date().toDateString()
        };
        
        // Configuración del sistema
        this.coinPackages = this.initializeCoinPackages();
        this.shopItems = this.initializeShopItems();
        this.exchangeRates = this.initializeExchangeRates();
        this.dailyLimits = this.initializeDailyLimits();
        
        console.log('💰 Virtual Currency System inicializando...');
        this.loadCurrencyData();
        this.createInterface();
        this.checkDailyReset();
        this.initializeCurrencyEvents();
    }

    /**
     * Inicializar paquetes de monedas
     */
    initializeCoinPackages() {
        return {
            starter: {
                id: 'starter',
                name: 'Paquete Iniciador',
                coins: 500,
                bonus: 50, // Bonus extra
                price: 0.99,
                currency: 'EUR',
                popular: false,
                discount: 0,
                description: 'Perfect para empezar',
                features: ['500 BingoCoins', '+50 Bonus', 'Válido 30 días']
            },
            
            basic: {
                id: 'basic',
                name: 'Paquete Básico',
                coins: 1200,
                bonus: 200,
                price: 1.99,
                currency: 'EUR',
                popular: false,
                discount: 0,
                description: 'Ideal para jugadores casuales',
                features: ['1,200 BingoCoins', '+200 Bonus', 'Acceso prioritario', 'Válido 60 días']
            },
            
            popular: {
                id: 'popular',
                name: 'Paquete Popular',
                coins: 3000,
                bonus: 700,
                price: 4.99,
                currency: 'EUR',
                popular: true,
                discount: 15,
                description: 'El favorito de nuestros usuarios',
                features: ['3,000 BingoCoins', '+700 Bonus', '15% descuento', 'Skin exclusivo', 'Válido 90 días']
            },
            
            premium: {
                id: 'premium',
                name: 'Paquete Premium',
                coins: 7500,
                bonus: 2000,
                price: 9.99,
                currency: 'EUR',
                popular: false,
                discount: 25,
                description: 'Para jugadores serios',
                features: ['7,500 BingoCoins', '+2,000 Bonus', '25% descuento', 'Acceso VIP', 'Regalos premium']
            },
            
            ultimate: {
                id: 'ultimate',
                name: 'Paquete Ultimate',
                coins: 20000,
                bonus: 6000,
                price: 19.99,
                currency: 'EUR',
                popular: false,
                discount: 35,
                description: 'La experiencia definitiva',
                features: ['20,000 BingoCoins', '+6,000 Bonus', '35% descuento', 'Todo incluido', 'Soporte dedicado']
            }
        };
    }

    /**
     * Inicializar items del shop
     */
    initializeShopItems() {
        return {
            // CARTONES Y TICKETS
            cards: {
                single_card: {
                    id: 'single_card',
                    name: 'Cartón Individual',
                    description: 'Un cartón de bingo estándar',
                    price: 50,
                    currency: 'bingoCoins',
                    category: 'cards',
                    availability: 'unlimited',
                    icon: 'fa-ticket-alt'
                },
                
                card_pack_5: {
                    id: 'card_pack_5',
                    name: 'Pack 5 Cartones',
                    description: 'Paquete de 5 cartones con descuento',
                    price: 200,
                    currency: 'bingoCoins',
                    category: 'cards',
                    availability: 'unlimited',
                    icon: 'fa-layer-group',
                    discount: 20
                },
                
                premium_card: {
                    id: 'premium_card',
                    name: 'Cartón Premium',
                    description: 'Cartón con diseño exclusivo y ventajas',
                    price: 150,
                    currency: 'bingoCoins',
                    category: 'cards',
                    availability: 'unlimited',
                    icon: 'fa-star',
                    features: ['+25% probabilidad de ganar', 'Diseño único', 'Efectos especiales']
                }
            },
            
            // POWERUPS Y MEJORAS
            powerups: {
                auto_daub: {
                    id: 'auto_daub',
                    name: 'Auto-Daub 24h',
                    description: 'Marcado automático por 24 horas',
                    price: 300,
                    currency: 'bingoCoins',
                    category: 'powerups',
                    availability: 'unlimited',
                    icon: 'fa-magic',
                    duration: '24h'
                },
                
                lucky_boost: {
                    id: 'lucky_boost',
                    name: 'Boost de Suerte',
                    description: '+50% suerte en próximas 10 partidas',
                    price: 250,
                    currency: 'bingoCoins',
                    category: 'powerups',
                    availability: 'unlimited',
                    icon: 'fa-clover',
                    uses: 10
                },
                
                double_xp: {
                    id: 'double_xp',
                    name: 'Doble XP',
                    description: 'Doble experiencia por 2 horas',
                    price: 400,
                    currency: 'bingoCoins',
                    category: 'powerups',
                    availability: 'unlimited',
                    icon: 'fa-rocket',
                    duration: '2h'
                }
            },
            
            // COSMÉTICOS
            cosmetics: {
                avatar_frames: {
                    id: 'avatar_frames',
                    name: 'Marcos de Avatar',
                    description: 'Colección de marcos decorativos',
                    price: 800,
                    currency: 'bingoCoins',
                    category: 'cosmetics',
                    availability: 'unlimited',
                    icon: 'fa-portrait',
                    variants: ['Oro', 'Plata', 'Bronce', 'Diamante']
                },
                
                card_backs: {
                    id: 'card_backs',
                    name: 'Reversos de Cartón',
                    description: 'Diseños únicos para tus cartones',
                    price: 600,
                    currency: 'bingoCoins',
                    category: 'cosmetics',
                    availability: 'unlimited',
                    icon: 'fa-palette',
                    variants: ['Floral', 'Geométrico', 'Espacial', 'Vintage']
                },
                
                victory_animations: {
                    id: 'victory_animations',
                    name: 'Animaciones de Victoria',
                    description: 'Efectos especiales al ganar',
                    price: 1200,
                    currency: 'bingoCoins',
                    category: 'cosmetics',
                    availability: 'limited',
                    icon: 'fa-trophy',
                    variants: ['Fuegos artificiales', 'Confeti', 'Lluvia de oro']
                }
            },
            
            // REGALOS Y SOCIAL
            gifts: {
                friend_gift: {
                    id: 'friend_gift',
                    name: 'Regalo para Amigo',
                    description: 'Envía cartones gratis a un amigo',
                    price: 100,
                    currency: 'bingoCoins',
                    category: 'gifts',
                    availability: 'unlimited',
                    icon: 'fa-gift'
                },
                
                clan_donation: {
                    id: 'clan_donation',
                    name: 'Donación de Clan',
                    description: 'Contribuye al tesoro del clan',
                    price: 500,
                    currency: 'bingoCoins',
                    category: 'gifts',
                    availability: 'unlimited',
                    icon: 'fa-hand-holding-heart'
                }
            }
        };
    }

    /**
     * Inicializar tasas de cambio
     */
    initializeExchangeRates() {
        return {
            coinsToEuro: 1000, // 1000 coins = 1 EUR
            earnRates: {
                gameWin: 25,
                lineWin: 10,
                daily_login: 15,
                achievement: 50,
                tournament_participation: 40,
                tournament_win: 200,
                referral: 300
            },
            bonusMultipliers: {
                vip_bronze: 1.2,
                vip_silver: 1.4,
                vip_gold: 1.6,
                vip_platinum: 1.8,
                vip_diamond: 2.0
            }
        };
    }

    /**
     * Inicializar límites diarios
     */
    initializeDailyLimits() {
        return {
            maxEarnPerDay: 500,
            maxTransferToFriends: 200,
            maxPurchaseWithCoins: 2000,
            maxClanDonation: 1000
        };
    }

    /**
     * Crear interfaz del sistema monetario
     */
    createInterface() {
        const currencyPanel = document.createElement('div');
        currencyPanel.id = 'virtualCurrencyPanel';
        currencyPanel.className = 'virtual-currency-panel card-premium';
        
        currencyPanel.innerHTML = `
            <div class="currency-header">
                <div class="currency-title">
                    <h3><i class="fas fa-coins"></i> BingoCoins Shop</h3>
                    <div class="currency-balance">
                        <div class="balance-item">
                            <i class="fas fa-coins"></i>
                            <span id="bingoCoinsBalance">${this.currencyData.bingoCoins.toLocaleString()}</span>
                            <span class="currency-label">BingoCoins</span>
                        </div>
                        <div class="balance-item premium">
                            <i class="fas fa-gem"></i>
                            <span id="premiumCoinsBalance">${this.currencyData.premiumCoins.toLocaleString()}</span>
                            <span class="currency-label">Premium</span>
                        </div>
                    </div>
                </div>
                <button class="currency-buy-btn" id="buyCurrencyBtn">
                    <i class="fas fa-shopping-cart"></i> Comprar Coins
                </button>
            </div>
            
            <div class="currency-content">
                <div class="currency-tabs">
                    <button class="tab-btn active" data-tab="shop">Shop</button>
                    <button class="tab-btn" data-tab="packages">Paquetes</button>
                    <button class="tab-btn" data-tab="earn">Ganar Coins</button>
                    <button class="tab-btn" data-tab="history">Historial</button>
                </div>
                
                <div class="tab-content active" id="shopTab">
                    ${this.generateShopHTML()}
                </div>
                
                <div class="tab-content" id="packagesTab">
                    ${this.generatePackagesHTML()}
                </div>
                
                <div class="tab-content" id="earnTab">
                    ${this.generateEarnHTML()}
                </div>
                
                <div class="tab-content" id="historyTab">
                    ${this.generateHistoryHTML()}
                </div>
            </div>
        `;
        
        // Insertar en el DOM
        const sidebar = document.querySelector('.game-sidebar');
        if (sidebar) {
            sidebar.appendChild(currencyPanel);
        } else {
            document.body.appendChild(currencyPanel);
        }
        
        this.bindCurrencyEvents();
    }

    /**
     * Generar HTML del shop
     */
    generateShopHTML() {
        let html = '<div class="shop-sections">';
        
        // Organizar items por categoría
        const categories = {
            cards: '🎫 Cartones y Tickets',
            powerups: '⚡ Power-ups',
            cosmetics: '🎨 Cosméticos',
            gifts: '🎁 Regalos y Social'
        };
        
        Object.entries(categories).forEach(([categoryId, categoryName]) => {
            html += `
                <div class="shop-category">
                    <h4>${categoryName}</h4>
                    <div class="shop-items-grid">
            `;
            
            // Obtener items de esta categoría
            Object.values(this.shopItems).forEach(categoryItems => {
                Object.values(categoryItems).forEach(item => {
                    if (item.category === categoryId) {
                        html += this.generateShopItemHTML(item);
                    }
                });
            });
            
            html += '</div></div>';
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Generar HTML de un item del shop
     */
    generateShopItemHTML(item) {
        const canAfford = this.currencyData.bingoCoins >= item.price;
        const isAvailable = item.availability === 'unlimited' || 
                           (item.availability === 'limited' && item.stock > 0);
        
        return `
            <div class="shop-item ${!canAfford ? 'cannot-afford' : ''} ${!isAvailable ? 'unavailable' : ''}" 
                 data-item-id="${item.id}">
                <div class="item-header">
                    <div class="item-icon">
                        <i class="fas ${item.icon}"></i>
                    </div>
                    ${item.discount ? `<div class="item-discount">-${item.discount}%</div>` : ''}
                </div>
                
                <div class="item-content">
                    <h5>${item.name}</h5>
                    <p>${item.description}</p>
                    
                    ${item.features ? `
                        <div class="item-features">
                            ${item.features.map(feature => `<span class="feature">• ${feature}</span>`).join('')}
                        </div>
                    ` : ''}
                    
                    ${item.variants ? `
                        <div class="item-variants">
                            <span class="variants-label">Variantes:</span>
                            <span class="variants-list">${item.variants.join(', ')}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="item-footer">
                    <div class="item-price">
                        <i class="fas fa-coins"></i>
                        <span class="price-amount">${item.price.toLocaleString()}</span>
                    </div>
                    
                    <button class="item-buy-btn ${!canAfford || !isAvailable ? 'disabled' : ''}" 
                            data-item-id="${item.id}" 
                            ${!canAfford || !isAvailable ? 'disabled' : ''}>
                        ${!isAvailable ? 'No Disponible' : 
                          !canAfford ? 'Sin Coins' : 'Comprar'}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Generar HTML de paquetes
     */
    generatePackagesHTML() {
        return `
            <div class="packages-section">
                <div class="packages-header">
                    <h4>💎 Paquetes de BingoCoins</h4>
                    <p>Compra BingoCoins con dinero real y obtén bonos exclusivos</p>
                </div>
                
                <div class="packages-grid">
                    ${Object.values(this.coinPackages).map(pkg => `
                        <div class="currency-package ${pkg.popular ? 'popular' : ''}">
                            ${pkg.popular ? '<div class="popular-badge">MÁS POPULAR</div>' : ''}
                            ${pkg.discount > 0 ? `<div class="package-discount">-${pkg.discount}%</div>` : ''}
                            
                            <div class="package-header">
                                <h5>${pkg.name}</h5>
                                <div class="package-price">
                                    <span class="price-currency">€</span>
                                    <span class="price-amount">${pkg.price}</span>
                                </div>
                            </div>
                            
                            <div class="package-content">
                                <div class="coins-amount">
                                    <i class="fas fa-coins"></i>
                                    <span class="coins-main">${pkg.coins.toLocaleString()}</span>
                                    <span class="coins-label">BingoCoins</span>
                                </div>
                                
                                ${pkg.bonus > 0 ? `
                                    <div class="bonus-amount">
                                        <i class="fas fa-plus"></i>
                                        <span class="bonus-coins">${pkg.bonus.toLocaleString()}</span>
                                        <span class="bonus-label">Bonus</span>
                                    </div>
                                ` : ''}
                                
                                <div class="package-features">
                                    ${pkg.features.map(feature => `
                                        <div class="package-feature">
                                            <i class="fas fa-check"></i>
                                            <span>${feature}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="package-footer">
                                <button class="package-buy-btn" data-package-id="${pkg.id}">
                                    <i class="fas fa-credit-card"></i>
                                    Comprar Ahora
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="packages-info">
                    <div class="info-item">
                        <i class="fas fa-shield-alt"></i>
                        <span>Compra 100% segura</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-bolt"></i>
                        <span>Entrega instantánea</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-headset"></i>
                        <span>Soporte 24/7</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Funcionalidades principales
     */
    
    // Comprar item del shop
    buyShopItem(itemId) {
        const item = this.findShopItem(itemId);
        if (!item) {
            this.showError('Item no encontrado');
            return false;
        }
        
        if (this.currencyData.bingoCoins < item.price) {
            this.showError(`Necesitas ${item.price.toLocaleString()} BingoCoins`);
            return false;
        }
        
        // Procesar compra
        this.currencyData.bingoCoins -= item.price;
        this.currencyData.totalSpent += item.price;
        
        // Registrar transacción
        this.recordTransaction({
            type: 'shop_purchase',
            itemId: item.id,
            itemName: item.name,
            amount: item.price,
            timestamp: new Date().toISOString()
        });
        
        // Aplicar item
        this.applyShopItem(item);
        
        // Actualizar UI
        this.updateCurrencyDisplay();
        this.showSuccess(`✅ ${item.name} comprado exitosamente`);
        
        this.saveCurrencyData();
        return true;
    }
    
    // Ganar monedas
    earnCoins(amount, source = 'unknown') {
        // Verificar límite diario
        if (this.currencyData.dailyEarnings + amount > this.dailyLimits.maxEarnPerDay) {
            const remaining = this.dailyLimits.maxEarnPerDay - this.currencyData.dailyEarnings;
            amount = Math.max(0, remaining);
        }
        
        if (amount <= 0) return false;
        
        // Aplicar multiplicador VIP
        const vipMultiplier = this.getVipMultiplier();
        const finalAmount = Math.floor(amount * vipMultiplier);
        
        this.currencyData.bingoCoins += finalAmount;
        this.currencyData.totalEarned += finalAmount;
        this.currencyData.dailyEarnings += finalAmount;
        
        // Registrar ganancia
        this.recordTransaction({
            type: 'earned',
            source: source,
            amount: finalAmount,
            timestamp: new Date().toISOString()
        });
        
        this.updateCurrencyDisplay();
        this.saveCurrencyData();
        
        return finalAmount;
    }
    
    /**
     * Utilidades
     */
    findShopItem(itemId) {
        for (const category of Object.values(this.shopItems)) {
            for (const item of Object.values(category)) {
                if (item.id === itemId) return item;
            }
        }
        return null;
    }
    
    getVipMultiplier() {
        const vipTier = this.bingoGame.currentVipTier || 'none';
        return this.exchangeRates.bonusMultipliers[`vip_${vipTier}`] || 1.0;
    }
    
    checkDailyReset() {
        const today = new Date().toDateString();
        if (this.currencyData.lastDailyReset !== today) {
            this.currencyData.dailyEarnings = 0;
            this.currencyData.lastDailyReset = today;
            this.saveCurrencyData();
        }
    }
    
    /**
     * Events y UI
     */
    bindCurrencyEvents() {
        // Comprar paquetes
        document.querySelectorAll('.package-buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const packageId = e.target.dataset.packageId;
                this.purchasePackage(packageId);
            });
        });
        
        // Comprar items del shop
        document.querySelectorAll('.item-buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.itemId;
                this.buyShopItem(itemId);
            });
        });
        
        // Tabs
        document.querySelectorAll('.currency-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchCurrencyTab(e.target.dataset.tab);
            });
        });
    }
    
    updateCurrencyDisplay() {
        document.getElementById('bingoCoinsBalance').textContent = 
            this.currencyData.bingoCoins.toLocaleString();
        document.getElementById('premiumCoinsBalance').textContent = 
            this.currencyData.premiumCoins.toLocaleString();
    }
    
    /**
     * Persistencia
     */
    loadCurrencyData() {
        try {
            const saved = localStorage.getItem('bingoroyal_currency_data');
            if (saved) {
                this.currencyData = { ...this.currencyData, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.log('⚠️ Error cargando datos de moneda:', error);
        }
    }
    
    saveCurrencyData() {
        try {
            localStorage.setItem('bingoroyal_currency_data', JSON.stringify(this.currencyData));
        } catch (error) {
            console.log('⚠️ Error guardando datos de moneda:', error);
        }
    }
    
    /**
     * Destruir sistema
     */
    destroy() {
        document.getElementById('virtualCurrencyPanel')?.remove();
        console.log('💰 Virtual Currency System destruido');
    }
}

// CSS para sistema monetario
const virtualCurrencyCSS = `
.virtual-currency-panel {
    margin-bottom: var(--spacing-lg);
    animation: currencyEntrance 1s ease-out;
}

@keyframes currencyEntrance {
    from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.currency-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.currency-balance {
    display: flex;
    gap: var(--spacing-md);
}

.balance-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: rgba(255, 255, 255, 0.2);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    font-weight: 600;
}

.balance-item.premium {
    background: linear-gradient(135deg, #6f42c1, #e83e8c);
}

.currency-buy-btn {
    background: var(--premium-gold);
    color: var(--premium-royal-blue-dark);
    border: none;
    border-radius: var(--radius-md);
    padding: var(--spacing-sm) var(--spacing-md);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.shop-items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
}

.shop-item {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    transition: all var(--transition-medium);
    color: white;
}

.shop-item:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-medium);
}

.packages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
}

.currency-package {
    background: var(--glass-bg-strong);
    border: 2px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    text-align: center;
    position: relative;
    transition: all var(--transition-medium);
    color: white;
}

.currency-package.popular {
    border-color: var(--premium-gold);
    box-shadow: var(--shadow-glow);
}

.popular-badge {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--premium-gold);
    color: var(--premium-royal-blue-dark);
    padding: var(--spacing-xs) var(--spacing-md);
    border-radius: var(--radius-lg);
    font-size: 0.8rem;
    font-weight: 700;
}

.package-price {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: var(--spacing-xs);
    margin: var(--spacing-md) 0;
}

.price-amount {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--premium-gold);
}

.coins-amount {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: var(--spacing-lg) 0;
}

.coins-main {
    font-size: 2rem;
    font-weight: 700;
    color: var(--premium-gold);
}

.package-buy-btn {
    width: 100%;
    background: var(--gradient-gold);
    color: var(--premium-royal-blue-dark);
    border: none;
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.package-buy-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-medium);
}

@media (max-width: 768px) {
    .currency-balance {
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    
    .shop-items-grid {
        grid-template-columns: 1fr;
    }
    
    .packages-grid {
        grid-template-columns: 1fr;
    }
}
`;

// Inyectar CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = virtualCurrencyCSS;
document.head.appendChild(styleSheet);

// Exportar clase
window.VirtualCurrencySystem = VirtualCurrencySystem; 