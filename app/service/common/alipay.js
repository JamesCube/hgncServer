'use strict';

const Service = require('../base/baseService');
const AlipaySdk = require('alipay-sdk');
var moment = require('moment');
const fs = require('fs');
const alipaySdk = new AlipaySdk({
    appId: '2019061665632155',// 鹏鱼
    privateKey: fs.readFileSync('./app-private-key.pem', 'ascii'),
});

class alipayService extends Service {
    constructor(ctx) {
        super(ctx); //如果需要在构造函数做一些处理，一定要有这句话，才能保证后面 `this.ctx`的使用。
        // 就可以直接通过 this.ctx 获取 ctx 了
        // 还可以直接通过 this.app 获取 app 了
        this.utils = this.ctx.helper;
        //oss实例
        this.image_bucket = this.utils.get_image_bucket();
    }

    async pay() {
        let params = new Map();
        params.set('app_id', this.accountSettings.APP_ID);
        params.set('method', 'alipay.trade.app.pay');
        params.set('charset', 'utf-8');
        params.set('sign_type', 'RSA2');
        params.set('timestamp', moment().format('YYYY-MM-DD HH:mm:ss'));
        params.set('version', '1.0');
        params.set('notify_url', this.accountSettings.APP_GATEWAY_URL);
        params.set('biz_content', this._buildBizContent('商品名称xxxx', '商户订单号xxxxx', '商品金额8.88'));
        const result = await alipaySdk.exec('alipay.trade.app.pay', {
            grantType: 'authorization_code',
            charset: 'utf-8',
            sign_type: 'RSA2',
            sign: ,
            timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
            version: '1.0',
            biz_content:
        });
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

        let privateKey = fs.readFileSync(this.accountSettings.APP_PRIVATE_KEY_PATH, 'utf8');
        let signType = paramsMap.get('sign_type');
        return this._signWithPrivateKey(signType, paramsString, privateKey);
    }

    /**
     * 复制路径文件
     * @param from
     * @param to
     * @return {Promise<*>}
     */
     async oss_paths_copy(from, to) {
         const res = await this.image_bucket.copy(to, from);
         return res;
     }

    /**
     * 删除path路径文件,批量接口
     * @since 2019/04/09
     * @param paths 目标路径数组 array
     * @returns {Promise<*>}
     */
     async oss_paths_delete(paths) {
        const res = await this.image_bucket.deleteMulti(paths);
        return res;
     }
}
module.exports = alipayService;
