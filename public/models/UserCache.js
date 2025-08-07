/**
 * Sistema de Caché para Usuarios
 * Mejora el rendimiento reduciendo consultas a la base de datos
 */

class UserCache {
    constructor() {
        this.cache = new Map();
        this.userSessions = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutos
        this.sessionExpiry = 24 * 60 * 60 * 1000; // 24 horas
        this.maxCacheSize = 1000; // Máximo 1000 usuarios en caché
        
        // Limpiar caché expirado cada 5 minutos
        setInterval(() => {
            this.cleanExpiredCache();
        }, 5 * 60 * 1000);
        
        console.log('🔄 Sistema de caché de usuarios inicializado');
    }

    /**
     * Generar clave de caché para un usuario
     */
    generateCacheKey(userId, type = 'user') {
        return `${type}:${userId}`;
    }

    /**
     * Obtener usuario del caché
     */
    getCachedUser(userId) {
        const key = this.generateCacheKey(userId);
        const cached = this.cache.get(key);
        
        if (cached && !this.isExpired(cached.timestamp)) {
            console.log(`📦 Usuario ${userId} obtenido del caché`);
            return cached.data;
        }
        
        if (cached) {
            this.cache.delete(key);
        }
        
        return null;
    }

    /**
     * Guardar usuario en caché
     */
    setCachedUser(userId, userData) {
        const key = this.generateCacheKey(userId);
        
        // Limpiar caché si está lleno
        if (this.cache.size >= this.maxCacheSize) {
            this.evictOldestEntries();
        }
        
        this.cache.set(key, {
            data: userData,
            timestamp: Date.now(),
            accessCount: 0
        });
        
        console.log(`💾 Usuario ${userId} guardado en caché`);
    }

    /**
     * Actualizar usuario en caché
     */
    updateCachedUser(userId, userData) {
        const key = this.generateCacheKey(userId);
        const existing = this.cache.get(key);
        
        if (existing) {
            existing.data = { ...existing.data, ...userData };
            existing.timestamp = Date.now();
            existing.accessCount++;
            console.log(`🔄 Usuario ${userId} actualizado en caché`);
        } else {
            this.setCachedUser(userId, userData);
        }
    }

    /**
     * Eliminar usuario del caché
     */
    removeCachedUser(userId) {
        const key = this.generateCacheKey(userId);
        this.cache.delete(key);
        console.log(`🗑️ Usuario ${userId} eliminado del caché`);
    }

    /**
     * Obtener sesión de usuario
     */
    getCachedSession(sessionId) {
        const key = this.generateCacheKey(sessionId, 'session');
        const cached = this.userSessions.get(key);
        
        if (cached && !this.isExpired(cached.timestamp, this.sessionExpiry)) {
            return cached.data;
        }
        
        if (cached) {
            this.userSessions.delete(key);
        }
        
        return null;
    }

    /**
     * Guardar sesión de usuario
     */
    setCachedSession(sessionId, sessionData) {
        const key = this.generateCacheKey(sessionId, 'session');
        
        this.userSessions.set(key, {
            data: sessionData,
            timestamp: Date.now()
        });
        
        console.log(`💾 Sesión ${sessionId} guardada en caché`);
    }

    /**
     * Verificar si el caché ha expirado
     */
    isExpired(timestamp, expiry = this.cacheExpiry) {
        return Date.now() - timestamp > expiry;
    }

    /**
     * Limpiar caché expirado
     */
    cleanExpiredCache() {
        let cleanedCount = 0;
        
        // Limpiar caché de usuarios
        for (const [key, value] of this.cache.entries()) {
            if (this.isExpired(value.timestamp)) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }
        
        // Limpiar caché de sesiones
        for (const [key, value] of this.userSessions.entries()) {
            if (this.isExpired(value.timestamp, this.sessionExpiry)) {
                this.userSessions.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Limpieza de caché: ${cleanedCount} entradas expiradas eliminadas`);
        }
    }

    /**
     * Eliminar entradas más antiguas cuando el caché está lleno
     */
    evictOldestEntries() {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // Eliminar el 20% más antiguo
        const toRemove = Math.ceil(entries.length * 0.2);
        
        for (let i = 0; i < toRemove; i++) {
            this.cache.delete(entries[i][0]);
        }
        
        console.log(`🗑️ Evicción de caché: ${toRemove} entradas antiguas eliminadas`);
    }

    /**
     * Obtener estadísticas del caché
     */
    getCacheStats() {
        return {
            userCacheSize: this.cache.size,
            sessionCacheSize: this.userSessions.size,
            maxCacheSize: this.maxCacheSize,
            cacheExpiry: this.cacheExpiry,
            sessionExpiry: this.sessionExpiry,
            memoryUsage: process.memoryUsage()
        };
    }

    /**
     * Limpiar todo el caché
     */
    clearAllCache() {
        this.cache.clear();
        this.userSessions.clear();
        console.log('🧹 Todo el caché ha sido limpiado');
    }

    /**
     * Buscar usuario por email en caché
     */
    findUserByEmail(email) {
        for (const [key, value] of this.cache.entries()) {
            if (key.startsWith('user:') && value.data.email === email) {
                return value.data;
            }
        }
        return null;
    }

    /**
     * Buscar usuario por username en caché
     */
    findUserByUsername(username) {
        for (const [key, value] of this.cache.entries()) {
            if (key.startsWith('user:') && value.data.username === username) {
                return value.data;
            }
        }
        return null;
    }

    /**
     * Obtener usuarios activos del caché
     */
    getActiveUsers() {
        const activeUsers = [];
        for (const [key, value] of this.cache.entries()) {
            if (key.startsWith('user:') && value.data.is_active) {
                activeUsers.push(value.data);
            }
        }
        return activeUsers;
    }

    /**
     * Obtener usuarios verificados del caché
     */
    getVerifiedUsers() {
        const verifiedUsers = [];
        for (const [key, value] of this.cache.entries()) {
            if (key.startsWith('user:') && value.data.is_verified) {
                verifiedUsers.push(value.data);
            }
        }
        return verifiedUsers;
    }
}

// Crear instancia global del caché
const userCache = new UserCache();

module.exports = userCache; 