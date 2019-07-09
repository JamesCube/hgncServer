'use strict';

const Controller = require('./baseController');
const moment = require('moment');

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
            const expire = ctx.helper.getProperty('APP_REDIS_TOKEN_TIMEOUT');
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
     * 用户登出,app和pc共用一个退出登录的接口
     * @param phoneNum
     * @param pwd
     * @returns {Promise<void>}
     */
    async logout() {
        const { ctx } = this;
        const token =ctx.headers.authorization;
        const tokenUser = this.app.jwt.decode(token);
        const tokenUserId = tokenUser ? tokenUser.id : ""
        if(!tokenUserId) {
            //入参校验
            this.fail('token invalid');
            return
        }
        await ctx.app.redis.del(`token_${tokenUserId}`);
        this.success(`logout success`)
    }

    /**
     * 根据用户id，批量查询用户信息
     * 批量接口
     * @param ids 用户id的数组
     * @return {Promise<void>}
     */
    async userInfo() {
        const { ctx, service } = this;
        const { ids } = ctx.request.body;
        //入参校验
        if(!ids || !Array.isArray(ids) || ids.length === 0) {
            this.fail("ids is required");
            return;
        }
        let res = await service.user.userService.getRows('t_user', ids, 'id', ['id', 'userName', 'phone', 'role', 'inviteCode', 'createTime']);
        this.success(res);
    }

    /**
     * 根据token，返回最新的user信息
     * @return {Promise<void>}
     */
    async refleshMe() {
        const { ctx, service  } = this;
        const tokenUserId = ctx.tokenUser ? ctx.tokenUser.id : '';
        //tokenUserId和可能是用户id，或pc_前缀的用户id,这里兼容转化为用户id
        let userId = tokenUserId.length === 39 ? tokenUserId.substring(3) : tokenUserId;
        //由于已alive: true为条件筛选，这里只能查出存活的用户
        const me = await service.user.userService._getUserById(userId);
        if(me) {
            //删除掉敏感字段信息
            delete me["pwd"];
            delete me["secondaryPwd"];
            delete me["parentCode"];
            delete me["mentorCode"];
        }
        this.success(me);
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
            const expire = ctx.helper.getProperty('PC_REDIS_TOKEN_TIMEOUT');
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
        const { ctx, service  } =   this;
        let userId = this.getUserId();
        const files = ctx.multipart();
        let file;
        while ((file = await files()) != null) {
            if (file.length) {
                // 官方解释为 arrays are busboy fields，实际上通俗应理解为非文件流自定义字段参数
                //file 作为一个数组 有4个item，分别对用field，value，valueTruncated，fieldnameTruncated
                continue;
            } else {
                const fileName = file.filename;
                if (!fileName) {
                    // user click `upload` before choose a file,
                    // `part` will be file stream, but `part.filename` is empty
                    // must handler this, such as log error.
                    continue;
                }
                // otherwise, it's a stream
                //fieldname为formData的key值
                const fieldName = file.fieldname;
                if(fieldName !== 'image') continue;
                try {
                    const time = moment().format('YYYYMMDDHHmmss');
                    const res = await service.common.oss.image_stream_upload(`users/${userId}/head/${time}_${fileName}`, file);
                    if(res.res.status === 200) {
                        //上传成功的图片名，需要更新user表中的头像字段，增加对oss上图片的引用
                        const addImage = await service.user.userService.updateUserHead(userId, `${time}_${fileName}`);
                        if(addImage === true) {
                            this.log('uploadUserHead', userId, userId, `上传了头像：${time}_${fileName}`);
                            this.success("upload success");
                        } else {
                            //删掉oss上的图片，保持同步
                            this.oss_paths_delete([`users/${userId}/head/${time}_${fileName}`]);
                            this.fail(addImage);
                        }
                    }
                } catch (e) {
                    this.fail(e.message);
                }
            }
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
     * @param type 枚举类型标识用户想查询什么角色的成员 member manager director
     * @return {Promise<void>}
     */
    async getGroupMembers() {
        const { ctx, service } = this;
        const utils = ctx.helper;
        const { type } = ctx.request.body;
        const userId = this.getUserId()
        //查询出最新的实时的user数据行
        const userRow = await service.user.userService._getUserById(userId);
        if(!userRow) {
            //入参校验
            this.fail('invalid userId');
            return
        }
        //type不传时后台逻辑默认处理 为‘member’枚举类型
        const t = type || 'member';
        const userRole = userRow.role;
        const shortId = userRow.inviteCode;
        //查询出所有我的子用户，包括alive为false的用户（注意用户的角色不限，可能比我自己要大）
        let mySonIds = []
        await service.user.userService._getSonUsers(shortId, mySonIds);
        const mySons = await service.user.userService.getRows("t_user", mySonIds, "id", ["id", "phone", "role", "inviteCode", "createTime", "alive"]);
        //const mySons = await service.user.userService.getRows("t_user", shortId, "parentCode", ["id", "phone", "role", "inviteCode", "createTime", "alive"]);
        const commonAndVip = [...utils.filterUser_by_role(mySons, utils.Enum.USER_ROLE.COMMON), ...utils.filterUser_by_role(mySons, utils.Enum.USER_ROLE.VIP)]
        let result = [];
        switch (userRole) {
            case utils.Enum.USER_ROLE.VIP:
                //我是VIP
                if(t === 'member') {
                    //查询我的团队成员，可能为普通用户或VIP
                    result = commonAndVip;
                } else {
                    //result初始化的值本来就为[] 无需再赋值
                    //result = [];
                }
                break;
            case utils.Enum.USER_ROLE.MANAGER:
                //我是经理
                if(t === 'member') {
                    //我要查我直接邀请的会员，和我邀请的会员所邀请的间接会员
                    result = commonAndVip;
                } else if (t === 'manager') {
                    //我要查我的经理，我无法看到我平级的经理，故只能看到我自己(返回有效字段)
                    result = [{
                        id: userRole.id,
                        phone: userRole.phone,
                        role: userRole.role,
                        inviteCode: userRole.inviteCode,
                        createTime: userRole.createTime,
                        alive: userRole.alive,
                    }]
                } else {
                    //result初始化的值本来就为[] 无需再赋值
                    //result = [];
                }
                break;
            case utils.Enum.USER_ROLE.DIRECTOR:
                //我是总监
                if(t === 'member') {
                    result = commonAndVip;
                } else if (t === 'manager') {
                    result = utils.filterUser_by_role(mySons, utils.Enum.USER_ROLE.MANAGER);
                } else if(t === 'director') {
                    //我要查我的总监，我无法看到我平级的总监，故只能看到我自己(返回有效字段)
                    result = [{
                        id: userRole.id,
                        phone: userRole.phone,
                        role: userRole.role,
                        inviteCode: userRole.inviteCode,
                        createTime: userRole.createTime,
                        alive: userRole.alive,
                    }]
                }
                break;
            case utils.Enum.USER_ROLE.AGENT:
                //我是总代
                if(t === 'member') {
                    result = commonAndVip;
                } else if (t === 'manager') {
                    result = utils.filterUser_by_role(mySons, utils.Enum.USER_ROLE.MANAGER);
                } else if(t === 'director') {
                    //我要查我的总监，我无法看到我平级的总监，故只能看到我自己(返回有效字段)
                    result = utils.filterUser_by_role(mySons, utils.Enum.USER_ROLE.DIRECTOR);
                }
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
                    this.success({
                        token: '',
                        code: '00',
                        msg: 'healthy token, do not need reflesh',
                    });
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
                const tokenKey = userInfo.id.length === 39 ? 'PC_REDIS_TOKEN_TIMEOUT' : 'APP_REDIS_TOKEN_TIMEOUT';
                //pc端和app端，redis token超时的时间不一样，应该分别区分
                const expire = ctx.helper.getProperty(tokenKey);
                await ctx.app.redis.set(`token_${userInfo.id}`, token, 'EX', expire);
                this.success({
                    token: token,
                    code: 'OK',
                    msg: 'reflesh success'
                });
            } else {
                if(!redisToken) {
                    this.success({
                        token: '',
                        code: 'RN',
                        msg: 'cannot refleshToken with redis token is null, please relogin',
                    });
                } else {
                    this.success({
                        token: '',
                        code: 'NW',
                        msg: 'not latest token, cannot reflesh',
                    });
                }
            }
        } catch (e) {
            this.fail('token invalid');
        }
    }

    /**
     * 查询我的团队成员数量
     * @param userId 用户id
     * @param start 开始时间毫秒数（可选）
     * @param end 结束时间毫秒数（可选）
     * 当start，end存在时，查询改时间段内新增的团队成员个数
     * @return {Promise<void>}
     */
    async getMyTeamNum() {
        const { ctx, service } = this;
        const { userId, start, end } = ctx.request.body;
        if(!userId) {
            //入参校验
            this.fail('userId is required');
            return
        }
        if((start && !end) || (!start && end)) {
            this.fail('missing startTime or endTime');
            return
        }
        if(start >= end) {
            this.fail('endTime cannot be less than startTime');
            return
        }
        const me = await service.user.userService._getUserById(userId);
        let sons = []
        await service.user.userService._getSonUsers(me.inviteCode, sons);
        if(!start && !end) {
            //开始时间和结束时间都没有，查询我的下级总人数
            //我的team算上我自己故需要+1
            this.success(sons.length + 1);
        } else {
            //查找时间段内新增的团队人数
            const sql = `SELECT
                            id 
                        FROM t_user
                        WHERE 
                            id in (:ids) 
                        AND createTime BETWEEN :startTime and :endTime`;
            const res = await this.app.mysql.query(sql, {
                ids: sons,
                startTime: start,
                endTime: end,
            });
            this.success(res.length);
        }
    }

    /**
     * 查询我的团队的总成交额业绩
     * @param start 开始时间毫秒数（可选）
     * @param end 结束时间毫秒数（可选）
     * @return {Promise<void>}
     */
    async getMyTeamPerformance() {
        const { ctx, service } = this;
        const { userId, start, end } = ctx.request.body;
        if(!userId) {
            //入参校验
            this.fail('userId is required');
            return
        }
        if((start && !end) || (!start && end)) {
            this.fail('missing startTime or endTime');
            return
        }
        if(start >= end) {
            this.fail('endTime cannot be less than startTime');
            return
        }
        const me = await service.user.userService._getUserById(userId);
        let result = 0;
        let sons = []
        await service.user.userService._getSonUsers(me.inviteCode, sons);
        if(!start && !end) {
            //开始时间和结束时间都没有，查询所有时间段的成交额（不以时间做筛选条件）
            const costArr = await service.user.userService.getRows("t_user", sons, "id", ["cost"]);
            costArr.forEach(v => {
                result += v.cost;
            })
        } else {
            //需要按时间条件筛选的情况
            const sql = `SELECT 
                            description 
                        FROM t_log_cost
                        WHERE 
                            type = 'user_consumption_add' 
                        AND influencer in (:ids) 
                        AND createTime BETWEEN :startTime and :endTime`;
            const res = await this.app.mysql.query(sql, {
                ids: sons,
                startTime: start,
                endTime: end,
            });
            res.forEach(v => {
                result += parseFloat(v.description);
            });
        }
        this.success(result);
    }

    /**
     * 查询我的团队的总成交额详情
     * @param userId 用户id
     * @param start 开始时间毫秒数（可选）
     * @param end 结束时间毫秒数（可选）
     * @return {Promise<void>}
     */
    async salesDetail() {
        const { ctx, service } = this;
        const { type, start, end } = ctx.request.body;
        if((start && !end) || (!start && end)) {
            this.fail('missing startTime or endTime');
            return
        }
        if(start >= end) {
            this.fail('endTime cannot be less than startTime');
            return
        }
        const userId = this.getUserId();
        const me = await service.user.userService._getUserById(userId);
        if(!me) {
            this.fail('illegal current user');
            return
        }
        let result;
        let sons = []
        await service.user.userService._getSonUsers(me.inviteCode, sons);
        if(!start && !end) {
            //开始时间和结束时间都没有，查询所有时间段的成交额（不以时间做筛选条件）
            const costArr = await service.user.userService.getRows("t_log_cost", sons, "influencer", ["phone", "createTime", "description", "title"]);
            result = costArr;
        } else {
            //需要按时间条件筛选的情况
            const sql = `SELECT 
                            description 
                        FROM t_log_cost
                        WHERE 
                            type = 'user_consumption_add' 
                        AND influencer in (:ids) 
                        AND createTime BETWEEN :startTime and :endTime`;
            const res = await this.app.mysql.query(sql, {
                ids: sons,
                startTime: start,
                endTime: end,
            });
            result = res;
        }
        this.success(result);
    }

    /**
     * 查询某个时间段内我的团队成员新增的普通积分
     * @param userId 用户id
     * @param start 开始时间毫秒数（可选）
     * @param end 结束时间毫秒数（可选）
     * @return {Promise<void>}
     * @tips 实际上有t_log和t_log_point都存储了积分变化的日志，type分别为incremental_update_comPoint和user_comPoint_add
     * incremental_update_comPoint的详情记录了调用incremental_update_comPoint方法后原积分和现有的积分的情况，而user_comPoint_add
     * 只记录了消费后积分核算增加的积分
     */
    async getMyTeamPoint() {
        const { ctx, service } = this;
        const { userId, start, end } = ctx.request.body;
        if(!userId) {
            //入参校验
            this.fail('userId is required');
            return
        }
        if((start && !end) || (!start && end)) {
            this.fail('missing startTime or endTime');
            return
        }
        if(start >= end) {
            this.fail('endTime cannot be less than startTime');
            return
        }
        const me = await service.user.userService._getUserById(userId);
        let result = 0;
        let sons = []
        await service.user.userService._getSonUsers(me.inviteCode, sons);
        const sql = `SELECT 
                            description 
                        FROM t_log_point
                        WHERE 
                            type = 'user_comPoint_add' 
                        AND influencer in (:ids) 
                        ${ (start && end) ? "AND createTime BETWEEN :startTime and :endTime" : "" }`;
        const res = await this.app.mysql.query(sql, (start && end) ? {
            ids: sons,
            startTime: start,
            endTime: end,
        } : { ids: sons });
        res.forEach(v => {
            result += parseFloat(v.description);
        });
        this.success(result);
    }

    /**
     * 上传我的图片，可批量
     * formData 表单上传
     * @return {Promise<void>}
     */
    async uploadMyImages() {
        const { ctx, service  } = this;
        const tokenUserId = ctx.tokenUser ? ctx.tokenUser.id : '';
        //tokenUserId和可能是用户id，或pc_前缀的用户id,这里兼容转化为用户id
        let userId = tokenUserId.length === 39 ? tokenUserId.substring(3) : tokenUserId;
        const files = ctx.multipart();
        let file;
        while ((file = await files()) != null) {
            if (file.length) {
                // 官方解释为 arrays are busboy fields，实际上通俗应理解为非文件流自定义字段参数
                //file 作为一个数组 有4个item，分别对用field，value，valueTruncated，fieldnameTruncated
                continue;
            } else {
                const fileName = file.filename;
                if (!fileName) {
                    // user click `upload` before choose a file,
                    // `part` will be file stream, but `part.filename` is empty
                    // must handler this, such as log error.
                    continue;
                }
                // otherwise, it's a stream
                //fieldname为formData的key值
                const fieldName = file.fieldname;
                if(fieldName !== 'images') continue;
                try {
                    const time = new Date().getTime();
                    const res = await service.common.oss.image_stream_upload(`users/${userId}/${time}_${fileName}`, file);
                    if(res.res.status === 200) {
                        //上传成功的图片名，放到result中返回，后续需要更新goods商品数据行
                        const addImage = await service.user.userService.image_add(userId, `${time}_${fileName}`);
                        if(addImage === true) {
                            this.success("upload success");
                        } else {
                            //删掉oss上的图片，保持同步
                            this.oss_paths_delete([`users/${userId}/${time}_${fileName}`]);
                            this.fail(addImage);
                        }
                    }
                } catch (e) {
                    this.fail(e.message);
                }
            }
        }
    }

    /**
     * 查询我上传的的图片
     * @return {Promise<void>}
     */
    async getMyImages() {
        const { ctx, service  } = this;
        const { page, pageSize, orderBy } = ctx.request.body;
        const tokenUserId = ctx.tokenUser ? ctx.tokenUser.id : '';
        //tokenUserId和可能是用户id，或pc_前缀的用户id,这里兼容转化为用户id
        let userId = tokenUserId.length === 39 ? tokenUserId.substring(3) : tokenUserId;
        const res = await service.user.userService.myPageImages(userId, page, pageSize, orderBy)
        this.success(res);
    }

    /**
     * 根据图片id数组批量删除我曾今上传的图片
     * @params ids 图片id的数组，必须传数组否则校验报错
     * @return {Promise<void>}
     */
    async deleteMyImages() {
        const { ctx, service  } = this;
        const { ids } = ctx.request.body;
        if(!ids || !Array.isArray(ids) || ids.length === 0) {
            this.fail("ids is required");
            return;
        }
        let userId = this.getUserId();
        const imagesRows = await service.user.userService.getRows("t_images", ids);
        if(imagesRows.length > 0) {
            const paths = imagesRows.map(item => `users/${userId}/${item.path}`);
            const res = await this.oss_paths_delete(paths);
            if(res === true) {
                const rowDelete = await service.user.userService.delRows("t_images", "id", ids);
                if(rowDelete === true) {
                    this.success("delete success");
                }
            }
        } else {
            this.fail("invalid ids")
        }
    }

    /**
     * 设置用户昵称，可设置为空
     * @param imageName
     * @returns {Promise<*|boolean>}
     */
    async setUserName() {
        const { ctx, service  } = this;
        const { name } = ctx.request.body;
        const userId = this.getUserId();
        const userName = (name || '').trim();
        const res = await service.user.userService.setUserName(userId, userName);
        if (res === true) {
            this.success("operation success")
        } else {
            this.fail(res);
        }
    }

    /**
     * 用户申请实名认证
     * @returns {Promise<void>}
     */
    async applyStore() {
        const { ctx, service  } = this;
        const files = ctx.multipart();
        const userId = this.getUserId();
        let file;
        let uploadFlag = true;
        let rowData = {userId};
        let ossPath = [];
        while ((file = await files()) != null) {
            if (file.length) {
                // 官方解释为 arrays are busboy fields，实际上通俗应理解为非文件流自定义字段参数
                //file 作为一个数组 有4个item，分别对用field，value，valueTruncated，fieldnameTruncated
                rowData[file[0]] = (file[1] || "").trim();
                continue;
            } else {
                const fileName = file.filename;
                if (!fileName) {
                    // user click `upload` before choose a file,
                    // `part` will be file stream, but `part.filename` is empty
                    // must handler this, such as log error.
                    continue;
                }
                // otherwise, it's a stream
                //fieldname为formData的key值
                const fieldName = file.fieldname;
                if(fieldName !== 'front' && fieldName !== 'back' && fieldName !== 'license' && fieldName !== 'entrust') continue;
                try {
                    const time = moment().format('YYYYMMDDHHmmss');
                    const res = await service.common.oss.image_stream_upload(`users/${userId}/apply/${time}_${fileName}`, file);
                    if(res.res.status === 200) {
                        //上传成功的图片名，放到result中返回，后续需要更新goods商品数据行
                        const addImage = await service.user.userService.image_add(userId, `${time}_${fileName}`);
                        if(addImage === true) {
                            rowData[fieldName] = `${time}_${fileName}`;
                            ossPath.push(`users/${userId}/apply/${time}_${fileName}`)
                            this.success("upload success");
                        } else {
                            //删掉oss上的图片，保持同步
                            this.oss_paths_delete([`users/${userId}/apply/${time}_${fileName}`]);
                            this.fail(addImage);
                        }
                    }
                } catch (e) {
                    uploadFlag = false;
                    this.fail(e.message);
                }
            }
        }
        if(uploadFlag) {
            //上传图片成功，则新增实名认证数据行
            const res = await service.user.userService.insert_certification(rowData);
            if(res === true) {
                this.success('apply success')
            } else {
                //删除之前上传成功的图片
                this.oss_paths_delete(ossPath);
                this.fail(res);
            }
        }
    }
}

module.exports = UserController;
