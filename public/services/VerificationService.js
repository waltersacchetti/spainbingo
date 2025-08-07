/**
 * Servicio de Verificación
 * Maneja la generación y envío de códigos de verificación
 */

const { v4: uuidv4 } = require('uuid');
const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const VerificationCode = require('../models/VerificationCode')(sequelize);
const User = require('../models/User')(sequelize);

class VerificationService {
    constructor() {
        this.codeExpiryMinutes = 10; // 10 minutos
        this.maxAttempts = 3;
        console.log('🔐 Servicio de verificación inicializado');
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

            const verificationCode = await VerificationCode.create({
                user_id: userId,
                code: code,
                method: method,
                target: target,
                expires_at: expiresAt,
                used: false,
                attempts: 0,
                max_attempts: this.maxAttempts
            });

            console.log(`📧 Código de verificación creado para usuario ${userId}: ${code}`);

            return {
                success: true,
                code: code,
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
     * Enviar código por email
     */
    async sendEmailCode(email, code, username) {
        try {
            // En producción, aquí usarías un servicio como SendGrid, AWS SES, etc.
            console.log(`📧 Enviando código ${code} a ${email} para usuario ${username}`);
            
            // Simulación de envío de email
            const emailContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #667eea;">SpainBingo - Verificación de Cuenta</h2>
                    <p>Hola <strong>${username}</strong>,</p>
                    <p>Tu código de verificación es:</p>
                    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
                        <h1 style="color: #667eea; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h1>
                    </div>
                    <p>Este código expira en ${this.codeExpiryMinutes} minutos.</p>
                    <p>Si no solicitaste este código, puedes ignorar este email.</p>
                    <hr>
                    <p style="font-size: 12px; color: #666;">
                        SpainBingo - El mejor bingo online de España
                    </p>
                </div>
            `;

            // En producción, aquí enviarías el email real
            console.log('📧 Email simulado enviado:', {
                to: email,
                subject: 'SpainBingo - Código de Verificación',
                content: emailContent
            });

            return {
                success: true,
                message: 'Código enviado por email'
            };

        } catch (error) {
            console.error('❌ Error al enviar email:', error);
            return {
                success: false,
                error: 'Error al enviar email'
            };
        }
    }

    /**
     * Enviar código por SMS
     */
    async sendSMSCode(phone, code, username) {
        try {
            // En producción, aquí usarías un servicio como Twilio, AWS SNS, etc.
            console.log(`📱 Enviando código ${code} a ${phone} para usuario ${username}`);
            
            // Simulación de envío de SMS
            const smsContent = `SpainBingo: Tu código de verificación es ${code}. Expira en ${this.codeExpiryMinutes} minutos.`;

            // En producción, aquí enviarías el SMS real
            console.log('📱 SMS simulado enviado:', {
                to: phone,
                content: smsContent
            });

            return {
                success: true,
                message: 'Código enviado por SMS'
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

            const target = method === 'email' ? user.email : user.phone;
            if (!target) {
                return {
                    success: false,
                    error: `${method === 'email' ? 'Email' : 'Teléfono'} no disponible`
                };
            }

            // Crear código de verificación
            const codeResult = await this.createVerificationCode(userId, method, target);
            if (!codeResult.success) {
                return codeResult;
            }

            // Enviar código según el método
            let sendResult;
            if (method === 'email') {
                sendResult = await this.sendEmailCode(target, codeResult.code, user.username);
            } else {
                sendResult = await this.sendSMSCode(target, codeResult.code, user.username);
            }

            if (!sendResult.success) {
                return sendResult;
            }

            return {
                success: true,
                message: `Código enviado por ${method}`,
                expiresIn: this.codeExpiryMinutes
            };

        } catch (error) {
            console.error('❌ Error al enviar código de verificación:', error);
            return {
                success: false,
                error: 'Error al enviar código de verificación'
            };
        }
    }

    /**
     * Verificar código
     */
    async verifyCode(userId, code) {
        try {
            console.log(`🔍 Verificando código ${code} para usuario ${userId}`);
            
            // Buscar código válido
            const verificationCode = await VerificationCode.findOne({
                where: {
                    user_id: userId,
                    code: code,
                    used: false,
                    expires_at: {
                        [Sequelize.Op.gt]: new Date()
                    }
                }
            });

            if (!verificationCode) {
                console.log(`❌ Código no encontrado o expirado para usuario ${userId}`);
                return {
                    success: false,
                    error: 'Código inválido o expirado'
                };
            }

            console.log(`✅ Código encontrado: ${verificationCode.code}, intentos: ${verificationCode.attempts}/${verificationCode.max_attempts}`);

            // Verificar intentos
            if (verificationCode.attempts >= verificationCode.max_attempts) {
                console.log(`❌ Demasiados intentos para usuario ${userId}`);
                await verificationCode.update({ used: true });
                return {
                    success: false,
                    error: 'Demasiados intentos. Solicita un nuevo código'
                };
            }

            // Incrementar intentos
            await verificationCode.update({
                attempts: verificationCode.attempts + 1
            });

            console.log(`✅ Código verificado correctamente para usuario ${userId}`);

            // Marcar código como usado
            await verificationCode.update({ used: true });

            // Marcar usuario como verificado
            await User.update(
                { is_verified: true },
                { where: { id: userId } }
            );

            console.log(`✅ Usuario ${userId} verificado exitosamente`);

            return {
                success: true,
                message: 'Cuenta verificada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al verificar código:', error);
            return {
                success: false,
                error: 'Error al verificar código'
            };
        }
    }

    /**
     * Limpiar códigos expirados
     */
    async cleanExpiredCodes() {
        try {
            const result = await VerificationCode.destroy({
                where: {
                                    expires_at: {
                    [Sequelize.Op.lt]: new Date()
                }
                }
            });

            console.log(`🧹 ${result} códigos expirados eliminados`);
            return result;

        } catch (error) {
            console.error('❌ Error al limpiar códigos expirados:', error);
            return 0;
        }
    }
}

module.exports = new VerificationService(); 