'use strict';

const Service = require('../base/baseService');
const AlipaySdk = require('alipay-sdk').default;
const path = require('path');
var moment = require('moment');
const fs = require('fs');
const crypto = require('crypto');
let ALIPAY_CONFIG = {
    APP_ID: '2019061665632155',
    // APP_GATEWAY_URL: 'http://wooo.tech:7001/v1/api/order/payResult',//用于接收支付宝异步通知
    APP_GATEWAY_URL: 'http://server.maiyidesan.cn/v1/api/order/payResult',//用于接收支付宝异步通知
    AUTH_REDIRECT_URL: 'xxxxxxx',//第三方授权或用户信息授权后回调地址。授权链接中配置的redirect_uri的值必须与此值保持一致。
    APP_PRIVATE_KEY_PATH: path.join(__dirname, './app-private-key.pem'),//应用私钥
    //APP_PUBLIC_KEY_PATH: path.join(__dirname, 'pem', 'remind', 'sandbox', 'app-public.pem'),//应用公钥
    ALI_PUBLIC_KEY_PATH: path.join(__dirname, './ali-public-key.pem'),//阿里公钥
};
const alipaySdk = new AlipaySdk({
    appId: '2019061665632155',// 鹏鱼
    privateKey: fs.readFileSync(path.join(__dirname, './app-private-key.pem'), 'ascii'),
    alipayPublicKey: fs.readFileSync(ALIPAY_CONFIG.ALI_PUBLIC_KEY_PATH, 'utf8'),
});

class alipayService extends Service {
    constructor(ctx) {
        super(ctx); //如果需要在构造函数做一些处理，一定要有这句话，才能保证后面 `this.ctx`的使用。
        // 就可以直接通过 this.ctx 获取 ctx 了
        // 还可以直接通过 this.app 获取 app 了
        this.utils = this.ctx.helper;
        this.app_private_key = fs.readFileSync(ALIPAY_CONFIG.APP_PRIVATE_KEY_PATH, 'utf8');
        this.ali_public_key = fs.readFileSync(ALIPAY_CONFIG.ALI_PUBLIC_KEY_PATH, 'utf8');
    }

    pay(title, no, amount) {
        let params = new Map();
        params.set('app_id', '2019061665632155');
        params.set('method', 'alipay.trade.app.pay');
        params.set('charset', 'utf-8');
        params.set('sign_type', 'RSA2');
        params.set('timestamp', moment().format('YYYY-MM-DD HH:mm:ss'));
        params.set('version', '1.0');
        params.set('notify_url', ALIPAY_CONFIG.APP_GATEWAY_URL);
        params.set('biz_content', this._goodsContent(title, no, amount));
        params.set('sign', this._buildSign(params))
        return [...params].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
    }

    /**
     * 验证支付宝异步通知的合法性
     * @param params  支付宝异步通知结果的参数
     * @returns {*}
     */
    verifySign(params) {
        const res = alipaySdk.checkNotifySign(params)
        return res;
    }


    /**
     * 生成业务请求参数的集合
     * @param subject       商品的标题/交易标题/订单标题/订单关键字等。
     * @param outTradeNo    商户网站唯一订单号
     * @param totalAmount   订单总金额，单位为元，精确到小数点后两位，取值范围[0.01,100000000]
     * @returns {string}    json字符串
     * @private
     */
    _goodsContent(subject, outTradeNo, totalAmount) {
        let bizContent = {
            subject: subject,
            out_trade_no: outTradeNo,
            total_amount: totalAmount,
            timeout_express: '30m',
            product_code: 'QUICK_MSECURITY_PAY',
        };
        return JSON.stringify(bizContent);
    }

    /**
     * 根据参数构建签名
     * @param paramsMap    Map对象
     * @returns {number|PromiseLike<ArrayBuffer>}
     * @private
     */
    _buildSign(paramsMap) {
        //1.获取所有请求参数，不包括字节类型参数，如文件、字节流，剔除sign字段，剔除值为空的参数
        let paramsList = [...paramsMap].filter(([k1, v1]) => k1 !== 'sign' && v1);
        //2.按照字符的键值ASCII码递增排序
        paramsList.sort();
        //3.组合成“参数=参数值”的格式，并且把这些参数用&字符连接起来
        let paramsString = paramsList.map(([k, v]) => `${k}=${v}`).join('&');

        let signType = paramsMap.get('sign_type');
        return this._signWithPrivateKey(signType, paramsString, this.app_private_key);
    }


    /**
     * 通过私钥给字符串签名
     * @param signType      返回参数的签名类型：RSA2或RSA
     * @param content       需要加密的字符串
     * @param privateKey    私钥
     * @returns {number | PromiseLike<ArrayBuffer>}
     * @private
     */
    _signWithPrivateKey(signType, content, privateKey) {
        let sign;
        if (signType.toUpperCase() === 'RSA2') {
            sign = crypto.createSign("RSA-SHA256");
        } else if (signType.toUpperCase() === 'RSA') {
            sign = crypto.createSign("RSA-SHA1");
        } else {
            throw new Error('请传入正确的签名方式，signType：' + signType);
        }
        sign.update(content);
        return sign.sign(privateKey, 'base64');
    }

    /**
     * 验证签名
     * @param signType      返回参数的签名类型：RSA2或RSA
     * @param sign          返回参数的签名
     * @param content       参数组成的待验签串
     * @param publicKey     支付宝公钥
     * @returns {*}         是否验证成功
     * @private
     */
    _verifyWithPublicKey(signType, sign, content, publicKey) {
        try {
            let verify;
            if (signType.toUpperCase() === 'RSA2') {
                verify = crypto.createVerify('RSA-SHA256');
            } else if (signType.toUpperCase() === 'RSA') {
                verify = crypto.createVerify('RSA-SHA1');
            } else {
                throw new Error('未知signType：' + signType);
            }
            verify.update(content);
            return verify.verify(publicKey, sign, 'base64')
        } catch (err) {
            console.error(err);
            return false;
        }
    }

}
module.exports = alipayService;
