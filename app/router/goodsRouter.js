'use strict';

/**
 * 商品相关路由模块
 * @author chengjiajun
 * @since 2019/02/22
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
    const { router, controller } = app;
    //获得商品一级分类列表
    router.post('/v1/api/goods/topClass', controller.goods.getTopClass);
    //获得商品二级分类列表
    router.post('/v1/api/goods/secondClass', controller.goods.getSecondClass);
    //根据商品id数组查询商品详情
    router.post('/v1/api/goods/goodsList', controller.goods.goodsList);
    //根据商品分类查询商品详情
    router.post('/v1/api/goods/goodsPageList', controller.goods.goodsPageList);
    //商品名称模糊搜索
    router.post('/v1/api/goods/search', controller.goods.searchGoods);
    //获取推荐给指定用户的商品列表
    router.post('/v1/api/goods/recommend', controller.goods.goodsRecommend);
};
