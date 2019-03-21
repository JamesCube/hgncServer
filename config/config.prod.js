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
            port: 8800,
            hostname: '127.0.0.1',
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
    }

    // add your user config here
    const userConfig = {
        myAppName: 'hgncServer',
    };

    return {
        ...config,
        ...userConfig,
    };
};
