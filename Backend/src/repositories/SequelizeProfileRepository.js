'use strict';

const REQUIRED_MODELS = [
  'Card',
  'PlayerStats',
  'Battle',
  'Mission',
  'PlayerMission',
  'Achievement',
  'PlayerAchievement',
  'PlayerCard',
  'PlayerAttackType',
];

class SequelizeProfileRepository {
  constructor(models) {
    const missing = REQUIRED_MODELS.filter((name) => !models || !models[name]);
    if (missing.length > 0) {
      throw new TypeError(`[SequelizeProfileRepository] Faltan modelos: ${missing.join(', ')}.`);
    }
    this.models = models;
  }

  async findStats(userId) {
    return this.models.PlayerStats.findByPk(userId);
  }

  async saveStats(userId, values) {
    const [row] = await this.models.PlayerStats.upsert({ userId, ...values, updatedAt: new Date() });
    return row;
  }

  async createBattle(values) {
    return this.models.Battle.create(values);
  }

  async listMissions(userId) {
    const missions = await this.models.Mission.findAll({ order: [['id', 'ASC']] });
    const progress = await this.models.PlayerMission.findAll({ where: { userId } });
    const byId = new Map(progress.map((row) => [row.missionId, row]));

    return missions.map((mission) => {
      const row = byId.get(mission.id);
      return {
        id: mission.id,
        element: mission.element,
        title: mission.title,
        description: mission.description,
        target: mission.target,
        rewardGems: mission.rewardGems,
        progress: row ? row.progress : 0,
        completed: row ? row.completed : false,
      };
    });
  }

  async saveMissionProgress(userId, missionId, { progress, completed }) {
    const values = { userId, missionId, progress, completed };
    if (completed) {
      values.completedAt = new Date();
    }
    const [row] = await this.models.PlayerMission.upsert(values);
    return row;
  }

  async listAchievements(userId) {
    const achievements = await this.models.Achievement.findAll({ order: [['id', 'ASC']] });
    const unlocked = await this.models.PlayerAchievement.findAll({ where: { userId } });
    const unlockedIds = new Set(unlocked.map((row) => row.achievementId));

    return achievements.map((achievement) => ({
      id: achievement.id,
      element: achievement.element,
      title: achievement.title,
      description: achievement.description,
      unlocked: unlockedIds.has(achievement.id),
    }));
  }

  async unlockAchievement(userId, achievementId) {
    const [row] = await this.models.PlayerAchievement.findOrCreate({
      where: { userId, achievementId },
      defaults: { userId, achievementId, unlockedAt: new Date() },
    });
    return row;
  }

  async countCollectedCards(userId) {
    return this.models.PlayerCard.count({ where: { userId } });
  }

  async addCollectedCard(userId, cardId) {
    const [row] = await this.models.PlayerCard.findOrCreate({
      where: { userId, cardId },
      defaults: { userId, cardId, collectedAt: new Date() },
    });
    return row;
  }

  async findCardByElementLevel(element, level) {
    return this.models.Card.findOne({ where: { element, level } });
  }

  async listCollectedCards(userId) {
    const rows = await this.models.PlayerCard.findAll({
      where: { userId },
      include: [{ model: this.models.Card, as: 'card', attributes: ['element', 'level'] }],
    });
    return rows.map((row) => `${row.card.element}-${row.card.level}`);
  }

  async addAttackType(userId, element) {
    const [row] = await this.models.PlayerAttackType.findOrCreate({
      where: { userId, element },
      defaults: { userId, element },
    });
    return row;
  }

  async countAttackTypes(userId) {
    return this.models.PlayerAttackType.count({ where: { userId } });
  }
}

module.exports = SequelizeProfileRepository;
