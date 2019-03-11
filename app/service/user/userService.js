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
     * 新建用户,成功返回新建条数1，错误返回具体的错误信息
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
        this.app.mysql
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
        if(row && (row.pwd === pwd)) {
            result = row;
        }
        return result;
    }

    /**
     * 更改密码
     * 更改成功返回true，失败返回false
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
                phoneNum: phoneNum
            }
        };
        let result = await this.app.mysql.update('posts', row, options);
        return result.affectedRows === 1;
    }
}
module.exports = UserService;