'use strict';

const Subscription = require('egg').Subscription;

class DumpPoint extends Subscription {
    // 通过 schedule 属性来设置定时任务的执行间隔等配置
    static get schedule() {
        return {
            //corn 规则参考自 https://www.cnblogs.com/junrong624/p/4239517.html
            // 每天凌晨3点执行
            cron: '0 0 3 * * ?',
            // 每隔30秒执行
            //cron: '*/30 * * * * ?',
            type: 'worker',
        };
    }

    // subscribe 是真正定时任务执行时被运行的函数
    async subscribe() {
        const default_dumpRate = this.ctx.helper.getProperty('DEFAULT_POINT_DUMPRATE');
        //调用存储过程
        const sql = `CALL cus_dump_point(:rate)`;
        try {
            await this.ctx.app.mysql.query(sql, {
                rate: default_dumpRate,
            });
        } catch (e) {
            this.ctx.logger.error(new Error(e));
        }
    }
}

module.exports = DumpPoint;
