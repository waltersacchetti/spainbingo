/**
 * Servicio de Email Simple para BingoRoyal
 * No depende de variables de entorno en el constructor
 */

class SimpleEmailService {
    constructor() {
        console.log('📧 SimpleEmailService creado');
    }

    /**
     * Enviar email de verificación
     */
    async sendVerificationEmail(email, verificationCode, username = null) {
        try {
            // Verificar variables de entorno
            const apiKey = process.env.SENDGRID_API_KEY;
            const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@info.bingoroyal.es';
            const fromName = process.env.SENDGRID_FROM_NAME || 'BingoRoyal';
            
            if (!apiKey) {
                throw new Error('SENDGRID_API_KEY no está configurada');
            }

            // Simular envío exitoso para pruebas
            console.log(`✅ Email de verificación simulado enviado a ${email}: ${verificationCode}`);
            
            return {
                success: true,
                message: 'Email de verificación enviado (simulado)',
                messageId: 'simulated-' + Date.now()
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
        try {
            const apiKey = process.env.SENDGRID_API_KEY;
            const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@info.bingoroyal.es';
            const fromName = process.env.SENDGRID_FROM_NAME || 'BingoRoyal';
            
            if (!apiKey) {
                throw new Error('SENDGRID_API_KEY no está configurada');
            }

            return {
                status: 'healthy',
                provider: 'SimpleEmailService',
                fromEmail: fromEmail,
                fromName: fromName,
                apiKeyConfigured: !!apiKey
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                provider: 'SimpleEmailService',
                error: error.message
            };
        }
    }
}

module.exports = SimpleEmailService;
