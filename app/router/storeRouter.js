'use strict';

/**
 * 购物车相关路由模块
 * @author chengjiajun
 * @since 2019/03/21
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
    const { router, controller } = app;
    //添加商品至购物车
    router.post('/v1/api/cart/add', controller.cart.addCart);
    //根据用户id，分页查询购物车商品详情
    router.post('/v1/api/cart/list', controller.cart.cartList);
    //删除购物车中的某几个商品
    router.post('/v1/api/cart/delete', controller.cart.deleteCart);
    //根据商品分类查询商品详情
    //router.post('/v1/api/cart/goodsPageList', controller.goods.goodsPageList);

};
