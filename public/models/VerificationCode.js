/**
 * Modelo para códigos de verificación
 * Maneja la generación, almacenamiento y validación de códigos
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const VerificationCode = sequelize.define('VerificationCode', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        code: {
            type: DataTypes.STRING(6),
            allowNull: false
        },
        method: {
            type: DataTypes.ENUM('email', 'sms'),
            allowNull: false
        },
        target: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Email o número de teléfono'
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false
        },
        used: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        attempts: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        max_attempts: {
            type: DataTypes.INTEGER,
            defaultValue: 3
        }
    }, {
        tableName: 'verification_codes',
        timestamps: true,
        indexes: [
            {
                fields: ['user_id']
            },
            {
                fields: ['code']
            },
            {
                fields: ['expires_at']
            }
        ]
    });

    return VerificationCode;
}; 