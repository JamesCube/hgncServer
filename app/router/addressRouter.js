'use strict';

/**
 * 用户管理路由模块
 * @author chengjiajun
 * @since 2019/02/22
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
    const { router, controller } = app;
    //新增收货地址
    router.post('/v1/api/address/add', controller.address.addAddress);
    //修改收货地址
    router.post('/v1/api/address/edit', controller.address.editAddress);
    //删除收货地址
    router.post('/v1/api/address/del', controller.address.deleteAddress);
    //查询用户地址列表
    router.post('/v1/api/address/list', controller.address.listAddress);
};
