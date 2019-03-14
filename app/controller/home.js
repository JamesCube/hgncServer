'use strict';

const Controller = require('egg').Controller;

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
    async getP() {
        const { ctx } = this;
        ctx.helper.getProperty('a');
        ctx.body = 'online';
    }
}

module.exports = HomeController;
