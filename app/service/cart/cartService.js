'use strict';

const Service = require('../base/baseService');


class goodsService extends Service {
    constructor(ctx) {
        super(ctx); //如果需要在构造函数做一些处理，一定要有这句话，才能保证后面 `this.ctx`的使用。
        // 就可以直接通过 this.ctx 获取 ctx 了
        // 还可以直接通过 this.app 获取 app 了
        this.utils = this.ctx.helper;
    }

    /**
     * 新建商品,成功返回操作结果（需要自行判断result.affectedRows === 1），错误返回具体的错误信息
     * 需要接受参数userId, goodsId
     * @param params,
     * @returns {boolean}
     */
    async addCart(userId, goodsId, goodsNum = 1, standardId = '') {
        //先查询此用户的购物车中有没有该商品
        const rows = await this.app.mysql.select('t_cart', {
            where: { userId: userId, goodsId: goodsId, standardId: standardId },
            columns: ['id', 'num'],
        });
        let num = 0;
        let id = '';
        let result;
        //rows一定为数组，若没查到则为空数组，查到了也只有一条数据行
        if(rows.length > 0) {
            num = rows[0].num;
            id = rows[0].id;
            //若之前已经加入购物车则重复加入购物车时商品数量加1
            const row = {
                id: id,
                num: (num + goodsNum),
                standardId: standardId,
                timestamp: new Date().getTime(),
            };
            try{
                result = await this.app.mysql.update('t_cart', row);
            } catch (e) {
                result = e.sqlMessage
            }
        } else {
            //首次加入购物车
            const _now = new Date().getTime();
            const p = {
                id: this.utils.uuidv1(),
                userId: userId,
                goodsId: goodsId,
                standardId: standardId,
                num: goodsNum,
                createTime: _now,
                timestamp: _now,
            };
            try{
                result = await this.app.mysql.insert('t_cart', p);
            } catch (e) {
                result = e.sqlMessage
            }
        }
        return result
    }

    /**
     * 分页查询购物车下的商品
     * @param userId
     * @param page
     * @param pageSize
     * @return {Promise<{page: number, pageSize: number, data}>}
     */
    async cartList(userId, page = 1, pageSize = 10) {
        const rows = await this.app.mysql.select('t_cart', {
            where: { userId: userId },
            orders: [['timestamp','desc']], //时间倒序排序，最新的顶到最上显示
            limit: pageSize, // 返回数据量
            offset: (page - 1) * pageSize, // 数据偏移量
        });
        return {
            page: page,
            pageSize: pageSize,
            data: rows,
        };
    }

    /**
     * 批量删除用户购物车下的某几个商品
     * @param userId 用户id
     * @param ids [array] 购物车数据行id
     * @return {boolean} sql执行成功返回true，失败返回具体错误信息
     */
    async deleteCart(userId, ids) {
        let result;
        try{
            await this.app.mysql.delete('t_cart', {
                userId: userId,
                id: ids,
            });
            result = true
        } catch (e) {
            result = e.sqlMessage;
        }
        return result;
    }

    /**
     * 清空用户购物车下的所有商品
     * @param userId 用户id
     * @return 成功返回true，失败返回具体错误信息
     */
    async clearCart(userId) {
        let result;
        try{
            await this.app.mysql.delete('t_cart', {
                userId: userId,
            });
            result = true
        } catch (e) {
            result = e.sqlMessage;
        }
        return result;
    }




}
module.exports = goodsService;