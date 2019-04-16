'use strict';

const Controller = require('./baseController');

class OrderController extends Controller {

    /**
     * 新增商品订单
     * @param userId 用户id
     * @param goods 商品详情，是一个数组批量接口
     * @returns {Promise<void>}
     */
    async createOrder() {
        const { ctx, service } = this;
        const { userId, addressId, goods } = ctx.request.body;
        //入参校验
        if(!userId) {
            this.fail("userId is required");
            return;
        }
        if(!addressId) {
            this.fail("addressId is required");
            return;
        }
        const res = await service.order.orderService.orderCreate(userId, addressId, goods);
        if (res.res === true) {
            this.success(res.msg);
        } else {
            this.fail(res.msg);
        }
    }

    /**
     * 分页查询订单详情
     * @param userId
     * @param page
     * @param pageSize
     * @return {Promise<void>}
     */
    async orderList() {
        const { ctx, service } = this;
        const { userId, status, page, pageSize, orderBy } = ctx.request.body;
        if(!userId) {
            this.fail("userId is required");
            return;
        }
        const res = await service.order.orderService.listOrder(userId, status, page, pageSize, orderBy);
        this.success(res);
    }

    /**
     * 删除订单（敏感操作，不支持批量操作）
     * @param id 用户id
     * @return {Promise<void>}
     */
    async deleteOrders() {
        const { ctx, service } = this;
        const { id, goodsId, detail } = ctx.request.body;
        //入参校验
        if(!id) {
            this.fail("order id is required");
            return;
        }
        const res = await service.order.orderService.orderDelete(id, goodsId, detail);
        if(isNaN(res)) {
            this.fail(res);
        } else {
            this.success(`affected ${res} rows`)
        }
    }

    /**
     * 支付成功后的回调，用来变更订单状态
     * @param orderId 订单id
     * @return {Promise<void>}
     */
    async paySuccess() {
        const { ctx, service } = this;
        const { helper } = ctx;
        const { orderId, payment } = ctx.request.body;
        if(!orderId) {
            this.fail("order id is required");
            return;
        }
        //订单状态校验，只有待支付状态下支付成功才可以更改订单状态为已支付
        const validStatus = await service.order.orderService.checkOrderStatus(orderId, helper.Enum.ORDER_STATUS.WAIT_PAY);
        if(validStatus) {
            const res = await service.order.orderService.changeOrderStatus(orderId, helper.Enum.ORDER_STATUS.ALREADY_PAY, payment);
            if(res === true) {
                this.success('operation success');
            } else {
                this.fail(res);
            }
        } else {
            this.fail("当前订单状态校验失败,仅待支付状态才可变更为支付成功状态");
        }
    }

    /**
     * 订单确认收货，订单状态变更为done
     * @param orderId
     * @return {Promise<void>}
     */
    async received() {
        const { ctx, service } = this;
        const { helper } = ctx;
        const { orderId } = ctx.request.body;
        if(!orderId) {
            this.fail("order id is required");
            return;
        }
        const orders = await service.order.orderService.getByIds("t_order", orderId);
        let current_order_status;
        let current_order_userId;
        if(orders && Array.isArray(orders) && orders.length > 0) {
            current_order_status = orders[0].status;
            current_order_userId = orders[0].userId;
        } else {
            this.fail('订单信息查询失败');
            return;
        }
        //订单状态校验，只有已发货待收货状态时才可以更改订单状态为已收货
        //const validStatus = await service.order.orderService.checkOrderStatus(orderId, helper.Enum.ORDER_STATUS.HAS_DELIVER);
        if(current_order_status === helper.Enum.ORDER_STATUS.HAS_DELIVER) {
            const res = await service.order.orderService.changeOrderStatus(orderId, helper.Enum.ORDER_STATUS.DONE);
            if(res === true) {
                this.success('operation success');
                //确认收货后需要计算积分详情
                //获得当前订单产生的积分
                let point = 0;
                if(orders.length > 0) {
                    const default_rate = helper.getProperty("DEFAULT_GOODS_POINTRATE");
                    for(let order of orders) {
                        point += (order.price * (order.pointRate ===0 ? default_rate : order.pointRate));
                    }
                    //积分可能算出来小数需要四舍五入取整
                    point = Math.round(point);
                }
                if(point !== 0) {
                    //增量更新积分信息(不一定是更新自己的积分，为普通用户时更新推荐人积分)
                    service.user.userService.incremental_update_comPoint(current_order_userId, point);
                }
                //增量更新用户总消费额
                if(order.price > 0) {
                    service.user.userService.incremental_update_cost(current_order_userId, order.price);
                }
            } else {
                this.fail(res);
            }
        } else {
            this.fail("当前订单状态校验失败,仅已发货待收货状态时才可以更改订单状态为已收货");
        }
    }

    /**
     * 根据订单ids数组批量查询订单详情
     * @params ids 订单id的数组
     * @return {Promise<void>}
     */
    async getOrdersByIds() {
        const { ctx, service } = this;
        const { ids } = ctx.request.body;
        if(!ids || !Array.isArray(ids) || ids.length === 0) {
            this.fail("ids is required");
            return;
        }
        const rows = await service.user.userService.getByIds('t_order', ids);
        if(rows > 0) {
            for(let row of rows) {
                if(row.status === helper.Enum.ORDER_STATUS.WAIT_PAY) {
                    //如果订单状态是待支付，需要返回前台剩余时间，前台判断是否订单超时未支付
                    row.remainTime = new Date().getTime() - row.createTime
                }
            }
        }
        this.success(rows);
    }
}

module.exports = OrderController;
