'use strict';
const _ = require('lodash');

module.exports = {
    _,
    passport:{
        serializeUser:(async(ctx, user) => {
            return user;
            // ctx.session.passport.user 也就是 ctx.user
            // 如果没有 'return user', ctx.user 就是 undefined
        }),
        deserializeUser:(async (ctx, user) => {
            // 处理 user
            // ...
            return user;
        }),
    },
    /*sessionStore:{
        /!**
         * 从redis中获得对象
         * @param key
         * @returns {Promise<*>}
         *!/
        async get(key) {
            const res = await this.redis.get(key);
            if (!res) return null;
            return JSON.parse(res);
        },

        /!**
         * 放对象到redis中
         * @param key
         * @param value
         * @param maxAge
         * @returns {Promise<void>}
         *!/
        async set(key, value, maxAge = 24) {
            //当maxAge入参没有指定时，默认为24小时超时
            const milliseconds_age = maxAge * 60 * 60 * 1000;
            value = JSON.stringify(value);
            await this.redis.set(key, value, 'PX', milliseconds_age);
        },

        /!**
         * 清空redis中指定key对应的数据
         * @param key
         * @returns {Promise<void>}
         *!/
        async destroy(key) {
            await this.redis.del(key);
        },
    }*/
}
