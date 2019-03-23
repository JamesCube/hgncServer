'use strict';

const Controller = require('./baseController');

class GoodsController extends Controller {

    /**
     * 获取商品顶级（一级）分类
     * @param classScheme 分类方案
     * @returns {Promise<void>}
     */
    async getTopClass() {
        const { ctx, service } = this;
        const { classScheme } = ctx.request.body;
        //入参校验
        if(!classScheme || !(classScheme.trim())) {
            this.fail("classScheme is required");
            return;
        }
        const res = await service.goods.goodsService.getTopClass(classScheme);
        this.success(res)
    }

    /**
     * 获取商品二级分类列表
     * @param topClass 一级分类的id数组
     * @returns {Promise<void>}
     */
    async getSecondClass() {
        const { ctx, service } = this;
        const { topClass } = ctx.request.body;
        //入参校验
        if(!topClass || !Array.isArray(topClass) || topClass.length === 0) {
            this.fail("topClass is required");
            return;
        }
        const res = await service.goods.goodsService.getSecondClass(topClass);
        this.success(res)
    }

    /**
     * 获取商品id的数组批量查询商品详情列表
     * @param ids 商品id的数组
     * @returns {Promise<void>}
     */
    async goodsList() {
        const { ctx, service } = this;
        const { ids } = ctx.request.body;
        //入参校验
        if(!ids || !Array.isArray(ids) || ids.length === 0) {
            this.fail("ids is required");
            return;
        }
        const res = await service.goods.goodsService.getGoodsByIds(ids);
        this.success(res)
    }

    /**
     * 根据商品类型分页查询商品详情
     * @param type 商品类新
     * @param page 页码
     * @param pageSize 页大小
     * @returns {Promise<void>}
     */
    async goodsPageList() {
        const { ctx, service } = this;
        const { type, page, pageSize } = ctx.request.body;
        //入参校验
        if(!type || !type.trim()) {
            this.fail("type is required");
            return;
        }
        const res = await service.goods.goodsService.goods_page_list(type, page, pageSize);
        this.success(res)
    }

    /**
     * 根据title模糊分页查询商品列表
     * @param title 搜索关键字
     * @param page 页码
     * @param pageSize 页大小
     * @return {Promise<void>}
     */
    async searchGoods() {
        const { ctx, service } = this;
        const { title, page, pageSize } = ctx.request.body;
        if(!title.trim()) {
            this.fail("title is required");
            return;
        }
        const res = await service.goods.goodsService.searchGoodsByTitle(title, page, pageSize);
        this.success(res)
    }


}

module.exports = GoodsController;
