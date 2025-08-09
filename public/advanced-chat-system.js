/* ===== SISTEMA DE CHAT AVANZADO v3.0 ===== */
/* Chat social premium con emojis, stickers y moderación */

class AdvancedChatSystem {
    constructor(bingoGame) {
        this.bingoGame = bingoGame;
        this.messages = [];
        this.emojis = this.initializeEmojis();
        this.stickers = this.initializeStickers();
        this.predefinedMessages = this.initializePredefinedMessages();
        this.isEmojiPanelOpen = false;
        this.isStickerPanelOpen = false;
        this.messageFilters = new Set();
        this.mutedUsers = new Set();
        this.isModeratorMode = false;
        this.autoScrollEnabled = true;
        
        // Configuración de moderación
        this.moderationConfig = {
            maxMessageLength: 200,
            maxMessagesPerMinute: 10,
            bannedWords: ['spam', 'hack', 'cheat'],
            linkDetection: true,
            capsLockLimit: 0.7 // 70% mayúsculas máximo
        };
        
        // Estadísticas de usuario
        this.userStats = {
            messagesSent: 0,
            emojisUsed: 0,
            stickersUsed: 0,
            lastMessageTime: 0
        };
        
        console.log('💬 Advanced Chat System inicializado');
        this.initializeInterface();
    }

    /**
     * Inicializar emojis animados
     */
    initializeEmojis() {
        return {
            // Emociones básicas
            happy: { code: '😀', animation: 'bounce', category: 'emotion' },
            laugh: { code: '😂', animation: 'shake', category: 'emotion' },
            love: { code: '😍', animation: 'pulse', category: 'emotion' },
            wink: { code: '😉', animation: 'tilt', category: 'emotion' },
            cool: { code: '😎', animation: 'slide', category: 'emotion' },
            surprised: { code: '😲', animation: 'pop', category: 'emotion' },
            sad: { code: '😢', animation: 'fall', category: 'emotion' },
            angry: { code: '😠', animation: 'shake', category: 'emotion' },
            thinking: { code: '🤔', animation: 'tilt', category: 'emotion' },
            party: { code: '🥳', animation: 'spin', category: 'emotion' },
            
            // Bingo específicos
            bingo: { code: '🎯', animation: 'target', category: 'bingo' },
            winner: { code: '🏆', animation: 'trophy', category: 'bingo' },
            luck: { code: '🍀', animation: 'lucky', category: 'bingo' },
            cards: { code: '🎴', animation: 'flip', category: 'bingo' },
            numbers: { code: '🔢', animation: 'count', category: 'bingo' },
            jackpot: { code: '💰', animation: 'money', category: 'bingo' },
            fire: { code: '🔥', animation: 'flame', category: 'bingo' },
            rocket: { code: '🚀', animation: 'launch', category: 'bingo' },
            star: { code: '⭐', animation: 'twinkle', category: 'bingo' },
            gem: { code: '💎', animation: 'sparkle', category: 'bingo' },
            
            // Gestos
            thumbsup: { code: '👍', animation: 'thumbs', category: 'gesture' },
            thumbsdown: { code: '👎', animation: 'thumbs', category: 'gesture' },
            clap: { code: '👏', animation: 'clap', category: 'gesture' },
            wave: { code: '👋', animation: 'wave', category: 'gesture' },
            peace: { code: '✌️', animation: 'peace', category: 'gesture' },
            ok: { code: '👌', animation: 'ok', category: 'gesture' },
            punch: { code: '👊', animation: 'punch', category: 'gesture' },
            pray: { code: '🙏', animation: 'pray', category: 'gesture' },
            muscle: { code: '💪', animation: 'flex', category: 'gesture' },
            crossed: { code: '🤞', animation: 'cross', category: 'gesture' },
            
            // Objetos
            crown: { code: '👑', animation: 'crown', category: 'object' },
            gift: { code: '🎁', animation: 'gift', category: 'object' },
            balloon: { code: '🎈', animation: 'float', category: 'object' },
            confetti: { code: '🎊', animation: 'confetti', category: 'object' },
            tada: { code: '🎉', animation: 'celebrate', category: 'object' },
            bell: { code: '🔔', animation: 'ring', category: 'object' },
            magic: { code: '✨', animation: 'magic', category: 'object' },
            lightning: { code: '⚡', animation: 'zap', category: 'object' },
            bomb: { code: '💣', animation: 'tick', category: 'object' },
            boom: { code: '💥', animation: 'explode', category: 'object' },
            
            // Caras adicionales
            kiss: { code: '😘', animation: 'kiss', category: 'face' },
            tongue: { code: '😛', animation: 'wiggle', category: 'face' },
            crazy: { code: '🤪', animation: 'crazy', category: 'face' },
            sleepy: { code: '😴', animation: 'sleep', category: 'face' },
            sick: { code: '🤢', animation: 'sick', category: 'face' },
            dizzy: { code: '😵', animation: 'dizzy', category: 'face' },
            ghost: { code: '👻', animation: 'spook', category: 'face' },
            devil: { code: '😈', animation: 'evil', category: 'face' },
            angel: { code: '😇', animation: 'halo', category: 'face' },
            robot: { code: '🤖', animation: 'robot', category: 'face' },
            
            // Animales
            cat: { code: '🐱', animation: 'meow', category: 'animal' },
            dog: { code: '🐶', animation: 'wag', category: 'animal' },
            monkey: { code: '🐵', animation: 'monkey', category: 'animal' },
            tiger: { code: '🐯', animation: 'roar', category: 'animal' },
            unicorn: { code: '🦄', animation: 'magic', category: 'animal' }
        };
    }

    /**
     * Inicializar stickers temáticos
     */
    initializeStickers() {
        return {
            // Stickers de celebración
            celebration: [
                { id: 'winner_dance', image: '🏆', text: '¡GANADOR!', color: '#FFD700' },
                { id: 'jackpot_hit', image: '💰', text: 'JACKPOT', color: '#FF6B35' },
                { id: 'lucky_day', image: '🍀', text: 'SUERTE', color: '#4ECDC4' },
                { id: 'on_fire', image: '🔥', text: '¡EN LLAMAS!', color: '#FF073A' },
                { id: 'bingo_master', image: '🎯', text: 'MAESTRO', color: '#7209B7' }
            ],
            
            // Stickers de reacción
            reaction: [
                { id: 'wow_amazing', image: '🤩', text: '¡WOW!', color: '#F72585' },
                { id: 'so_close', image: '😬', text: 'CASI...', color: '#F77F00' },
                { id: 'good_luck', image: '🤞', text: 'SUERTE', color: '#06FFA5' },
                { id: 'nervous', image: '😰', text: 'NERVIOSO', color: '#FFB700' },
                { id: 'confident', image: '😏', text: 'SEGURO', color: '#3A86FF' }
            ],
            
            // Stickers de ánimo
            encouragement: [
                { id: 'you_can', image: '💪', text: '¡TÚ PUEDES!', color: '#FF006E' },
                { id: 'keep_going', image: '🚀', text: '¡SIGUE ASÍ!', color: '#8338EC' },
                { id: 'believe', image: '⭐', text: 'CREE', color: '#FFBE0B' },
                { id: 'never_give_up', image: '🏃', text: 'NO TE RINDAS', color: '#FB5607' },
                { id: 'focus', image: '🎯', text: 'ENFÓCATE', color: '#023047' }
            ],
            
            // Stickers VIP
            vip: [
                { id: 'vip_crown', image: '👑', text: 'VIP', color: '#D4AF37' },
                { id: 'premium', image: '💎', text: 'PREMIUM', color: '#4A90E2' },
                { id: 'exclusive', image: '🌟', text: 'EXCLUSIVO', color: '#9013FE' },
                { id: 'legend', image: '🏆', text: 'LEYENDA', color: '#FF4081' },
                { id: 'champion', image: '🥇', text: 'CAMPEÓN', color: '#FFD700' }
            ]
        };
    }

    /**
     * Inicializar mensajes predefinidos
     */
    initializePredefinedMessages() {
        return {
            greetings: [
                '¡Hola a todos! 👋',
                '¡Buenos días! ☀️',
                '¡Buenas tardes! 🌅',
                '¡Buenas noches! 🌙',
                '¡Qué tal, gente! 😊'
            ],
            
            encouragement: [
                '¡Buena suerte a todos! 🍀',
                '¡Que gane el mejor! 🏆',
                '¡Vamos, que podemos! 💪',
                '¡A por el bote! 💰',
                '¡Concentración! 🎯'
            ],
            
            celebration: [
                '¡LÍNEA! 🎉',
                '¡DOS LÍNEAS! 🔥',
                '¡BINGO! 🏆',
                '¡Qué suerte! 😍',
                '¡Increíble! 🤩'
            ],
            
            reaction: [
                '¡Casi! 😅',
                '¡Muy cerca! 😬',
                '¡La próxima! 😊',
                '¡Qué nervios! 😰',
                '¡Emocionante! 🎭'
            ],
            
            farewell: [
                '¡Hasta luego! 👋',
                '¡Nos vemos! 😊',
                '¡Que vaya bien! 🍀',
                '¡Buena suerte! ✨',
                '¡Adiós! 👋'
            ]
        };
    }

    /**
     * Crear interfaz del chat
     */
    initializeInterface() {
        const chatContainer = document.createElement('div');
        chatContainer.id = 'advancedChatContainer';
        chatContainer.className = 'advanced-chat-container card-premium';
        
        chatContainer.innerHTML = `
            <div class="chat-header">
                <div class="chat-title">
                    <i class="fas fa-comments"></i>
                    <span>Chat Social</span>
                    <div class="online-indicator">
                        <div class="pulse-dot"></div>
                        <span id="onlineCount">0</span> online
                    </div>
                </div>
                
                <div class="chat-controls">
                    <button class="chat-btn" id="emojiToggle" title="Emojis">
                        <i class="fas fa-smile"></i>
                    </button>
                    <button class="chat-btn" id="stickerToggle" title="Stickers">
                        <i class="fas fa-images"></i>
                    </button>
                    <button class="chat-btn" id="quickToggle" title="Mensajes rápidos">
                        <i class="fas fa-bolt"></i>
                    </button>
                    <button class="chat-btn" id="settingsToggle" title="Configuración">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            </div>
            
            <div class="chat-messages" id="chatMessages">
                <!-- Mensajes aparecerán aquí -->
            </div>
            
            <div class="chat-input-container">
                <div class="input-wrapper">
                    <input type="text" id="messageInput" placeholder="Escribe un mensaje..." maxlength="200">
                    <div class="input-controls">
                        <button class="input-btn" id="emojiBtn">😊</button>
                        <button class="input-btn" id="stickerBtn">🖼️</button>
                        <button class="input-btn" id="sendBtn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
                
                <div class="character-counter">
                    <span id="charCount">0</span>/200
                </div>
            </div>
            
            <!-- Panel de emojis -->
            <div class="emoji-panel" id="emojiPanel" style="display: none;">
                <div class="panel-header">
                    <div class="emoji-categories">
                        <button class="cat-btn active" data-category="all">Todos</button>
                        <button class="cat-btn" data-category="emotion">😊</button>
                        <button class="cat-btn" data-category="bingo">🎯</button>
                        <button class="cat-btn" data-category="gesture">👋</button>
                        <button class="cat-btn" data-category="object">🎁</button>
                    </div>
                </div>
                <div class="emoji-grid" id="emojiGrid">
                    ${this.generateEmojiHTML()}
                </div>
            </div>
            
            <!-- Panel de stickers -->
            <div class="sticker-panel" id="stickerPanel" style="display: none;">
                <div class="panel-header">
                    <div class="sticker-categories">
                        <button class="cat-btn active" data-category="celebration">🎉</button>
                        <button class="cat-btn" data-category="reaction">🤔</button>
                        <button class="cat-btn" data-category="encouragement">💪</button>
                        <button class="cat-btn" data-category="vip">👑</button>
                    </div>
                </div>
                <div class="sticker-grid" id="stickerGrid">
                    ${this.generateStickerHTML('celebration')}
                </div>
            </div>
            
            <!-- Panel de mensajes rápidos -->
            <div class="quick-panel" id="quickPanel" style="display: none;">
                <div class="quick-categories">
                    ${Object.keys(this.predefinedMessages).map(cat => 
                        `<button class="quick-cat-btn" data-category="${cat}">${this.getCategoryIcon(cat)} ${this.getCategoryName(cat)}</button>`
                    ).join('')}
                </div>
                <div class="quick-messages" id="quickMessages">
                    ${this.generateQuickMessagesHTML('greetings')}
                </div>
            </div>
            
            <!-- Panel de configuración -->
            <div class="chat-settings" id="chatSettings" style="display: none;">
                <div class="settings-content">
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="autoScrollSetting" ${this.autoScrollEnabled ? 'checked' : ''}>
                            <span>Auto-scroll</span>
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="soundNotifications">
                            <span>Sonidos de notificación</span>
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="showTimestamps">
                            <span>Mostrar timestamps</span>
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>Filtros de mensaje:</label>
                        <div class="filter-options">
                            <label><input type="checkbox" value="system"> Sistema</label>
                            <label><input type="checkbox" value="user"> Usuarios</label>
                            <label><input type="checkbox" value="moderator"> Moderadores</label>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insertar en el DOM (reemplazar chat existente si existe)
        const existingChat = document.querySelector('.chat-section') || document.querySelector('#chat');
        if (existingChat) {
            existingChat.parentNode.replaceChild(chatContainer, existingChat);
        } else {
            const sidebar = document.querySelector('.game-sidebar');
            if (sidebar) {
                sidebar.appendChild(chatContainer);
            } else {
                document.body.appendChild(chatContainer);
            }
        }
        
        this.bindEvents();
        this.loadChatHistory();
        this.simulateOnlineUsers();
    }

    /**
     * Generar HTML de emojis
     */
    generateEmojiHTML() {
        let html = '';
        for (const [key, emoji] of Object.entries(this.emojis)) {
            html += `
                <button class="emoji-btn" data-emoji="${key}" data-category="${emoji.category}" title="${key}">
                    <span class="emoji-char ${emoji.animation}">${emoji.code}</span>
                </button>
            `;
        }
        return html;
    }

    /**
     * Generar HTML de stickers
     */
    generateStickerHTML(category) {
        const stickers = this.stickers[category] || [];
        return stickers.map(sticker => `
            <button class="sticker-btn" data-sticker="${sticker.id}">
                <div class="sticker-content" style="background: ${sticker.color}">
                    <div class="sticker-image">${sticker.image}</div>
                    <div class="sticker-text">${sticker.text}</div>
                </div>
            </button>
        `).join('');
    }

    /**
     * Generar HTML de mensajes rápidos
     */
    generateQuickMessagesHTML(category) {
        const messages = this.predefinedMessages[category] || [];
        return messages.map(message => `
            <button class="quick-msg-btn" data-message="${message}">
                ${message}
            </button>
        `).join('');
    }

    /**
     * Obtener icono de categoría
     */
    getCategoryIcon(category) {
        const icons = {
            greetings: '👋',
            encouragement: '💪',
            celebration: '🎉',
            reaction: '🤔',
            farewell: '👋'
        };
        return icons[category] || '💬';
    }

    /**
     * Obtener nombre de categoría
     */
    getCategoryName(category) {
        const names = {
            greetings: 'Saludos',
            encouragement: 'Ánimo',
            celebration: 'Celebración',
            reaction: 'Reacciones',
            farewell: 'Despedidas'
        };
        return names[category] || category;
    }

    /**
     * Vincular eventos
     */
    bindEvents() {
        // Toggle panels
        document.getElementById('emojiToggle')?.addEventListener('click', () => this.toggleEmojiPanel());
        document.getElementById('stickerToggle')?.addEventListener('click', () => this.toggleStickerPanel());
        document.getElementById('quickToggle')?.addEventListener('click', () => this.toggleQuickPanel());
        document.getElementById('settingsToggle')?.addEventListener('click', () => this.toggleSettingsPanel());
        
        // Input buttons
        document.getElementById('emojiBtn')?.addEventListener('click', () => this.toggleEmojiPanel());
        document.getElementById('stickerBtn')?.addEventListener('click', () => this.toggleStickerPanel());
        document.getElementById('sendBtn')?.addEventListener('click', () => this.sendMessage());
        
        // Message input
        const messageInput = document.getElementById('messageInput');
        messageInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        messageInput?.addEventListener('input', (e) => this.updateCharCounter(e.target.value));
        
        // Emoji clicks
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const emojiKey = e.currentTarget.dataset.emoji;
                this.insertEmoji(emojiKey);
            });
        });
        
        // Emoji categories
        document.querySelectorAll('#emojiPanel .cat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterEmojis(e.target.dataset.category);
            });
        });
        
        // Sticker categories
        document.querySelectorAll('.sticker-categories .cat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterStickers(e.target.dataset.category);
            });
        });
        
        // Quick message categories
        document.querySelectorAll('.quick-cat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showQuickMessages(e.target.dataset.category);
            });
        });
        
        // Settings
        document.getElementById('autoScrollSetting')?.addEventListener('change', (e) => {
            this.autoScrollEnabled = e.target.checked;
        });
    }

    /**
     * Toggle panel de emojis
     */
    toggleEmojiPanel() {
        const panel = document.getElementById('emojiPanel');
        const isOpen = panel.style.display !== 'none';
        
        this.closeAllPanels();
        
        if (!isOpen) {
            panel.style.display = 'block';
            this.isEmojiPanelOpen = true;
        }
    }

    /**
     * Toggle panel de stickers
     */
    toggleStickerPanel() {
        const panel = document.getElementById('stickerPanel');
        const isOpen = panel.style.display !== 'none';
        
        this.closeAllPanels();
        
        if (!isOpen) {
            panel.style.display = 'block';
            this.isStickerPanelOpen = true;
        }
    }

    /**
     * Toggle panel de mensajes rápidos
     */
    toggleQuickPanel() {
        const panel = document.getElementById('quickPanel');
        const isOpen = panel.style.display !== 'none';
        
        this.closeAllPanels();
        
        if (!isOpen) {
            panel.style.display = 'block';
        }
    }

    /**
     * Toggle panel de configuración
     */
    toggleSettingsPanel() {
        const panel = document.getElementById('chatSettings');
        const isOpen = panel.style.display !== 'none';
        
        this.closeAllPanels();
        
        if (!isOpen) {
            panel.style.display = 'block';
        }
    }

    /**
     * Cerrar todos los panels
     */
    closeAllPanels() {
        document.getElementById('emojiPanel').style.display = 'none';
        document.getElementById('stickerPanel').style.display = 'none';
        document.getElementById('quickPanel').style.display = 'none';
        document.getElementById('chatSettings').style.display = 'none';
        
        this.isEmojiPanelOpen = false;
        this.isStickerPanelOpen = false;
    }

    /**
     * Filtrar emojis por categoría
     */
    filterEmojis(category) {
        document.querySelectorAll('#emojiPanel .cat-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            const show = category === 'all' || btn.dataset.category === category;
            btn.style.display = show ? 'block' : 'none';
        });
    }

    /**
     * Filtrar stickers por categoría
     */
    filterStickers(category) {
        document.querySelectorAll('.sticker-categories .cat-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        const stickerGrid = document.getElementById('stickerGrid');
        stickerGrid.innerHTML = this.generateStickerHTML(category);
        
        // Re-bind sticker events
        stickerGrid.querySelectorAll('.sticker-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stickerId = e.currentTarget.dataset.sticker;
                this.sendSticker(stickerId);
            });
        });
    }

    /**
     * Mostrar mensajes rápidos
     */
    showQuickMessages(category) {
        document.querySelectorAll('.quick-cat-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        const quickMessages = document.getElementById('quickMessages');
        quickMessages.innerHTML = this.generateQuickMessagesHTML(category);
        
        // Re-bind quick message events
        quickMessages.querySelectorAll('.quick-msg-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.sendQuickMessage(e.target.dataset.message);
            });
        });
    }

    /**
     * Insertar emoji en input
     */
    insertEmoji(emojiKey) {
        const input = document.getElementById('messageInput');
        const emoji = this.emojis[emojiKey];
        
        if (input && emoji) {
            const cursorPos = input.selectionStart;
            const textBefore = input.value.substring(0, cursorPos);
            const textAfter = input.value.substring(cursorPos);
            
            input.value = textBefore + emoji.code + textAfter;
            input.focus();
            input.setSelectionRange(cursorPos + emoji.code.length, cursorPos + emoji.code.length);
            
            this.updateCharCounter(input.value);
            this.userStats.emojisUsed++;
        }
    }

    /**
     * Enviar sticker
     */
    sendSticker(stickerId) {
        const allStickers = Object.values(this.stickers).flat();
        const sticker = allStickers.find(s => s.id === stickerId);
        
        if (sticker) {
            const message = {
                type: 'sticker',
                content: sticker,
                username: this.bingoGame.username || 'Usuario',
                timestamp: new Date(),
                id: Date.now()
            };
            
            this.addMessage(message);
            this.userStats.stickersUsed++;
            this.closeAllPanels();
        }
    }

    /**
     * Enviar mensaje rápido
     */
    sendQuickMessage(message) {
        document.getElementById('messageInput').value = message;
        this.sendMessage();
        this.closeAllPanels();
    }

    /**
     * Enviar mensaje
     */
    sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        
        if (!text) return;
        
        // Verificar moderación
        if (!this.passesModeration(text)) {
            this.showModerationWarning();
            return;
        }
        
        const message = {
            type: 'user',
            content: text,
            username: this.bingoGame.username || 'Usuario',
            timestamp: new Date(),
            id: Date.now()
        };
        
        this.addMessage(message);
        this.userStats.messagesSent++;
        this.userStats.lastMessageTime = Date.now();
        
        input.value = '';
        this.updateCharCounter('');
    }

    /**
     * Verificar moderación
     */
    passesModeration(text) {
        const config = this.moderationConfig;
        
        // Verificar longitud
        if (text.length > config.maxMessageLength) return false;
        
        // Verificar palabras prohibidas
        const lowerText = text.toLowerCase();
        for (const word of config.bannedWords) {
            if (lowerText.includes(word)) return false;
        }
        
        // Verificar mayúsculas excesivas
        const capsCount = (text.match(/[A-Z]/g) || []).length;
        const capsRatio = capsCount / text.length;
        if (capsRatio > config.capsLockLimit) return false;
        
        // Verificar rate limiting
        const now = Date.now();
        const timeSinceLastMessage = now - this.userStats.lastMessageTime;
        if (timeSinceLastMessage < 1000) return false; // Mínimo 1 segundo entre mensajes
        
        return true;
    }

    /**
     * Añadir mensaje al chat
     */
    addMessage(message) {
        this.messages.push(message);
        
        const messagesContainer = document.getElementById('chatMessages');
        const messageElement = this.createMessageElement(message);
        
        messagesContainer.appendChild(messageElement);
        
        // Auto-scroll si está habilitado
        if (this.autoScrollEnabled) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Limpiar mensajes antiguos (mantener últimos 100)
        if (this.messages.length > 100) {
            this.messages.shift();
            messagesContainer.removeChild(messagesContainer.firstChild);
        }
        
        // Animación de entrada
        setTimeout(() => {
            messageElement.classList.add('show');
        }, 50);
    }

    /**
     * Crear elemento de mensaje
     */
    createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `chat-message ${message.type}`;
        
        const time = message.timestamp.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        if (message.type === 'sticker') {
            div.innerHTML = `
                <div class="message-header">
                    <span class="username">${message.username}</span>
                    <span class="timestamp">${time}</span>
                </div>
                <div class="sticker-message">
                    <div class="sticker-content" style="background: ${message.content.color}">
                        <div class="sticker-image">${message.content.image}</div>
                        <div class="sticker-text">${message.content.text}</div>
                    </div>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div class="message-header">
                    <span class="username">${message.username}</span>
                    <span class="timestamp">${time}</span>
                </div>
                <div class="message-content">
                    ${this.formatMessageContent(message.content)}
                </div>
            `;
        }
        
        return div;
    }

    /**
     * Formatear contenido del mensaje
     */
    formatMessageContent(content) {
        // Convertir emojis a elementos animados
        let formatted = content;
        
        for (const [key, emoji] of Object.entries(this.emojis)) {
            const regex = new RegExp(emoji.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            formatted = formatted.replace(regex, 
                `<span class="animated-emoji ${emoji.animation}">${emoji.code}</span>`
            );
        }
        
        return formatted;
    }

    /**
     * Actualizar contador de caracteres
     */
    updateCharCounter(text) {
        const counter = document.getElementById('charCount');
        if (counter) {
            counter.textContent = text.length;
            counter.parentElement.classList.toggle('warning', text.length > 180);
            counter.parentElement.classList.toggle('danger', text.length >= 200);
        }
    }

    /**
     * Simular usuarios online
     */
    simulateOnlineUsers() {
        const updateCount = () => {
            const count = Math.floor(Math.random() * 50) + 10;
            document.getElementById('onlineCount').textContent = count;
        };
        
        updateCount();
        setInterval(updateCount, 30000); // Actualizar cada 30 segundos
    }

    /**
     * Cargar historial del chat
     */
    loadChatHistory() {
        // Simular algunos mensajes iniciales
        const welcomeMessages = [
            { type: 'system', content: '¡Bienvenido al chat de BingoRoyal! 🎉', username: 'Sistema', timestamp: new Date() },
            { type: 'system', content: 'Sé respetuoso y diviértete jugando 😊', username: 'Sistema', timestamp: new Date() }
        ];
        
        welcomeMessages.forEach(msg => this.addMessage(msg));
    }

    /**
     * Mostrar advertencia de moderación
     */
    showModerationWarning() {
        const warning = document.createElement('div');
        warning.className = 'moderation-warning';
        warning.innerHTML = `
            <div class="warning-content">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Mensaje bloqueado por moderación</span>
            </div>
        `;
        
        document.body.appendChild(warning);
        
        setTimeout(() => warning.classList.add('show'), 100);
        setTimeout(() => {
            warning.classList.remove('show');
            setTimeout(() => warning.remove(), 300);
        }, 3000);
    }

    /**
     * Obtener estadísticas
     */
    getStats() {
        return { ...this.userStats };
    }

    /**
     * Destruir sistema
     */
    destroy() {
        document.getElementById('advancedChatContainer')?.remove();
        console.log('💬 Advanced Chat System destruido');
    }
}

// CSS para el chat avanzado (archivo muy extenso, incluir solo una parte representativa)
const advancedChatCSS = `
.advanced-chat-container {
    max-height: 600px;
    display: flex;
    flex-direction: column;
    animation: slideInRight 0.8s ease-out;
}

.chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--glass-border);
    background: linear-gradient(135deg, var(--premium-royal-blue), var(--premium-royal-blue-light));
}

.chat-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: white;
    font-weight: 600;
}

.online-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.8);
}

.pulse-dot {
    width: 8px;
    height: 8px;
    background: #00ff00;
    border-radius: 50%;
    animation: pulse 2s infinite;
}

.chat-controls {
    display: flex;
    gap: var(--spacing-xs);
}

.chat-btn {
    width: 32px;
    height: 32px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: white;
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
}

.chat-btn:hover {
    background: var(--premium-gold);
    color: var(--premium-royal-blue-dark);
}

.chat-messages {
    flex-grow: 1;
    padding: var(--spacing-sm);
    overflow-y: auto;
    max-height: 300px;
    background: rgba(0, 0, 0, 0.1);
}

.chat-message {
    margin-bottom: var(--spacing-sm);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    opacity: 0;
    transform: translateY(20px);
    transition: all var(--transition-medium);
}

.chat-message.show {
    opacity: 1;
    transform: translateY(0);
}

.chat-message.user {
    background: linear-gradient(135deg, rgba(26, 35, 126, 0.2), rgba(26, 35, 126, 0.1));
    border-left: 3px solid var(--premium-royal-blue);
}

.chat-message.system {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1));
    border-left: 3px solid var(--premium-gold);
}

.message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xs);
    font-size: 0.8rem;
}

.username {
    font-weight: 600;
    color: var(--premium-gold);
}

.timestamp {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.7rem;
}

.message-content {
    color: white;
    font-size: 0.9rem;
    line-height: 1.4;
}

.animated-emoji {
    display: inline-block;
    font-size: 1.2em;
}

.animated-emoji.bounce {
    animation: emojiBounce 0.6s ease-out;
}

.animated-emoji.shake {
    animation: emojiShake 0.8s ease-out;
}

.animated-emoji.pulse {
    animation: emojiPulse 1s ease-in-out infinite;
}

@keyframes emojiBounce {
    0%, 100% { transform: scale(1) translateY(0); }
    50% { transform: scale(1.3) translateY(-10px); }
}

@keyframes emojiShake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}

@keyframes emojiPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
}

.chat-input-container {
    padding: var(--spacing-md);
    border-top: 1px solid var(--glass-border);
}

.input-wrapper {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    background: var(--glass-bg);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    border: 1px solid var(--glass-border);
}

#messageInput {
    flex-grow: 1;
    background: transparent;
    border: none;
    color: white;
    font-size: 0.9rem;
    outline: none;
}

#messageInput::placeholder {
    color: rgba(255, 255, 255, 0.5);
}

.input-controls {
    display: flex;
    gap: var(--spacing-xs);
}

.input-btn {
    width: 28px;
    height: 28px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
}

.input-btn:hover {
    background: var(--premium-gold);
    color: var(--premium-royal-blue-dark);
}

.character-counter {
    text-align: right;
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.6);
    margin-top: var(--spacing-xs);
}

.character-counter.warning {
    color: #ffa726;
}

.character-counter.danger {
    color: #ef5350;
}

.emoji-panel, .sticker-panel, .quick-panel, .chat-settings {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    background: var(--glass-bg-strong);
    backdrop-filter: var(--glass-backdrop);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    max-height: 300px;
    z-index: 1000;
    box-shadow: var(--shadow-strong);
}

.panel-header {
    padding: var(--spacing-sm);
    border-bottom: 1px solid var(--glass-border);
}

.emoji-categories, .sticker-categories {
    display: flex;
    gap: var(--spacing-xs);
    overflow-x: auto;
}

.cat-btn {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: white;
    padding: var(--spacing-xs) var(--spacing-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
    font-size: 0.8rem;
}

.cat-btn:hover, .cat-btn.active {
    background: var(--premium-gold);
    color: var(--premium-royal-blue-dark);
}

.emoji-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    max-height: 200px;
    overflow-y: auto;
}

.emoji-btn {
    width: 40px;
    height: 40px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
}

.emoji-btn:hover {
    background: var(--premium-gold);
    transform: scale(1.1);
}

.sticker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    max-height: 200px;
    overflow-y: auto;
}

.sticker-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.sticker-btn:hover {
    transform: scale(1.05);
}

.sticker-content {
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    text-align: center;
    color: white;
    font-weight: 600;
    box-shadow: var(--shadow-subtle);
}

.sticker-image {
    font-size: 1.5rem;
    margin-bottom: var(--spacing-xs);
}

.sticker-text {
    font-size: 0.7rem;
}

.moderation-warning {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--glass-bg-strong);
    backdrop-filter: var(--glass-backdrop);
    border: 1px solid #ef5350;
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    z-index: 10000;
    opacity: 0;
    transition: all var(--transition-medium);
}

.moderation-warning.show {
    opacity: 1;
}

.warning-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: #ef5350;
    font-weight: 600;
}

@media (max-width: 768px) {
    .advanced-chat-container {
        max-height: 400px;
    }
    
    .chat-messages {
        max-height: 200px;
    }
    
    .emoji-grid {
        grid-template-columns: repeat(auto-fill, minmax(35px, 1fr));
    }
    
    .sticker-grid {
        grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    }
}
`;

// Inyectar CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = advancedChatCSS;
document.head.appendChild(styleSheet);

// Exportar clase
window.AdvancedChatSystem = AdvancedChatSystem; 