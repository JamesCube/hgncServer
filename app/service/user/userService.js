'use strict';

const Service = require('egg').Service;


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
            result = e.sqlMessage
        } finally {
            return result
        }
    }

    /**
     * 根据手机号,查询用户
     * @param phoneNum
     */
    findOneByPhone(phoneNum) {
        const row = this.app.mysql.get('t_user', { phone: phoneNum });
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
        const options  = {
            where: {
                //t_user表的手机号字段为phone而不是phoneNum
                phone: phoneNum
            }
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
}
module.exports = UserService;