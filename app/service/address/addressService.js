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
     * 新建用户地址,成功返回true，错误返回具体的错误信息
     * @param params
     * @returns {boolean}
     */
    async addAddress(userId, params) {
        //是否是默认地址标志位,前台可以传也可以不传此参数，当不传此参数时，后台机制为不设置为默认地址
        let isDefaultAddress = !!params.default;
        const _now = new Date().getTime();
        const p = Object.assign(params, {
            id: this.utils.uuidv1(),
            userId: userId,
            createTime: _now,
            timestamp: _now,
            alive: true,
        });
        let result;
        // 初始化手动事务操作
        const conn = await this.app.mysql.beginTransaction();
        try{
            if(isDefaultAddress) {
                //将该用户名下其他的地址，是否默认项设置为false
                const options = {
                    where: {
                        //t_user表的手机号字段为phone而不是phoneNum
                        userId: userId,
                        alive: true,
                    },
                };
                await conn.update('t_address', { default: false }, options);
            }
            const resp = await conn.insert('t_address', p);
            result = resp.affectedRows === 1;
            if(result) {
                //提交事务
                await conn.commit();
            }
        } catch (e) {
            //发生异常回滚事务操作
            await conn.rollback();
            result = e.sqlMessage
        } finally {
            return result
        }
    }

    /**
     * 编辑地址信息
     * @param id 主键
     * @param params 待编辑的数据信息
     * @return boolean 成功返回true，失败返回false
     */
    async editAddressRow(id, params) {
        params.id = id;
        const result = await this.app.mysql.update('t_address', params);
        return result.affectedRows === 1;
    }

    /**
     * 根据用户id，查询该用户下的地址信息详情
     * @param userId
     * @returns {Promise<void>}
     */
    async listAddressRows(userId) {
        const rows = await this.app.mysql.select('t_address', {
            where: { userId: userId, alive: true },
        });
        return rows;
    }

}
module.exports = UserService;