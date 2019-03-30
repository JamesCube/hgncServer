'use strict';

const Controller = require('./baseController');

class UserController extends Controller {

    /**
     * app用户登录
     * @param phoneNum
     * @param pwd
     * @returns {Promise<void>}
     */
    async login() {
        const { ctx, service } = this;
        const { phoneNum, pwd } = ctx.request.body;
        let res = await service.user.userService.validLogin(phoneNum, pwd);
        //当登录成功时，res为user数据行，当登录失败时，返回false
        if(res) {
            ctx.session.user = JSON.stringify(res);
            this.success(res)
        } else {
            this.fail("用户名或密码不正确")
        }
    }

    /**
     * 管理员登录
     * @param phoneNum
     * @param pwd
     * @returns {Promise<void>}
     */
    async adminLogin() {
        const { ctx, service } = this;
        const { name, pwd } = ctx.request.body;
        let res = await service.user.userService.validAdminLogin(name, pwd);
        //当登录成功时，res为user数据行，当登录失败时，返回false
        if(res) {
            ctx.session.user = JSON.stringify(res);
            this.success(res)
        } else {
            this.fail("管理员用户名或密码不正确")
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
        const validInviteCode = await service.user.userService.validInviteCode(inviteCode);
        if(!validAuthCode) {
            this.fail('验证码校验失败')
            return;
        }
        if(!validInviteCode) {
            this.fail('邀请码校验失败')
            return;
        }
        if(validAuthCode && validInviteCode) {
            //组装参数
            const params = {
                phone: phoneNum,
                pwd: pwd,
                parentCode: inviteCode,
            }
            let res = await service.user.userService.insertOne(params);
            if(res === true) {
                //移除redis cache中的验证码
                ctx.app.redis.del(phoneNum);
                this.success('signUp success');
            } else {
                this.fail(res)
            }
        }
    }

    /**
     * 修改密码
     * @param pwd
     * @param phoneNum
     * @tips 前台需要做入参trim()处理，后台暂不处理
     * @returns {Promise<void>}
     */
    async changePwd() {
        const { ctx, service } = this;
        const { phoneNum, pwd } = ctx.request.body;
        if(!phoneNum || !pwd) {
            //入参校验
            this.fail('手机号或密码不能为空')
            return
        }
        const result = await service.user.userService.changePwd(phoneNum, pwd);
        if(result === true) {
            this.success('changePwd success')
        } else {
            this.fail(result)
        }
    }

    /**
     * 忘记密码,重置密码
     * @param pwd
     * @param phoneNum
     * @tips 需要发送验证码验证
     * @returns {Promise<void>}
     */
    async forgetPwd() {
        const { ctx, service } = this;
        const { phoneNum, pwd, authCode } = ctx.request.body;
        if(!phoneNum || !pwd) {
            //入参校验
            this.fail('手机号或密码不能为空')
            return
        }
        const validAuthCode = await service.common.sms.validAuthCode(phoneNum, authCode);
        if(!validAuthCode) {
            this.fail('验证码校验失败')
            return;
        }
        const result = await service.user.userService.changePwd(phoneNum, pwd);
        if(result === true) {
            //移除redis cache中的验证码
            ctx.app.redis.del(phoneNum);
            this.success('reset password success');
        } else {
            this.fail(result);
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
        this.success(result, (result === 'success' ? 200 : 400));
    }

    /**
     * 设置用户二级密码
     * @param userId 用户id
     * @param pwd 二级密码
     * @return {Promise<void>}
     */
    async setSecondaryPwd() {
        const { ctx, service } = this;
        const { userId, pwd } = ctx.request.body;
        if(!userId) {
            //入参校验
            this.fail('userId is required');
            return
        }
        if(!pwd || !pwd.trim()) {
            this.fail('secondary password is required');
            return
        }
        const result = await service.user.userService.updateSecondaryPwd(userId, pwd);
        if(result === true) {
            this.success("set secondary password success");
        } else {
            this.fail(result);
        }
    }

    async changeSecondaryPwd() {
        const { userId, pwd } = ctx.request.body;
        if(!userId) {
            //入参校验
            this.fail('userId is required');
            return
        }
        if(!pwd || !pwd.trim()) {
            //入参校验
            this.fail('secondary password is required');
            return
        }
    }
}

module.exports = UserController;
