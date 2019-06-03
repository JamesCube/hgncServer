'use strict';

/**
 * 品牌管理相关路由模块
 * @author chengjiajun
 * @since 2019/06/03
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
    const { router, controller } = app;
    //添加品牌
    router.post('/v1/api/brand/add', controller.brand.brandCreate);
    //品牌列表(支持分页和排序)
    router.post('/v1/api/brand/list', controller.brand.brandList);
    //根据id删除品牌
    router.post('/v1/api/brand/delete', controller.brand.brandDelete);
    //编辑品牌
    router.post('/v1/api/brand/edit', controller.brand.brandEdit);

};
