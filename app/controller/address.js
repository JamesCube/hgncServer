'use strict';

const Controller = require('./baseController');

class UserController extends Controller {

    /**
     * 新增收货地址
     * @param phoneNum
     * @param pwd
     * @returns {Promise<void>}
     */
    async addAddress() {
        const { ctx, service } = this;
        const { userId, params } = ctx.request.body;
        if(!userId || !userId.trim()) {
            this.fail("userId is required")
            return;
        }
        let res = await service.address.addressService.addAddress(userId, params);
        //当登录成功时，res为user数据行，当登录失败时，返回false
        if(res === true) {
            this.success("add new address success");
        } else {
            this.fail(res)
        }
    }

    /**
     * 编辑地址信息
     * @returns {Promise<void>}
     */
    async editAddress() {
        const { ctx, service } = this;
        const { id, params } = ctx.request.body;
        if(!id) {
            this.fail("address id is required")
            return;
        }
        const res = await service.address.addressService.editAddressRow(id, params);
        if(res === true) {
            this.success("update address success");
        } else {
            this.fail(res)
        }
    }

    /**
     * 删除地址信息
     * @param id 地址数据行id，非userId
     * @returns {Promise<void>}
     */
    async deleteAddress() {
        const { ctx, service } = this;
        const { id } = ctx.request.body;
        if(!id) {
            this.fail("address id is required")
            return;
        }
        const res = await service.address.addressService.setAlive("t_address", id, false);
        if(res === true) {
            this.success("delete address success");
        } else {
            this.fail(res);
        }
    }

    /**
     * 查询地址列表详情
     * @param userId 用户id
     * @returns {Promise<void>}
     */
    async listAddress() {
        const { ctx, service } = this;
        const { userId } = ctx.request.body;
        if(!userId) {
            this.fail("userId id is required");
            return;
        }
        const rows = await service.address.addressService.listAddressRows(userId);
        this.success(rows)
    }

}

module.exports = UserController;
