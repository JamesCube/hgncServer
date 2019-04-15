'use strict';

const Service = require('../base/baseService');


class UserService extends Service {
    constructor(ctx) {
        super(ctx); //如果需要在构造函数做一些处理，一定要有这句话，才能保证后面 `this.ctx`的使用。
        // 就可以直接通过 this.ctx 获取 ctx 了
        // 还可以直接通过 this.app 获取 app 了
        this.utils = this.ctx.helper;
    }

    /**
     * 新建用户,成功返回true，错误返回具体的错误信息
     * @param params
     * @returns {boolean}
     */
    async insertOne(params) {
        const _now = new Date().getTime();
        const p = Object.assign(params, {
            id: this.utils.uuidv1(),
            role: 0,
            inviteCode: this.utils.genInviteCode(),
            createTime: _now,
            timeline: _now + '',
        });
        let result;
        try{
            const resp = await this.app.mysql.insert('t_user', p);
            result = resp.affectedRows === 1;
        } catch (e) {
            result = e.sqlMessage;
            //如果邀请码重复会返回  Duplicate entry 'cUXXgJ' for key 't_user_inviteCode_uindex'
            if(e.errno === 1062 && result.indexOf('t_user_inviteCode_uindex') !== -1) {
                this.log('insertOne','system','system',`自动生成的邀请码重复:${p.inviteCode}`);
                //换一个邀请码重新插入（递归）
                result = await this.insertOne(params);
            }
        } finally {
            return result
        }
    }

    /**
     * 根据手机号,查询用户
     * @param phoneNum
     */
    findOneByPhone(phoneNum) {
        const row = this.app.mysql.get('t_user', { phone: phoneNum, alive: true });
        return row;
    }

    /**
     * 手机号方式登录时，校验手机和密码是否匹配
     * @param phoneNum
     * @param pwd
     * @returns 登录成功返回user数据行，失败返回false
     */
    async validLogin(phoneNum, pwd) {
        let result = false;
        const row = await this.findOneByPhone(phoneNum);
        if(row && (row.pwd === pwd) && row.alive) {
            result = row;
        }
        return result;
    }

    /**
     * 管理员后台页面登录
     * @tips 在user表中后台管理员和普通用户的区别在于普通用户的登录名只能为手机号，而管理员可为任意字符串，且管理员的createTime毫秒数为0
     * @param name
     * @param pwd
     * @returns 登录成功返回adminUser数据行，失败返回false
     */
    async validAdminLogin(name, pwd) {
        let result = false;
        const row = await this.app.mysql.get('t_user', { phone: name, alive: true, createTime: 0});
        if(row && (row.pwd === pwd)) {
            result = row;
        }
        return result;
    }

    /**
     * 更改密码
     * 更改成功返回true，失败返回具体原因字符串
     * @param phoneNum
     * @param pwd
     */
    async changePwd(phoneNum, pwd) {
        /*let result = await this.app.mysql.query(
            'UPDATE `t_user` SET pwd = ? WHERE phoneNum = ?',
            [pwd, phoneNum]
        )*/
        const row = {pwd: pwd};
        const options = {
            where: {
                //t_user表的手机号字段为phone而不是phoneNum
                phone: phoneNum,
            },
        };
        let result;
        try {
            let res = await this.app.mysql.update('t_user', row, options);
            result = (res && (res.affectedRows === 1)) ? true : '无此手机号用户'
        } catch (e) {
            result = e.sqlMessage
        } finally {
            return result;
        }
    }

    /**
     * 校验邀请码是否是已经存在的邀请码，防止用户随便填邀请码
     * 存在返回true，不存在返回false
     * @param code
     * @return {Promise<void>}
     */
    async validInviteCode(code) {
        if(!code.trim()) return false;
        const row = await this.app.mysql.get('t_user', { inviteCode: code });
        return !!row;
    }

    /**
     * 修改用户绑定的手机号,成功返回true，失败返回具体错误信息
     * @param userId
     * @param phoneNum
     * @return {Promise<*>}
     */
    async change_bind_phone(userId, phoneNum) {
        const row = {phone: phoneNum};
        const options = {
            where: {
                id: userId,
            },
        };
        let result;
        try {
            let res = await this.app.mysql.update('t_user', row, options);
            result = res.affectedRows === 1;
        } catch (e) {
            result = e.sqlMessage
        } finally {
            return result;
        }
    }

    /**
     * 修改用户二级密码(直接修改)
     * 操作成功返回true，失败返回false或报错原因
     * @return {Promise<void>}
     */
    async updateSecondaryPwd(userId, pwd) {
        const row = {
            id: userId,
            secondaryPwd: pwd,
            timeLine: new Date().getTime(),
        };
        let result;
        try {
            const res = await this.app.mysql.update('t_user', row);
            result = (res.affectedRows === 1);
        } catch (e) {
            result = e.sqlMessage
        } finally {
            return result;
        }
    }

    /**
     * 修改用户二级密码(需要校验原二级密码)
     * 修改成功返回true，修改失败返回false或具体错误原因
     * @param userId
     * @param oldPwd
     * @param newPwd
     * @return {Promise<*>}
     */
    async change_secondary_pwd(userId, oldPwd, newPwd) {
        //验证旧密码是否正确
        const validFlag = await this.valid_secondary_pwd(userId, oldPwd);
        if(!validFlag) {
            return '原二级密码校验失败'
        }
        let result = await this.updateSecondaryPwd(userId, newPwd);
        return result;
    }

    /**
     * 校验二级密码，校验成功返回true，失败返回false
     * @param userId
     * @param pwd
     * @return {Promise<string>}
     */
    async valid_secondary_pwd(userId, pwd) {
        let result = false;
        const row = await this._getUserById(userId);
        if(row && (row.secondaryPwd === pwd)) {
            result = true;
        }
        return result;
    }

    /**
     * 根据id获取user数据行
     * @param userId
     * @return {Promise<*>}
     * @private
     */
    async _getUserById(userId) {
        const row = await this.app.mysql.get('t_user', { id: userId, alive: true });
        return row;
    }

    /**
     * 在原来的基础上增量更新用户积分
     * @param userId
     * @param comPoint 需要增加的积分，减也行（传负数就是减）
     * 更新成功返回true，无此用户数据行返回false，报错返回具体报错信息
     */
    async incremental_update_comPoint(userId, comPoint = 0) {
        const row = this._getUserById(userId);
        let result = false;
        if(row) {
            const newPoint =  row.comPoint + comPoint
            const params = {
                id: row.id,
                comPoint: newPoint,
            }
            result = this.updateRow('t_user', params);
        }
        return result;
    }

    /**
     * 在原来的基础上增量更新用户消费额
     * @param userId
     * @param comPoint 需要增加的消费额
     * 更新成功返回true，无此用户数据行返回false，报错返回具体报错信息
     */
    async incremental_update_cost(userId, cost = 0) {
        const row = this._getUserById(userId);
        let result = false;
        let newCost = 0;
        if(row) {
            newCost =  row.cost + cost;
            const params = {
                id: row.id,
                cost: newCost,
            }
            //判断用户角色看是否需要根据总消费额更新用户角色
            if(row.role === this.utils.Enum.USER_ROLE.COMMON) {
                //如果是普通会员且，且消费额大于额度阈值，提升会员为VIP角色
                const vip_threshold = this.utils.getProperty("VIP_THRESHOLD") || 0;
                if(newCost > vip_threshold) {
                    params.role = this.utils.Enum.USER_ROLE.VIP;
                }
            }
            result = this.updateRow('t_user', params);
        }
        return result;
    }

}
module.exports = UserService;