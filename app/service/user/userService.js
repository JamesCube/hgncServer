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
     * 新建用户
     * @param params
     * @returns {boolean}
     */
    insertOne(params) {
        const _now = new Date().getTime();
        const p = Object.assign(params, {
            id: this.utils.uuidv1(),
            role: 0,
            inviteCode: this.utils.genInviteCode(),
            createTime: _now,
            timeline: _now + '',
        });
        const result = this.app.mysql.insert('t_user', p);
        const insertSuccess = result.affectedRows === 1;
        return insertSuccess
    }

    /**
     * 根据手机号,查询用户
     * @param phoneNum
     */
    findOneByPhone(phoneNum) {
        const row = this.app.mysql.get('t_user', { phone: phoneNum });
        this.app.mysql
        return row;
    }

    /**
     * 手机号方式登录时，校验手机和密码是否匹配
     * @param phoneNum
     * @param pwd
     * @returns 登录成功返回user数据航，失败返回false
     */
    validLogin(phoneNum, pwd) {
        let result = false;
        const row = this.findOneByPhone(phoneNum);
        if(row && (row.pwd === pwd)) {
            result = row;
        }
        return result;
    }

    /**
     * 更改密码
     * @param phoneNum
     * @param pwd
     */
    changePwd(phoneNum, pwd) {

    }
}
module.exports = UserService;