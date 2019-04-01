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
    //忘记密码
    router.post('/v1/api/user/forgetPwd', controller.user.forgetPwd);
    //修改用户绑定的手机号
    router.post('/v1/api/user/changeBindPhone', controller.user.changePhone);
    //设置二级密码
    router.post('/v1/api/user/setSecondaryPwd', controller.user.setSecondaryPwd);
    //修改二级密码（需要输入原二级密码）
    router.post('/v1/api/user/changeSecondaryPwd', controller.user.changeSecondaryPwd);
    //忘记二级密码（需要校验短信验证码）
    router.post('/v1/api/user/forgetSecondaryPwd', controller.user.forgetSecondaryPwd);
    //校验二级密码
    router.post('/v1/api/user/validSecondaryPwd', controller.user.validSecondaryPwd);
};
