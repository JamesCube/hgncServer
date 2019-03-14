'use strict';

const { Controller } = require('egg');

/**
 * BaseController
 * 扩展Controller基类中的方法
 * @class
 * @author chengjiajun
 */
class BaseController extends Controller {
    get user() {
        return this.ctx.session.user;
    }

    success(data, status = 200) {
        this.ctx.status = status;
        this.ctx.body = { status: status, data: data };
    }

    fail(message) {
        this.success(message, 400);
    }

    notFound(msg) {
        msg = msg || 'not found';
        this.ctx.throw(404, msg);
    }
}

module.exports = BaseController;
