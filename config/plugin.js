'use strict';

/** @type Egg.EggPlugin */
module.exports = {
  // had enabled by egg
  // static: {
  //   enable: true,
  // }
    validate: {
        enable: true,
        package: 'egg-validate',
    },
    redis: {
        enable: true,
        package: 'egg-redis',
    },
    sessionRedis: {
        enable: true,
        package: 'egg-session-redis',
    },
    session: true,
    mysql: {
        enable: true,
        package: 'egg-mysql',
    },
    passport: {
        enable: true,
        package: 'egg-passport',
    },
};