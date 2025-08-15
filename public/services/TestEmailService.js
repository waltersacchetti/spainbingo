/**
 * Servicio de Email de Prueba para BingoRoyal
 * Completamente simple, sin dependencias externas
 */

class TestEmailService {
    constructor() {
        console.log('📧 TestEmailService creado');
    }

    /**
     * Enviar email de verificación
     */
    async sendVerificationEmail(email, verificationCode, username = null) {
        try {
            console.log(`✅ Email de verificación simulado enviado a ${email}: ${verificationCode}`);
            
            return {
                success: true,
                message: 'Email de verificación enviado (simulado)',
                messageId: 'test-' + Date.now()
            };
            
        } catch (error) {
            console.error(`❌ Error enviando email de verificación a ${email}:`, error);
            throw error;
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        return {
            status: 'healthy',
            provider: 'TestEmailService',
            message: 'Servicio de email funcionando correctamente'
        };
    }
}

module.exports = TestEmailService;
