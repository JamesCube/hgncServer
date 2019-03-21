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
    router.post('/v1/api/user/signUp', controller.user.signUp);
    //登录
    router.post('/v1/api/user/login', controller.user.login);
    //管理员登录
    router.post('/v1/api/user/adminLogin', controller.user.adminLogin);
    //发送手机验证码
    router.post('/v1/api/sms/sendSms', controller.user.getSms);
    //修改密码
    router.post('/v1/api/user/changePwd', controller.user.changePwd);
};
