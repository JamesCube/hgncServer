'use strict';

const uuidv1 = require('uuid/v1');
//系统路径模块
const path = require('path');
//文件模块
const fs = require('fs');
//自定义配置文件的相对路径
const custom_config_url = '../../config/custom_config.json';
//是否已经加载过配置文件，默认为false
let loaded = false;
let properties = null;
const SnowflakeCodon = require("snowflake-codon");
// Initialize snowflake
var appId = 1; //default value 0
var machineId = 1; //default value 0
var firstYear = 2019; //default value 1970
var timestampPrecision = 200; // optional, default value 1000 (ms)
//订单id雪花算法
const snowflake = new SnowflakeCodon(appId, machineId, firstYear, timestampPrecision);
//商品规格id雪花算法
const snowflake_2 = new SnowflakeCodon(2, machineId, firstYear, timestampPrecision);
//ali OSS存储sdk  需要运行cnpm install ali-oss来集成
const OSS = require('ali-oss');
let image_bucket = null;
module.exports = {
    uuidv1,
    /**
     * 根据key获取配置项的值
     * @author chengjiajun
     * @since 2019/02/25
     * @param key
     * @returns {*}
     */
    getProperty(key) {
        if(!key) return undefined;
        if (!loaded) {
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
     * 获得单例oss实例
     * @author chengjiajun
     * @since 2019/04/04
     * @returns {*}
     */
    get_image_bucket() {
        if(!image_bucket) {
            const keyId = this.getProperty('OSS_ACCESSKEY_ID');
            const keySecret = this.getProperty('OSS_ACCESSKEY_SECRET');
            image_bucket = new OSS({
                region: 'oss-cn-hangzhou',
                accessKeyId: keyId,
                accessKeySecret: keySecret,
                bucket: 'hgnc-goods-images',
            });
        }
        return image_bucket
    },

    /**
     * 获得所有的配置项
     * @author chengjiajun
     * @since 2019/03/23
     * @returns {*}
     */
    getAllProperty() {
        if (!loaded) {
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
        return properties;
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
        return ((Math.random() * 900000) | 100000) + '';
    },

    /**
     * 生成6位数邀请码
     * 此6位算法千亿分之1.7的几率会重复,如果还是担心会重复，可以考虑后期将6位邀请码升级到8位
     * @author chengjiajun
     * @since 2019/03/10
     * @returns {string}
     */
    genInviteCode(length = 6) {
        if (length > 0) {
            const data = [ "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z" ];
            let nums = "";
            for (let i = 0; i < length; i++) {
                let r = parseInt(Math.random() * 61);
                nums += data[r];
            }
            return nums;
        } else {
            return false;
        }
    },

    Enum: {
        ORDER_STATUS: {
            // "0"为待付款，
            WAIT_PAY: "0",
            // "1"为已付款待发货，
            ALREADY_PAY: "1",
            // "2"为已发货待收货，
            HAS_DELIVER: "2",
            // "d"为确认收货已完成(done)交易成功状态,
            DONE: "d",
            // "c"为未付款订单已取消(cancel)状态,
            CANCEL_WITHOUT_PAY: "c",
            // "n"为已付款订单取消未退款状态
            CANCEL_BUT_PAY: "n",
            // "a"为已付款订单取消已退款状态
            CANCEL_DONE: "a",
        },
    },

    /**
     * 雪花算法，自增id
     * @author chengjiajun
     * @since 2019/03/31
     */
    genSnowId(module) {
        //cnpm i snowflake-codon
        let result;
        if(module === 2) {
            //商品类别雪花id
            result = snowflake_2.nextId();
        } else {
            //默认是订单雪花id
            result = snowflake.nextId();
        }
        return result;
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
