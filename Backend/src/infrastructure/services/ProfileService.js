'use strict';

const IProfileRepository = require('../repositories/IProfileRepository');
const assertContract = require('../../core/assertContract');
const { ValidationError } = require('../../core/errors');

const ELEMENTS = ['fuego', 'agua', 'planta', 'luz', 'sombra', 'espiritu'];
const TOTAL_CARDS = 18;
const XP_PER_WIN = 100;
const XP_PER_LEVEL = 300;

const RANKS = [
  { min: 100, name: 'Diamante' },
  { min: 50, name: 'Platino' },
  { min: 25, name: 'Oro' },
  { min: 10, name: 'Plata' },
  { min: 1, name: 'Bronce' },
  { min: 0, name: 'Novato' },
];

// Condiciones de los logros, evaluadas sobre un estado agregado del jugador.
const ACHIEVEMENT_RULES = {
  'primera-llama': (state) => state.battlesWon >= 1,
  'marea-creciente': (state) => state.longestStreak >= 3,
  'raices-profundas': (state) => state.fusions >= state.fusionsTarget,
  'cazador-del-viento': (state) => state.allMissions,
  'coloso-invicto': (state) => state.battlesWon >= 10,
  'senor-de-la-noche': (state) => state.collectedCards >= TOTAL_CARDS,
};

class ProfileService {
  constructor({ profileRepository, logger }) {
    IProfileRepository.assert(profileRepository);
    assertContract(logger, ['info', 'error', 'warn'], 'Logger');

    this.profileRepository = profileRepository;
    this.logger = logger;
  }

  rankFor(wins) {
    const rank = RANKS.find((entry) => wins >= entry.min);
    return rank ? rank.name : RANKS[RANKS.length - 1].name;
  }

  emptyStats() {
    return {
      battlesPlayed: 0,
      battlesWon: 0,
      battlesLost: 0,
      currentStreak: 0,
      longestStreak: 0,
      gems: 0,
    };
  }

  async getStats(userId) {
    const stats = await this.profileRepository.findStats(userId);
    return stats || this.emptyStats();
  }

  async getProfile(userId) {
    const stats = await this.getStats(userId);
    const missions = await this.profileRepository.listMissions(userId);
    const achievements = await this.profileRepository.listAchievements(userId);
    const collectedCards = await this.profileRepository.countCollectedCards(userId);
    const collected = await this.profileRepository.listCollectedCards(userId);

    const totalXp = stats.battlesWon * XP_PER_WIN;

    return {
      battlesPlayed: stats.battlesPlayed,
      battlesWon: stats.battlesWon,
      battlesLost: stats.battlesLost,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      gems: stats.gems,
      collected,
      collectedCards,
      collectedTotal: TOTAL_CARDS,
      missions: missions.map((mission) => ({
        id: mission.id,
        element: mission.element,
        progress: mission.progress,
        target: mission.target,
        completed: mission.completed,
      })),
      achievements: achievements.map((achievement) => ({
        id: achievement.id,
        unlocked: achievement.unlocked,
      })),
      missionsCompleted: missions.filter((mission) => mission.completed).length,
      missionsTotal: missions.length,
      achievementsUnlocked: achievements.filter((achievement) => achievement.unlocked).length,
      achievementsTotal: achievements.length,
      level: 1 + Math.floor(totalXp / XP_PER_LEVEL),
      xp: totalXp % XP_PER_LEVEL,
      xpMax: XP_PER_LEVEL,
      ranking: this.rankFor(stats.battlesWon),
    };
  }

  async listMissions(userId) {
    return this.profileRepository.listMissions(userId);
  }

  async listAchievements(userId) {
    return this.profileRepository.listAchievements(userId);
  }

  async recordBattle(userId, { result, opponent = 'bot', difficulty = null, level3OnField = false }) {
    if (!['victoria', 'derrota'].includes(result)) {
      throw new ValidationError("El resultado debe ser 'victoria' o 'derrota'.");
    }

    // Las estadísticas (partidas, victorias, derrotas y rachas) las actualiza
    // ÚNICAMENTE el trigger trg_stats_batalla de PostgreSQL al insertar la
    // batalla. Aquí solo registramos y volvemos a leer el estado ya derivado;
    // escribir stats desde el servicio duplicaría los contadores.
    await this.profileRepository.createBattle({
      userId,
      result,
      opponent,
      difficulty,
      level3OnField,
    });

    const stats = await this.getStats(userId);
    const currentStreak = stats.currentStreak;

    const missions = await this.profileRepository.listMissions(userId);
    if (result === 'victoria') {
      await this.bumpMission(userId, missions, 'primera-victoria', 1);
      if (level3OnField) {
        await this.setMission(userId, missions, 'estratega', 1);
      }
    }
    await this.setMission(userId, missions, 'racha-victorias', currentStreak);

    await this.refreshAchievements(userId);
    return this.getProfile(userId);
  }

  async recordFusion(userId) {
    const missions = await this.profileRepository.listMissions(userId);
    await this.bumpMission(userId, missions, 'fusionador', 1);
    await this.refreshAchievements(userId);
    return this.getProfile(userId);
  }

  async recordAttack(userId, element) {
    if (!ELEMENTS.includes(element)) {
      throw new ValidationError('Elemento inválido.');
    }
    await this.profileRepository.addAttackType(userId, element);
    const usedTypes = await this.profileRepository.countAttackTypes(userId);
    const missions = await this.profileRepository.listMissions(userId);
    await this.setMission(userId, missions, 'aprendiz-elemental', usedTypes);
    await this.refreshAchievements(userId);
    return this.getProfile(userId);
  }

  async recordFieldComplete(userId) {
    const missions = await this.profileRepository.listMissions(userId);
    await this.setMission(userId, missions, 'coleccionista', 1);
    await this.refreshAchievements(userId);
    return this.getProfile(userId);
  }

  async recordCollectedCard(userId, { element, level }) {
    const card = await this.profileRepository.findCardByElementLevel(element, level);
    if (!card) {
      throw new ValidationError('Carta no encontrada.');
    }
    await this.profileRepository.addCollectedCard(userId, card.id);
    await this.refreshAchievements(userId);
    return this.getProfile(userId);
  }

  async setMission(userId, missions, missionId, progress) {
    const mission = missions.find((entry) => entry.id === missionId);
    if (!mission) {
      return;
    }
    const capped = Math.min(Math.max(progress, 0), mission.target);
    mission.progress = capped;
    mission.completed = capped >= mission.target;
    await this.profileRepository.saveMissionProgress(userId, missionId, {
      progress: capped,
      completed: mission.completed,
    });
  }

  async bumpMission(userId, missions, missionId, delta) {
    const mission = missions.find((entry) => entry.id === missionId);
    if (!mission) {
      return;
    }
    await this.setMission(userId, missions, missionId, mission.progress + delta);
  }

  async refreshAchievements(userId) {
    const stats = await this.getStats(userId);
    const missions = await this.profileRepository.listMissions(userId);
    const achievements = await this.profileRepository.listAchievements(userId);
    const collectedCards = await this.profileRepository.countCollectedCards(userId);
    const fusionMission = missions.find((mission) => mission.id === 'fusionador');

    const state = {
      battlesWon: stats.battlesWon,
      longestStreak: stats.longestStreak,
      collectedCards,
      fusions: fusionMission ? fusionMission.progress : 0,
      fusionsTarget: fusionMission ? fusionMission.target : Number.MAX_SAFE_INTEGER,
      allMissions: missions.length > 0 && missions.every((mission) => mission.completed),
    };

    for (const achievement of achievements) {
      if (achievement.unlocked) {
        continue;
      }
      const rule = ACHIEVEMENT_RULES[achievement.id];
      if (rule && rule(state)) {
        await this.profileRepository.unlockAchievement(userId, achievement.id);
        this.logger.info(`Logro desbloqueado: ${achievement.id} (usuario ${userId})`);
      }
    }
  }
}

module.exports = ProfileService;
