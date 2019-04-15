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
            //this.log("login", phoneNum, phoneNum, '用户登录');
            this.ctx.logger.info(`用户${phoneNum}登录`);
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
            this.log("changePwd", phoneNum, phoneNum, '修改用户登录密码');
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
            this.log("forgetPwd", phoneNum, phoneNum, '用户重置登录密码');
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
     * 修改用户绑定的手机号
     * 只能在登录进去之后修改手机号
     * @param userId
     * @param phone
     * @return {Promise<void>}
     */
    async changePhone() {
        const { ctx, service } = this;
        const { userId, phoneNum, authCode } = ctx.request.body;
        if(!userId) {
            //入参校验
            this.fail('userId is required');
            return
        }
        const validAuthCode = await service.common.sms.validAuthCode(phoneNum, authCode);
        if(!validAuthCode) {
            this.fail('验证码校验失败');
            return;
        }
        const result = await service.user.userService.change_bind_phone(userId, phone);
        if(result === true) {
            this.log("changeBindPhone", userId, userId, '用户修改绑定的手机号');
            this.success("bind new phoneNum success");
        } else {
            this.fail(result);
        }
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

    /**
     * 修改二级密码，需要校验原二级密码是否正确
     * @param userId 用户id
     * @param oldPwd 旧二级密码
     * @param newPwd 新二级密码
     * @return {Promise<void>}
     */
    async changeSecondaryPwd() {
        const { ctx, service } = this;
        const { userId, oldPwd, newPwd } = ctx.request.body;
        if(!userId) {
            //入参校验
            this.fail('userId is required');
            return
        }
        if(!oldPwd || !oldPwd.trim() || !newPwd || !newPwd.trim()) {
            //入参校验
            this.fail('secondary password is required');
            return
        }
        const result = await service.user.userService.change_secondary_pwd(userId, oldPwd, newPwd);
        if(result === true) {
            this.log("changeSecondaryPwd", userId, userId, '用户修改2级密码成功');
            this.success("change secondary password success");
        } else {
            this.fail(result);
        }
    }

    /**
     * 忘记二级密码，需要校验短信验证码
     * @param phoneNum
     * @param authCode
     * @param newPwd
     * @return {Promise<void>}
     */
    async forgetSecondaryPwd() {
        const { ctx, service } = this;
        const { phoneNum, authCode, newPwd } = ctx.request.body;
        const validAuthCode = await service.common.sms.validAuthCode(phoneNum, authCode);
        if(!validAuthCode) {
            this.fail('验证码校验失败');
            return;
        }
        if(!newPwd || !newPwd.trim()) {
            this.fail('secondary password is required');
            return
        }
        const userRow = await service.user.userService.findOneByPhone(phoneNum);
        if(!userRow || !userRow.id) {
            this.fail('not such user');
            return
        }
        const result = await service.user.userService.updateSecondaryPwd(userRow.id, pwd);
        if(result === true) {
            //日志记录
            this.log("resetSecondaryPwd", userRow.id, userRow.id, '用户重置2级密码成功');
            this.success("reset secondary password success");
        } else {
            this.fail(result);
        }
    }

    /**
     * 校验用户二级密码，校验通过返回true，失败返回false
     * @param userId
     * @param pwd
     * @return {Promise<void>}
     */
    async validSecondaryPwd() {
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
        const result = await service.user.userService.valid_secondary_pwd(userId, pwd);
        this.success(result);
    }

    /**
     * 上传用户头像
     * @return {Promise<void>}
     * 方法流程暂未完成
     */
    async uploadUserHead() {
        const { ctx, service } = this;
        const stream = await ctx.getFileStream();
        const imageName = stream.filename;
        let res;
        try {
            // 异步把文件流 写入
            res = await service.common.oss.image_stream_upload(imageName, stream);
            this.success(res);
        } catch (e) {
            this.fail(e.message);
        }
    }
}

module.exports = UserController;
