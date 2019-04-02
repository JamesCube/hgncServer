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
        if (res === true) {
            this.success("create order success");
        } else {
            this.fail(res);
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
        //订单状态校验，只有已发货待收货状态时才可以更改订单状态为已收货
        const validStatus = await service.order.orderService.checkOrderStatus(orderId, helper.Enum.ORDER_STATUS.HAS_DELIVER);
        if(validStatus) {
            const res = await service.order.orderService.changeOrderStatus(orderId, helper.Enum.ORDER_STATUS.DONE);
            if(res === true) {
                this.success('operation success');
                //确认收货后需要计算分红额（待做）
            } else {
                this.fail(res);
            }
        } else {
            this.fail("当前订单状态校验失败,仅已发货待收货状态时才可以更改订单状态为已收货");
        }
    }

}

module.exports = OrderController;
