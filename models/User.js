const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Please add a full name' },
            notEmpty: { msg: 'Please add a full name' }
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
            msg: 'User with this email already exists'
        },
        validate: {
            isEmail: { msg: 'Please add a valid email' },
            notNull: { msg: 'Please add an email' }
        }
    },
    phoneNumber: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: {
            msg: 'User with this phone number already exists'
        },
        validate: {
            isLocal(value) {
                if (this.authProvider === 'local' && !value) {
                    throw new Error('Please add a phone number');
                }
            }
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isLocal(value) {
                if (this.authProvider === 'local' && !value) {
                    throw new Error('Please add a password');
                }
            },
            len: { args: [6, 100], msg: 'Password must be at least 6 characters' }
        }
    },
    authProvider: {
        type: DataTypes.STRING,
        defaultValue: 'local'
    },
    googleId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    }
}, {
    timestamps: true,
    hooks: {
        beforeSave: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

// Instance method to check password
User.prototype.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = User;
