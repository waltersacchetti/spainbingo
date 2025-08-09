const AWS = require('aws-sdk');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

/**
 * Servicio de Email para BingoRoyal usando AWS SES
 */
class EmailService {
    constructor() {
        // Configurar AWS SES
        this.region = process.env.AWS_REGION || 'eu-west-1';
        
        // Cliente AWS SES v3 (recomendado)
        this.sesClient = new SESClient({
            region: this.region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });

        // Configuración de emails
        this.fromEmail = process.env.SES_FROM_EMAIL || 'noreply@info.bingoroyal.es';
        this.fromName = process.env.SES_FROM_NAME || 'BingoRoyal';
        this.replyTo = process.env.SES_REPLY_TO || 'support@info.bingoroyal.es';
        
        console.log('✅ EmailService inicializado con AWS SES');
        console.log(`📧 From: ${this.fromName} <${this.fromEmail}>`);
        console.log(`🌍 Region: ${this.region}`);
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
                    padding: 0; 
                    border-radius: 10px; 
                    box-shadow: 0 0 20px rgba(0,0,0,0.1); 
                }
                .header { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 30px; 
                    text-align: center; 
                    border-radius: 10px 10px 0 0; 
                }
                .header h1 { 
                    margin: 0; 
                    font-size: 28px; 
                    font-weight: bold; 
                }
                .content { 
                    padding: 40px 30px; 
                }
                .verification-code { 
                    background: #f8f9fa; 
                    border: 2px dashed #667eea; 
                    padding: 20px; 
                    text-align: center; 
                    margin: 20px 0; 
                    border-radius: 8px; 
                }
                .code { 
                    font-size: 32px; 
                    font-weight: bold; 
                    color: #667eea; 
                    letter-spacing: 5px; 
                    font-family: 'Courier New', monospace; 
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
                    transition: transform 0.2s; 
                }
                .button:hover { 
                    transform: translateY(-2px); 
                }
                .footer { 
                    background: #f8f9fa; 
                    padding: 20px; 
                    text-align: center; 
                    color: #666; 
                    font-size: 14px; 
                    border-radius: 0 0 10px 10px; 
                }
                .footer a { 
                    color: #667eea; 
                    text-decoration: none; 
                }
                .divider { 
                    height: 1px; 
                    background: #eee; 
                    margin: 30px 0; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎮 BingoRoyal</h1>
                    <p>El Rey del Bingo Online</p>
                </div>
                <div class="content">
                    ${content}
                    ${actionUrl && actionText ? `
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${actionUrl}" class="button">${actionText}</a>
                    </div>
                    ` : ''}
                </div>
                <div class="footer">
                    <p>Este email fue enviado por <strong>BingoRoyal</strong></p>
                    <p>
                        <a href="https://game.bingoroyal.es">Ir al juego</a> | 
                        <a href="https://game.bingoroyal.es/terms">Términos</a> | 
                        <a href="https://game.bingoroyal.es/privacy">Privacidad</a>
                    </p>
                    <p style="color: #999; font-size: 12px;">
                        BingoRoyal - El mejor bingo online de España<br>
                        game.bingoroyal.es
                    </p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Enviar email de verificación de cuenta
     */
    async sendVerificationEmail(userEmail, userName, verificationCode, verificationToken) {
        try {
            const verificationUrl = `https://game.bingoroyal.es/verify?token=${verificationToken}&email=${encodeURIComponent(userEmail)}`;
            
            const content = `
                <h2>¡Bienvenido a BingoRoyal, ${userName}! 🎉</h2>
                <p>Gracias por registrarte en <strong>BingoRoyal</strong>, el mejor bingo online de España.</p>
                
                <p>Para completar tu registro y empezar a jugar, necesitas verificar tu cuenta.</p>
                
                <div class="verification-code">
                    <p><strong>Tu código de verificación es:</strong></p>
                    <div class="code">${verificationCode}</div>
                    <p style="margin: 0; color: #666; font-size: 14px;">
                        Este código expira en 15 minutos
                    </p>
                </div>
                
                <p>También puedes hacer click en el botón de abajo para verificar automáticamente:</p>
                
                <div class="divider"></div>
                
                <h3>¿Qué puedes hacer en BingoRoyal?</h3>
                <ul style="color: #555;">
                    <li>🎮 <strong>Jugar Bingo en tiempo real</strong> con otros jugadores</li>
                    <li>🏆 <strong>Diferentes modos de juego:</strong> Clásico, Rápido, VIP y Nocturno</li>
                    <li>💰 <strong>Premios increíbles</strong> y jackpots diarios</li>
                    <li>💬 <strong>Chat en vivo</strong> con la comunidad</li>
                    <li>📊 <strong>Estadísticas</strong> y historial de partidas</li>
                </ul>
                
                <p style="color: #666; font-size: 14px;">
                    <strong>¿No solicitaste esta cuenta?</strong><br>
                    Si no creaste una cuenta en BingoRoyal, puedes ignorar este email.
                </p>
            `;

            const params = {
                Source: `${this.fromName} <${this.fromEmail}>`,
                Destination: {
                    ToAddresses: [userEmail]
                },
                Message: {
                    Subject: {
                        Data: `🎮 Verifica tu cuenta en BingoRoyal - Código: ${verificationCode}`,
                        Charset: 'UTF-8'
                    },
                    Body: {
                        Html: {
                            Data: this.createEmailTemplate(
                                'Verificar cuenta - BingoRoyal',
                                content,
                                verificationUrl,
                                '✅ Verificar mi cuenta'
                            ),
                            Charset: 'UTF-8'
                        },
                        Text: {
                            Data: `
Bienvenido a BingoRoyal, ${userName}!

Tu código de verificación es: ${verificationCode}

O visita este enlace para verificar: ${verificationUrl}

Este código expira en 15 minutos.

BingoRoyal - El mejor bingo online de España
https://game.bingoroyal.es
                            `,
                            Charset: 'UTF-8'
                        }
                    }
                },
                ReplyToAddresses: [this.replyTo]
            };

            const command = new SendEmailCommand(params);
            const result = await this.sesClient.send(command);

            console.log('✅ Email de verificación enviado exitosamente');
            console.log(`📧 Para: ${userEmail}`);
            console.log(`🔑 Código: ${verificationCode}`);
            console.log(`📊 Message ID: ${result.MessageId}`);

            return {
                success: true,
                messageId: result.MessageId,
                verificationCode,
                verificationToken
            };

        } catch (error) {
            console.error('❌ Error enviando email de verificación:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Enviar email de recuperación de contraseña
     */
    async sendPasswordResetEmail(userEmail, userName, resetToken) {
        try {
            const resetUrl = `https://game.bingoroyal.es/reset-password?token=${resetToken}&email=${encodeURIComponent(userEmail)}`;
            
            const content = `
                <h2>Recuperación de contraseña 🔐</h2>
                <p>Hola <strong>${userName}</strong>,</p>
                
                <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en BingoRoyal.</p>
                
                <p>Si fuiste tú quien solicitó este cambio, haz click en el botón de abajo:</p>
                
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404;">
                        <strong>⏰ Este enlace expira en 1 hora por seguridad.</strong>
                    </p>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    <strong>¿No solicitaste este cambio?</strong><br>
                    Si no fuiste tú, puedes ignorar este email. Tu contraseña permanecerá sin cambios.
                </p>
                
                <p style="color: #666; font-size: 14px;">
                    También puedes copiar y pegar este enlace en tu navegador:<br>
                    <code style="background: #f4f4f4; padding: 5px; border-radius: 3px; word-break: break-all;">
                        ${resetUrl}
                    </code>
                </p>
            `;

            const params = {
                Source: `${this.fromName} <${this.fromEmail}>`,
                Destination: {
                    ToAddresses: [userEmail]
                },
                Message: {
                    Subject: {
                        Data: '🔐 Restablecer contraseña - BingoRoyal',
                        Charset: 'UTF-8'
                    },
                    Body: {
                        Html: {
                            Data: this.createEmailTemplate(
                                'Restablecer contraseña - BingoRoyal',
                                content,
                                resetUrl,
                                '🔐 Restablecer mi contraseña'
                            ),
                            Charset: 'UTF-8'
                        },
                        Text: {
                            Data: `
Recuperación de contraseña - BingoRoyal

Hola ${userName},

Recibimos una solicitud para restablecer tu contraseña.

Visita este enlace para crear una nueva contraseña:
${resetUrl}

Este enlace expira en 1 hora.

Si no solicitaste este cambio, ignora este email.

BingoRoyal - El mejor bingo online de España
https://game.bingoroyal.es
                            `,
                            Charset: 'UTF-8'
                        }
                    }
                },
                ReplyToAddresses: [this.replyTo]
            };

            const command = new SendEmailCommand(params);
            const result = await this.sesClient.send(command);

            console.log('✅ Email de recuperación enviado exitosamente');
            console.log(`📧 Para: ${userEmail}`);
            console.log(`📊 Message ID: ${result.MessageId}`);

            return {
                success: true,
                messageId: result.MessageId
            };

        } catch (error) {
            console.error('❌ Error enviando email de recuperación:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Enviar notificación de bienvenida
     */
    async sendWelcomeEmail(userEmail, userName) {
        try {
            const content = `
                <h2>¡Cuenta verificada exitosamente! 🎉</h2>
                <p>¡Felicidades <strong>${userName}</strong>!</p>
                
                <p>Tu cuenta ha sido verificada y ya puedes disfrutar de todas las funciones de BingoRoyal.</p>
                
                <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #155724;">🎮 ¡Comienza a jugar ahora!</h3>
                    <ul style="color: #155724; margin-bottom: 0;">
                        <li><strong>Clásico:</strong> El bingo tradicional que conoces y amas</li>
                        <li><strong>Rápido:</strong> Partidas dinámicas de 5 minutos</li>
                        <li><strong>VIP:</strong> Para jugadores experimentados</li>
                        <li><strong>Nocturno:</strong> Premios especiales de noche</li>
                    </ul>
                </div>
                
                <h3>💰 Tu bonus de bienvenida</h3>
                <p>Como nuevo jugador, recibes:</p>
                <ul>
                    <li>🎫 <strong>5 cartones gratis</strong> para tu primera partida</li>
                    <li>💎 <strong>1000 puntos</strong> para gastar en el juego</li>
                    <li>🏆 <strong>Acceso a torneos especiales</strong> para novatos</li>
                </ul>
                
                <div class="divider"></div>
                
                <p style="text-align: center; color: #666;">
                    <strong>¿Necesitas ayuda?</strong><br>
                    Visita nuestro <a href="https://game.bingoroyal.es/help">centro de ayuda</a> 
                    o contáctanos en <a href="mailto:support@bingoroyal.es">support@bingoroyal.es</a>
                </p>
            `;

            const params = {
                Source: `${this.fromName} <${this.fromEmail}>`,
                Destination: {
                    ToAddresses: [userEmail]
                },
                Message: {
                    Subject: {
                        Data: '🎉 ¡Bienvenido a BingoRoyal! Tu cuenta está lista',
                        Charset: 'UTF-8'
                    },
                    Body: {
                        Html: {
                            Data: this.createEmailTemplate(
                                'Bienvenido a BingoRoyal',
                                content,
                                'https://game.bingoroyal.es/game',
                                '🎮 ¡Empezar a jugar!'
                            ),
                            Charset: 'UTF-8'
                        }
                    }
                },
                ReplyToAddresses: [this.replyTo]
            };

            const command = new SendEmailCommand(params);
            const result = await this.sesClient.send(command);

            console.log('✅ Email de bienvenida enviado exitosamente');
            console.log(`📧 Para: ${userEmail}`);
            console.log(`📊 Message ID: ${result.MessageId}`);

            return {
                success: true,
                messageId: result.MessageId
            };

        } catch (error) {
            console.error('❌ Error enviando email de bienvenida:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verificar configuración de SES
     */
    async testConnection() {
        try {
            // Intentar obtener información de la cuenta SES
            const AWS_SES = require('aws-sdk');
            const ses = new AWS_SES.SES({ 
                region: this.region,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            });
            
            const result = await ses.getSendQuota().promise();
            
            console.log('✅ Conexión SES exitosa');
            console.log(`📊 Quota: ${result.SentLast24Hours}/${result.Max24HourSend} emails (24h)`);
            console.log(`⚡ Tasa: ${result.MaxSendRate} emails/segundo`);
            
            return {
                success: true,
                quota: result
            };
            
        } catch (error) {
            console.error('❌ Error conectando a SES:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = EmailService; 