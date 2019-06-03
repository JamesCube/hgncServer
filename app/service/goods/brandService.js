'use strict';

const Service = require('../base/baseService');


class goodsService extends Service {
    constructor(ctx) {
        super(ctx); //如果需要在构造函数做一些处理，一定要有这句话，才能保证后面 `this.ctx`的使用。
        // 就可以直接通过 this.ctx 获取 ctx 了
        // 还可以直接通过 this.app 获取 app 了
        this.utils = this.ctx.helper;
    }

    /**
     * 新建品牌,成功返回true，错误返回具体的错误信息
     * @returns {boolean}
     */
    async brandCreate(name, site, logo, description, order = 0, active = true, id) {
        let result;
        const _now = new Date().getTime();
        const p = {
            id: id ? id : this.utils.uuidv1(),
            name: name,
            site: site,
            logo: logo,
            description: description,
            order: order,
            active: active,
            alive: true,
            createTime: _now,
            timestamp: _now,
        };
        try{
            const res = await this.app.mysql.insert('t_brand', p);
            result = res.affectedRows === 1;
        } catch (e) {
            if(e.errno === 1062 && e.sqlMessage.indexOf('t_brand_name_uindex') !== -1) {
                //品牌名name重复，包装错误信息
                result = "brand name already exist"
            } else {
                result = e.sqlMessage
            }
        }
        return result
    }

    /**
     * 分页查询品牌
     * @param page
     * @param pageSize
     * @return {Promise<{page: number, pageSize: number, data}>}
     */
    async brandPageList( page = 1, pageSize = 10, option = {alive: true}, orderBy = [['order', 'asc'], ['createTime','desc']]) {
        const totalNum = await this.app.mysql.count('t_brand', option);
        const pg = this.utils.pagefaultTolerant(totalNum, page, pageSize);
        const brandRows = await this.app.mysql.select('t_brand', {
            where: option,
            //columns: ["id", "path", "createTime"],
            limit: pg.pageSize, // 返回数据量
            orders: orderBy,
            offset: (pg.page - 1) * pg.pageSize, // 数据偏移量
        });
        const result = {
            total: totalNum,
            page: pg.page,
            pageSize: pg.pageSize,
            data: brandRows,
        }
        return result;
    }





}
module.exports = goodsService;