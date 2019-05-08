module.exports = (options, app) => {
    /**
     * 自定义jwt校验方法
     * 实现单例token签发校验
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
            _forbidden(ctx, 'missing token');
            return;
        }
        try {
            const decode = app.jwt.verify(token, privateKey);
            if(decode) {
                const redisToken = await app.redis.get(`token_${decode.id}`);
                if(!redisToken) {
                    //redisToken不存在，用户已登出或redis策略已清空token数据
                    _forbidden(ctx, 'redis token timeout, please relogin');
                    return;
                }
                if(token !== redisToken) {
                    //token校验成功，但不是最新签发的token，以此来保证单例登录，无法账户共享
                    _forbidden(ctx, 'not latest token');
                    return;
                }
            } else {
                //token校验失败，表示使用了过期的token或伪造的token
                _forbidden(ctx, 'token invalid');
                return;
            }
        } catch (e) {
            //e.name === "TokenExpiredError" 说明超时了
            if(e.name === "TokenExpiredError") {
                const userInfo = app.jwt.decode(token);
                const redisToken = await app.redis.get(`token_${userInfo.id}`);
                if(!redisToken) {
                    //redisToken不存在，用户已登出或redis策略已清空token数据
                    _forbidden(ctx, 'redis token timeout, please relogin');
                    return;
                }
                if(token === redisToken) {
                    //redisToken是最新的
                    _forbidden(ctx, 'token timeout');
                } else {
                    _forbidden(ctx, 'not latest token;token timeout');
                }
                return;
            }
            //很明显token格式不正确，伪造了token
            _forbidden(ctx, 'token invalid');
            return;
        }
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

function _forbidden(ctx, msg) {
    ctx.status = 401;
    ctx.body = { status: 401, data: msg };
}
