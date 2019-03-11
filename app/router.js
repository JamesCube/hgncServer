'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
    const { router, controller } = app;
    router.get('/', controller.home.index);
    router.get('/api/v1/isOnline', controller.home.isOnline);
    //user路由
    require('./router/user')(app);
};
