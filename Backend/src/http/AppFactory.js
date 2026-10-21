'use strict';

const express = require('express');
const cors = require('cors');
const buildErrorHandler = require('./middleware/errorHandler');

class AppFactory {
  constructor({ config, logger }) {
    this.config = config;
    this.logger = logger;
  }

  build({ authRouter = null, profileRouter = null } = {}) {
    const app = express();

    app.use(cors({ origin: this.config.corsOrigin }));
    app.use(express.json());

    if (authRouter) {
      app.use('/api/auth', authRouter);
    }

    if (profileRouter) {
      app.use('/api/profile', profileRouter);
    }

    app.get('/ping', (req, res) => {
      res.json({ ok: true, time: Date.now(), host: req.hostname });
    });

    app.use(buildErrorHandler(this.logger));

    return app;
  }
}

module.exports = AppFactory;