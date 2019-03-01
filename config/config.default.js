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
      renew: true
  };

  //redis环境默认配置，默认为开发环境的redis地址
  /*config.redis = {
      client: {
          host: '',
          port: '',
          password: '',
          db: '0',
      },
      agent:true
  };*/

  // add your user config here
  const userConfig = {
     myAppName: 'hgncServer',
  };

  return {
    ...config,
    ...userConfig,
  };
};
