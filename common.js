const os = require('os');

function  getLocalIP() {
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const interfaceInfo of interfaces[name]) {
            // Skip internal (like localhost) and non-IPv4 addresses
            if (!interfaceInfo.internal && interfaceInfo.family === 'IPv4') {
                return interfaceInfo.address;
            }
        }
    }

    return 'Unable to determine local IP address.';
}


/**
 * this class target to solve net package sticky problem
 */
const seperator="^";
class PackageProcessor{

    constructor(){
        this.remainning;
    }


    //处理tcp里的message粘包，半包问题
    //message规则是json^
    process(steam){
        let str=steam.toString();

        const processInner=(str)=>{
            let packages=[];
            while(true){
                let index=str.indexOf(seperator);
                if(index!=-1){
                    let p=str.substring(0,index);
                    packages.push(p);
                    str=str.substring(index+1);
                    continue;
                }
                break;
            }
            this.remainning=str;
            return packages;
        }

        return new Promise((resovle,reject)=>{
            if(!this.remainning){
                resovle(processInner(str));
            }else{
                str=this.remainning+str;
                resovle(processInner(str));
            }
        });
    }

}

//test
// let processor=new PackageProcessor();
// let msg="{}^"
// processor.process(msg).then(packages=>packages.forEach(element => {
//     console.info(element);
// }));
// msg="{}^{}^"
// processor.process(msg).then(packages=>packages.forEach(element => {
//     console.info(element);
// }));


module.exports={getLocalIP,PackageProcessor}