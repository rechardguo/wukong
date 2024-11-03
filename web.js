const http = require('http');
const fs = require('fs');
const path = require("path");
const {getLocalIP} =require('./common')
//const {ProtratorDistributeExecutor}=require('./protractorDistributeExecutotr')
class WebServer {

    constructor(port = 3000) {
        this.port = port;
        this.pratractorRunning=false;
    }
    setDistributeServer(distributeServer) {
        this.distributeServer = distributeServer;
    }
    //启动webServer
    start() {
        this.server = http.createServer((req, res) => {
            // Set CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*'); // Replace * with specific domains in production
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
            res.setHeader('Access-Control-Allow-Credentials', true);

            // 设置响应头以支持SSE
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // Handle preflight requests (OPTIONS method)
            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            if (req.url == "/") {
                let data = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");
                res.setHeader('Content-Type', 'text/html');
                res.end(data);
            } else if (req.url == "/getAllClients") {
                // 设置响应头部信息
                this.distributeServer.emit('event', { action: 'getAllClients', req, res });
            } else if (req.url == "/execute") {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                if(this.pratractorRunning) {
                    res.end(JSON.stringify(
                        {code:1,msg:"protractor is running,you can not execute until protractor task done!"}
                    ));
                }else{
                     this.pratractorRunning=true;
                    // this.executor = new ProtratorDistributeExecutor(this.distributeServer,this);
                   //  this.executor.run();
                     res.end(JSON.stringify({code:0,msg:"success"}));
                }
            }
            // res.statusCode = 200;
            // res.setHeader('Content-Type', 'application/json');
            // res.end(JSON.stringify({
            //     data: 'Hello World!',
            // }));
        })
        return new Promise((resolve, reject) => {
            this.server.listen(this.port, () => {
                console.log(`web started,running on http://${getLocalIP()}:${this.port}/`);
                resolve(true);
            });
            //reject("error in start web server");
        });

    }

    exit() {
        this.distributeServer.emit('exit', -1);
    }
}

module.exports = { WebServer }