const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SusFeedback = sequelize.define('SusFeedback', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  participantId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  participantRole: {
    type: DataTypes.STRING, // 'Student' | 'IT Staff' | 'General User'
    defaultValue: 'Student',
  },
  task1TimeSec: { type: DataTypes.FLOAT, defaultValue: 45.0 }, // Auth & Bind Device
  task2TimeSec: { type: DataTypes.FLOAT, defaultValue: 25.0 }, // Map & GPS View
  task3TimeSec: { type: DataTypes.FLOAT, defaultValue: 30.0 }, // Create SafeZone
  task4TimeSec: { type: DataTypes.FLOAT, defaultValue: 20.0 }, // Activate Motion Guard
  task5TimeSec: { type: DataTypes.FLOAT, defaultValue: 35.0 }, // TOTP Auth & AR Vision
  q1: { type: DataTypes.INTEGER, allowNull: false }, // Use frequently
  q2: { type: DataTypes.INTEGER, allowNull: false }, // Unnecessarily complex
  q3: { type: DataTypes.INTEGER, allowNull: false }, // Easy to use
  q4: { type: DataTypes.INTEGER, allowNull: false }, // Need tech support
  q5: { type: DataTypes.INTEGER, allowNull: false }, // Well integrated
  q6: { type: DataTypes.INTEGER, allowNull: false }, // Too much inconsistency
  q7: { type: DataTypes.INTEGER, allowNull: false }, // Learn quickly
  q8: { type: DataTypes.INTEGER, allowNull: false }, // Cumbersome to use
  q9: { type: DataTypes.INTEGER, allowNull: false }, // Confident using
  q10: { type: DataTypes.INTEGER, allowNull: false }, // Need to learn a lot
  susScore: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = SusFeedback;
