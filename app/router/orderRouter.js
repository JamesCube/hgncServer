'use strict';

/**
 * 购物车相关路由模块
 * @author chengjiajun
 * @since 2019/03/21
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
    const { router, controller } = app;
    //生成订单
    router.post('/v1/api/order/create', controller.order.createOrder);
    //根据用户id，分页查询我的订单详情
    router.post('/v1/api/order/list', controller.order.orderList);
    //根据订单id数组，批量查询订单详情
    router.post('/v1/api/order/ids', controller.order.getOrdersByIds);
    //删除订单信息
    router.post('/v1/api/order/delete', controller.order.deleteOrders);
    //支付成功后的回调
    router.post('/v1/api/order/paySuccess', controller.order.paySuccess);
    //支付宝支付结果异步回调函数（通知服务端支付宝的支付结果）
    router.post('/v1/api/order/payResult', controller.order.payResult);
    //确认收货
    router.post('/v1/api/order/received', controller.order.received);
};
