const process = require('node:process');
const {WebServer} =require("./web");
const {DistributeServer}=require("./distributeServer");

async function start(){
    let webServer = new WebServer(3000);
    let distributeServer;
   // let executor;
    await webServer.start().then(success=>{
            if(success){
                distributeServer = new DistributeServer();
                distributeServer.start();
                webServer.setDistributeServer(distributeServer);
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
                distributeServer.emit("exit");
                //executor.endAllTask();
            }
        })
    };
    handleProcessEvent();
}


start();

