const process = require('node:process');
const {WebServer} =require("./web");
const {Distributor}=require("./distributor");


class Server{
    webPort=3000;
    distributorPort=8124;
    constructor(webPort=3000,distributorPort=8124){
        this.webPort=webPort;
        this.distributorPort=distributorPort;
    }
    start(){
        let webServer = new WebServer(this.webPort);
        let distributor;
       // let executor;
        webServer.start().then(success=>{
                if(success){
                    distributor = new Distributor(this.distributorPort);
                    distributor.start();
                    webServer.setDistributeServer(distributor);
                }
        });
        
        const handleProcessEvent=()=>{
            process.on('SIGINT', function () {
                process.exit();
            }); 
            process.on('exit',(code)=>{
                if(code!=0){
                    console.log('handle exit event with code: ', code);
                    console.info('notify webServer,distributeServer,executor exit');
                    webServer.exit();
                    distributor.emit("exit");
                    //executor.endAllTask();
                }
            })
        };
        handleProcessEvent();
   }
}

module.exports={Server: Server}
