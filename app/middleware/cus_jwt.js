module.exports = (options, app) => {
    /**
     * 自定义jwt校验方法
     * 实现单例token签发校验
     * 00	missing token	   请求需带上token
     * FF	redis token timeout, please relogin	（超时，无法reflesh）重定向到登录页面
     * SF	not latest token	（非最新签发的token但token有效，被其他用户挤下来了）重定向到登录页面
     * ER	token invalid	（token解码失败）请勿伪造token
     * RF	token timeout	  需要更换token
     * OE	not latest token;token timeout	（非最新签发的token且超时）重定向到登录页面
     */
    return async function cus_jwt(ctx, next) {
        const originalUrl = ctx.originalUrl;
        const isWhiteUrl = _isWhiteUrl(options, app, originalUrl);
        if(isWhiteUrl) {
            await next();
            return;
        }
        const privateKey = app.config.jwt.secret;
        const token =ctx.headers.authorization;
        if(!token) {
            //header头里，不存在token
            _forbidden(ctx, 'missing token', '00');
            return;
        }
        let userInfo;
        try {
            userInfo = app.jwt.verify(token, privateKey);
            if(userInfo) {
                const redisToken = await app.redis.get(`token_${userInfo.id}`);
                if(!redisToken) {
                    //redisToken不存在，用户已登出或redis策略已清空token数据
                    _forbidden(ctx, 'redis token timeout, please relogin', 'FF');
                    return;
                }
                if(token !== redisToken) {
                    //token校验成功，但不是最新签发的token，以此来保证单例登录，无法账户共享
                    _forbidden(ctx, 'not latest token', 'SF');
                    return;
                }
            } else {
                //token校验失败，表示使用了过期的token或伪造的token
                _forbidden(ctx, 'token invalid', 'ER');
                return;
            }
        } catch (e) {
            //e.name === "TokenExpiredError" 说明超时了
            if(e.name === "TokenExpiredError") {
                userInfo = app.jwt.decode(token);
                const redisToken = await app.redis.get(`token_${userInfo.id}`);
                if(!redisToken) {
                    //redisToken不存在，用户已登出或redis策略已清空token数据
                    _forbidden(ctx, 'redis token timeout, please relogin', 'FF');
                    return;
                }
                if(token === redisToken) {
                    //redisToken是最新的
                    _forbidden(ctx, 'token timeout', 'RF');
                } else {
                    _forbidden(ctx, 'not latest token;token timeout', 'OE');
                }
                return;
            }
            //很明显token格式不正确，伪造了token
            _forbidden(ctx, 'token invalid', 'ER');
            return;
        }
        ctx.tokenUser = userInfo;
        await next();
    }

}

/**
 * 检测testUrl是否是白名单中存在的url，是返回true，否则返回false
 * @param testUrl
 * @return {boolean}
 * @private
 */
function _isWhiteUrl(options, app, testUrl) {
    const whiteUrls = options.whiteUrls;
    let result = false;
    if(testUrl.trim()) {
        app._.forEach(whiteUrls, function(whiteUrl) {
            if(testUrl.indexOf(whiteUrl) > -1) {
                result = true;
                return false;
            }
        });
    }
    return result;
}

function _forbidden(ctx, msg, code = "") {
    ctx.status = 401;
    ctx.body = { status: 401, data: {code: code, msg: msg} };
}
