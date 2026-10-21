'use strict';

const express = require('express');

function buildProfileRouter(profileController, authMiddleware) {
  const router = express.Router();

  router.use(authMiddleware);

  router.get('/', profileController.getProfile.bind(profileController));
  router.get('/missions', profileController.getMissions.bind(profileController));
  router.get('/achievements', profileController.getAchievements.bind(profileController));

  router.post('/battles', profileController.recordBattle.bind(profileController));
  router.post('/fusions', profileController.recordFusion.bind(profileController));
  router.post('/attacks', profileController.recordAttack.bind(profileController));
  router.post('/field-complete', profileController.recordFieldComplete.bind(profileController));
  router.post('/collection', profileController.recordCollectedCard.bind(profileController));

  return router;
}

module.exports = buildProfileRouter;
