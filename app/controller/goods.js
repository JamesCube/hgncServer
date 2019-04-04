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
        //查询商品规格
        const standardObj = {}
        for (let goodsId of ids) {
            const rows = await service.goods.goodsService.getStandards(goodsId);
            standardObj[goodsId] = rows;
        }
        //拼装规格到商品详情里
        const arr = res.map(goods => {
            goods.standard = standardObj[goods.id]
            return goods
        });
        this.success(arr)
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
        const { type, page, pageSize, orderBy } = ctx.request.body;
        //入参校验
        if(!type || !type.trim()) {
            this.fail("type is required");
            return;
        }
        const res = await service.goods.goodsService.goods_page_list(type, page, pageSize, orderBy);
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
        const { title, page, pageSize, orderBy } = ctx.request.body;
        if(!title.trim()) {
            this.fail("title is required");
            return;
        }
        const res = await service.goods.goodsService.searchGoodsByTitle(title, page, pageSize, orderBy);
        this.success(res);
    }

    /**
     * 根据用户id和区域id，查询用户推送商品列表，默认返回4个商品（不分页）
     * @param userId 用户id
     * @param areaId 区域id
     * @param num 商品数量
     */
    async goodsRecommend() {
        const { ctx, service } = this;
        const { userId, areaId, num } = ctx.request.body;
        const res = await service.goods.goodsService.recommendGoods(userId, areaId, num);
        this.success(res);
    }

    /**
     * 添加商品类别（批量接口）
     * @param goodsId 商品id
     * @param items 类别详情的数组
     * @return {Promise<void>}
     */
    async standardAdd() {
        const { ctx, service } = this;
        const { goodsId, items } = ctx.request.body;
        if(!goodsId) {
            this.fail("goodsId is required");
            return;
        }
        const res = await service.goods.goodsService.standard_add(goodsId, items);
        if(res === true) {
            this.success("goods standard add success");
        } else {
            this.fail(res);
        }
    }

    /**
     * 删除商品类别（批量接口）
     * @param ids  类别id的数组
     * @return {Promise<void>}
     */
    async standardDel() {
        const { ctx, service } = this;
        const { ids } = ctx.request.body;
        if(!ids || !Array.isArray(ids) || ids.length === 0) {
            this.fail("param ids: effective Array type is required");
            return;
        }
        //这里需要使用真删除，因为goodsId和title是联合主键，alive设置为false的时候，同名的title无法插入
        const res = await service.goods.goodsService.delRows("t_goods_standard", "id", ids);
        if(res === true) {
            this.success("goods standard delete success");
        } else {
            this.fail(res);
        }
    }

    /**
     * 编辑商品类别
     * @param id 类别id
     * @param params 需要变更的字段对象
     * @return {Promise<void>}
     */
    async standardUpdate() {
        const { ctx, service } = this;
        const { id, params } = ctx.request.body;
        if(!id) {
            this.fail("goods standard id is required");
            return;
        }
        const res = await service.goods.goodsService.standard_update(id, params);
        if(res === true) {
            this.success("goods standard update success");
        } else {
            this.fail(res);
        }
    }

}

module.exports = GoodsController;
