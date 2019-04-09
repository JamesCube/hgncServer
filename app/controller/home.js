'use strict';

const Controller = require('./baseController');

class HomeController extends Controller {
    async index() {
        const { ctx } = this;
        ctx.body = 'hi, egg';
    }
    async isOnline() {
        const { ctx } = this;
        const a = ctx.helper.getProperty('REDIS_HOST');
        const b = ctx.helper.getProperty('REDIS_PASSWORD');
        const authCode = ctx.helper.genAuthCode();
        //ctx.service.common.sms.sendSms('18971011200',ctx.helper.genAuthCode());
        //ctx.service.common.sms.sendSms('18162863094',ctx.helper.genAuthCode());
        //ctx.service.common.sms.sendSms('18986080118', authCode);
        //ctx.response.status = 400
        //ctx.response.body = {a:a,b:b};
        ctx.body = { code: 400, msg:`online ${a} ${b}` };
        ctx.status = 400;
    }
    async getCusConfig() {
        const { ctx } = this;
        const config = ctx.helper.getAllProperty();
        //自定义config里不是所有的参数前台都需要，敏感参数项无需返回前台，这里组装下参数
        const result = {};
        result.SMS_TIMEOUT = config.SMS_TIMEOUT;
        result.DEFAULT_GOODS_POINTRATE = config.DEFAULT_GOODS_POINTRATE;
        result.DEFAULT_IMAGE_DOMAIN = config.DEFAULT_IMAGE_DOMAIN;
        this.success(result);
    }

    async reloadConfigs() {
        const { ctx } = this;
        ctx.helper.reloadProperties();
        const config = ctx.helper.getAllProperty();
        this.success(config);
    }
}

module.exports = HomeController;
