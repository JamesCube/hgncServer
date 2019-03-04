'use strict';

const Service = require('egg').Service;

const moment = require('moment');
const crypto = require('crypto');
const superagent = require('superagent');
const send_sms = async (phone_number, arr, template_id,account_sid, account_token, app_id) => {
    let timestamp_formatted = moment().format('YYYYMMDDHHmmss');
    let to_be_signed_parts = [
        account_sid,
        account_token,
        timestamp_formatted,
    ];
    let to_be_signed = to_be_signed_parts.join('');
    let signature = crypto.createHash('md5').update(to_be_signed).digest('hex').toUpperCase();
    let url_parts = [
        'https://app.cloopen.com:8883',
        '/2013-12-26/Accounts/', account_sid,
        '/SMS/TemplateSMS?sig=', signature,
    ];
    let url = url_parts.join('');
    let auth_buffer = new Buffer(account_sid + ':' + timestamp_formatted);
    let auth_value = auth_buffer.toString('base64');
    let request_body = {
        to: phone_number,
        datas: arr,
        templateId: template_id,
        appId: app_id,
    };
    let prepared_request = await superagent.post(url)
        .timeout(2000)
        .set('Authorization', auth_value)
        .set('Accept', 'application/json')
        .send(request_body);
    return prepared_request.body;
};
/**
 * 将电话号码对应的验证码存储到redis中
 * @param app
 * @param phoneNum
 * @param authCode
 */
const storeRedis = (app, phoneNum, authCode) => {
    if(!app) return;
    //app.redis.get('instance1').set('foo', 'bar');
    let authCodes = app.redis.get(phoneNum);
    authCodes.then(function (res) {
        let arr = JSON.parse(res);
        if(arr) {
            arr.push({code:authCode,time:new Date().getTime()});
            app.redis.set(phoneNum, JSON.stringify(arr))
        } else {
            app.redis.set(phoneNum, JSON.stringify([{code:authCode,time:new Date().getTime()}]))
        }
    })
}

class SmsService extends Service {
    constructor(ctx) {
        super(ctx); //如果需要在构造函数做一些处理，一定要有这句话，才能保证后面 `this.ctx`的使用。
        // 就可以直接通过 this.ctx 获取 ctx 了
        // 还可以直接通过 this.app 获取 app 了
        this.utils = this.ctx.helper;
        //主账户sid，登陆云通讯网站后，可在控制台首页看到开发者主账号ACCOUNT SID
        this.account_sid = this.utils.getProperty("RONGSMS_ACCOUNT_SID");
        //主账户Token，登陆云通讯网站后，可在控制台首页看到开发者主账号AUTH TOKEN。
        this.account_token = this.utils.getProperty("RONGSMS_ACCOUNT_TOKEN");
        //请使用管理控制台中已创建应用的APPID。
        this.app_id = this.utils.getProperty("RONGSMS_APP_ID");
        //短信模板ID
        this.template_id = this.utils.getProperty("RONGSMS_TEMPLATE_ID");
    }

    /**
     *
     * @param phoneNum 电话号码（string）
     * @param authCode 短信验证码（string）
     * @returns {Promise<*>}
     */
     sendSms(phoneNum, authCode) {
        storeRedis(this.app, phoneNum, authCode);
        let a = this.app.redis.get('s');
        a.then(function (res) {
            const o = JSON.parse(res);
            o
        })
        // const timeout_val = this.utils.getProperty("SMS_TIMEOUT");
        // const result = send_sms(phoneNum, [authCode, `${timeout_val}分钟`], this.template_id,this.account_sid, this.account_token, this.app_id);
        // result.then(function (res) {
        //     res
        // });
    }
}
module.exports = SmsService;