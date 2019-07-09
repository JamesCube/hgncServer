'use strict';

/**
 * 用户管理路由模块
 * @author chengjiajun
 * @since 2019/02/22
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
    //const { router, controller, jwt } = app;
    const { router, controller } = app;
    //const cus_jwt = app.middleware.cusJwt;
    //刷新token
    router.post('/v1/api/user/refleshToken', controller.user.refleshToken);
    //注册
    router.post('/v1/api/user/signUp', controller.user.signUp);
    //登录
    router.post('/v1/api/user/login', controller.user.login);
    //登出
    router.post('/v1/api/user/logout', controller.user.logout);
    //管理员登录
    router.post('/v1/api/user/adminLogin', controller.user.adminLogin);
    //管理员登出
    router.post('/v1/api/user/adminLogout', controller.user.logout);
    //根据token，返回最新的user信息
    router.post('/v1/api/user/me', controller.user.refleshMe);
    //获取用户详情(批量接口)
    router.post('/v1/api/user/userInfo', controller.user.userInfo);
    //设置用户昵称
    router.post('/v1/api/user/nickname', controller.user.setUserName);
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
    //转移专用积分
    router.post('/v1/api/user/transferGold', controller.user.goldTransfer);
    //查询今日释放积分
    router.post('/v1/api/user/releaseGold', controller.user.getReleaseGold);
    //查询积分/专用积分 历史列表（支持分页）
    router.post('/v1/api/user/pointHistory', controller.user.getPointHistory);
    //根据不同角色，获取我的团队成员列表
    router.post('/v1/api/user/groupMembers', controller.user.getGroupMembers);
    //查询我的团队的成员数量,(经理以上角色，查询自己以下的节点数量)
    router.post('/v1/api/user/myTeamNum', controller.user.getMyTeamNum);
    //查询我的团队的业绩（可查总业绩，和时间范围内的业绩）
    router.post('/v1/api/user/myTeamPerformance', controller.user.getMyTeamPerformance);
    //查询某段时间内新增的团队成员普通积分
    router.post('/v1/api/user/myTeamPoint', controller.user.getMyTeamPoint);
    //查询某段时间内新增的团队成员普通积分
    router.post('/v1/api/user/team/salesDetail', controller.user.salesDetail);
    /** 用户图片服务相关  **/
    //上传我的图片
    router.post('/v1/api/user/images/upload', controller.user.uploadMyImages);
    //查询我的图片(返回图片的相对地址,支持分页)
    router.post('/v1/api/user/images/myImages', controller.user.getMyImages);
    //删除我的图片(批量接口)
    router.post('/v1/api/user/images/delete', controller.user.deleteMyImages);
    //上传我的头像
    router.post('/v1/api/user/images/head', controller.user.uploadUserHead);
    //开店实名认证
    router.post('/v1/api/user/store/apply', controller.user.applyStore);
};
