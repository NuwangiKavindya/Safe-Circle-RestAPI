const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const SafeZone = sequelize.define('SafeZone', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    zoneName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notNull: { msg: 'Please provide a safe zone name (e.g. Home, Campus, Work)' },
            notEmpty: { msg: 'Zone name cannot be empty' }
        }
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
        validate: {
            min: -90.0,
            max: 90.0
        }
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false,
        validate: {
            min: -180.0,
            max: 180.0
        }
    },
    radiusMeters: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 200.0,
        validate: {
            min: 50.0,
            max: 5000.0
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    timestamps: true
});

// Relationships
User.hasMany(SafeZone, { foreignKey: 'userId', as: 'safeZones' });
SafeZone.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = SafeZone;
