/**
 * Servicio de Verificación
 * Maneja la generación y envío de códigos de verificación
 */

const crypto = require('crypto');
const EmailService = require('./EmailService');

class VerificationService {
    constructor() {
        this.emailService = new EmailService();
        this.verificationCodes = new Map(); // Almacenar códigos temporalmente
        this.codeExpiration = 10 * 60 * 1000; // 10 minutos
        
        console.log('🔐 Servicio de verificación inicializado con SendGrid');
    }

    /**
     * Generar código de verificación
     * @param {string} userId - ID del usuario
     * @param {string} email - Email del usuario
     * @returns {string} - Código de verificación generado
     */
    generateVerificationCode(userId, email) {
        // Generar código de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Crear hash del código para almacenamiento seguro
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');
        
        // Almacenar código con timestamp de expiración
        this.verificationCodes.set(`${userId}-${email}`, {
            hash: codeHash,
            timestamp: Date.now(),
            attempts: 0
        });
        
        console.log(`🔐 Código de verificación generado para ${email}: ${code}`);
        return code;
    }

    /**
     * Verificar código de verificación
     * @param {string} userId - ID del usuario
     * @param {string} email - Email del usuario
     * @param {string} code - Código a verificar
     * @returns {boolean} - True si el código es válido
     */
    verifyCode(userId, email, code) {
        const key = `${userId}-${email}`;
        const stored = this.verificationCodes.get(key);
        
        if (!stored) {
            console.log(`❌ No se encontró código de verificación para ${email}`);
            return false;
        }
        
        // Verificar expiración
        if (Date.now() - stored.timestamp > this.codeExpiration) {
            console.log(`❌ Código de verificación expirado para ${email}`);
            this.verificationCodes.delete(key);
            return false;
        }
        
        // Verificar código
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');
        if (codeHash === stored.hash) {
            console.log(`✅ Código de verificación válido para ${email}`);
            this.verificationCodes.delete(key);
            return true;
        }
        
        // Incrementar intentos fallidos
        stored.attempts++;
        if (stored.attempts >= 3) {
            console.log(`🚨 Demasiados intentos fallidos para ${email}, eliminando código`);
            this.verificationCodes.delete(key);
        }
        
        console.log(`❌ Código de verificación inválido para ${email}`);
        return false;
    }

    /**
     * Enviar código de verificación por email
     * @param {string} userId - ID del usuario
     * @param {string} email - Email del usuario
     * @param {string} username - Nombre de usuario
     * @returns {Object} - Resultado del envío
     */
    async sendVerificationCode(userId, email, username) {
        try {
            // Generar código de verificación
            const code = this.generateVerificationCode(userId, email);
            
            console.log(`📧 Enviando código de verificación real a ${email} usando SendGrid`);
            
            // Usar SendGrid para enviar el email
            const result = await this.emailService.sendVerificationEmail(email, username, code);
            
            if (result.success) {
                console.log(`✅ Código de verificación enviado exitosamente a ${email}`);
                return {
                    success: true,
                    message: 'Código de verificación enviado por email',
                    expiresIn: this.codeExpiration / 1000 // en segundos
                };
            } else {
                throw new Error(result.error || 'Error desconocido al enviar email');
            }
            
        } catch (error) {
            console.error(`❌ Error enviando código de verificación a ${email}:`, error);
            return {
                success: false,
                error: `Error al enviar código de verificación: ${error.message}`
            };
        }
    }

    /**
     * Enviar código por SMS (placeholder - implementar con servicio SMS en el futuro)
     * @param {string} userId - ID del usuario
     * @param {string} phone - Número de teléfono
     * @returns {Object} - Resultado del envío
     */
    async sendVerificationSMS(userId, phone) {
        // TODO: Implementar servicio SMS real
        console.log(`📱 Enviando código SMS a ${phone} (placeholder)`);
        
        // Simular envío exitoso para desarrollo
        return {
            success: true,
            message: 'Código SMS enviado (simulado)',
            expiresIn: this.codeExpiration / 1000
        };
    }

    /**
     * Limpiar códigos expirados
     */
    cleanupExpiredCodes() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, value] of this.verificationCodes.entries()) {
            if (now - value.timestamp > this.codeExpiration) {
                this.verificationCodes.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Limpiados ${cleanedCount} códigos de verificación expirados`);
        }
    }

    /**
     * Obtener estadísticas del servicio
     * @returns {Object} - Estadísticas del servicio
     */
    getStats() {
        return {
            activeCodes: this.verificationCodes.size,
            codeExpiration: this.codeExpiration / 1000, // en segundos
            emailService: this.emailService.getServiceStats()
        };
    }
}

module.exports = VerificationService; 