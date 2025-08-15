const sgMail = require('@sendgrid/mail');

class SendGridService {
    constructor() {
        this.apiKey = process.env.SENDGRID_API_KEY;
        this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@info.bingoroyal.es';
        this.fromName = process.env.SENDGRID_FROM_NAME || 'BingoRoyal';
        
        if (this.apiKey) {
            sgMail.setApiKey(this.apiKey);
            console.log('✅ SendGrid configurado correctamente');
        } else {
            console.log('⚠️ SendGrid no configurado - SENDGRID_API_KEY no encontrada');
        }
    }

    async sendVerificationEmail(toEmail, username, verificationCode, userId) {
        if (!this.apiKey) {
            throw new Error('SendGrid no está configurado');
        }

        const msg = {
            to: toEmail,
            from: {
                email: this.fromEmail,
                name: this.fromName
            },
            subject: 'Verifica tu cuenta de BingoRoyal',
            // Fallback HTML si no hay template
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">🎮 BingoRoyal - Verificación de Cuenta</h2>
                    <p>Hola <strong>${username}</strong>,</p>
                    <p>Gracias por registrarte en BingoRoyal. Para completar tu registro, necesitas verificar tu cuenta.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #e74c3c; margin: 0;">Tu código de verificación:</h3>
                        <div style="font-size: 32px; font-weight: bold; color: #2c3e50; text-align: center; padding: 20px; background-color: white; border-radius: 4px; margin: 10px 0;">
                            ${verificationCode}
                        </div>
                    </div>
                    
                    <p>O puedes hacer clic en el siguiente enlace:</p>
                    <a href="https://game.bingoroyal.es/verify?code=${verificationCode}&email=${encodeURIComponent(toEmail)}&userId=${userId}" 
                       style="display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                        Verificar Mi Cuenta
                    </a>
                    
                    <p>Este código expirará en 10 minutos por seguridad.</p>
                    
                    <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
                    <p style="color: #7f8c8d; font-size: 14px;">
                        Si no solicitaste este código, puedes ignorar este email.<br>
                        BingoRoyal - Tu juego de bingo favorito
                    </p>
                </div>
            `,
            text: `
                BingoRoyal - Verificación de Cuenta
                
                Hola ${username},
                
                Gracias por registrarte en BingoRoyal. Tu código de verificación es:
                
                ${verificationCode}
                
                O visita: https://game.bingoroyal.es/verify?code=${verificationCode}&email=${encodeURIComponent(toEmail)}&userId=${userId}
                
                Este código expirará en 10 minutos.
                
                BingoRoyal
            `
        };

        try {
            const response = await sgMail.send(msg);
            console.log(`✅ Email de verificación enviado a ${toEmail} via SendGrid`);
            return {
                success: true,
                messageId: response[0].headers['x-message-id'],
                message: 'Email de verificación enviado correctamente'
            };
        } catch (error) {
            console.error('❌ Error enviando email via SendGrid:', error);
            throw new Error(`Error enviando email: ${error.message}`);
        }
    }

    async sendWelcomeEmail(toEmail, username) {
        if (!this.apiKey) {
            throw new Error('SendGrid no está configurado');
        }

        const msg = {
            to: toEmail,
            from: {
                email: this.fromEmail,
                name: this.fromName
            },
            subject: '¡Bienvenido a BingoRoyal!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">🎉 ¡Bienvenido a BingoRoyal!</h2>
                    <p>Hola <strong>${username}</strong>,</p>
                    <p>¡Tu cuenta ha sido verificada exitosamente! Ya puedes disfrutar de todos los juegos de BingoRoyal.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #27ae60;">🎮 ¿Qué puedes hacer ahora?</h3>
                        <ul style="color: #2c3e50;">
                            <li>Jugar Bingo Clásico</li>
                            <li>Participar en torneos VIP</li>
                            <li>Ganar premios y experiencia</li>
                            <li>Chat con otros jugadores</li>
                        </ul>
                    </div>
                    
                    <a href="https://game.bingoroyal.es" 
                       style="display: inline-block; background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                        ¡Jugar Ahora!
                    </a>
                    
                    <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
                    <p style="color: #7f8c8d; font-size: 14px;">
                        ¡Disfruta del juego!<br>
                        BingoRoyal - Tu juego de bingo favorito
                    </p>
                </div>
            `
        };

        try {
            const response = await sgMail.send(msg);
            console.log(`✅ Email de bienvenida enviado a ${toEmail} via SendGrid`);
            return {
                success: true,
                messageId: response[0].headers['x-message-id']
            };
        } catch (error) {
            console.error('❌ Error enviando email de bienvenida via SendGrid:', error);
            throw new Error(`Error enviando email de bienvenida: ${error.message}`);
        }
    }

    async sendPasswordResetEmail(toEmail, username, resetToken) {
        if (!this.apiKey) {
            throw new Error('SendGrid no está configurado');
        }

        const msg = {
            to: toEmail,
            from: {
                email: this.fromEmail,
                name: this.fromName
            },
            subject: 'Restablece tu contraseña de BingoRoyal',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">🔐 Restablece tu Contraseña</h2>
                    <p>Hola <strong>${username}</strong>,</p>
                    <p>Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para continuar:</p>
                    
                    <a href="https://game.bingoroyal.es/reset-password?token=${resetToken}&email=${encodeURIComponent(toEmail)}" 
                       style="display: inline-block; background-color: #e67e22; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                        Restablecer Contraseña
                    </a>
                    
                    <p>Este enlace expirará en 1 hora por seguridad.</p>
                    
                    <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
                    
                    <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
                    <p style="color: #7f8c8d; font-size: 14px;">
                        BingoRoyal - Tu juego de bingo favorito
                    </p>
                </div>
            `
        };

        try {
            const response = await sgMail.send(msg);
            console.log(`✅ Email de restablecimiento enviado a ${toEmail} via SendGrid`);
            return {
                success: true,
                messageId: response[0].headers['x-message-id']
            };
        } catch (error) {
            console.error('❌ Error enviando email de restablecimiento via SendGrid:', error);
            throw new Error(`Error enviando email de restablecimiento: ${error.message}`);
        }
    }
}

module.exports = SendGridService; 