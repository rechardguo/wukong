const net = require('node:net');
const { PackageProcessor } = require('./common');

const packageProcessor = new PackageProcessor();
let connected=false;
let heartbeatIntervalId;
let cid;

if(process.argv.length!=3){
  console.error("usage: npm run test:join <host:ip>")
  return
}

let host_port=process.argv[2].split(":");
let host=host_port[0];
let port=host_port[1];
const client = net.createConnection({host:host, port:port}, () => {
  connected=true;
  heartbeatIntervalId = setInterval(()=>{
    send({type:'heartbeat',payload:`${cid}`});
  },5000);
});

function  processMessage(message){
  if(message.type=="client-registe-response"){
    cid=message.payload;
  }else if(message.type=="task-assign"){
    processTask(message);
  }
}

function send(type,payload){
  client.write(JSON.stringify({type,payload:payload}));
}

function processTask(message){
  console.log("receive server assign task : "+ JSON.stringify(message.payload));
  //message转成task后执行
  setTimeout(()=>{
    send({cid:cid, tid:message.payload.id, result:'ok'});
  },3000);
}

client.on('data', (data) => {
  console.log(data.toString());
  packageProcessor.process(data.toString()).then(messages=>messages.forEach(m=>processMessage(m)));
});

client.on('end', () => {
  clearInterval(heartbeatIntervalId);
  console.log('disconnected from server');
}); 

client.on('error', err => {
  clearInterval(heartbeatIntervalId);
  console.log(`disconnected from server,${err}`);
}); 
