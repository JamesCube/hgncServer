'use strict';

const Controller = require('./baseController');

class CartController extends Controller {

    /**
     * 新建品牌
     * @param userId 用户id
     * @param goodsId 商品id
     * @returns {Promise<void>}
     */
    async brandCreate() {
        const { ctx, service } = this;
        const { name, site, logo, description, order, active } = ctx.request.body;
        //入参校验
        if(!name || !name.trim()) {
            this.fail("brand name is required");
            return;
        }
        const res = await service.goods.brandService.brandCreate(name, site, logo, description, order, active);
        if (res === true) {
            //品牌名name有唯一约束，数据行create成功后再更新图片
            const tokenUserId = ctx.tokenUser ? ctx.tokenUser.id : '';
            //tokenUserId和可能是用户id，或pc_前缀的用户id,这里兼容转化为用户id
            let userId = tokenUserId.length === 39 ? tokenUserId.substring(3) : tokenUserId;
            if(logo) {
                await service.common.oss.oss_paths_copy(`users/${userId}/${logo}`, `brands/${logo}`);
            }
            this.success("create brand success");
        } else {
            this.fail(res);
        }
    }

    /**
     * 分页查询品牌列表
     * @param userId
     * @param page
     * @param pageSize
     * @return {Promise<void>}
     */
    async brandList() {
        const { ctx, service } = this;
        const { page, pageSize, orderBy } = ctx.request.body;
        const res = await service.goods.brandService.brandPageList( page, pageSize, {alive: true}, orderBy);
        this.success(res);
    }

    /**
     * 根据品牌id，批量删除品牌
     * @param ids 品牌id的数组
     * @return {Promise<void>}
     */
    async brandDelete() {
        const { ctx, service } = this;
        const { ids } = ctx.request.body;
        //入参校验
        if(!ids || !Array.isArray(ids) || ids.length === 0) {
            this.fail("param ids: effective Array type is required");
            return;
        }
        const res = await service.goods.brandService.setAlive("t_brand", ids, false);
        if(typeof res === "boolean") {
            //是true或false，表示sql执行成功，为false时表示包含无效id
            this.success("operation success");
        } else {
            this.fail(res);
        }
    }

    /**
     * 编辑品牌信息
     * 要编辑什么字段就传什么字段，无需编辑的字段不用传
     * 所有的字段有 id, name, site, logo, description, order, active
     * @return {Promise<void>}
     */
    async brandEdit() {
        const { ctx, service } = this;
        const params = ctx.request.body;
        if(!params.id) {
            this.fail("id is required");
            return;
        }
        const brand_row = await this.app.mysql.get('t_brand', { id: params.id });
        if(brand_row) {
            const row_update = await service.goods.brandService.updateRow("t_brand", params);
            if(row_update === true) {
                //品牌名name有唯一约束，数据行update成功后再更新图片
                const logo = params.logo;
                if(logo && logo.trim()) {
                    const tokenUserId = ctx.tokenUser ? ctx.tokenUser.id : '';
                    //tokenUserId和可能是用户id，或pc_前缀的用户id,这里兼容转化为用户id
                    let userId = tokenUserId.length === 39 ? tokenUserId.substring(3) : tokenUserId;
                    await service.common.oss.oss_paths_copy(`users/${userId}/${logo}`, `brands/${logo}`);
                    //异步删除掉原来的logo图片
                    const origin_logo = brand_row.logo;
                    if(origin_logo && origin_logo.length > 0 && origin_logo !== logo) {
                        this.oss_paths_delete([`brands/${origin_logo}`]);
                    }
                }
                if(logo === "" || logo.trim() === "") {
                    //logo字段不为undefined，有logo字段，但logo字段为空字符串，删除曾经的logo
                    const origin_logo = brand_row.logo;
                    if(origin_logo && origin_logo.length > 0) {
                        this.oss_paths_delete([`brands/${origin_logo}`]);
                    }
                }
                this.success("update success");
            } else {
                let errInfo;
                if(row_update.indexOf('t_brand_name_uindex') !== -1) {
                    //品牌名name重复，包装错误信息
                    errInfo = "brand name already exist"
                } else {
                    errInfo = row_update;
                }
                this.fail(errInfo)
            }
        } else {
            this.fail("invalid id");
        }
    }

}

module.exports = CartController;
