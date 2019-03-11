'use strict';

/**
 * 用户管理路由模块
 * @author chengjiajun
 * @since 2019/02/22
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
    const { router, controller } = app;
    //注册
    router.post('/api/v1/user/signUp', controller.user.signUp);
    //登录
    router.post('/api/v1/user/login', controller.user.login);
    //发送手机验证码
    router.post('/api/v1/sms/getSms', controller.user.getSms);
    //修改密码
    router.post('/api/v1/user/changePwd', controller.user.changePwd);
};
