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
            limit: page*pageSize - 1, // 返回数据量
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


}
module.exports = UserService;