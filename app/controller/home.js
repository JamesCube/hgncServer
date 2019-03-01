'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    ctx.body = 'hi, egg';
  }
  async isOnline() {
    const { ctx } = this;
    var a = ctx.helper.getProperty('REDIS_HOST');
      var b = ctx.helper.getProperty('REDIS_PASSWORD');
    ctx.body = `online ${a} ${b}`;
  }
  async getP() {
    const { ctx } = this;
    ctx.helper.getProperty('a');
    ctx.body = 'online';
  }
}

module.exports = HomeController;
