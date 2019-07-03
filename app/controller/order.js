'use strict';

const Controller = require('./baseController');

class OrderController extends Controller {

    /**
     * 新增商品订单
     * @param userId 用户id
     * @param goods 商品详情，是一个数组批量接口
     * @returns {Promise<void>}
     */
    async createOrder() {
        const { ctx, service } = this;
        const { addressId, goods } = ctx.request.body;
        if(!addressId) {
            this.fail("addressId is required");
            return;
        }
        let userId = this.getUserId();
        const res = await service.order.orderService.orderCreate(userId, addressId, goods);
        if (res.res === true) {
            //当res为true时，msg为orderId
            const orderId = res.msg;
            const totalPrice = res.totalPrice;
            const sign = service.common.alipay.pay('鹏鱼商城', orderId, totalPrice);
            this.success({
                orderId: orderId,
                secret: sign
            });
        } else {
            this.fail(res.msg);
        }
    }

    /**
     * 分页查询订单详情
     * @param userId
     * @param page
     * @param pageSize
     * @return {Promise<void>}
     */
    async orderList() {
        const { ctx, service } = this;
        const { userId, status, page, pageSize, orderBy } = ctx.request.body;
        if(!userId) {
            this.fail("userId is required");
            return;
        }
        const res = await service.order.orderService.listOrder(userId, status, page, pageSize, orderBy);
        this.success(res);
    }

    /**
     * 删除订单（敏感操作，不支持批量操作）
     * @param id 用户id
     * @return {Promise<void>}
     */
    async deleteOrders() {
        const { ctx, service } = this;
        const { id, goodsId, detail } = ctx.request.body;
        //入参校验
        if(!id) {
            this.fail("order id is required");
            return;
        }
        const res = await service.order.orderService.orderDelete(id, goodsId, detail);
        if(isNaN(res)) {
            this.fail(res);
        } else {
            this.success(`affected ${res} rows`)
        }
    }

    /**
     * 支付成功后的回调，用来变更订单状态
     * @param orderId 订单id
     * @return {Promise<void>}
     */
    async paySuccess() {
        const { ctx, service } = this;
        const { helper } = ctx;
        const { orderId, payment } = ctx.request.body;
        if(!orderId) {
            this.fail("order id is required");
            return;
        }
        //订单状态校验，只有待支付状态下支付成功才可以更改订单状态为已支付
        const validStatus = await service.order.orderService.checkOrderStatus(orderId, helper.Enum.ORDER_STATUS.WAIT_PAY);
        if(validStatus) {
            const res = await service.order.orderService.changeOrderStatus(orderId, helper.Enum.ORDER_STATUS.ALREADY_PAY, payment);
            if(res === true) {
                this.success('operation success');
            } else {
                this.fail(res);
            }
        } else {
            this.fail("当前订单状态校验失败,仅待支付状态才可变更为支付成功状态");
        }
    }

    /**
     * 支付成功后的回调，用来变更订单状态
     * @param orderId 订单id
     * @return {Promise<void>}
     */
    async payResult() {
        const { ctx, service } = this;
        const { helper } = ctx;
        const res = ctx.request;
        // const notifyTime = res.body.notify_time;//通知时间:通知的发送时间。格式为yyyy-MM-dd HH:mm:ss
        // const notifyType = res.body.notify_type;//通知类型:通知的类型
        // const notifyId = res.body.notify_id;//通知校验ID:通知校验ID
        // const appId = res.body.app_id;//支付宝分配给开发者的应用Id:支付宝分配给开发者的应用Id
        // const charset = res.body.charset;//编码格式:编码格式，如utf-8、gbk、gb2312等
        // const version = res.body.version;//接口版本:调用的接口版本，固定为：1.0
        // const signType = res.body.sign_type;//签名类型:商户生成签名字符串所使用的签名算法类型，目前支持RSA2和RSA，推荐使用RSA2
        // const sign = res.body.sign;//签名:请参考<a href="#yanqian" class="bi-link">异步返回结果的验签</a>
        // const tradeNo = res.body.trade_no;//支付宝交易号:支付宝交易凭证号
        const outTradeNo = res.body.out_trade_no;//商户订单号:原支付请求的商户订单号
        // const outBizNo = res.body.out_biz_no;//商户业务号:商户业务ID，主要是退款通知中返回退款申请的流水号
        // const buyerId = res.body.buyer_id;//买家支付宝用户号:买家支付宝账号对应的支付宝唯一用户号。以2088开头的纯16位数字
        // const buyerLogonId = res.body.buyer_logon_id;//买家支付宝账号:买家支付宝账号
        // const sellerId = res.body.seller_id;//卖家支付宝用户号:卖家支付宝用户号
        // const sellerEmail = res.body.seller_email;//卖家支付宝账号:卖家支付宝账号
        const tradeStatus = res.body.trade_status;//交易状态:交易目前所处的状态，见<a href="#jiaoyi" class="bi-link">交易状态说明</a>
        // const totalAmount = res.body.total_amount;//订单金额:本次交易支付的订单金额，单位为人民币（元）
        // const receiptAmount = res.body.receipt_amount;//实收金额:商家在交易中实际收到的款项，单位为元
        // const invoiceAmount = res.body.invoice_amount;//开票金额:用户在交易中支付的可开发票的金额
        // const buyerPayAmount = res.body.buyer_pay_amount;//付款金额:用户在交易中支付的金额
        // const pointAmount = res.body.point_amount;//集分宝金额:使用集分宝支付的金额
        // const refundFee = res.body.refund_fee;//总退款金额:退款通知中，返回总退款金额，单位为元，支持两位小数
        // const subject = res.body.subject;//订单标题:商品的标题/交易标题/订单标题/订单关键字等，是请求时对应的参数，原样通知回来
        // const body = res.body.body;//商品描述:该订单的备注、描述、明细等。对应请求时的body参数，原样通知回来
        // const gmtCreate = res.body.gmt_create;//交易创建时间:该笔交易创建的时间。格式为yyyy-MM-dd HH:mm:ss
        // const gmtPayment = res.body.gmt_payment;//交易付款时间:该笔交易的买家付款时间。格式为yyyy-MM-dd HH:mm:ss
        // const gmtRefund = res.body.gmt_refund;//交易退款时间:该笔交易的退款时间。格式为yyyy-MM-dd HH:mm:ss.S
        // const gmtClose = res.body.gmt_close;//交易结束时间:该笔交易结束时间。格式为yyyy-MM-dd HH:mm:ss
        // const fundBillList = res.body.fund_bill_list;//支付金额信息:支付成功的各个渠道金额信息，详见<a href="#zijin" class="bi-link">资金明细信息说明</a>
        // const passbackParams = res.body.passback_params;//回传参数:公共回传参数，如果请求时传递了该参数，则返回给商户时会在异步通知时将该参数原样返回。本参数必须进行UrlEncode之后才可以发送给支付宝
        // const voucherDetailList = res.body.voucher_detail_list;//优惠券信息:本交易支付时所使用的所有优惠券信息，详见<a href="#youhui" class="bi-link">优惠券信息说明</a>
        const isSuccess = service.common.alipay.verifySign(res.body);
        if (isSuccess) {
            if (tradeStatus === 'TRADE_FINISHED' || tradeStatus === 'TRADE_SUCCESS') {
                //交易状态TRADE_FINISHED的通知触发条件是商户签约的产品不支持退款功能的前提下，买家付款成功；或者，商户签约的产品支持退款功能的前提下，交易已经成功并且已经超过可退款期限。
                //交易状态TRADE_SUCCESS的通知触发条件是商户签约的产品支持退款功能的前提下，买家付款成功
                const orderId = outTradeNo;
                const validStatus = await service.order.orderService.checkOrderStatus(orderId, helper.Enum.ORDER_STATUS.WAIT_PAY);
                if(validStatus) {
                    const res = await service.order.orderService.changeOrderStatus(orderId, helper.Enum.ORDER_STATUS.ALREADY_PAY, 'alipay');
                    if(res === true) {
                        this.success('operation success');
                    } else {
                        this.fail(res);
                    }
                }
            } else if (tradeStatus === 'WAIT_BUYER_PAY') {

            } else if (tradeStatus === 'TRADE_CLOSED') {

            }
            ctx.response.send('success');
        } else {
            ctx.response.send('fail');
        }
    }

    /**
     * 订单确认收货，订单状态变更为done
     * @param orderId
     * @return {Promise<void>}
     */
    async received() {
        const { ctx, service } = this;
        const { helper } = ctx;
        const { orderId } = ctx.request.body;
        if(!orderId) {
            this.fail("order id is required");
            return;
        }
        const orders = await service.order.orderService.getByIds("t_order", orderId);
        let current_order_status;
        let current_order_userId;
        if(orders && Array.isArray(orders) && orders.length > 0) {
            current_order_status = orders[0].status;
            current_order_userId = orders[0].userId;
        } else {
            this.fail('订单信息查询失败');
            return;
        }
        //订单状态校验，只有已发货待收货状态时才可以更改订单状态为已收货
        //const validStatus = await service.order.orderService.checkOrderStatus(orderId, helper.Enum.ORDER_STATUS.HAS_DELIVER);
        if(current_order_status === helper.Enum.ORDER_STATUS.HAS_DELIVER) {
            const res = await service.order.orderService.changeOrderStatus(orderId, helper.Enum.ORDER_STATUS.DONE);
            if(res === true) {
                this.success('operation success');
                //确认收货后需要计算积分详情
                //获得当前订单产生的积分
                let point = 0;
                if(orders.length > 0) {
                    const default_rate = helper.getProperty("DEFAULT_GOODS_POINTRATE");
                    for(let order of orders) {
                        point += (order.price * (order.pointRate ===0 ? default_rate : order.pointRate));
                    }
                    //积分可能算出来小数需要四舍五入取整
                    point = Math.round(point);
                }
                if(point !== 0) {
                    //增量更新积分信息(不一定是更新自己的积分，为普通用户时更新推荐人积分)
                    const updateComPoint = service.user.userService.incremental_update_comPoint(current_order_userId, point);
                    if(updateComPoint === true) {
                        //记录日志
                        this.log_point("user_comPoint_add", current_order_userId, current_order_userId, point);
                    }
                }
                //增量更新用户总消费额(当普通会员消费总额大于vip阈值的时候会自动提升为vip角色)
                if(order.price > 0) {
                    const updateCost = await service.user.userService.incremental_update_cost(current_order_userId, order.price);
                    if(updateCost === true) {
                        //记录日志
                        this.log_cost("user_consumption_add", current_order_userId, current_order_userId, order.price);
                    }
                    //计算该订单的佣金分成
                    await service.order.orderService.commissionClear(current_order_userId, order.price);
                }
            } else {
                this.fail(res);
            }
        } else {
            this.fail("当前订单状态校验失败,仅已发货待收货状态时才可以更改订单状态为已收货");
        }
    }

    /**
     * 根据订单ids数组批量查询订单详情
     * @params ids 订单id的数组
     * @return {Promise<void>}
     */
    async getOrdersByIds() {
        const { ctx, service } = this;
        const { ids } = ctx.request.body;
        if(!ids || !Array.isArray(ids) || ids.length === 0) {
            this.fail("ids is required");
            return;
        }
        const rows = await service.user.userService.getByIds('t_order', ids);
        if(rows > 0) {
            for(let row of rows) {
                if(row.status === helper.Enum.ORDER_STATUS.WAIT_PAY) {
                    //如果订单状态是待支付，需要返回前台剩余时间，前台判断是否订单超时未支付
                    row.remainTime = new Date().getTime() - row.createTime
                }
            }
        }
        this.success(rows);
    }
}

module.exports = OrderController;
