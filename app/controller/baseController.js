'use strict';

const { Controller } = require('egg');

/**
 * BaseController
 * 扩展Controller基类中的方法
 * @class
 * @author chengjiajun
 */
class BaseController extends Controller {
    getUser() {
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

    notFound(msg) {
        msg = msg || 'not found';
        this.ctx.throw(404, msg);
    }
}

module.exports = BaseController;
