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
        let result = {
            res: true,
            msg: orderId
        };
        try{
            const resp = await this.app.mysql.insert('t_order', arr);
            if(resp.affectedRows !== length) {
                this.log('orderCreate', userId, userId, `订单号${orderId}应生成${length}行数据，实际生成${resp.affectedRows}行`);
                result = {
                    res: false,
                    msg: `订单号${orderId}应生成${length}行数据，实际生成${resp.affectedRows}行`,
                };
            }
        } catch (e) {
            result = {
                res: false,
                msg: e.sqlMessage,
            };
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

    /**
     * 核心业务，佣金结算逻辑
     * 操作成功返回true，操作失败返回具体错误信息
     * @return {Promise<void>}
     */
    async commissionClear(userId,  amount) {
        const userRows = await this.service.user.userService._getMyCommissionUsers(userId);
        //根据待结算佣金的金额，将佣金分成分为5份
        const manager = amount * (this.utils.getProperty("MANAGER_COMMISSION") || 0);
        const director = amount * (this.utils.getProperty("DIRECTOR_COMMISSION") || 0);
        const agent = amount * (this.utils.getProperty("AGENT_COMMISSION") || 0);
        const guide_manager = amount * (this.utils.getProperty("GUIDE_MANAGER_COMMISSION") || 0);
        const guide_director = amount * (this.utils.getProperty("GUIDE_DIRECTOR_COMMISSION") || 0);
        const params = {}
        //userId 去重
        const ids = [...new Set(userRows.map(item => item.id))];
        ids.forEach( id => {
            params[id] = 0;
        });
        params[userRows[0].id] += manager;
        params[userRows[1].id] += guide_manager;
        params[userRows[2].id] += director;
        params[userRows[3].id] += guide_director;
        params[userRows[4].id] += agent;
        const originalRows = await this.getRows('t_user', ids);
        const paramsArr = [];
        ids.forEach( id => {
            const remain = params[id];
            const originalRow = this.app._.find(originalRows, o => o.id === id);
            paramsArr.push({id: id, remain: (originalRow.remain + remain).toFixed(3)})
        });
        let result;
        try {
            const res = await this.app.mysql.updateRows('t_user', paramsArr);
            result = (res.affectedRows === paramsArr.length);
            if(result) {
                //记录日志
                this.log('commission_manager', userId, userRows[0].id, manager);
                this.log('commission_guide_manager', userId, userRows[1].id, guide_manager);
                this.log('commission_director', userId, userRows[2].id, director);
                this.log('commission_guide_director', userId, userRows[3].id, guide_director);
                this.log('commission_agent', userId, userRows[4].id, agent);
            }
        } catch (e) {
            result = e.sqlMessage
        } finally {
            return result;
        }
    }

    /**
     * 根据id获取user数据行
     * @param val 默认为userId
     * @return {Promise<*>}
     * @private
     */
    async _getUserById(val, key = 'id') {
        const row = await this.app.mysql.get('t_user', { [key]: val, alive: true });
        return row;
    }

}
module.exports = goodsService;