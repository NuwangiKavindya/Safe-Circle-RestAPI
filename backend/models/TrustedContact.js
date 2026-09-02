const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const TrustedContact = sequelize.define('TrustedContact', {
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
    contactName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Please add a contact name' },
            notEmpty: { msg: 'Please add a contact name' }
        }
    },
    contactPhone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
            notNull: { msg: 'Please add a contact phone number' },
            notEmpty: { msg: 'Please add a contact phone number' }
        }
    },
    contactEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isEmail: { msg: 'Please add a valid email' }
        }
    },
    relationship: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    accessCode: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true
    },
    sharingMode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'EMERGENCY_ONLY'
    }
}, {
    timestamps: true,
    hooks: {
        beforeCreate: async (contact) => {
            // Generate a random 6-digit access code (100000 to 999999)
            contact.accessCode = Math.floor(100000 + Math.random() * 900000).toString();
        }
    }
});

// Setup relationships
User.hasMany(TrustedContact, { foreignKey: 'userId', as: 'trustedContacts' });
TrustedContact.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = TrustedContact;
