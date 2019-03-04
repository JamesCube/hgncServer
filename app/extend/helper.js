'use strict';

//const uuidv1 = require('uuid/v1');
//系统路径模块
const path = require('path');
//文件模块
const fs = require('fs');
//自定义配置文件的相对路径
const custom_config_url = '../../config/custom_config.json';
//是否已经加载过配置文件，默认为false
var loaded = false;
var properties = null;

module.exports = {
    /**
     * 根据key获取配置项的值
     * @author chengjiajun
     * @since 2019/02/25
     * @param key
     * @returns {*}
     */
    getProperty(key) {
        if(!key) return undefined;
        if(!loaded) {
            const file = path.join(__dirname, custom_config_url);
            try {
                const result = fs.readFileSync(file, 'utf-8');
                loaded = true;
                properties = JSON.parse(result);
            } catch(e) {
                loaded = false;
                this.ctx.logger.error(new Error('读取自定义配置文件失败'));
            }
        }
        return properties[key]
    },

    /**
     * 重置自定义配置文件
     * 下次读取的时候会重新读取配置文件
     * @author chengjiajun
     * @since 2019/02/25
     */
    reloadProperties() {
        loaded = false;
    },

    /**
     * 生成6位数验证码
     * @author chengjiajun
     * @since 2019/02/25
     * @returns {string}
     */
    genAuthCode() {
        return ((Math.random() * 900000) | 100000)+'';
    },

  // 字符串转对象，转换出错返回{}或者默认值
      JSONParse(str, defaultResult) {
        try {
          return JSON.parse(str);
        } catch (e) {
          return defaultResult || {};
        }
      },
};
