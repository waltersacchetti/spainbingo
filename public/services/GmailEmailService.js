const nodemailer = require('nodemailer');

class GmailEmailService {
    constructor() {
        this.user = process.env.GMAIL_USER;
        this.password = process.env.GMAIL_APP_PASSWORD;
        this.fromEmail = process.env.GMAIL_FROM_EMAIL || 'bingoroyal@gmail.com';
        this.fromName = process.env.GMAIL_FROM_NAME || 'BingoRoyal';
        
        if (this.user && this.password) {
            this.transporter = nodemailer.createTransporter({
                service: 'gmail',
                auth: {
                    user: this.user,
                    pass: this.password
                }
            });
            console.log('✅ Gmail configurado correctamente');
        } else {
            console.log('⚠️ Gmail no configurado - GMAIL_USER o GMAIL_APP_PASSWORD no encontrados');
        }
    }

    async sendVerificationEmail(toEmail, verificationCode, username) {
        if (!this.transporter) {
            throw new Error('Gmail no está configurado');
        }

        const mailOptions = {
            from: `"${this.fromName}" <${this.fromEmail}>`,
            to: toEmail,
            subject: 'Verifica tu cuenta de BingoRoyal',
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
                    <a href="https://game.bingoroyal.es/verify?code=${verificationCode}&email=${encodeURIComponent(toEmail)}" 
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
                
                O visita: https://game.bingoroyal.es/verify?code=${verificationCode}&email=${encodeURIComponent(toEmail)}
                
                Este código expirará en 10 minutos.
                
                BingoRoyal
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email de verificación enviado a ${toEmail} via Gmail`);
            return {
                success: true,
                messageId: info.messageId,
                message: 'Email de verificación enviado correctamente'
            };
        } catch (error) {
            console.error('❌ Error enviando email via Gmail:', error);
            throw new Error(`Error enviando email: ${error.message}`);
        }
    }

    async sendWelcomeEmail(toEmail, username) {
        if (!this.transporter) {
            throw new Error('Gmail no está configurado');
        }

        const mailOptions = {
            from: `"${this.fromName}" <${this.fromEmail}>`,
            to: toEmail,
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
                    
                    <p>¡Disfruta del juego!</p>
                    
                    <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
                    <p style="color: #7f8c8d; font-size: 14px;">
                        BingoRoyal - Tu juego de bingo favorito
                    </p>
                </div>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email de bienvenida enviado a ${toEmail} via Gmail`);
            return {
                success: true,
                messageId: info.messageId,
                message: 'Email de bienvenida enviado correctamente'
            };
        } catch (error) {
            console.error('❌ Error enviando email de bienvenida via Gmail:', error);
            throw new Error(`Error enviando email: ${error.message}`);
        }
    }

    async healthCheck() {
        if (!this.transporter) {
            return { status: 'error', message: 'Gmail no configurado' };
        }
        
        try {
            await this.transporter.verify();
            return { status: 'ok', message: 'Gmail funcionando correctamente' };
        } catch (error) {
            return { status: 'error', message: `Error en Gmail: ${error.message}` };
        }
    }
}

module.exports = GmailEmailService;
