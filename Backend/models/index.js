require('dotenv').config();
const { sequelize, Sequelize } = require('../controllers/config/db'); // usar la instancia centralizada
const DataTypes = require('sequelize').DataTypes;

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
const User = require('./user')(sequelize, DataTypes);

db.User = User;

module.exports = db;
