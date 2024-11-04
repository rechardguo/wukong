const net = require('node:net');
const { PackageProcessor } = require('./common');

class client {
  packageProcessor;
  connected = false;
  heartbeatIntervalId;
  cid;
  client;

  constructor() {
    this.packageProcessor = new PackageProcessor();
  }

  connnect(host, port) {
    this.client = net.createConnection({ host: host, port: port }, () => {
      this.connected = true;
      this.heartbeatIntervalId = setInterval(() => {
        this.send({ type: 'heartbeat', payload: `${this.cid}` });
      }, 5000);
    });


    this.client.on('data', (data) => {
      console.log(data.toString());
      this.packageProcessor.process(data.toString())
        .then(messages => messages.forEach(m => this.processMessage(m)));
    });

    this.client.on('end', () => {
      clearInterval(this.heartbeatIntervalId);
      console.log('disconnected from server');
    });

    this.client.on('error', err => {
      clearInterval(this.heartbeatIntervalId);
      console.log(`disconnected from server,${err}`);
    });

  }

  processMessage(message) {
    if (message.type == "client-registe-response") {
      this.cid = message.payload;
    } else if (message.type == "task-assign") {
      this.processTask(message);
    }
  }

  send(type, payload) {
    this.client.write(JSON.stringify({ type, payload: payload }));
  }

  processTask(message) {
    console.log("receive server assign task : " + JSON.stringify(message.payload));
    //message转成task后执行
    setTimeout(() => {
      send({ cid: this.cid, tid: message.payload.id, result: 'ok' });
    }, 3000);
  }
}

module.exports={client:client}
