'use strict';

const assertContract = require('../../../core/assertContract');

class ProfileController {
  constructor(profileService) {
    assertContract(profileService, [
      'getProfile',
      'listMissions',
      'listAchievements',
      'recordBattle',
      'recordFusion',
      'recordAttack',
      'recordFieldComplete',
      'recordCollectedCard',
    ], 'ProfileService');

    this.profileService = profileService;
  }

  async getProfile(req, res, next) {
    try {
      res.json(await this.profileService.getProfile(req.user.id));
    } catch (error) {
      next(error);
    }
  }

  async getMissions(req, res, next) {
    try {
      res.json(await this.profileService.listMissions(req.user.id));
    } catch (error) {
      next(error);
    }
  }

  async getAchievements(req, res, next) {
    try {
      res.json(await this.profileService.listAchievements(req.user.id));
    } catch (error) {
      next(error);
    }
  }

  async recordBattle(req, res, next) {
    try {
      res.json(await this.profileService.recordBattle(req.user.id, req.body || {}));
    } catch (error) {
      next(error);
    }
  }

  async recordFusion(req, res, next) {
    try {
      res.json(await this.profileService.recordFusion(req.user.id));
    } catch (error) {
      next(error);
    }
  }

  async recordAttack(req, res, next) {
    try {
      res.json(await this.profileService.recordAttack(req.user.id, (req.body || {}).element));
    } catch (error) {
      next(error);
    }
  }

  async recordFieldComplete(req, res, next) {
    try {
      res.json(await this.profileService.recordFieldComplete(req.user.id));
    } catch (error) {
      next(error);
    }
  }

  async recordCollectedCard(req, res, next) {
    try {
      const { element, level } = req.body || {};
      res.json(await this.profileService.recordCollectedCard(req.user.id, { element, level }));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProfileController;
