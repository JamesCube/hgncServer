'use strict';

const Service = require('../base/baseService');


class UserService extends Service {
    constructor(ctx) {
        super(ctx); //如果需要在构造函数做一些处理，一定要有这句话，才能保证后面 `this.ctx`的使用。
        // 就可以直接通过 this.ctx 获取 ctx 了
        // 还可以直接通过 this.app 获取 app 了
        this.utils = this.ctx.helper;
    }

    /**
     * 新建用户,成功返回true，错误返回具体的错误信息
     * @param params
     * @returns {boolean}
     */
    async insertOne(params) {
        const _now = new Date().getTime();
        const p = Object.assign(params, {
            id: this.utils.uuidv1(),
            role: 0,
            inviteCode: this.utils.genInviteCode(),
            createTime: _now,
            timeline: _now + '',
        });
        let result;
        try{
            const resp = await this.app.mysql.insert('t_user', p);
            result = resp.affectedRows === 1;
        } catch (e) {
            result = e.sqlMessage;
            //如果邀请码重复会返回  Duplicate entry 'cUXXgJ' for key 't_user_inviteCode_uindex'
            if(e.errno === 1062 && result.indexOf('t_user_inviteCode_uindex') !== -1) {
                this.log('insertOne','system','system',`自动生成的邀请码重复:${p.inviteCode}`);
                //换一个邀请码重新插入（递归）
                result = await this.insertOne(params);
            }
        } finally {
            return result
        }
    }

    /**
     * 根据手机号,查询用户
     * @param phoneNum
     */
    findOneByPhone(phoneNum) {
        const row = this.app.mysql.get('t_user', { phone: phoneNum, alive: true });
        return row;
    }

    /**
     * 手机号方式登录时，校验手机和密码是否匹配
     * @param phoneNum
     * @param pwd
     * @returns 登录成功返回user数据行，失败返回false
     */
    async validLogin(phoneNum, pwd) {
        let result = false;
        const row = await this.findOneByPhone(phoneNum);
        if(row && (row.pwd === pwd) && row.alive) {
            result = row;
        }
        return result;
    }

    /**
     * 管理员后台页面登录
     * @tips 在user表中后台管理员和普通用户的区别在于普通用户的登录名只能为手机号，而管理员可为任意字符串，且管理员的createTime毫秒数为0
     * @param name
     * @param pwd
     * @returns 登录成功返回adminUser数据行，失败返回false
     */
    async validAdminLogin(name, pwd) {
        let result = false;
        const row = await this.app.mysql.get('t_user', { phone: name, alive: true, storeOwner: true});
        if(row && (row.pwd === pwd)) {
            result = row;
        }
        return result;
    }

    /**
     * 更改密码
     * 更改成功返回true，失败返回具体原因字符串
     * @param phoneNum
     * @param pwd
     */
    async changePwd(phoneNum, pwd) {
        /*let result = await this.app.mysql.query(
            'UPDATE `t_user` SET pwd = ? WHERE phoneNum = ?',
            [pwd, phoneNum]
        )*/
        const row = {pwd: pwd};
        const options = {
            where: {
                //t_user表的手机号字段为phone而不是phoneNum
                phone: phoneNum,
            },
        };
        let result;
        try {
            let res = await this.app.mysql.update('t_user', row, options);
            result = (res && (res.affectedRows === 1)) ? true : '无此手机号用户'
        } catch (e) {
            result = e.sqlMessage
        } finally {
            return result;
        }
    }

    /**
     * 校验邀请码是否是已经存在的邀请码，防止用户随便填邀请码
     * 存在返回true，不存在返回false
     * @param code
     * @return {Promise<void>}
     */
    async validInviteCode(code) {
        if(!code.trim()) return false;
        const row = await this.app.mysql.get('t_user', { inviteCode: code });
        return !!row;
    }

    /**
     * 修改用户绑定的手机号,成功返回true，失败返回具体错误信息
     * @param userId
     * @param phoneNum
     * @return {Promise<*>}
     */
    async change_bind_phone(userId, phoneNum) {
        const row = {phone: phoneNum};
        const options = {
            where: {
                id: userId,
            },
        };
        let result;
        try {
            let res = await this.app.mysql.update('t_user', row, options);
            result = res.affectedRows === 1;
        } catch (e) {
            result = e.sqlMessage
        } finally {
            return result;
        }
    }

    /**
     * 修改用户二级密码(直接修改)
     * 操作成功返回true，失败返回false或报错原因
     * @return {Promise<void>}
     */
    async updateSecondaryPwd(userId, pwd) {
        const row = {
            id: userId,
            secondaryPwd: pwd,
            timeLine: new Date().getTime(),
        };
        let result;
        try {
            const res = await this.app.mysql.update('t_user', row);
            result = (res.affectedRows === 1);
        } catch (e) {
            result = e.sqlMessage
        } finally {
            return result;
        }
    }

    /**
     * 修改用户二级密码(需要校验原二级密码)
     * 修改成功返回true，修改失败返回false或具体错误原因
     * @param userId
     * @param oldPwd
     * @param newPwd
     * @return {Promise<*>}
     */
    async change_secondary_pwd(userId, oldPwd, newPwd) {
        //验证旧密码是否正确
        const validFlag = await this.valid_secondary_pwd(userId, oldPwd);
        if(!validFlag) {
            return '原二级密码校验失败'
        }
        let result = await this.updateSecondaryPwd(userId, newPwd);
        return result;
    }

    /**
     * 校验二级密码，校验成功返回true，失败返回false
     * @param userId
     * @param pwd
     * @return {Promise<string>}
     */
    async valid_secondary_pwd(userId, pwd) {
        let result = false;
        const row = await this._getUserById(userId);
        if(row && (row.secondaryPwd === pwd)) {
            result = true;
        }
        return result;
    }

    /**
     * 根据id获取user数据行
     * @param val 默认为userId
     * @return {Promise<*>}
     * @private
     */
    async _getUserById(val, key = 'id') {
        const row = await this.app.mysql.get('t_user', { [key]: val, alive: true });
        return row;
    }

    /**
     * 在原来的基础上增量更新用户积分
     * @param userId 用户id
     * @param comPoint 需要增加的积分，减也行（传负数就是减）
     * 更新成功返回true，无此用户数据行返回false，报错返回具体报错信息
     */
    async incremental_update_comPoint(userId, comPoint = 0) {
        const row = this._getUserById(userId);
        let result = false;
        //原积分，用于日志记录的变量
        let beforePoint = row.comPoint;
        if(row) {
            const newPoint =  row.comPoint + comPoint;
            const params = {
                id: row.id,
                comPoint: newPoint,
            }
            if(row.role === this.utils.USER_ROLE.COMMON) {
                //没有升级为VIP之前消费产生的积分给自己的推荐人
                const parentRow = this._getUserById(row.parentCode, 'inviteCode');
                beforePoint = parentRow.comPoint;
                params.id = parentRow.id;
                params.comPoint = parentRow.comPoint + comPoint;
            }
            result = this.updateRow('t_user', params);
            if(result === true) {
                //记录日志信息,记录了积分变更详情
                this.log('incremental_update_comPoint', row.id, params.id, `${beforePoint}=>${params.comPoint}`);
            }
        }
        return result;
    }

    /**
     * 在原来的基础上增量更新用户消费额
     * @param userId
     * @param comPoint 需要增加的消费额
     * 更新成功返回true，无此用户数据行返回false，报错返回具体报错信息
     */
    async incremental_update_cost(userId, cost = 0) {
        const row = this._getUserById(userId);
        let result = false;
        let newCost = 0;
        if(row) {
            newCost =  row.cost + cost;
            const params = {
                id: row.id,
                cost: newCost,
            }
            //判断用户角色看是否需要根据总消费额更新用户角色
            if(row.role === this.utils.Enum.USER_ROLE.COMMON) {
                //如果是普通会员且，且消费额大于额度阈值，提升会员为VIP角色
                const vip_threshold = this.utils.getProperty("VIP_THRESHOLD") || 0;
                if(newCost > vip_threshold) {
                    params.role = this.utils.Enum.USER_ROLE.VIP;
                }
            }
            result = this.updateRow('t_user', params);
        }
        return result;
    }

    /**
     * 转出专用积分给别人
     * @param fromUser
     * @param toUser
     * @param count
     * @return {Promise<boolean>}
     */
    async gold_transfer(fromUser, toUser, count) {
        let result = true;
        // 初始化手动事务操作
        const conn = await this.app.mysql.beginTransaction();
        try{
            const res1 = await conn.update('t_user', { id: fromUser.id, gold: (fromUser.gold - count) });
            const res2 = await conn.update('t_user', { id: toUser.id, gold: (toUser.gold + count) });
            if(res1.affectedRows === 1 && res2.affectedRows === 1) {
                //提交事务
                await conn.commit();
            }
        } catch (e) {
            //发生异常回滚事务操作
            await conn.rollback();
            result = e.sqlMessage
        } finally {
            if(result === true) {
                //记录业务日志行
                this.log('goldTransfer', toUser.id, fromUser.id, `${fromUser.gold}=>${fromUser.gold - count}`);
                this.log('goldTransfer', fromUser.id, toUser.id, `${toUser.gold}=>${toUser.gold + count}`);
            }
            return result
        }
    }

    /**
     * 获得当天的专用积分转化数量
     * @param userId
     * @return {Promise<{status: boolean, msg: string}>}
     */
    async getReleaseGoldToday(userId) {
        let today = new Date();
        today.setHours(0);
        today.setMinutes(0);
        today.setSeconds(0);
        today.setMilliseconds(0);
        const fromTime = today.getTime();
        today.setHours(24);
        const toTime = today.getTime();
        //已服务器时间为准计算今天专用积分的释放情况
        const sql = `SELECT description FROM t_log WHERE type = 'auto_dumpRate_calc' AND influencer = '${userId}' and createTime BETWEEN ${fromTime} and ${toTime}`;
        const result = {
            status: true,
            msg:'0'
        };
        try {
            const resArr = await this.app.mysql.query(sql);
            if(resArr.length > 0) {
                result.status = true;
                result.msg = ((resArr[0].description).split(':')[1]);
            }
        } catch (e) {
            result.status = false;
            result.msg = e.sqlMessage;
        } finally {
            return result;
        }
    }

    /**
     * 查询积分/专用积分 历史列表（支持分页）
     * @return {Promise<void>}
     */
    async point_page_list(isCom = true, page = 1, pageSize = 10, userId, start, end, orderBy = [['createTime','desc']]) {
        //查询总条数
        let promise_getPointNum = this._getPointNum(isCom, userId, start, end);
        //查询分页数据
        let _orderBy = '';
        orderBy.forEach(function (v, i) {
            _orderBy += ((i===0 ? '' : ',') + v.join(' '))
        })
        const sql = isCom ? `SELECT * FROM t_log WHERE influencer = :userId AND type in ('incremental_update_comPoint') AND createTime BETWEEN :startTime and :endTime ORDER BY ${_orderBy} LIMIT :offset, :limit` :
            `SELECT * FROM t_log WHERE influencer = :userId AND type in ('auto_dumpRate_calc', 'goldTransfer') AND createTime BETWEEN :startTime and :endTime ORDER BY ${_orderBy} LIMIT :offset, :limit`
        let promise_getPoint = this.app.mysql.query(sql, {
            startTime: start,
            endTime: end,
            offset: ((page - 1) * pageSize),
            limit: pageSize,
            userId: userId,
        });
        let res = await Promise.all([promise_getPointNum, promise_getPoint]).then(resArr => {
            const result = {
                total: resArr[0],
                page: page,
                pageSize: pageSize,
                data: resArr[1],
            }
            return result;
        })
        return res
    }

    /**
     * 获得不分页情况下的积分历史数据行总数
     * @return {Promise<*>}
     * @private
     */
    async _getPointNum(isCom = true, userId , start, end) {
        const sql = isCom ?
            `SELECT COUNT(id) FROM t_log WHERE influencer=:userId AND type in ('incremental_update_comPoint') AND createTime BETWEEN :startTime and :endTime` :
            `SELECT COUNT(id) FROM t_log WHERE influencer=:userId AND type in ('auto_dumpRate_calc', 'goldTransfer') AND createTime BETWEEN :startTime and :endTime`
        const res = await this.app.mysql.query(sql, {
            startTime: start,
            endTime: end,
            userId: userId,
        });
        return res[0]["COUNT(id)"]
    }

}
module.exports = UserService;