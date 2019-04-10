'use strict';

const Controller = require('./baseController');

class CartController extends Controller {

    /**
     * 添加商品至购物车
     * @param userId 用户id
     * @param goodsId 商品id
     * @returns {Promise<void>}
     */
    async addCart() {
        const { ctx, service } = this;
        const { userId, goodsId, num, standardId } = ctx.request.body;
        //入参校验
        if(!userId || !goodsId) {
            this.fail("userId and goodsId is required");
            return;
        }
        const res = await service.cart.cartService.addCart(userId, goodsId, num, standardId);
        if (res.affectedRows === 1) {
            this.success("add cart success");
        } else {
            this.fail(res);
        }
    }

    /**
     * 分页查询购物车下的商品
     * @param userId
     * @param page
     * @param pageSize
     * @return {Promise<void>}
     */
    async cartList() {
        const { ctx, service } = this;
        const { userId, page, pageSize } = ctx.request.body;
        if(!userId) {
            this.fail("userId is required");
            return;
        }
        const res = await service.cart.cartService.cartList(userId, page, pageSize);
        this.success(res);
    }

    /**
     * 删除购物车中的某几个商品
     * @param userId 用户id
     * @param ids 购物车数据行的id数组，注意为真删除，当ids为空时，清空用户所有购物车商品
     * @return {Promise<void>}
     */
    async deleteCart() {
        const { ctx, service } = this;
        const { userId, ids } = ctx.request.body;
        //入参校验
        if(!userId) {
            this.fail("userId is required");
            return;
        }
        if(ids && Array.isArray(ids) && ids.length > 0) {
            const res = await service.cart.cartService.deleteCart(userId, ids);
            //必须使用全等于true
            if(res === true) {
                this.success("delete success")
            } else {
                this.fail(res)
            }
            return;
        }
        if(ids === undefined) {
            const res = await service.cart.cartService.clearCart(userId);
            //必须使用全等于true
            if(res === true) {
                this.success("clear success")
            } else {
                this.fail(res)
            }
            return;
        }
        //若参数没有问题上面的2个if语句就已经return了结果，进到下面来肯定说明参数有问题，直接提示goodsIds参数错误
        this.fail("goodsIds type error");
    }



}

module.exports = CartController;
