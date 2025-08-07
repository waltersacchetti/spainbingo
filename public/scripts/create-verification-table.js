#!/usr/bin/env node

/**
 * Script para crear la tabla de códigos de verificación
 */

const { sequelize } = require('../config/database');
const VerificationCode = require('../models/VerificationCode')(sequelize);

async function createVerificationTable() {
    try {
        console.log('🔧 Creando tabla de códigos de verificación...');
        
        // Sincronizar el modelo con la base de datos
        await VerificationCode.sync({ force: false });
        
        console.log('✅ Tabla verification_codes creada/actualizada exitosamente');
        
        // Verificar que la tabla existe
        const tableExists = await sequelize.getQueryInterface().showAllTables();
        console.log('📋 Tablas existentes:', tableExists);
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error al crear tabla:', error);
        process.exit(1);
    }
}

createVerificationTable(); 