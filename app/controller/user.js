'use strict';

const Controller = require('./baseController');

class UserController extends Controller {

    /**
     * 用户登录
     * @param phoneNum
     * @param pwd
     * @returns {Promise<void>}
     */
    async login() {
        const { ctx, service } = this;
        const { phoneNum, pwd } = ctx.request.body;
        let res = await service.user.userService.validLogin(phoneNum, pwd);
        if(res) {
            this.success("login success")
        } else {
            this.fail("用户名或密码不正确")
        }
    }

    /**
     * 用户注册
     * @param phoneNum
     * @param pwd
     * @param inviteCode
     * @returns {Promise<void>}
     */
    async signUp() {
        const { ctx, service } = this;
        const { phoneNum, pwd, inviteCode, authCode } = ctx.request.body;
        //验证码校验
        const validAuthCode = await service.common.sms.validAuthCode(phoneNum, authCode);
        if(validAuthCode) {
            //组装参数
            const params = {
                phone: phoneNum,
                pwd: pwd,
                inviteCode: inviteCode,
            }
            let res = await service.user.userService.insertOne(params);
            if(res === 1) {
                //移除redis cache中的验证码
                ctx.app.redis.del(phoneNum);
                this.success('signUp success');
            } else {
                this.fail(res)
            }
        } else {
            this.fail('验证码校验失败')
        }
    }

    /**
     * 修改密码
     * @param pwd
     * @param phoneNum
     * @returns {Promise<void>}
     */
    async changePwd() {
        const { ctx, service } = this;
        const { phoneNum, pwd } = ctx.request.body;
        const result = await service.user.userService.changePwd(phoneNum, pwd);
        if(result) {
            this.success('changePwd success')
        } else {
            this.fail('changePwd failed')
        }
    }

    /**
     * 发送手机验证码
     * @param phoneNum
     * @returns {Promise<void>}
     */
    async getSms() {
        const { ctx, service } = this;
        const { phoneNum } = ctx.request.body;
        //生成6位验证码
        const authCode = ctx.helper.genAuthCode();
        //调用短信service，发送手机验证码
        const result = await service.common.sms.sendSms(phoneNum, authCode);
        this.success(result, (result === 'success' ? 200 : 400), );
    }
}

module.exports = UserController;
