// 响应对象

const response = {
    get body () {
        return this._body;
    },

    set body (val) {
        this.res.statusCode = 200; // 只要设置了body，就应该把状态码设置为200
        this._body = val; // set时先保存下来
    }
};
module.exports = response;
