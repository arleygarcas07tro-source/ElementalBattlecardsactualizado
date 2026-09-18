'use strict';

const express = require('express');

function buildAuthRouter(authController) {
  const router = express.Router();

  router.post('/register', authController.register.bind(authController));
  router.post('/login', authController.login.bind(authController));

  return router;
}

module.exports = buildAuthRouter;