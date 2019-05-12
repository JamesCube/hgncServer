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
            //gen token
            const {secret, timeout} = ctx.app.config.jwt;
            const token = ctx.app.jwt.sign({
                id: res.id,
                phone: res.phone,
                inviteCode: res.inviteCode,
            }, secret, {expiresIn: timeout});
            //token放入redis中
            const expire = ctx.helper.getProperty('REDIS_TOKEN_TIMEOUT');
            await ctx.app.redis.set(`token_${res.id}`, token, 'EX', expire);
            //this.log("login", phoneNum, phoneNum, '用户登录');
            this.ctx.logger.info(`用户${phoneNum}登录`);
            ctx.session.user = JSON.stringify(res);
            this.success({
                token: token,
                user: res,
            })
        } else {
            this.fail("用户名或密码不正确")
        }
    }

    /**
     * app用户登出
     * @param phoneNum
     * @param pwd
     * @returns {Promise<void>}
     */
    async logout() {
        const { ctx } = this;
        const { userId } = ctx.request.body;
        if(!userId) {
            //入参校验
            this.fail('userId is required');
            return
        }
        await ctx.app.redis.del(`token_${userId}`);
        this.success(`logout success`)
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
            //gen token
            const {secret, timeout} = ctx.app.config.jwt;
            const tObj = {
                id: `pc_${res.id}`,
                phone: res.phone,
                inviteCode: res.inviteCode,
            }
            const token = ctx.app.jwt.sign(tObj, secret, {expiresIn: timeout});
            //token放入redis中
            const expire = ctx.helper.getProperty('REDIS_TOKEN_TIMEOUT');
            await ctx.app.redis.set(`token_${tObj.id}`, token, 'EX', expire);
            //this.log("login", name, name, '用户登录');
            this.ctx.logger.info(`用户${name}登录`);
            ctx.session.user = JSON.stringify(res);
            this.success({
                token: token,
                user: res,
            })
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

    /**
     * 转移专用积分，从某个账户转出转入到另一个账户
     * 在service层会记录积分转移日志
     * @param from
     * @param to
     * @param count
     * @return {Promise<void>}
     */
    async goldTransfer() {
        const { ctx, service } = this;
        const { from, to, count } = ctx.request.body;
        if(!from || !to.trim()) {
            //入参校验
            this.fail('from who?');
            return
        }
        if(!to || !to.trim()) {
            //入参校验
            this.fail('to who?');
            return
        }
        if(to.trim() === from.trim()) {
            //入参校验
            this.fail('自己不可以转让给自己！');
            return
        }
        const fromRow = await service.user.userService._getUserById(from, 'inviteCode');
        const toRow = await service.user.userService._getUserById(to, 'inviteCode');
        if(!fromRow) {
            this.fail('from user is not alive');
            return
        }
        if(!toRow) {
            this.fail('to user is not alive');
            return
        }
        //转出方余额
        const fromBalance = fromRow.gold - (count || 0);
        if(fromBalance < 0) {
            this.fail('转出数额不能超过账户余额');
            return
        }
        const res = await service.user.userService.gold_transfer(fromRow, toRow, count);
        if(res === true) {
            this.success('transfer success');
        } else {
            this.fail(res);
        }
    }

    /**
     * 查询指定用户今日释放积分情况
     * @param userId 用户id
     * @return {Promise<void>}
     */
    async getReleaseGold() {
        const { ctx, service } = this;
        const { userId } = ctx.request.body;
        if(!userId) {
            //入参校验
            this.fail('userId is required');
            return
        }
        const res = await service.user.userService.getReleaseGoldToday(userId);
        if(res.status) {
            this.success(res.msg);
        } else {
            this.fail(res.msg)
        }
    }

    /**
     * 查询积分/专用积分 历史列表（支持分页）
     * @param userId 用户id
     * @param isCom 是否要查普通积分标识位，默认为true
     * @param page 第几页
     * @param pageSize 每页条数
     * @param start 开始时间
     * @param end 结束时间
     * @param orderBy 排序规则
     * @return {Promise<void>}
     */
    async getPointHistory() {
        const { ctx, service } = this;
        const { userId, isCom , page, pageSize, start, end, orderBy } = ctx.request.body;
        if(!userId) {
            //入参校验
            this.fail('userId is required');
            return
        }
        if(start >= end) {
            this.fail('endTime cannot be less than startTime');
            return
        }
        const res = await service.user.userService.point_page_list(isCom, page, pageSize, userId, start, end, orderBy);
        this.success(res)
    }

    /**
     * 根据角色，获取我的团队成员列表
     * @param userId 用户id
     * @return {Promise<void>}
     */
    async getGroupMembers() {
        const { ctx, service } = this;
        const { userId } = ctx.request.body;
        if(!userId) {
            //入参校验
            this.fail('userId is required');
            return
        }
        const userRow = await service.user.userService._getUserById(userId);
        if(!userRow) {
            //入参校验
            this.fail('invalid userId');
            return
        }
        const userRole = userRow.role;
        const shortId = userRow.inviteCode;
        const myInvited = await service.user.userService.getRows("t_user", shortId, "parentCode");
        let result = [];
        switch (userRole) {
            case this.utils.Enum.USER_ROLE.VIP:
                //VIP
                result = myInvited;
                break;
            case this.utils.Enum.USER_ROLE.MANAGER:
                //经理
                if(myInvited.length > 0) {
                    const parentCodeArr =  myInvited.map(item => item.inviteCode);
                    const res = await service.user.userService.getRows("t_user", parentCodeArr, "parentCode");
                    result = [...res, ...myInvited];
                }
                break;
            case this.utils.Enum.USER_ROLE.DIRECTOR:
                //总监
                result = myInvited;
                break;
            case this.utils.Enum.USER_ROLE.AGENT:
                //总代
                result = myInvited;
                break;
            default:
                this.fail('user role invalid');
                return
        }
        this.success(result);
    }

    /**
     * 拿旧的超时的token更换新的token
     * @return {Promise<void>}
     */
    async refleshToken() {
        const { ctx, service } = this;
        const token =ctx.headers.authorization;
        if(!token.trim()) {
            //入参校验
            this.fail('token is required');
            return
        }
        try {
            const userInfo = ctx.app.jwt.decode(token);
            const redisToken = await ctx.app.redis.get(`token_${userInfo.id}`);
            if(token === redisToken) {
                //校验token是否超时
                const expireAt = userInfo.exp;
                if(expireAt*1000 > new Date().getTime()) {
                    //超时时间大于现在的时间，即意味着该token没有超时
                    this.fail('healthy token, do not need reflesh');
                    return;
                }
                //redis里是最新的token可以更换token
                //gen new token
                const {secret, timeout} = ctx.app.config.jwt;
                const token = ctx.app.jwt.sign({
                    id: userInfo.id,
                    phone: userInfo.phone,
                    inviteCode: userInfo.inviteCode,
                }, secret, {expiresIn: timeout});
                //更新redisToken
                const expire = ctx.helper.getProperty('REDIS_TOKEN_TIMEOUT');
                await ctx.app.redis.set(`token_${userInfo.id}`, token, 'EX', expire);
                this.success(token);
            } else {
                if(!redisToken) {
                    this.fail('cannot refleshToken with redis token is null, please relogin');
                } else {
                    this.fail('not latest token, cannot reflesh');
                }
            }
        } catch (e) {
            this.fail('token invalid');
        }
    }
}

module.exports = UserController;
