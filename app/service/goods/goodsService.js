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
     * 新建商品,成功返回true，错误返回具体的错误信息
     * 需要接受参数type，description,price,imageUrl,detail
     * @param params
     * @returns {boolean}
     */
    async create(params) {
        const _now = new Date().getTime();
        if(!params.id)  params.id = this.utils.genSnowId(3);
        const p = Object.assign(params, {
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
    async goods_page_list(options, page = 1, pageSize = 10, orderBy = [['createTime','desc']]) {
        //查询未分页前的数据行总数,若没有type入参则查询所有商品类型
        let promise_getGoodsNum = this._getGoodsNum(options.type);
        //查询分页数据
        let promise_getGoods = this.app.mysql.select('t_goods', {
            where: options,
            limit: pageSize, // 返回数据量
            orders: orderBy,
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
    async searchGoodsByTitle(title, page = 1, pageSize = 10, orderBy = [['createTime','desc']]) {
        //查询count总数量
        const count_sql = `SELECT COUNT(id) FROM t_goods WHERE alive = true AND title LIKE :title`;
        let count_promise = this.app.mysql.query(count_sql, {title:('%'+title+'%')});
        //查询分页后的结果
        const sql = `SELECT * FROM t_goods WHERE alive = true AND title LIKE :title order by ${orderBy[0][0] +' '+ orderBy[0][1]} LIMIT :offset, :limit`;
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

    /**
     * 根据用户id和区域id查询用户推荐商品列表
     * @param userId
     * @param areaId
     * @param num
     * @return {Promise<void>}
     */
    async recommendGoods(userId, areaId = 'default', num = 4) {
        const arr = this.utils.getProperty("DEFAULT_GOODS_RECOMMEND");
        //数组切片，返回取前num个数组元素的新数组
        const ids = arr.slice(0, num);
        const res = this.getByIds('t_goods', ids);
        return res;
    }

    /**
     * 新增商品规格（批量接口）,成功返回true，失败返回错误信息
     * pc后台管理接口
     * @param goodsId
     * @param items
     * @return {Promise<void>}
     */
    async standard_add(goodsId, items) {
        const length = items.length;
        const _now = new Date().getTime();
        let arr = items.map(item => {
            item.id = this.utils.genSnowId(2);
            item.goodsId = goodsId;
            item.createTime = _now;
            item.timestamp = _now;
            return item;
        });
        let result;
        try{
            const resp = await this.app.mysql.insert('t_goods_standard', arr);
            result = resp.affectedRows === length;
        } catch (e) {
            switch (e.errno) {
                case 1452:
                    result = 'goodsId校验失败';
                    break;
                case 1062:
                    result = '该商品类别已存在';
                    break;
                default:
                    result = e.sqlMessage
            }
        } finally {
            return result
        }
    }

    /**
     * 更改商品规格，（更改价格，库存，title等）
     * update操作成功返回true，失败返回错误信息
     * @param id
     * @param params
     * @return {Promise<void>}
     */
    async standard_update(standardId, params) {
        const row = Object.assign(params, {
            id: standardId,
            timestamp: new Date().getTime(),
        })
        let result;
        try {
            const res = await this.app.mysql.update('t_goods_standard', row);
            result = (res.affectedRows === 1);
        } catch (e) {
            result = e.sqlMessage
        } finally {
            return result;
        }
    }

    /**
     * 根据商品id，查询商品规格
     * @param goodsId 商品id
     * @return {Promise<void>}
     */
    async getStandards(goodsId) {
        const rows = await this.app.mysql.select('t_goods_standard', {
            where: { goodsId: goodsId, alive: true },
            columns: ['id', 'title', 'price', 'inventory', 'imageUrl','createTime'],
        });
        return rows;
    }
}
module.exports = goodsService;