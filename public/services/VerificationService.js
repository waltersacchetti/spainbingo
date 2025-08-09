/**
 * Servicio de Verificación
 * Maneja la generación y envío de códigos de verificación
 */

const { v4: uuidv4 } = require('uuid');
const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const VerificationCode = require('../models/VerificationCode')(sequelize);
const User = require('../models/User')(sequelize);
const EmailService = require('./EmailService');

class VerificationService {
    constructor() {
        this.codeExpiryMinutes = 15; // 15 minutos
        this.maxAttempts = 3;
        this.emailService = new EmailService();
        console.log('🔐 Servicio de verificación inicializado con AWS SES');
    }

    /**
     * Generar código de verificación de 6 dígitos
     */
    generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Crear código de verificación en la base de datos
     */
    async createVerificationCode(userId, method, target) {
        try {
            // Invalidar códigos anteriores del usuario
            await VerificationCode.update(
                { used: true },
                { 
                    where: { 
                        user_id: userId,
                        method: method,
                        used: false
                    }
                }
            );

            // Crear nuevo código
            const code = this.generateCode();
            const expiresAt = new Date(Date.now() + (this.codeExpiryMinutes * 60 * 1000));
            
            // Generar token de verificación para URL
            const verificationToken = this.emailService.generateVerificationToken();

            const verificationCode = await VerificationCode.create({
                user_id: userId,
                code: code,
                method: method,
                target: target,
                expires_at: expiresAt,
                verification_token: verificationToken,
                used: false,
                attempts: 0
            });

            console.log(`✅ Código de verificación creado para usuario ${userId}: ${code}`);
            
            return {
                success: true,
                code: code,
                verificationToken: verificationToken,
                expiresAt: expiresAt,
                verificationId: verificationCode.id
            };

        } catch (error) {
            console.error('❌ Error al crear código de verificación:', error);
            return {
                success: false,
                error: 'Error al generar código de verificación'
            };
        }
    }

    /**
     * Enviar código por email usando AWS SES
     */
    async sendEmailCode(email, code, username, verificationToken) {
        try {
            console.log(`📧 Enviando código de verificación real a ${email} usando AWS SES`);
            
            // Usar AWS SES para enviar el email
            const result = await this.emailService.sendVerificationEmail(
                email, 
                username, 
                code, 
                verificationToken
            );

            if (result.success) {
                console.log(`✅ Email enviado exitosamente a ${email}`);
                console.log(`📊 Message ID: ${result.messageId}`);
                
                return {
                    success: true,
                    message: 'Código enviado por email',
                    messageId: result.messageId
                };
            } else {
                console.error(`❌ Error enviando email a ${email}:`, result.error);
                return {
                    success: false,
                    error: result.error || 'Error al enviar email de verificación'
                };
            }

        } catch (error) {
            console.error('❌ Error en sendEmailCode:', error);
            return {
                success: false,
                error: 'Error al enviar email de verificación'
            };
        }
    }

    /**
     * Enviar código por SMS (placeholder - implementar con AWS SNS en el futuro)
     */
    async sendSMSCode(phone, code, username) {
        try {
            // Por ahora simulamos el SMS
            console.log(`📱 SMS simulado enviado a ${phone}: Código ${code}`);
            
            // TODO: Implementar AWS SNS para SMS real
            const smsContent = `BingoRoyal: Tu código de verificación es ${code}. Expira en ${this.codeExpiryMinutes} minutos.`;

            console.log('📱 SMS simulado enviado:', {
                to: phone,
                content: smsContent
            });

            return {
                success: true,
                message: 'Código enviado por SMS (simulado)'
            };

        } catch (error) {
            console.error('❌ Error al enviar SMS:', error);
            return {
                success: false,
                error: 'Error al enviar SMS'
            };
        }
    }

    /**
     * Enviar código de verificación
     */
    async sendVerificationCode(userId, method) {
        try {
            // Obtener datos del usuario
            const user = await User.findByPk(userId);
            if (!user) {
                return {
                    success: false,
                    error: 'Usuario no encontrado'
                };
            }

            let target;
            let sendFunction;

            if (method === 'email') {
                target = user.email;
                sendFunction = this.sendEmailCode.bind(this);
            } else if (method === 'sms') {
                target = user.phone || user.telefono;
                sendFunction = this.sendSMSCode.bind(this);
                
                if (!target) {
                    return {
                        success: false,
                        error: 'Usuario no tiene número de teléfono registrado'
                    };
                }
            } else {
                return {
                    success: false,
                    error: 'Método de verificación inválido'
                };
            }

            // Crear código en la base de datos
            const codeResult = await this.createVerificationCode(userId, method, target);
            if (!codeResult.success) {
                return codeResult;
            }

            // Enviar código
            const sendResult = await sendFunction(
                target, 
                codeResult.code, 
                user.username,
                codeResult.verificationToken
            );

            if (sendResult.success) {
                return {
                    success: true,
                    message: sendResult.message,
                    expiresIn: this.codeExpiryMinutes,
                    messageId: sendResult.messageId
                };
            } else {
                return sendResult;
            }

        } catch (error) {
            console.error('❌ Error al enviar código de verificación:', error);
            return {
                success: false,
                error: 'Error interno del servidor'
            };
        }
    }

    /**
     * Verificar código de verificación
     */
    async verifyCode(userId, code) {
        try {
            const verification = await VerificationCode.findOne({
                where: {
                    user_id: userId,
                    code: code,
                    used: false,
                    expires_at: {
                        [Sequelize.Op.gt]: new Date()
                    }
                }
            });

            if (!verification) {
                return {
                    success: false,
                    error: 'Código inválido o expirado'
                };
            }

            // Marcar como usado
            await verification.update({ used: true });

            // Activar usuario si el email fue verificado
            if (verification.method === 'email') {
                await User.update(
                    { 
                        verified: true,
                        email_verified: true,
                        email_verified_at: new Date()
                    },
                    { where: { id: userId } }
                );

                // Enviar email de bienvenida
                const user = await User.findByPk(userId);
                if (user) {
                    await this.emailService.sendWelcomeEmail(user.email, user.username);
                }
            }

            console.log(`✅ Código verificado para usuario ${userId}`);

            return {
                success: true,
                message: 'Código verificado correctamente'
            };

        } catch (error) {
            console.error('❌ Error al verificar código:', error);
            return {
                success: false,
                error: 'Error interno del servidor'
            };
        }
    }

    /**
     * Verificar código por token (desde URL)
     */
    async verifyByToken(email, token) {
        try {
            const verification = await VerificationCode.findOne({
                include: [{
                    model: User,
                    where: { email: email }
                }],
                where: {
                    verification_token: token,
                    used: false,
                    expires_at: {
                        [Sequelize.Op.gt]: new Date()
                    }
                }
            });

            if (!verification) {
                return {
                    success: false,
                    error: 'Token inválido o expirado'
                };
            }

            // Marcar como usado
            await verification.update({ used: true });

            // Activar usuario
            await User.update(
                { 
                    verified: true,
                    email_verified: true,
                    email_verified_at: new Date()
                },
                { where: { id: verification.user_id } }
            );

            // Enviar email de bienvenida
            const user = await User.findByPk(verification.user_id);
            if (user) {
                await this.emailService.sendWelcomeEmail(user.email, user.username);
            }

            console.log(`✅ Email verificado por token para usuario ${verification.user_id}`);

            return {
                success: true,
                message: 'Email verificado correctamente'
            };

        } catch (error) {
            console.error('❌ Error al verificar por token:', error);
            return {
                success: false,
                error: 'Error interno del servidor'
            };
        }
    }

    /**
     * Limpiar códigos expirados
     */
    async cleanExpiredCodes() {
        try {
            const expiredCount = await VerificationCode.destroy({
                where: {
                    expires_at: {
                        [Sequelize.Op.lt]: new Date()
                    }
                }
            });

            if (expiredCount > 0) {
                console.log(`🧹 Limpiados ${expiredCount} códigos expirados`);
            }

            return {
                success: true,
                cleaned: expiredCount
            };

        } catch (error) {
            console.error('❌ Error al limpiar códigos expirados:', error);
            return {
                success: false,
                error: 'Error al limpiar códigos expirados'
            };
        }
    }

    /**
     * Obtener estadísticas de verificación
     */
    async getVerificationStats() {
        try {
            const stats = await VerificationCode.findAll({
                attributes: [
                    'method',
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
                    [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN used = true THEN 1 ELSE 0 END')), 'verified']
                ],
                group: ['method'],
                raw: true
            });

            return {
                success: true,
                stats: stats
            };

        } catch (error) {
            console.error('❌ Error al obtener estadísticas:', error);
            return {
                success: false,
                error: 'Error al obtener estadísticas'
            };
        }
    }
}

module.exports = new VerificationService(); 