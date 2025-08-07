#!/usr/bin/env node

/**
 * Script para ver códigos de verificación
 */

const { sequelize } = require('../config/database');
const VerificationCode = require('../models/VerificationCode')(sequelize);
const User = require('../models/User')(sequelize);

async function viewVerificationCodes() {
    try {
        console.log('🔍 Buscando códigos de verificación...\n');
        
        // Obtener todos los códigos recientes
        const codes = await VerificationCode.findAll({
            order: [['created_at', 'DESC']],
            limit: 10
        });

        if (codes.length === 0) {
            console.log('❌ No se encontraron códigos de verificación');
            return;
        }

        console.log('📋 CÓDIGOS DE VERIFICACIÓN RECIENTES:');
        console.log('=====================================\n');

        for (const code of codes) {
            // Obtener información del usuario
            const user = await User.findByPk(code.user_id);
            const username = user ? user.username : 'Usuario ' + code.user_id;
            
            const status = code.used ? '❌ USADO' : '✅ ACTIVO';
            const expired = new Date() > new Date(code.expires_at) ? '⏰ EXPIRADO' : '⏰ VÁLIDO';
            
            console.log(`👤 Usuario: ${username} (ID: ${code.user_id})`);
            console.log(`   📧 Método: ${code.method} -> ${code.target}`);
            console.log(`   🔢 Código: ${code.code}`);
            console.log(`   📊 Estado: ${status} | ${expired}`);
            console.log(`   📅 Creado: ${new Date(code.created_at).toLocaleString()}`);
            console.log(`   ⏰ Expira: ${new Date(code.expires_at).toLocaleString()}`);
            console.log(`   🔢 Intentos: ${code.attempts}/${code.max_attempts}`);
            console.log('');
        }

        // Mostrar códigos activos específicos
        console.log('🎯 CÓDIGOS ACTIVOS POR USUARIO:');
        console.log('================================\n');

        const activeCodes = await VerificationCode.findAll({
            where: {
                used: false,
                expires_at: {
                    [sequelize.Op.gt]: new Date()
                }
            },
            order: [['created_at', 'DESC']]
        });

        for (const code of activeCodes) {
            const user = await User.findByPk(code.user_id);
            const username = user ? user.username : 'Usuario ' + code.user_id;
            
            console.log(`👤 ${username}`);
            console.log(`   🔢 Código: ${code.code}`);
            console.log(`   📧 ${code.method}: ${code.target}`);
            console.log(`   ⏰ Expira en: ${Math.round((new Date(code.expires_at) - new Date()) / 60000)} minutos`);
            console.log('');
        }

        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error al obtener códigos:', error);
        process.exit(1);
    }
}

viewVerificationCodes(); 