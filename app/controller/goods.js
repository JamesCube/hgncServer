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
     * 获取商品id的数组批量查询商品详情列表
     * @returns {Promise<void>}
     */
    async adminList() {
        const { ctx, service } = this;
        const { type, page, pageSize, orderBy } = ctx.request.body;
        //类型为选填字段
        const options = type ? { type: type, alive: true } : { alive: true };
        const res = await service.goods.goodsService.goods_page_list(options, page, pageSize, orderBy);
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
        const { type, page, pageSize, orderBy } = ctx.request.body;
        //入参校验
        if(!type || !type.trim()) {
            this.fail("type is required");
            return;
        }
        const options = { type: type, alive: true, listing: true};
        const res = await service.goods.goodsService.goods_page_list(options, page, pageSize, orderBy);
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

    /**
     * 上传商品图片，支持多fieldName多图片上传
     * fieldName只支持title，flow，detail
     * 若上传成功返回商品名对象，返回数据结构如result所示
     * @params title
     * @params flow
     * @params detail
     */
    async _uploadImage(paths = '') {
        const { ctx, service } = this;
        //const stream = await ctx.getFileStream();
        const files = ctx.multipart();
        let file;
        let result = {
            title: [],
            flow: [],
            detail: [],
        }
        while ((file = await files()) != null) {
            if (file.length) {
                // arrays are busboy fields
                console.log('field: ' + file[0]);
                console.log('value: ' + file[1]);
                console.log('valueTruncated: ' + file[2]);
                console.log('fieldnameTruncated: ' + file[3]);
            } else {
                const fileName = file.filename;
                if (!fileName) {
                    // user click `upload` before choose a file,
                    // `part` will be file stream, but `part.filename` is empty
                    // must handler this, such as log error.
                    continue;
                }
                // otherwise, it's a stream
                //fieldname为formData的key值
                const fieldName = file.fieldname;
                if(fieldName !== 'title' && fieldName !== 'flow' && fieldName !== 'detail') continue;
                try {
                    const res = await service.common.oss.image_stream_upload(paths + fileName, file);
                    if(res.res.status === 200) {
                        result[fieldName].push(fileName);
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        }
        this.success(result);
        return result;
    }

    /**
     * 解析formData的值，文件就直接上传，参数值则存储到params中返回
     * 返回数据结构强定制，私有方法，其他地方谨慎复用
     * @param paths
     * @return {Promise<*[]>}
     * @private
     */
    async _multipartAnalyse(paths) {
        const { ctx, service } = this;
        //const stream = await ctx.getFileStream();
        const files = ctx.multipart();
        let file;
        let result = {
            titleImage: [],
            flowImages: [],
            detailImages: [],
        }
        //商品字段详情
        const params = {};
        while ((file = await files()) != null) {
            if (file.length) {
                // 官方解释为 arrays are busboy fields，实际上通俗应理解为非文件流自定义字段参数
                //file 作为一个数组 有4个item，分别对用field，value，valueTruncated，fieldnameTruncated
                params[file[0]] = file[1];
            } else {
                const fileName = file.filename;
                if (!fileName) {
                    // user click `upload` before choose a file,
                    // `part` will be file stream, but `part.filename` is empty
                    // must handler this, such as log error.
                    continue;
                }
                // otherwise, it's a stream
                //fieldname为formData的key值
                const fieldName = file.fieldname;
                if(fieldName !== 'titleImage' && fieldName !== 'flowImages' && fieldName !== 'detailImages') continue;
                try {
                    const res = await service.common.oss.image_stream_upload(paths + fileName, file);
                    if(res.res.status === 200) {
                        //上传成功的图片名，放到result中返回，后续需要更新goods商品数据行
                        result[fieldName].push(fileName);
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        }
        return [params, result];
    }

    /**
     * 添加商品，整合了商品图片的上传功能
     * 使用formData传参 前台Content-Type 应该设置为 multipart/form-data
     * 由于stream流机制，解析到的流不上传无法关闭，故先上传图片，再新增数据行，若商品数据行新增失败，则需要删除上传成功的图片
     * @param title
     * @param type
     * @param price
     * @param standardTitle
     * @param pointRate
     * @param detail
     * @param flowImages
     * @param detailImages
     * @param titleImage
     * @return {Promise<void>}
     */
    async goodsAdd() {
        const { ctx, service } = this;
        //生成goodsId
        const goodsId = ctx.helper.genSnowId(3);
        const analyseRes = await this._multipartAnalyse(`goods/${goodsId}/`);
        const params = analyseRes[0];
        const files = analyseRes[1];
        params.id = goodsId;
        const res = await service.goods.goodsService.create(params);
        if(res === true) {
            //图片处理成功后，新增goods数据行
            const row = {
                id: goodsId,
                imageUrl: files.titleImage.join(';'),
                flowImages: files.flowImages.join(';'),
                detailImages: files.detailImages.join(';'),
            };
            const updateRes = await service.goods.goodsService.updateRow('t_goods', row);
            if(updateRes === true) {
                this.success('create goods success');
            } else {
                this.success('create goods success,but no images stored');
            }
        } else {
            //删除掉已经上传的文件
            const names = [...files.titleImage, ...files.flowImages, ...files.detailImages];
            const paths = names.map(name => `goods/${goodsId}/${name}`);
            this.oss_paths_delete(paths);
            this.log("goodsAdd", 'admin', goodsId, '上传图片操作:oss冗余文件夹');
            this.fail(res);
        }
    }

    /**
     * 编辑已经存在的商品
     * 使用formData传参 前台Content-Type 应该设置为 multipart/form-data
     * @return {Promise<void>}
     */
    async goodsEdit() {
        const { service } = this;
        //将formData内容中的字符串字段和文件字段分开
        const filterRes = await this._formDataFilter();
        const params = filterRes[0];
        //const fileDict = filterRes[1];
        if(!params || !params.id) {
            this.fail("goods id is required");
            return;
        }
        const row_update = await service.goods.goodsService.updateRow("t_goods", params);
        this.success(row_update);
    }

    async _formDataFilter() {
        const { ctx } = this;
        const files = ctx.multipart();
        let file;
        let result = {
            titleImage: [],
            flowImages: [],
            detailImages: [],
        };
        //商品字段详情
        const params = {};
        while ((file = await files()) != null) {
            if (file.length) {
                // 官方解释为 arrays are busboy fields，实际上通俗应理解为非文件流自定义字段参数
                //file 作为一个数组 有4个item，分别对用field，value，valueTruncated，fieldnameTruncated
                params[file[0]] = file[1];
            } else {
                const fileName = file.filename;
                if (!fileName) {
                    // user click `upload` before choose a file,
                    // `part` will be file stream, but `part.filename` is empty
                    // must handler this, such as log error.
                    continue;
                }
                // otherwise, it's a stream
                //fieldname为formData的key值
                const fieldName = file.fieldname;
                if(fieldName === 'titleImage' || fieldName === 'flowImages' || fieldName === 'detailImages'){
                    result[fieldName].push(file);
                };
            }
        }
        return [params, result];
    }


    /**
     * 删除商品（批量接口）假删除
     * @ids 商品id的数组
     * @return {Promise<void>}
     */
    async goodsDelete(alive = false) {
        const { ctx, service } = this;
        const { ids } = ctx.request.body;
        if(!ids || !Array.isArray(ids) || ids.length === 0) {
            this.fail("param ids: effective Array type is required");
            return;
        }
        const res = await service.goods.goodsService.setAlive("t_goods", ids, alive);
        if(res === true) {
            this.success("operation success");
        } else {
            this.fail(res === false ? "contains invalid id" : res);
        }
    }

    /**
     * 回收站功能，查看被删除的商品
     * @return {Promise<void>}
     */
    async getRecycleGoods() {
        const { ctx, service } = this;
        const { type, page, pageSize, orderBy } = ctx.request.body;
        //类型为选填字段
        const options = type ? { type: type, alive: false } : { alive: false };
        const res = await service.goods.goodsService.goods_page_list(options, page, pageSize, orderBy);
        this.success(res)
    }

    /**
     * 批量恢复回收站中的商品
     * @return {Promise<void>}
     */
    async recoverGoods() {
        await this.goodsDelete(true);
    }

    /**
     * 删除回收站中的商品
     * 真删除
     * @return {Promise<void>}
     */
    async clearGoods() {
        const { ctx, service } = this;
        const { ids } = ctx.request.body;
        if(!ids || !Array.isArray(ids) || ids.length === 0) {
            this.fail("param ids: effective Array type is required");
            return;
        }
        //只能删除状态为 alive: false的商品
        let result;
        let userId = this.getUserId();
        try {
            const res = await this.app.mysql.delete("t_goods", {
                alive: false,
                id: ids,
            });
            result = `${res.affectedRows} rows affected`;
            ids.forEach(async id => {
                //删除oss图片
                if(id && id.trim()) {
                    const ossRes = await this.oss_paths_delete(`goods/${id}`)
                    if(ossRes === true) {
                        this.log("oss_goodsImages_clear", userId, "", `goodsId:${id},oss images clear`);
                    }
                }
            });
            this.success(result);
        } catch (e) {
            result = e.sqlMessage;
            this.fail(result);
        }
    }

}

module.exports = GoodsController;
