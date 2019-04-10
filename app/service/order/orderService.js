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
     * 创建订单，批量接口
     * @param userId
     * @param goods [Array]
     * @return {Promise<*>}
     */
    async orderCreate(userId, addressId, goods) {
        const length = goods.length;
        const _now = new Date().getTime();
        const orderId = this.utils.genSnowId();
        let arr = goods.map(item => {
            item.id = orderId;
            item.userId = userId;
            item.addressId = addressId;
            item.createTime = _now;
            item.timestamp = _now;
            return item;
        })
        let result;
        try{
            const resp = await this.app.mysql.insert('t_order', arr);
            result = resp.affectedRows === length;
        } catch (e) {
            result = e.sqlMessage
        } finally {
            return result
        }
    }

    /**
     * 分页查询购物车下的商品
     * @param userId
     * @param page
     * @param pageSize
     * @param status
     * @param orderBy
     * @return {Promise<{page: number, pageSize: number, data}>}
     */
    async listOrder(userId, status, page = 1, pageSize = 10, orderBy = [['createTime','desc']]) {
        const _where = status ? { userId: userId, status: status, alive: true } : { userId: userId, alive: true };
        const rows = await this.app.mysql.select('t_order', {
            where: _where,
            orders: orderBy, //时间倒序排序，最新的顶到最上显示
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
     * 删除订单
     * @param orderId 订单id
     * @param goodsId 商品id
     * @param detail 商品详情
     * @return {boolean} sql执行成功返回影响条数，失败返回具体错误信息
     */
    async orderDelete(orderId, goodsId, detail) {
        let result;
        let _where = {id: orderId}
        if(goodsId) {
            _where = Object.assign(_where, {goodsId: goodsId})
        }
        if(detail) {
            _where = Object.assign(_where, {detail: detail})
        }
        try{
            const res = await this.app.mysql.update('t_order', { alive: false, timestamp: new Date().getTime() }, { where: _where });
            result = res.affectedRows;
        } catch (e) {
            result = e.sqlMessage;
        }
        return result;
    }

    /**
     * 更改订单状态
     * sql执行成功返回true，执行失败返回具体错误信息,
     * 当不传payment字段时，后台不对该字段进行update操作
     * @param orderId
     * @return {Promise<void>}
     */
    async changeOrderStatus(orderId, status, payment) {
        let row = {
            id: orderId,
            status: status,
            timestamp: new Date().getTime(),
        };
        if(payment) {
            row = Object.assign(row, {
                payment: payment,
            })
        }
        let result;
        try {
            const res = await this.app.mysql.update('t_order', row);
            result = true;
        } catch (e) {
            result = e.sqlMessage;
        } finally {
            return result;
        }
    }

    /**
     * 校验订单状态是否是status状态，是返回true，不是返回false
     * @param orderId 订单id
     * @param status 需要对比的订单状态
     * @return {Promise<void>}
     */
    async checkOrderStatus(orderId, status) {
        let result = false;
        const orders = await this.getByIds("t_order", orderId);
        if(orders && Array.isArray(orders) && orders.length > 0) {
            const _status = orders[0].status;
            if(status === _status) {
                result = true;
            }
        }
        return result;
    }

    /**
     * 查询订单价格,不支持批量
     * @param orderId
     * @return {Promise<void>}
     */
    async getOrderPrice(orderId) {
        const rows = await this.app.mysql.select('t_order', {
            where: { id: orderId },
        });
        let result = 0;
        if(rows.length > 0) {
            for(let row of rows) {
                result += row.price;
            }
        }
        return result;
    }

    /**
     * 查询订单可以获得的积分,不支持批量订单查询
     * 实时接口，按照当前积分率来换算
     * @param orderId
     * @return {Promise<void>}
     */
    async getOrderPoint(orderId) {
        const rows = await this.app.mysql.select('v_order', {
            where: { id: orderId },
        });
        let result = 0;
        if(rows.length > 0) {
            const default_rate = this.utils.getProperty("DEFAULT_GOODS_POINTRATE");
            for(let row of rows) {
                result += (row.price * (row.pointRate ===0 ? default_rate : row.pointRate));
            }
        }
        return Math.round(result);
    }

}
module.exports = goodsService;