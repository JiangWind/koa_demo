// 入口文件

const http = require('http');
const EventEmitter = require('events'); // 错误处理
const Stream = require('stream'); // 引入stream
const context = require('./context'); // 上下文对象
const request = require('./request'); // 请求对象相关
const response = require('./response'); // 响应对象相关

class Koa extends EventEmitter {
    constructor () {
        super();
        this.middlewares = []; // 需要一个数组将每个中间件按顺序存放起来
        this.context = context;
        this.request = request;
        this.response = response;
    }

    use (fn) {
        this.middlewares.push(fn);
    }

    compose (middlewares, ctx) { // 简化版的compose，接收中间件数组，ctx对象作为参数
        function dispatch (index) { // 利用递归函数将各中间件串联起来依次调用
            if (index === middlewares.length) return Promise.resolve(); // 若最后一个中间件，返回一个resolve的promise
            const middleware = middlewares[index]; // 取当前应该被调用的函数
            return Promise.resolve(middleware(ctx, () => dispatch(index + 1))); // 调用并传入ctx和下一个将被调用的函数，用户next（）时执行该函数
        }

        return dispatch(0);

    }

    createContext (req, res) {
        // 使用Object.create方法是为了继承this.context但在增加属性时不影响原对象
        const ctx = Object.create(this.context);
        const request = ctx.request = Object.create(this.request);
        const response = ctx.response = Object.create(this.response);

        ctx.req = request.req = response.req = req;
        ctx.res = request.res = response.res = res;
        request.ctx = response.ctx = ctx;
        request.response = response;
        response.request = request;
        return ctx;
    }

    handleRequest (req, res) {
        res.statusCode = 404; // 默认404
        const ctx = this.createContext(req, res); // 创建ctx
        const fn = this.compose(this.middlewares, ctx); // 调用compose，传入参数
        fn.then(() => { // then了之后再进行判断
            if (typeof ctx.body === 'object') { // 如果是对象，按json格式输出
                res.setHeader('Content-Type', 'application/json;charset=urf8');
                res.end(JSON.stringify(ctx.body));
            } else if (ctx.body instanceof Stream) { // 如果是流
                ctx.body.pipe(res);
            } else if (typeof ctx.body === 'string' || Buffer.isBuffer(ctx.body)) { // 如果是字符串或buffer
                res.setHeader('Content-Type', 'text/htmlcharset=utf8');
                res.end(ctx.body);
            } else {
                res.end('Not found');
            }
            res.end(ctx.body); // ctx.body用来输出到页面，后面会说如何绑定数据到ctx.body
        }).catch(err => { // 监控错误发射error，用于app.on('error', err => {})
            this.emit('error', err);
            res.statusCode = 500;
            res.end('server error');
        });

    }

    listen (...args) {
        const server = http.createServer(this.handleRequest.bind(this)); // 放入回调
        server.listen(...args); // 因为listen方法可能有多参数，所以这里直接解构所有参数就可以了
    }
}

module.exports = Koa;

