'use strict';

const { Controller } = require('egg');

/**
 * BaseController
 * 扩展Controller基类中的方法
 * @class
 * @author chengjiajun
 */
class BaseController extends Controller {
    getSessionUser() {
        return this.ctx.session.user;
    }

    success(data, status = 200) {
        this.ctx.status = status;
        this.ctx.body = { status: status, data: data };
    }

    fail(message) {
        this.success(message, 400);
    }

    /**
     * 用户级日志，记录到数据库中
     * @param type
     * @param executor
     * @param influencer
     * @param description
     * @return {Promise<*>}
     */
    async log(type, executor, influencer, description) {
        const { service } = this;
        const res = await service.base.baseService.log(type, executor, influencer, description);
        return res
    }

    /**
     * 消费相关的日志记录数据
     * 分表记录
     */
    async log_cost(type, executor, influencer, orderId, goodsId, title, price) {
        const _now = new Date().getTime();
        const p = {
            id: this.utils.uuidv1(),
            type,
            executor,
            influencer,
            orderId,
            goodsId,
            title,
            description: price,
            createTime: _now,
        };
        let result;
        try{
            const resp = await this.app.mysql.insert('t_log_cost', p);
            result = resp.affectedRows === 1;
        } catch (e) {
            result = e.sqlMessage
        } finally {
            return result
        }
    }

    /**
     * 普通积分相关的日志记录数据
     * 分表记录
     */
    async log_point(type, executor, influencer, description) {
        const { service } = this;
        const res = await service.base.baseService.log(type, executor, influencer, description, "t_log_point");
        return res
    }

    /**
     * 根据path删除oss对象,删除成功返回true，删除失败返回false
     * 批量接口
     * @return {Promise<void>}
     */
    async oss_paths_delete(pathArr) {
        const { ctx, service } = this;
        const { paths } = ctx.request.body;
        const params = paths || pathArr;
        let result = false;
        if(!params) {
            this.fail('path is required');
            return false;
        }
        const res = await service.common.oss.oss_paths_delete(params);
        if(res.res.status === 200) {
            result = true;
            this.success('delete success');
        }
        return result;
    }

    /**
     * 通过token拿到当前用户的userId
     * 同步方法 不加async
     * @return {string}
     */
    getUserId() {
        const { ctx } = this;
        const tokenUserId = ctx.tokenUser ? ctx.tokenUser.id : '';
        //tokenUserId和可能是用户id，或pc_前缀的用户id,这里兼容转化为用户id
        const userId = tokenUserId.length === 39 ? tokenUserId.substring(3) : tokenUserId;
        return userId;
    }

    notFound(msg) {
        msg = msg || 'not found';
        this.ctx.throw(404, msg);
    }
}

module.exports = BaseController;
