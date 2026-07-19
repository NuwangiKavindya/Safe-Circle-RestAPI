const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Device = sequelize.define('Device', {
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
    deviceName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Please add a device name' },
        }
    },
    deviceModel: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Please add a device model' },
        }
    },
    imeiNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
            msg: 'Device with this IMEI is already bound'
        },
        validate: {
            notNull: { msg: 'Please add an IMEI number' }
        }
    },
    deviceOs: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Please add a device OS' },
        }
    }
}, {
    timestamps: true
});

// Setup relationships
User.hasMany(Device, { foreignKey: 'userId', as: 'devices' });
Device.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = Device;
