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
     * @Deprecated 过时方法 不推荐使用
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
     * 根据id的数组，批量查询指定表名的数据行数据
     * @param ids
     * @returns {Promise<void>}
     */
    async getRows(tableName, ids, key="id", columns = undefined) {
        const rows = await this.app.mysql.select(tableName, {
            where: { [key]: ids },
            columns: columns,
        });
        return rows;
    }

    /**
     * 根据表id更新数据行,update成功返回true错误返回具体错误信息
     * @param tableName
     * @param row
     * @return {Promise<*|boolean>}
     */
    async updateRow(tableName, row) {
        row.timestamp = new Date().getTime();
        let result = true;
        try {
            const res = await this.app.mysql.update(tableName, row);
            result = res.affectedRows === 1;
        } catch (e) {
            result = e.sqlMessage;
        } finally {
            return result
        }
    }

    /**
     * 根据表id更新数据行,update成功返回true错误返回具体错误信息
     * @param tableName
     * @param rows {array} 必须是一个数组
     * @return {Promise<*|boolean>}
     */
    async updateRows(tableName, rows) {
        //rows.timestamp = new Date().getTime();
        let result = true;
        try {
            const res = await this.app.mysql.updateRows(tableName, rows);
            result = res.affectedRows === rows.length;
        } catch (e) {
            result = e.sqlMessage;
        } finally {
            return result
        }
    }

    /**
     * 更改某张表，某指定主键数据行的alive字段的值
     * @param tableName 表名
     * @param id的值,或ids数组array
     * @param alive的值
     * @return boolean sql执行成功返回true，失败返回错误信息
     */
    async setAlive(tableName, ids, alive) {
        const options = {
            where: {
                id: ids,
            },
        };
        const row = {
            timestamp: new Date().getTime(),
            alive: !!alive,
        };
        let result = true;
        try {
            result = await this.app.mysql.update(tableName, row, options);
        } catch (e) {
            result = e.sqlMessage;
        } finally {
            return result
        }
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
            await this.app.mysql.delete(tableName, {
                [column]: val,
            });
            result = true
        } catch (e) {
            result = e.sqlMessage;
        }
        return result;
    }

    /**
     * 记录操作日志到数据库表里，相较于记录系统级日志到txt文件里，记录用户操作级的日志到表里，更方便查询
     * 插入日志数据成功返回true，失败返回false或具体错误信息
     * @param type
     * @param executor
     * @param influencer
     * @param description
     * @return {Promise<*>}
     */
    async log(type, executor, influencer, description, tableName = "t_log") {
        const _now = new Date().getTime();
        const p = {
            id: this.utils.uuidv1(),
            type: type,
            executor: executor,
            influencer: influencer,
            description: description,
            createTime: _now,
        };
        let result;
        try{
            const resp = await this.app.mysql.insert(tableName, p);
            result = resp.affectedRows === 1;
        } catch (e) {
            result = e.sqlMessage
        } finally {
            return result
        }
    }

    /**
     * 数据库中记录用户上传的图片
     * @param userId
     * @param path
     * @param type
     * @return {Promise<*>}
     */
    async image_add(userId, path, type = "") {
        const _now = new Date().getTime();
        const p = {
            id: this.utils.uuidv1(),
            userId: userId,
            path: path,
            type: type,
            createTime: _now,
        };
        let result;
        try{
            const resp = await this.app.mysql.insert("t_images", p);
            result = resp.affectedRows === 1;
        } catch (e) {
            result = e.sqlMessage
        } finally {
            return result
        }
    }

    /**
     * 消费相关的日志记录数据
     * 分表记录
     */
    async log_cost(type, executor, influencer, description) {
        return await this.log(type, executor, influencer, description, "t_log_cost")
    }

    /**
     * 普通积分相关的日志记录数据
     * 分表记录
     */
    async log_cost(type, executor, influencer, description) {
        return await this.log(type, executor, influencer, description, "t_log_point")
    }

}
module.exports = baseService;