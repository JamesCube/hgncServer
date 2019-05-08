/* eslint valid-jsdoc: "off" */

'use strict';
const path = require('path');

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
  config.middleware = ['cusJwt'];
  config.cusJwt = {
      // 不执行中间件的url白名单
      whiteUrls: ['/v1/api/user/signUp', '/v1/api/user/logout', '/v1/api/user/login', '/v1/api/sms/sendSms', '/v1/api/user/refleshToken'],
  };

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

  config.mysql = {
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

    config.cluster= {
        listen: {
            port: 7001,
            hostname: '0.0.0.0',
            // path: '/var/run/egg.sock',
        },
    };

    config.security= {
        csrf: {
            enable: false,
            useSession: true, // 默认为 false，当设置为 true 时，将会把 csrf token 保存到 Session 中
            cookieName: 'csrfToken', // Cookie 中的字段名，默认为 csrfToken
            sessionName: 'csrfToken', // Session 中的字段名，默认为 csrfToken
            headerName: 'x-csrf-token', // 通过 header 传递 CSRF token 的默认字段为 x-csrf-token
        }
    };

    config.jwt = {
        //jwt private key
        secret: "fpY8Jwu24k5ew1E#",
        //custom timeout seconds(default as a half hour)
        timeout: 1800,
    };

  // add your user config here
  const userConfig = {
     myAppName: 'hgncServer',
  };

  //日志文件达到20M的时候切割文件
    config.logrotator = {
        filesRotateBySize: [
            path.join(appInfo.root, 'logs', appInfo.name, 'egg-web.log'),
        ],
        maxFileSize: 20 * 1024 * 1024,
    };

  return {
    ...config,
    ...userConfig,
  };
};
