'use strict';

const assertContract = require('../../core/assertContract');

const METHODS = [
  'findStats',
  'saveStats',
  'createBattle',
  'listMissions',
  'saveMissionProgress',
  'listAchievements',
  'unlockAchievement',
  'countCollectedCards',
  'addCollectedCard',
  'listCollectedCards',
  'findCardByElementLevel',
  'addAttackType',
  'countAttackTypes',
];

class IProfileRepository {
  static get METHODS() {
    return METHODS;
  }

  static assert(implementation) {
    assertContract(implementation, METHODS, 'IProfileRepository');
  }
}

module.exports = IProfileRepository;
