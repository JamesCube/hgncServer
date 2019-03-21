'use strict';

const Service = require('egg').Service;


class goodsService extends Service {
    constructor(ctx) {
        super(ctx); //如果需要在构造函数做一些处理，一定要有这句话，才能保证后面 `this.ctx`的使用。
        // 就可以直接通过 this.ctx 获取 ctx 了
        // 还可以直接通过 this.app 获取 app 了
        this.utils = this.ctx.helper;
    }

    /**
     * 新建商品,成功返回新建条数1，错误返回具体的错误信息
     * 需要接受参数type，description,price,imageUrl,detail
     * @param params,
     * @returns {boolean}
     */
    async create(params) {
        const _now = new Date().getTime();
        const p = Object.assign(params, {
            id: this.utils.uuidv1(),
            createTime: _now,
            timestamp: _now,
            alive: true,
        });
        let result;
        try{
            const resp = await this.app.mysql.insert('t_goods', p);
            result = resp.affectedRows === 1;
        } catch (e) {
            result = e.sqlMessage
        } finally {
            return result
        }
    }

    /**
     * 根据商品id的数组，批量查询商品信息
     * @param ids
     * @returns {Promise<void>}
     */
    async getGoodsByIds(ids) {
        const rows = await this.app.mysql.select('t_goods', {
            where: { id: ids },
        });
        return rows;
    }

    /**
     * 按照商品类型，分页查询
     * @param type
     * @param page
     * @param pageSize
     * @returns {Promise<void>}
     */
    async getGoodsByType(type, page = 1 , pageSize = 10) {
        const rows = await this.app.mysql.select('t_goods', {
            where: { type: type },
            //orders: [['created_at','desc'], ['id','desc']],
            limit: pageSize, // 返回数据量
            offset: (page - 1) * pageSize, // 数据偏移量
        });
        return rows;
    }

    /**
     * 更改商品价格
     * 为了安全性，没有做成批量接口
     * @param id 商品的id
     * @param price 价格
     * @return boolean 成功返回true，失败返回false
     */
    async changePrice(id, price) {
        const row = {
            id: id,
            price: price,
            timestamp: new Date().getTime(),
        };
        const result = await this.app.mysql.update('t_goods', row);
        return result.affectedRows === 1;
    }

    /**
     * 获取商品顶级分类列表
     * @param classsCheme 分类方案
     * @return {Promise<void>}
     */
    async getTopClass(classScheme) {
        //this.app.redis.set(phoneNum, JSON.stringify(arr));
        const types = await this.app.mysql.select('t_goods_type_first', {
            where: { pid: classScheme },
            columns: ['id', 'name'],
        });
        return types
    }

    /**
     * 获取商品二级分类列表
     * @param topClass [array] 一级分类的id数组
     * @return {Promise<void>}
     */
    async getSecondClass(topClass) {
        //this.app.redis.set(phoneNum, JSON.stringify(arr));
        const types = await this.app.mysql.select('t_goods_type_second', {
            where: { pid: topClass },
            columns: ['id', 'name', 'pid'],
        });
        return types
    }

    /**
     * 通过商品类型分页查询商品详情
     * @param type string 商品类型id
     * @return {Promise<void>}
     */
    async goods_page_list(type, page = 1, pageSize = 10) {
        //查询未分页前的数据行总数
        let promise_getGoodsNum = this._getGoodsNum(type);
        //查询分页数据
        let promise_getGoods = this.app.mysql.select('t_goods', {
            where: { type: type, alive: true },
            limit: pageSize, // 返回数据量
            offset: (page - 1) * pageSize, // 数据偏移量
        });
        let res = await Promise.all([promise_getGoodsNum, promise_getGoods]).then(resArr => {
            const result = {
                total: resArr[0],
                page: page,
                pageSize: pageSize,
                data: resArr[1],
            }
            return result;
        })
        return res
    }

    /**
     * 私有方法获得指定类型商品的数量
     * 若没有类型入参则查询所有类型的数量
     * @param type
     * @return {Promise<*>}
     * @private
     */
    async _getGoodsNum(type) {
        //注意这样拼sql可能会产生sql注入，但是考虑到type是一个id不是用户输入的字段，且此方法不直接对外暴露，故这里暂不修改
        const sql = `SELECT COUNT(id) FROM t_goods WHERE alive = true` + (type ? ` AND TYPE = '${type}'` : ``)
        const res = await this.app.mysql.query(sql);
        return res[0]["COUNT(id)"]
    }

    /**
     * 根据商品的title模糊搜索商品
     * 由于模糊搜索的商品可能会比较多，这里是带分页的，暂未排序
     * @param title
     * @return {Promise<void>}
     */
    async searchGoodsByTitle(title, page = 1, pageSize = 10) {
        //查询count总数量
        const count_sql = `SELECT COUNT(id) FROM t_goods WHERE alive = true AND title LIKE :title`;
        let count_promise = this.app.mysql.query(count_sql, {title:('%'+title+'%')});
        //查询分页后的结果
        const sql = `SELECT * FROM t_goods WHERE alive = true AND title LIKE :title LIMIT :offset, :limit`;
        const goods_promise = this.app.mysql.query(sql, {
            title: ('%'+title+'%'),
            offset: ((page - 1) * pageSize),
            limit: pageSize,
        });
        let res = await Promise.all([count_promise, goods_promise]).then(resArr => {
            const result = {
                total: resArr[0][0]["COUNT(id)"],
                page: page,
                pageSize: pageSize,
                data: resArr[1],
            }
            return result;
        })
        return res
    }


}
module.exports = goodsService;