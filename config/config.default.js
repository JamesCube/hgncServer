/* eslint valid-jsdoc: "off" */

'use strict';

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1550799737434_3265';

  // add your middleware config here
  config.middleware = [];

  //当用户 Session 的有效期仅剩下最大有效期一半的时候，重置 Session 的有效期
  config.session = {
      renew: true,
  };

  //redis环境默认配置，默认为开发环境的redis地址
  config.redis = {
      client: {
          port: 6379,
          host: '127.0.0.1',
          password: 'auth',
          db: 0,
      },
      agent: true,
  };

  exports.mysql = {
      // 单数据库信息配置
      client: {
          // host
          host: 'www.wolzche.com',
          // 端口号
          port: '3307',
          // 用户名
          user: 'wolzche',
          // 密码
          password: '9Kvvq20OOAPevDnL',
          // 数据库名
          database: 'hgnc',
      },
      // 是否加载到 app 上，默认开启
      app: true,
      // 是否加载到 agent 上，默认关闭
      agent: false,
  };

  // add your user config here
  const userConfig = {
     myAppName: 'hgncServer',
  };

  return {
    ...config,
    ...userConfig,
  };
};
