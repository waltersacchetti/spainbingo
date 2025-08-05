/**
 * Módulo de Seguridad para Bingo Spain
 * Implementa medidas de ciberseguridad y cumplimiento normativo
 */

class SecurityManager {
    constructor() {
        this.securityConfig = {
            // Configuración de seguridad
            maxSessionTime: 4 * 60 * 60 * 1000, // 4 horas
            maxDailyPlayTime: 8 * 60 * 60 * 1000, // 8 horas
            maxConcurrentSessions: 1,
            rateLimit: {
                calls: 100, // máximo 100 llamadas por minuto (aumentado para desarrollo)
                purchases: 20, // máximo 20 compras por hora (aumentado para desarrollo)
                deposits: 10 // máximo 10 depósitos por día (aumentado para desarrollo)
            },
            // Configuración de validación
            validationRules: {
                minAge: 18,
                maxBalance: 10000,
                maxCardsPerGame: 50,
                maxAutoPlayDuration: 5 * 60 * 1000 // 5 minutos
            },
            // Configuración de auditoría
            auditLog: [],
            securityEvents: []
        };
        
        this.sessionData = {
            startTime: Date.now(),
            lastActivity: Date.now(),
            playTime: 0,
            calls: 0,
            purchases: 0,
            deposits: 0
        };
        
        this.initializeSecurity();
    }

    /**
     * Inicializar medidas de seguridad
     */
    initializeSecurity() {
        this.setupSessionMonitoring();
        this.setupRateLimiting();
        this.setupInputValidation();
        this.setupAuditLogging();
        this.setupAntiTampering();
        this.setupAgeVerification();
        this.setupResponsibleGaming();
        
        // Mostrar información del entorno
        if (this.isProduction()) {
            console.log('🔒 Sistema de seguridad inicializado - MODO PRODUCCIÓN');
        } else {
            console.log('🔒 Sistema de seguridad inicializado - MODO DESARROLLO');
            console.log('📝 Nota: Algunas verificaciones de seguridad están deshabilitadas en desarrollo');
        }
    }

    /**
     * Monitoreo de sesión
     */
    setupSessionMonitoring() {
        // Verificar sesión cada minuto
        setInterval(() => {
            this.checkSessionValidity();
        }, 60000);

        // Actualizar actividad del usuario
        document.addEventListener('click', () => {
            this.sessionData.lastActivity = Date.now();
        });

        // Prevenir múltiples pestañas
        window.addEventListener('beforeunload', () => {
            this.logSecurityEvent('session_end', 'Usuario cerró la sesión');
        });
    }

    /**
     * Verificar validez de la sesión
     */
    checkSessionValidity() {
        const now = Date.now();
        const sessionAge = now - this.sessionData.startTime;
        const inactivityTime = now - this.sessionData.lastActivity;

        // Verificar tiempo máximo de sesión
        if (sessionAge > this.securityConfig.maxSessionTime) {
            this.forceLogout('Sesión expirada por tiempo máximo');
            return false;
        }

        // Verificar inactividad (30 minutos)
        if (inactivityTime > 30 * 60 * 1000) {
            this.forceLogout('Sesión expirada por inactividad');
            return false;
        }

        return true;
    }

    /**
     * Control de velocidad de acciones
     */
    setupRateLimiting() {
        this.rateLimiters = {
            calls: new RateLimiter(this.securityConfig.rateLimit.calls, 60000),
            purchases: new RateLimiter(this.securityConfig.rateLimit.purchases, 3600000),
            deposits: new RateLimiter(this.securityConfig.rateLimit.deposits, 86400000)
        };
    }

    /**
     * Validar acción según límites de velocidad
     */
    validateRateLimit(action) {
        const limiter = this.rateLimiters[action];
        if (!limiter) return true;

        if (!limiter.checkLimit()) {
            this.logSecurityEvent('rate_limit_exceeded', `Límite de velocidad excedido para: ${action}`);
            return false;
        }

        return true;
    }

    /**
     * Resetear rate limiters (útil para desarrollo)
     */
    resetRateLimiters() {
        if (!this.isProduction()) {
            Object.keys(this.rateLimiters).forEach(action => {
                this.rateLimiters[action].reset();
            });
            console.log('🔄 Rate limiters reseteados para desarrollo');
        }
    }

    /**
     * Validación de entrada
     */
    setupInputValidation() {
        // Sanitizar todas las entradas de usuario
        this.sanitizeInputs();
        
        // Prevenir XSS
        this.preventXSS();
        
        // Validar datos del juego
        this.validateGameData();
    }

    /**
     * Sanitizar entradas de usuario
     */
    sanitizeInputs() {
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                e.target.value = this.sanitizeString(e.target.value);
            });
        });
    }

    /**
     * Sanitizar string
     */
    sanitizeString(str) {
        if (typeof str !== 'string') return str;
        
        return str
            .replace(/[<>]/g, '') // Prevenir HTML
            .replace(/javascript:/gi, '') // Prevenir JavaScript
            .replace(/on\w+=/gi, '') // Prevenir eventos
            .trim();
    }

    /**
     * Prevenir ataques XSS
     */
    preventXSS() {
        // Configurar CSP (Content Security Policy)
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;";
        document.head.appendChild(meta);
    }

    /**
     * Validar datos del juego
     */
    validateGameData() {
        // Validar números del bingo
        this.validateBingoNumbers = (numbers) => {
            if (!Array.isArray(numbers)) return false;
            return numbers.every(num => 
                typeof num === 'number' && 
                num >= 1 && 
                num <= 90 && 
                Number.isInteger(num)
            );
        };

        // Validar cartones
        this.validateBingoCard = (card) => {
            if (!Array.isArray(card) || card.length !== 9) return false;
            return card.every(column => 
                Array.isArray(column) && 
                column.length === 3 &&
                column.every(cell => cell === null || (typeof cell === 'number' && cell >= 1 && cell <= 90))
            );
        };
    }

    /**
     * Sistema de auditoría
     */
    setupAuditLogging() {
        this.logEvent = (event, data) => {
            const logEntry = {
                timestamp: new Date().toISOString(),
                event: event,
                data: data,
                sessionId: this.getSessionId(),
                userAgent: navigator.userAgent,
                ip: this.getClientIP()
            };

            this.securityConfig.auditLog.push(logEntry);
            
            // Limitar tamaño del log
            if (this.securityConfig.auditLog.length > 1000) {
                this.securityConfig.auditLog.shift();
            }

            // Enviar a servidor en producción
            if (this.isProduction()) {
                this.sendAuditLog(logEntry);
            }
        };
    }

    /**
     * Registrar evento de seguridad
     */
    logSecurityEvent(event, description) {
        this.logEvent('security', { event, description });
        this.securityConfig.securityEvents.push({
            timestamp: Date.now(),
            event: event,
            description: description
        });
    }

    /**
     * Prevenir manipulación del código
     */
    setupAntiTampering() {
        // Verificar integridad del código
        this.checkCodeIntegrity();
        
        // Detectar herramientas de desarrollo
        this.detectDevTools();
        
        // Prevenir debugging
        this.preventDebugging();
    }

    /**
     * Verificar integridad del código
     */
    checkCodeIntegrity() {
        // Solo verificar en producción
        if (!this.isProduction()) {
            console.log('🔒 Modo desarrollo: Verificación de integridad deshabilitada');
            return;
        }

        // Verificar que las funciones críticas no han sido modificadas
        const criticalFunctions = ['callNumber', 'checkWin', 'buyPackage'];
        
        criticalFunctions.forEach(funcName => {
            if (typeof window[funcName] !== 'function') {
                this.logSecurityEvent('code_tampering', `Función crítica modificada: ${funcName}`);
                this.forceLogout('Detección de manipulación del código');
            }
        });
    }

    /**
     * Detectar herramientas de desarrollo
     */
    detectDevTools() {
        // Solo detectar en producción
        if (!this.isProduction()) {
            console.log('🔒 Modo desarrollo: Detección de DevTools deshabilitada');
            return;
        }

        let devtools = false;
        
        const threshold = 160;
        
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools) {
                    devtools = true;
                    this.logSecurityEvent('devtools_opened', 'Herramientas de desarrollo detectadas');
                }
            } else {
                devtools = false;
            }
        }, 1000);
    }

    /**
     * Prevenir debugging
     */
    preventDebugging() {
        // Solo prevenir en producción
        if (!this.isProduction()) {
            console.log('🔒 Modo desarrollo: Prevención de debugging deshabilitada');
            return;
        }

        // Detectar breakpoints
        const start = Date.now();
        debugger;
        const end = Date.now();
        
        if (end - start > 100) {
            this.logSecurityEvent('debugging_detected', 'Debugging detectado');
        }
    }

    /**
     * Verificación de edad
     */
    setupAgeVerification() {
        this.verifyAge = () => {
            const age = localStorage.getItem('user_age');
            if (!age || parseInt(age) < this.securityConfig.validationRules.minAge) {
                this.showAgeVerification();
                return false;
            }
            return true;
        };
    }

    /**
     * Mostrar verificación de edad
     */
    showAgeVerification() {
        const modal = document.createElement('div');
        modal.className = 'age-verification-modal';
        modal.innerHTML = `
            <div class="age-verification-content">
                <h3>Verificación de Edad</h3>
                <p>Debe ser mayor de 18 años para jugar.</p>
                <div class="age-input">
                    <label>Fecha de nacimiento:</label>
                    <input type="date" id="birthDate" required>
                </div>
                <div class="age-buttons">
                    <button onclick="securityManager.confirmAge()">Confirmar</button>
                    <button onclick="securityManager.denyAccess()">Salir</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Confirmar edad
     */
    confirmAge() {
        const birthDate = document.getElementById('birthDate').value;
        if (!birthDate) {
            alert('Por favor, ingrese su fecha de nacimiento');
            return;
        }

        const age = this.calculateAge(birthDate);
        if (age >= this.securityConfig.validationRules.minAge) {
            localStorage.setItem('user_age', age);
            document.querySelector('.age-verification-modal').remove();
            this.logEvent('age_verified', { age: age });
        } else {
            this.denyAccess();
        }
    }

    /**
     * Calcular edad
     */
    calculateAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    /**
     * Denegar acceso
     */
    denyAccess() {
        this.logSecurityEvent('access_denied', 'Acceso denegado por edad');
        alert('Debe ser mayor de 18 años para acceder a este sitio.');
        window.location.href = 'https://www.google.com';
    }

    /**
     * Juego responsable
     */
    setupResponsibleGaming() {
        this.responsibleGaming = {
            // Límites de tiempo
            timeLimits: {
                session: 4 * 60 * 60 * 1000, // 4 horas
                daily: 8 * 60 * 60 * 1000, // 8 horas
                autoPlay: 5 * 60 * 1000 // 5 minutos
            },
            
            // Alertas
            showTimeAlert: (timePlayed) => {
                if (timePlayed > 2 * 60 * 60 * 1000) { // 2 horas
                    this.showResponsibleGamingAlert('Ha jugado más de 2 horas. Considere tomar un descanso.');
                }
            },
            
            // Auto-exclusión
            selfExclusion: {
                isExcluded: false,
                exclusionPeriod: null,
                
                exclude: (days) => {
                    this.responsibleGaming.selfExclusion.isExcluded = true;
                    this.responsibleGaming.selfExclusion.exclusionPeriod = Date.now() + (days * 24 * 60 * 60 * 1000);
                    localStorage.setItem('self_exclusion', JSON.stringify({
                        isExcluded: true,
                        until: this.responsibleGaming.selfExclusion.exclusionPeriod
                    }));
                    this.forceLogout('Auto-exclusión activada');
                },
                
                checkExclusion: () => {
                    const exclusion = localStorage.getItem('self_exclusion');
                    if (exclusion) {
                        const data = JSON.parse(exclusion);
                        if (data.isExcluded && Date.now() < data.until) {
                            return true;
                        }
                    }
                    return false;
                }
            }
        };
    }

    /**
     * Mostrar alerta de juego responsable
     */
    showResponsibleGamingAlert(message) {
        const alert = document.createElement('div');
        alert.className = 'responsible-gaming-alert';
        alert.innerHTML = `
            <div class="alert-content">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <div class="alert-buttons">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">Continuar</button>
                    <button onclick="securityManager.responsibleGaming.selfExclusion.exclude(1)">Auto-excluirse 24h</button>
                    <button onclick="securityManager.responsibleGaming.selfExclusion.exclude(7)">Auto-excluirse 7 días</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(alert);
    }

    /**
     * Forzar cierre de sesión
     */
    forceLogout(reason) {
        this.logSecurityEvent('forced_logout', reason);
        alert(`Sesión terminada: ${reason}`);
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'welcome.html';
    }

    /**
     * Obtener ID de sesión
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('session_id', sessionId);
        }
        return sessionId;
    }

    /**
     * Obtener IP del cliente (simulado)
     */
    getClientIP() {
        // En producción, esto vendría del servidor
        return '127.0.0.1';
    }

    /**
     * Verificar si es producción
     */
    isProduction() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        
        // Entornos de desarrollo
        const devEnvironments = [
            'localhost',
            '127.0.0.1',
            '0.0.0.0',
            '::1'
        ];
        
        // Verificar si estamos en desarrollo
        if (devEnvironments.includes(hostname)) {
            return false;
        }
        
        // Verificar si estamos usando HTTP (desarrollo) vs HTTPS (producción)
        if (protocol === 'http:' && hostname !== 'localhost') {
            return false;
        }
        
        // Verificar si el puerto es de desarrollo
        const port = window.location.port;
        const devPorts = ['3000', '8000', '8080', '5000'];
        if (devPorts.includes(port)) {
            return false;
        }
        
        return true;
    }

    /**
     * Enviar log de auditoría al servidor
     */
    sendAuditLog(logEntry) {
        // En producción, enviar a servidor de auditoría
        fetch('/api/audit-log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(logEntry)
        }).catch(error => {
            console.error('Error enviando log de auditoría:', error);
        });
    }
}

/**
 * Clase para control de velocidad de acciones
 */
class RateLimiter {
    constructor(maxRequests, timeWindow) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.requests = [];
    }

    checkLimit() {
        const now = Date.now();
        
        // Limpiar requests antiguos
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        
        // Verificar límite
        if (this.requests.length >= this.maxRequests) {
            return false;
        }
        
        // Agregar nuevo request
        this.requests.push(now);
        return true;
    }

    reset() {
        this.requests = [];
    }
}

// Inicializar gestor de seguridad
const securityManager = new SecurityManager();

// Exportar para uso global
window.securityManager = securityManager;

// Función global para resetear rate limiters (útil para desarrollo)
window.resetRateLimiters = function() {
    if (securityManager) {
        securityManager.resetRateLimiters();
        console.log('✅ Rate limiters reseteados. Puedes continuar jugando.');
    }
};

console.log('🔒 Módulo de seguridad cargado');
console.log('💡 Para resetear rate limiters en desarrollo, usa: resetRateLimiters()'); 