const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');
const Device = require('./Device');

const Alert = sequelize.define('Alert', {
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
    deviceId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: Device,
            key: 'id'
        }
    },
    alertType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notNull: { msg: 'Please specify an alert type' },
            notEmpty: { msg: 'Please specify an alert type' }
        }
    },
    status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'ACTIVE'
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        validate: {
            min: -90.0,
            max: 90.0
        }
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        validate: {
            min: -180.0,
            max: 180.0
        }
    },
    resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    audioFileUrl: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true
});

// Setup relationships
User.hasMany(Alert, { foreignKey: 'userId', as: 'alerts' });
Alert.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Device.hasMany(Alert, { foreignKey: 'deviceId', as: 'alerts' });
Alert.belongsTo(Device, { foreignKey: 'deviceId', as: 'device' });

module.exports = Alert;
