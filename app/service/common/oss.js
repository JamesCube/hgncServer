'use strict';

const Service = require('../base/baseService');


class OssService extends Service {
    constructor(ctx) {
        super(ctx); //如果需要在构造函数做一些处理，一定要有这句话，才能保证后面 `this.ctx`的使用。
        // 就可以直接通过 this.ctx 获取 ctx 了
        // 还可以直接通过 this.app 获取 app 了
        this.utils = this.ctx.helper;
        //oss实例
        this.image_bucket = this.utils.get_image_bucket();
    }

    /**
     * 上传文件图片流
     * @since 2019/04/04
     * @param path 上传目标路径
     * @param stream 图片流
     * @returns {Promise<*>}
     */
     async image_stream_upload(path, stream) {
        const res = await this.image_bucket.putStream(path, stream);
        return res;
    }
}
module.exports = OssService;
