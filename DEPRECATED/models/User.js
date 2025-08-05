const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: {
                len: [3, 50],
                is: /^[a-zA-Z0-9_]+$/
            }
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        password_hash: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        first_name: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        last_name: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        date_of_birth: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            validate: {
                isDate: true,
                isPast(value) {
                    if (value && new Date(value) >= new Date()) {
                        throw new Error('La fecha de nacimiento debe ser en el pasado');
                    }
                }
            }
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        country: {
            type: DataTypes.STRING(50),
            defaultValue: 'Spain'
        },
        city: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        postal_code: {
            type: DataTypes.STRING(10),
            allowNull: true
        },
        is_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        self_exclusion: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        self_exclusion_until: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        balance: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.00,
            validate: {
                min: 0
            }
        },
        total_wagered: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.00,
            validate: {
                min: 0
            }
        },
        total_won: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.00,
            validate: {
                min: 0
            }
        },
        last_login: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'users',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        hooks: {
            beforeCreate: async (user) => {
                if (user.password_hash) {
                    user.password_hash = await bcrypt.hash(user.password_hash, 12);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password_hash')) {
                    user.password_hash = await bcrypt.hash(user.password_hash, 12);
                }
            }
        }
    });

    // Método para verificar contraseña
    User.prototype.verifyPassword = async function(password) {
        return await bcrypt.compare(password, this.password_hash);
    };

    // Método para verificar edad mínima (18 años)
    User.prototype.isAdult = function() {
        if (!this.date_of_birth) return false;
        const today = new Date();
        const birthDate = new Date(this.date_of_birth);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1 >= 18;
        }
        return age >= 18;
    };

    // Método para verificar auto-exclusión
    User.prototype.isSelfExcluded = function() {
        if (!this.self_exclusion) return false;
        if (!this.self_exclusion_until) return true;
        return new Date() <= new Date(this.self_exclusion_until);
    };

    // Método para obtener información pública (sin datos sensibles)
    User.prototype.getPublicInfo = function() {
        return {
            id: this.id,
            username: this.username,
            first_name: this.first_name,
            last_name: this.last_name,
            is_verified: this.is_verified,
            balance: this.balance,
            total_wagered: this.total_wagered,
            total_won: this.total_won,
            last_login: this.last_login,
            created_at: this.created_at
        };
    };

    return User;
}; 