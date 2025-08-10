/**
 * Configuración del Sistema de Chat - BingoRoyal
 * Archivo de configuración centralizada para el chat en vivo
 */

class ChatConfig {
    constructor() {
        // Configuración básica
        this.apiEndpoint = '/api/chat';
        this.pollingInterval = 3000; // 3 segundos
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 segundo
        
        // Configuración de mensajes
        this.maxMessageLength = 200;
        this.maxMessagesPerMinute = 10;
        this.messageTimeout = 10000; // 10 segundos
        
        // Configuración de UI
        this.autoScroll = true;
        this.showTimestamps = true;
        this.enableEmojis = true;
        this.enableStickers = true;
        
        // Configuración de moderación
        this.moderationEnabled = true;
        this.bannedWords = ['spam', 'hack', 'cheat', 'scam'];
        this.linkDetection = true;
        this.capsLockLimit = 0.7; // 70% mayúsculas máximo
        
        // Configuración de sonidos
        this.enableSounds = true;
        this.messageSound = 'message.mp3';
        this.notificationSound = 'notification.mp3';
        
        // Estado del sistema
        this.isInitialized = false;
        this.isConnected = false;
        this.lastMessageTime = 0;
        this.messageCount = 0;
        
        // Configuración de fallback
        this.fallbackMode = false;
        this.localStorageKey = 'bingoroyal_chat_messages';
        this.maxLocalMessages = 100;
        
        console.log('🔧 ChatConfig inicializado');
    }
    
    /**
     * Obtener la URL completa de la API
     */
    getApiUrl() {
        try {
            // Si estamos en HTTPS y la URL es relativa, usar URL completa
            if (window.location.protocol === 'https:' && this.apiEndpoint.startsWith('/')) {
                return `${window.location.origin}${this.apiEndpoint}`;
            }
            
            // Si estamos en desarrollo local
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return `http://localhost:3000${this.apiEndpoint}`;
            }
            
            return this.apiEndpoint;
        } catch (error) {
            console.error('❌ Error obteniendo URL de la API:', error);
            return this.apiEndpoint;
        }
    }
    
    /**
     * Verificar si el chat está habilitado
     */
    isChatEnabled() {
        // Verificar si hay una sesión activa
        const sessionData = localStorage.getItem('bingoroyal_session');
        if (!sessionData) {
            console.log('⚠️ No hay sesión activa, chat deshabilitado');
            return false;
        }
        
        try {
            const session = JSON.parse(sessionData);
            if (!session.user) {
                console.log('⚠️ Sesión inválida, chat deshabilitado');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error verificando sesión:', error);
            return false;
        }
    }
    
    /**
     * Obtener información del usuario actual
     */
    getCurrentUser() {
        try {
            const sessionData = localStorage.getItem('bingoroyal_session');
            if (!sessionData) {
                return { id: 'anonymous', name: 'Jugador' };
            }
            
            const session = JSON.parse(sessionData);
            if (session.user) {
                return {
                    id: session.user.id || session.user.email || 'user_' + Date.now(),
                    name: session.user.firstName || session.user.email || 'Jugador',
                    email: session.user.email || '',
                    isVIP: session.user.isVIP || false
                };
            }
            
            return { id: 'anonymous', name: 'Jugador' };
        } catch (error) {
            console.error('❌ Error obteniendo usuario actual:', error);
            return { id: 'anonymous', name: 'Jugador' };
        }
    }
    
    /**
     * Validar mensaje antes de enviarlo
     */
    validateMessage(message) {
        if (!message || typeof message !== 'string') {
            return { valid: false, error: 'Mensaje inválido' };
        }
        
        if (message.trim().length === 0) {
            return { valid: false, error: 'Mensaje vacío' };
        }
        
        if (message.length > this.maxMessageLength) {
            return { valid: false, error: `Mensaje demasiado largo (máximo ${this.maxMessageLength} caracteres)` };
        }
        
        // Verificar límite de mensajes por minuto
        const now = Date.now();
        if (now - this.lastMessageTime < 60000) { // 1 minuto
            if (this.messageCount >= this.maxMessagesPerMinute) {
                return { valid: false, error: 'Demasiados mensajes por minuto' };
            }
        } else {
            // Resetear contador si ha pasado más de 1 minuto
            this.messageCount = 0;
            this.lastMessageTime = now;
        }
        
        // Verificar palabras prohibidas
        if (this.moderationEnabled) {
            const lowerMessage = message.toLowerCase();
            for (const bannedWord of this.bannedWords) {
                if (lowerMessage.includes(bannedWord)) {
                    return { valid: false, error: 'Mensaje contiene palabras prohibidas' };
                }
            }
        }
        
        // Verificar límite de mayúsculas
        if (this.moderationEnabled && this.capsLockLimit > 0) {
            const upperCount = (message.match(/[A-Z]/g) || []).length;
            const totalCount = message.replace(/[^a-zA-Z]/g, '').length;
            
            if (totalCount > 0 && upperCount / totalCount > this.capsLockLimit) {
                return { valid: false, error: 'Demasiadas mayúsculas en el mensaje' };
            }
        }
        
        // Verificar enlaces si está habilitado
        if (this.linkDetection && this.moderationEnabled) {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            if (urlRegex.test(message)) {
                return { valid: false, error: 'No se permiten enlaces en el chat' };
            }
        }
        
        return { valid: true };
    }
    
    /**
     * Configurar modo de fallback
     */
    enableFallbackMode() {
        this.fallbackMode = true;
        console.log('🔄 Modo de fallback del chat habilitado');
        
        // Cargar mensajes desde localStorage
        this.loadLocalMessages();
    }
    
    /**
     * Deshabilitar modo de fallback
     */
    disableFallbackMode() {
        this.fallbackMode = false;
        console.log('✅ Modo de fallback del chat deshabilitado');
    }
    
    /**
     * Guardar mensaje en localStorage
     */
    saveLocalMessage(message) {
        try {
            const messages = this.loadLocalMessages();
            const newMessage = {
                ...message,
                timestamp: Date.now(),
                id: 'local_' + Date.now()
            };
            
            messages.push(newMessage);
            
            // Mantener solo los últimos mensajes
            if (messages.length > this.maxLocalMessages) {
                messages.splice(0, messages.length - this.maxLocalMessages);
            }
            
            localStorage.setItem(this.localStorageKey, JSON.stringify(messages));
            return true;
        } catch (error) {
            console.error('❌ Error guardando mensaje local:', error);
            return false;
        }
    }
    
    /**
     * Cargar mensajes desde localStorage
     */
    loadLocalMessages() {
        try {
            const messages = localStorage.getItem(this.localStorageKey);
            return messages ? JSON.parse(messages) : [];
        } catch (error) {
            console.error('❌ Error cargando mensajes locales:', error);
            return [];
        }
    }
    
    /**
     * Limpiar mensajes locales
     */
    clearLocalMessages() {
        try {
            localStorage.removeItem(this.localStorageKey);
            console.log('🗑️ Mensajes locales limpiados');
            return true;
        } catch (error) {
            console.error('❌ Error limpiando mensajes locales:', error);
            return false;
        }
    }
    
    /**
     * Obtener configuración para el usuario
     */
    getUserConfig() {
        const user = this.getCurrentUser();
        
        return {
            userId: user.id,
            userName: user.name,
            isVIP: user.isVIP,
            enableSounds: this.enableSounds,
            enableEmojis: this.enableEmojis,
            enableStickers: this.enableStickers,
            showTimestamps: this.showTimestamps,
            autoScroll: this.autoScroll
        };
    }
    
    /**
     * Actualizar configuración del usuario
     */
    updateUserConfig(newConfig) {
        try {
            Object.assign(this, newConfig);
            console.log('✅ Configuración del usuario actualizada');
            return true;
        } catch (error) {
            console.error('❌ Error actualizando configuración:', error);
            return false;
        }
    }
    
    /**
     * Verificar conectividad de la API
     */
    async checkApiConnectivity() {
        try {
            const apiUrl = this.getApiUrl();
            console.log('🔗 Verificando conectividad con:', apiUrl);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.messageTimeout);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                this.isConnected = true;
                console.log('✅ API del chat conectada');
                return { connected: true, status: response.status };
            } else {
                this.isConnected = false;
                console.warn('⚠️ API del chat respondió con error:', response.status);
                return { connected: false, status: response.status, error: 'HTTP Error' };
            }
        } catch (error) {
            this.isConnected = false;
            console.error('❌ Error conectando con la API del chat:', error);
            
            if (error.name === 'AbortError') {
                return { connected: false, error: 'Timeout' };
            }
            
            return { connected: false, error: error.message };
        }
    }
    
    /**
     * Obtener estado del sistema
     */
    getSystemStatus() {
        return {
            isInitialized: this.isInitialized,
            isConnected: this.isConnected,
            isChatEnabled: this.isChatEnabled(),
            fallbackMode: this.fallbackMode,
            currentUser: this.getCurrentUser(),
            apiUrl: this.getApiUrl(),
            messageCount: this.messageCount,
            lastMessageTime: this.lastMessageTime
        };
    }
    
    /**
     * Resetear configuración
     */
    reset() {
        this.isInitialized = false;
        this.isConnected = false;
        this.lastMessageTime = 0;
        this.messageCount = 0;
        this.fallbackMode = false;
        
        console.log('🔄 Configuración del chat reseteada');
    }
}

// Crear instancia global
window.chatConfig = new ChatConfig();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatConfig;
}
