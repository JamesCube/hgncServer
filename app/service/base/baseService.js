'use strict';

const Service = require('egg').Service;


class baseService extends Service {
    constructor(ctx) {
        super(ctx); //如果需要在构造函数做一些处理，一定要有这句话，才能保证后面 `this.ctx`的使用。
        // 就可以直接通过 this.ctx 获取 ctx 了
        // 还可以直接通过 this.app 获取 app 了
        this.utils = this.ctx.helper;
    }

    /**
     * 根据id的数组，批量查询指定表名的数据行数据
     * @param ids
     * @returns {Promise<void>}
     */
    async getByIds(tableName, ids) {
        const rows = await this.app.mysql.select(tableName, {
            where: { id: ids },
        });
        return rows;
    }

    /**
     * 更改某张表，某指定主键数据行的alive字段的值
     * @param tableName 表名
     * @param id的值
     * @param alive的值
     * @return boolean 成功返回true，失败返回false
     */
    async setAlive(tableName, id, alive) {
        const row = {
            id: id,
            timestamp: new Date().getTime(),
            alive: !!alive,
        };
        const result = await this.app.mysql.update(tableName, row);
        return result.affectedRows === 1;
    }

    /**
     * 删除表名为tableName下column为val的数据行
     * 注意是真删除要慎用
     * @param tableName 表名
     * @param column 列名
     * @param val 值
     * @return boolean 成功返回true，失败返回具体原因
     */
    async delRows(tableName, column, val) {
        let result;
        try{
            await this.app.mysql.delete('tableName', {
                [column]: val,
            });
            result = true
        } catch (e) {
            result = e.sqlMessage;
        }
        return result;
    }

}
module.exports = baseService;