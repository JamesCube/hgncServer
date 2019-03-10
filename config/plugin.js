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
    mysql: {
        enable: true,
        package: 'egg-mysql',
    },
};