'use strict';

const { DataTypes } = require('sequelize');
const UserModel = require('./UserModel');
const CardModel = require('./CardModel');
const PlayerStatsModel = require('./PlayerStatsModel');
const BattleModel = require('./BattleModel');
const MissionModel = require('./MissionModel');
const PlayerMissionModel = require('./PlayerMissionModel');
const AchievementModel = require('./AchievementModel');
const PlayerAchievementModel = require('./PlayerAchievementModel');
const PlayerCardModel = require('./PlayerCardModel');
const PlayerAttackTypeModel = require('./PlayerAttackTypeModel');

function buildModels(sequelize) {
  if (!sequelize) {
    throw new TypeError('[ModelRegistry] Falta la instancia de Sequelize.');
  }

  const models = {};
  models.User = UserModel.define(sequelize, DataTypes);
  models.Card = CardModel.define(sequelize, DataTypes);
  models.PlayerStats = PlayerStatsModel.define(sequelize, DataTypes);
  models.Battle = BattleModel.define(sequelize, DataTypes);
  models.Mission = MissionModel.define(sequelize, DataTypes);
  models.PlayerMission = PlayerMissionModel.define(sequelize, DataTypes);
  models.Achievement = AchievementModel.define(sequelize, DataTypes);
  models.PlayerAchievement = PlayerAchievementModel.define(sequelize, DataTypes);
  models.PlayerCard = PlayerCardModel.define(sequelize, DataTypes);
  models.PlayerAttackType = PlayerAttackTypeModel.define(sequelize, DataTypes);

  associate(models);
  return models;
}

/**
 * Define las relaciones lógicas del dominio. Las claves foráneas ya existen
 * en la base de datos (ver Backend/sql/schema.sql), por eso se usa
 * constraints:false para que Sequelize no intente recrearlas en sync.
 */
function associate(models) {
  const {
    User, Card, Mission, Achievement,
    PlayerStats, Battle, PlayerMission, PlayerAchievement, PlayerCard, PlayerAttackType,
  } = models;

  User.hasOne(PlayerStats, { foreignKey: 'userId', as: 'stats', constraints: false });
  PlayerStats.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });

  User.hasMany(Battle, { foreignKey: 'userId', as: 'battles', constraints: false });
  Battle.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });

  User.hasMany(PlayerMission, { foreignKey: 'userId', as: 'playerMissions', constraints: false });
  PlayerMission.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
  Mission.hasMany(PlayerMission, { foreignKey: 'missionId', as: 'playerMissions', constraints: false });
  PlayerMission.belongsTo(Mission, { foreignKey: 'missionId', as: 'mission', constraints: false });

  User.hasMany(PlayerAchievement, { foreignKey: 'userId', as: 'playerAchievements', constraints: false });
  PlayerAchievement.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
  Achievement.hasMany(PlayerAchievement, { foreignKey: 'achievementId', as: 'playerAchievements', constraints: false });
  PlayerAchievement.belongsTo(Achievement, { foreignKey: 'achievementId', as: 'achievement', constraints: false });

  User.hasMany(PlayerCard, { foreignKey: 'userId', as: 'playerCards', constraints: false });
  PlayerCard.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
  Card.hasMany(PlayerCard, { foreignKey: 'cardId', as: 'playerCards', constraints: false });
  PlayerCard.belongsTo(Card, { foreignKey: 'cardId', as: 'card', constraints: false });

  User.hasMany(PlayerAttackType, { foreignKey: 'userId', as: 'attackTypes', constraints: false });
  PlayerAttackType.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
}

module.exports = buildModels;
