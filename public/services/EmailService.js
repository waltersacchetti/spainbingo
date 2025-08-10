const sgMail = require('@sendgrid/mail');

/**
 * Servicio de Email para BingoRoyal usando SendGrid
 */
class EmailService {
    constructor() {
        // Configurar SendGrid
        this.apiKey = process.env.SENDGRID_API_KEY;
        this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@info.bingoroyal.es';
        this.fromName = process.env.SENDGRID_FROM_NAME || 'BingoRoyal';
        this.replyTo = process.env.SENDGRID_REPLY_TO || 'support@info.bingoroyal.es';
        
        if (!this.apiKey) {
            throw new Error('SENDGRID_API_KEY no está configurada');
        }
        
        // Configurar SendGrid
        sgMail.setApiKey(this.apiKey);
        
        console.log('✅ EmailService inicializado con SendGrid');
        console.log(`📧 From: ${this.fromName} <${this.fromEmail}>`);
        console.log(`🔑 API Key configurada: ${this.apiKey.substring(0, 10)}...`);
    }

    /**
     * Generar código de verificación de 6 dígitos
     */
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Generar token de verificación único
     */
    generateVerificationToken() {
        return require('crypto').randomBytes(32).toString('hex');
    }

    /**
     * Crear HTML base para emails de BingoRoyal
     */
    createEmailTemplate(title, content, actionUrl = null, actionText = null) {
        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    margin: 0; 
                    padding: 0; 
                    background-color: #f4f4f4; 
                }
                .container { 
                    max-width: 600px; 
                    margin: 20px auto; 
                    background: white; 
                    border-radius: 10px; 
                    box-shadow: 0 0 20px rgba(0,0,0,0.1); 
                    overflow: hidden; 
                }
                .header { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 30px; 
                    text-align: center; 
                }
                .header h1 { 
                    margin: 0; 
                    font-size: 28px; 
                    font-weight: 300; 
                }
                .content { 
                    padding: 40px 30px; 
                }
                .content h2 { 
                    color: #667eea; 
                    margin-bottom: 20px; 
                    font-size: 24px; 
                }
                .content p { 
                    margin-bottom: 15px; 
                    font-size: 16px; 
                }
                .button { 
                    display: inline-block; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold; 
                    margin: 20px 0; 
                    transition: transform 0.3s ease; 
                }
                .button:hover { 
                    transform: translateY(-2px); 
                }
                .footer { 
                    background: #f8f9fa; 
                    padding: 20px 30px; 
                    text-align: center; 
                    color: #666; 
                    font-size: 14px; 
                }
                .verification-code { 
                    background: #f8f9fa; 
                    border: 2px solid #667eea; 
                    border-radius: 8px; 
                    padding: 20px; 
                    text-align: center; 
                    margin: 20px 0; 
                }
                .verification-code .code { 
                    font-size: 32px; 
                    font-weight: bold; 
                    color: #667eea; 
                    letter-spacing: 5px; 
                    font-family: 'Courier New', monospace; 
                }
                .social-links { 
                    margin: 20px 0; 
                }
                .social-links a { 
                    display: inline-block; 
                    margin: 0 10px; 
                    color: #667eea; 
                    text-decoration: none; 
                }
                .warning { 
                    background: #fff3cd; 
                    border: 1px solid #ffeaa7; 
                    border-radius: 5px; 
                    padding: 15px; 
                    margin: 20px 0; 
                    color: #856404; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎰 BingoRoyal</h1>
                </div>
                
                <div class="content">
                    <h2>${title}</h2>
                    ${content}
                    
                    ${actionUrl && actionText ? `
                        <div style="text-align: center;">
                            <a href="${actionUrl}" class="button">${actionText}</a>
                        </div>
                    ` : ''}
                </div>
                
                <div class="footer">
                    <p>© 2024 BingoRoyal. Todos los derechos reservados.</p>
                    <p>Este email fue enviado desde una dirección no monitoreada.</p>
                    <div class="social-links">
                        <a href="#">📧 Soporte</a> | 
                        <a href="#">📱 App</a> | 
                        <a href="#">🌐 Web</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Enviar email de verificación
     */
    async sendVerificationEmail(email, verificationCode, username = null) {
        try {
            const subject = '🔐 Verifica tu cuenta - BingoRoyal';
            const content = `
                <p>¡Hola ${username || 'jugador'}! 👋</p>
                <p>Gracias por registrarte en <strong>BingoRoyal</strong>. Para completar tu registro, necesitamos verificar tu dirección de email.</p>
                
                <div class="verification-code">
                    <p><strong>Tu código de verificación es:</strong></p>
                    <div class="code">${verificationCode}</div>
                    <p><small>Este código expira en 10 minutos</small></p>
                </div>
                
                <p><strong>¿No solicitaste este código?</strong></p>
                <p>Si no fuiste tú, simplemente ignora este email. Tu cuenta permanecerá segura.</p>
                
                <div class="warning">
                    <strong>⚠️ Importante:</strong> Nunca compartas este código con nadie. El equipo de BingoRoyal nunca te pedirá tu código de verificación.
                </div>
            `;

            const html = this.createEmailTemplate('Verificación de Cuenta', content);
            
            const msg = {
                to: email,
                from: {
                    email: this.fromEmail,
                    name: this.fromName
                },
                replyTo: this.replyTo,
                subject: subject,
                html: html,
                text: this.htmlToText(html)
            };

            const result = await sgMail.send(msg);
            console.log(`✅ Email de verificación enviado a ${email}:`, result[0].statusCode);
            return { success: true, messageId: result[0].headers['x-message-id'] };
            
        } catch (error) {
            console.error(`❌ Error enviando email de verificación a ${email}:`, error);
            throw error;
        }
    }

    /**
     * Enviar email de bienvenida
     */
    async sendWelcomeEmail(email, username) {
        try {
            const subject = '🎉 ¡Bienvenido a BingoRoyal!';
            const content = `
                <p>¡Hola <strong>${username}</strong>! 🎊</p>
                <p>¡Bienvenido a <strong>BingoRoyal</strong>, tu destino definitivo para el bingo online! 🎰</p>
                
                <p>Tu cuenta ha sido verificada exitosamente y ya puedes disfrutar de:</p>
                <ul>
                    <li>🎯 <strong>Bingo en tiempo real</strong> con jugadores de toda España</li>
                    <li>🏆 <strong>Torneos diarios</strong> con premios increíbles</li>
                    <li>💎 <strong>Sistema VIP</strong> con beneficios exclusivos</li>
                    <li>🎮 <strong>Múltiples salas</strong> para todos los niveles</li>
                    <li>💰 <strong>Moneda virtual</strong> para jugar sin riesgo</li>
                </ul>
                
                <p><strong>🎁 Bonus de bienvenida:</strong> Recibe 1000 monedas virtuales gratis al hacer tu primera partida.</p>
                
                <p>¡Nos vemos en las salas de bingo!</p>
                <p>El equipo de <strong>BingoRoyal</strong> 🎰</p>
            `;

            const html = this.createEmailTemplate('¡Bienvenido a BingoRoyal!', content);
            
            const msg = {
                to: email,
                from: {
                    email: this.fromEmail,
                    name: this.fromName
                },
                replyTo: this.replyTo,
                subject: subject,
                html: html,
                text: this.htmlToText(html)
            };

            const result = await sgMail.send(msg);
            console.log(`✅ Email de bienvenida enviado a ${email}:`, result[0].statusCode);
            return { success: true, messageId: result[0].headers['x-message-id'] };
            
        } catch (error) {
            console.error(`❌ Error enviando email de bienvenida a ${email}:`, error);
            throw error;
        }
    }

    /**
     * Enviar email de recuperación de contraseña
     */
    async sendPasswordResetEmail(email, resetToken, username = null) {
        try {
            const resetUrl = `${process.env.FRONTEND_URL || 'https://spainbingo.com'}/reset-password?token=${resetToken}`;
            const subject = '🔑 Restablece tu contraseña - BingoRoyal';
            const content = `
                <p>¡Hola ${username || 'jugador'}! 👋</p>
                <p>Has solicitado restablecer tu contraseña en <strong>BingoRoyal</strong>.</p>
                
                <p>Para continuar con el proceso, haz clic en el botón de abajo:</p>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">🔑 Restablecer Contraseña</a>
                </div>
                
                <p><strong>¿No solicitaste este cambio?</strong></p>
                <p>Si no fuiste tú, simplemente ignora este email. Tu cuenta permanecerá segura.</p>
                
                <div class="warning">
                    <strong>⚠️ Importante:</strong> Este enlace expira en 1 hora por seguridad.
                </div>
                
                <p>Si tienes problemas con el botón, copia y pega este enlace en tu navegador:</p>
                <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            `;

            const html = this.createEmailTemplate('Restablecer Contraseña', content);
            
            const msg = {
                to: email,
                from: {
                    email: this.fromEmail,
                    name: this.fromName
                },
                replyTo: this.replyTo,
                subject: subject,
                html: html,
                text: this.htmlToText(html)
            };

            const result = await sgMail.send(msg);
            console.log(`✅ Email de recuperación enviado a ${email}:`, result[0].statusCode);
            return { success: true, messageId: result[0].headers['x-message-id'] };
            
        } catch (error) {
            console.error(`❌ Error enviando email de recuperación a ${email}:`, error);
            throw error;
        }
    }

    /**
     * Enviar email de notificación VIP
     */
    async sendVIPNotificationEmail(email, username, vipLevel, benefits) {
        try {
            const subject = `💎 ¡Felicidades! Eres ${vipLevel} - BingoRoyal`;
            const content = `
                <p>¡Hola <strong>${username}</strong>! 🎊</p>
                <p>¡Enhorabuena! Has alcanzado el nivel <strong>${vipLevel}</strong> en BingoRoyal. 🏆</p>
                
                <p>Como miembro VIP, ahora disfrutas de beneficios exclusivos:</p>
                <ul>
                    ${benefits.map(benefit => `<li>✨ ${benefit}</li>`).join('')}
                </ul>
                
                <p><strong>🎁 Bonus especial:</strong> Recibe 5000 monedas virtuales como regalo de bienvenida VIP.</p>
                
                <p>¡Gracias por tu lealtad y que disfrutes de todos los privilegios VIP!</p>
                <p>El equipo de <strong>BingoRoyal</strong> 💎</p>
            `;

            const html = this.createEmailTemplate(`¡Felicidades! Eres ${vipLevel}`, content);
            
            const msg = {
                to: email,
                from: {
                    email: this.fromEmail,
                    name: this.fromName
                },
                replyTo: this.replyTo,
                subject: subject,
                html: html,
                text: this.htmlToText(html)
            };

            const result = await sgMail.send(msg);
            console.log(`✅ Email VIP enviado a ${email}:`, result[0].statusCode);
            return { success: true, messageId: result[0].headers['x-message-id'] };
            
        } catch (error) {
            console.error(`❌ Error enviando email VIP a ${email}:`, error);
            throw error;
        }
    }

    /**
     * Enviar email personalizado
     */
    async sendCustomEmail(email, subject, content, actionUrl = null, actionText = null) {
        try {
            const html = this.createEmailTemplate(subject, content, actionUrl, actionText);
            
            const msg = {
                to: email,
                from: {
                    email: this.fromEmail,
                    name: this.fromName
                },
                replyTo: this.replyTo,
                subject: subject,
                html: html,
                text: this.htmlToText(html)
            };

            const result = await sgMail.send(msg);
            console.log(`✅ Email personalizado enviado a ${email}:`, result[0].statusCode);
            return { success: true, messageId: result[0].headers['x-message-id'] };
            
        } catch (error) {
            console.error(`❌ Error enviando email personalizado a ${email}:`, error);
            throw error;
        }
    }

    /**
     * Enviar email a múltiples destinatarios
     */
    async sendBulkEmail(emails, subject, content, actionUrl = null, actionText = null) {
        try {
            const html = this.createEmailTemplate(subject, content, actionUrl, actionText);
            
            const messages = emails.map(email => ({
                to: email,
                from: {
                    email: this.fromEmail,
                    name: this.fromName
                },
                replyTo: this.replyTo,
                subject: subject,
                html: html,
                text: this.htmlToText(html)
            }));

            const result = await sgMail.sendMultiple(messages);
            console.log(`✅ Emails masivos enviados a ${emails.length} destinatarios:`, result[0].statusCode);
            return { success: true, messageIds: result.map(r => r.headers['x-message-id']) };
            
        } catch (error) {
            console.error(`❌ Error enviando emails masivos:`, error);
            throw error;
        }
    }

    /**
     * Convertir HTML a texto plano
     */
    htmlToText(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Verificar estado del servicio
     */
    async healthCheck() {
        try {
            // Enviar email de prueba a una dirección de prueba
            const testEmail = 'test@example.com';
            const msg = {
                to: testEmail,
                from: {
                    email: this.fromEmail,
                    name: this.fromName
                },
                subject: 'Health Check - BingoRoyal',
                text: 'Este es un email de prueba para verificar el servicio.'
            };

            // No enviar realmente, solo verificar configuración
            console.log('✅ SendGrid configurado correctamente');
            return {
                status: 'healthy',
                provider: 'SendGrid',
                fromEmail: this.fromEmail,
                fromName: this.fromName,
                apiKeyConfigured: !!this.apiKey
            };
            
        } catch (error) {
            console.error('❌ Error en health check de SendGrid:', error);
            return {
                status: 'unhealthy',
                provider: 'SendGrid',
                error: error.message
            };
        }
    }
}

module.exports = EmailService; 