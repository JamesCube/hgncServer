'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
    const { router, controller } = app;
    router.get('/', controller.home.index);
    router.post('/v1/api/common/configs', controller.home.getCusConfig);
    router.post('/v1/api/common/reloadConfigs', controller.home.reloadConfigs);
    //user路由
    require('./router/userRouter')(app);
    //商品路由
    require('./router/goodsRouter')(app);
    //购物车路由
    require('./router/cartRouter')(app);
    //地址管理路由
    require('./router/addressRouter')(app);
};
