const { EventEmitter } = require('node:events');
const net = require('node:net');
const {getLocalIP,PackageProcessor} = require('./common')
/**
 * 该server是个调度器，用来连接protroctor 客户端，以实现多台client参与protroctor的运行
 */
class Distributor extends EventEmitter{
   server;
   clientIdAccumulator=1;
   clients = [];
   taskqueue = [];
   assignTaskInternalId;
   processingTask = [];
   completedTask = [];
   distrubutorPort =8124;
   packageProcessor = new PackageProcessor();

   constructor(distrubutorPort){
      super();
      this.distrubutorPort = distrubutorPort;
      this.on('exit', (code) => {
        this.processExit(code);
      });

      this.on('event',event=>{
          this.processEvent(event.action).then(result=>{
              event.res.statusCode = 200;
              event.res.setHeader('Content-Type', 'application/json; charset=utf-8');
              event.res.end(JSON.stringify(result));
        });
      });
   }
  
   getClient(cid){
    return this.clients.find(c=>c.cid==cid);
   }

   putTask(task){
    this.taskqueue.push(task);
   }
  
   processMessage(message){
    if(message.type=="heartbeat"){
      let cid=message.payload;
      console.info(`receive client cid=${cid} heartbeat`)
      let c = this.getClient(cid);
      if(c){
        c.updateTime = new Date();
      }else{
        console.info(`client cid=${cid} does not exist!`)
      }
    }else if(message.type=="task-response"){
      let taskResponse=JSON.stringify(message.payload);
      let taskid=taskResponse.tid;
      let cid=taskResponse.cid;
      let client=this.getClient(cid);
      //let task=client.processingTasks.find(task=>task.payload.tid==taskid);
      //remove processing task 
      client.processingTasks=client.processingTasks.filter(task=>task.payload.tid!=taskid);
  
      //completedTask.push(task);
      console.info(`receive client task process response=${taskResponse}`)
    }
  }
  
  assignTask(){
    if(this.taskqueue.length==0){
      console.info("no task yet!");
      return ;
    }
    if(this.clients.length==0){
      console.info("no client add yet!");
      return ;
    }
    
    while(this.taskqueue.length>0){
      let task = {type:'task-assign',payload:this.taskqueue.shift()};
      //let client = getRandomClient();
      let client = this.pickUpMinTaskNumberClient();
      //如果没找到，表示机器任务数都已经满了，跳出循环
      if(!client) break;
      client.processingTasks.push(task);
      client.send(task);
    }
  }

  startAssignTask(){
    this.assignTaskInternalId=setInterval(()=>{
      this.assignTask();
    },5000);
  }

  start(){
    this.server = net.createServer((c) => {
      // 'connection' listener.
      this.clientIdAccumulator++;
      console.log('client connected,assign clientid='+this.clientIdAccumulator);
      c.cid=this.clientIdAccumulator;
      c.updateTime=new Date();
      c.processingTasks=[];
      c.send=(type,payload)=>{
        let task = JSON.stringify({type,payload:payload});
        console.info("assign task==>"+task);
        c.write(task);
      }
    
      c.on('end', () => {
        console.log(`clientid=${c.cid} disconnected, remove it from clients`);
        this.clients = this.clients.filter(client=>client.cid!=c.cid);
      });
    
      c.on('error',()=>{
        console.log(`clientid=${c.cid} disconnected, remove it from clients`);
        this.clients = this.clients.filter(client=>client.cid!=c.cid);
      });
    
      c.on('data',data=>{
        //console.info("server receive data=>"+data);
        this.packageProcessor.process(data).then(messages=>messages.forEach(m => {
          this.processMessage(m);
        }));
      });
      this.clients.push(c);

      c.send({type:'client-registe-response',payload:`${this.clientIdAccumulator}`});
    });
    
    this.server.on('error', (err) => {
      throw err;
    });
    
    this.server.listen(
      this.distrubutorPort, () => {
      console.log(`server started,running on ${getLocalIP()}:${this.distrubutorPort}`);
      //分配任务
      this.startAssignTask();
    }); 
  }
  
  //正常情况下需要根据client的处理的任务数来分，
  //如果某个client处理的任务数很多，则不应该分给他
  //挑出最少任务的client
  pickUpMinTaskNumberClient(){
    let client=null;
    for(let c of this.clients){
      //每台机器分配的任务数不大于20，todo做成可配
      //如果机器处理任务数大于20，则不分配
      if(c.processingTasks.length==20){
        continue;
      }

      if(client==null){
        client=c;
      }else{
        if(c.processingTasks.length<client.processingTasks.length)
         client=c;
      }
    }
    return client;
  }
  
  //随机获取的cilent
  getRandomClient() {
    let clientIndex=Math.round(getRandomNumber(0,100))%this.clients.length;
    return this.clients[clientIndex];
  }
  
  getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
  }

  //处理web.js退出时的操作
  processExit(code){
    console.log('server process exit with code: ', code);
    clearInterval(this.assignTaskInternalId);
  }

  async processEvent(event){
    console.log("server receive event from web=>",event);
    if(event=="getAllClients"){
      return this.clients.map(c=>{
        return {
          cid:c.cid,
          port:c.remotePort,
          ip:c.remoteAddress,
          processingTasks:c.processingTasks
        }
      });
    } else {
      return "unsupoorted event";
    }
  }
  
  //模拟产生任务
  // let id=1;
  // setInterval(()=>{
  //   let task = getRandomNumber(10,30);
  //   taskqueue.push({id:id++,task:task});
  // },10000);
}

module.exports={Distributor: Distributor}
