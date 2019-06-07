#!/usr/bin/env node

var option = require('commander');
var loki = require('lokijs');
var db = new loki('memory.db');

option
  .version('0.1.0')
  .usage('[options] <file ...>')
  .option('-p, --port <n>', 'Set Port Number',(val)=>{return val}, 5000)
  .option('-h, --host <s>', 'Set Host Address',(val)=>{return val}, 'localhost')
  .option('-t, --test', 'Testing build')
  .parse(process.argv);

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

var clients = db.addCollection('clients');
clients.on('insert', function(input) { input.id = input.$loki; });

async function read_var(data){//Must be Json format
  data = data.toString(); //Change Buffer to string
  var str = data.substring(data.search("{"),data.lastIndexOf("}")+1)+"\n"; //retrieve the JSON substring
  return JSON.parse(str);
}

async function send_var(data,port,address){//data as object
  data = JSON.stringify(data);
  var dataLength= Buffer.byteLength(data)
  // Round UP dataLength to nearest multiple of 4
  while (dataLength%4){
    dataLength++
  }
  // The size of the buffer is:
  // 4 bytes for the length of the packet +
  // 4 bytes for the type +
  // 4 bytes for the length of the string +
  // the length of the string, rounded up to the nearest multiple of 4
  var response = Buffer.alloc(4+4+dataLength)
  response.writeUIntLE(0x00000004,0,4) // Write the type, 4 is for strings
  response.writeUIntLE(Buffer.byteLength(data),4,4) // Write the length of the string (in bytes)
  response.write(data,8) // Write the actual string
  server.send(response,0,Buffer.byteLength(response), port, address);
}

server.on('listening', function () {

  var address = server.address();
  console.log('UDP Server listening on ' + address.address + ":" + address.port);

  if (option.test){
    process.exit(0);
  }

});

server.on('error',(err) =>{
  console.log("Server Error:",err);
})

server.on('message', async function (data, client) {
  try{

    data = await read_var(data);
    var dat = data.data;

    switch (dat.event) {

      case "connecting":
        //client.ID = client.address+":"+client.port;
        client.channel = data.channel;
        clients.insert({ channel:client.channel, address:client.address, port:client.port });
        client = clients.findOne({address:client.address, port:client.port});

        console.log(client.id + " connected");

        unicast({event:"connected",ID:client.id}, client.id);

        multicast({event:"join",msg:client.id+" join the channel",ID:client.id}, client.id, client.channel);
        console.log(client.id + " join channel "+client.channel);
        break;

      case "disconnect":
        console.log(data.ID + " Disconnected");

        client = clients.findOne({id:data.ID});
        multicast({event:"left",msg:data.ID+" left the channel",ID:data.ID}, data.ID, client.channel);

        console.log(data.ID + " left channel "+client.channel);
        clients.remove(client);

        break;

      case "channel":
        client = clients.findOne({id:data.ID});
        if (client.channel == data.channel)
          return

        multicast({event:"left",msg:client.id+" left the channel",ID:client.id}, client.id, client.channel);
        console.log(client.id + " left channel "+client.channel);

        client.channel = data.channel;
        clients.update(client);

        multicast({event:"join",msg:client.id+" join the channel",ID:client.id}, client.id, client.channel);
        console.log(client.id + " join channel "+client.channel);

        break;

      case "broadcast":
        broadcast(dat, data.ID);
        break;

      case "unicast":
        unicast(dat, data.ID);
        break;

      case "multicast":
        multicast(dat, data.ID, data.channel);
        break;

      default:
        unicast(dat, data.ID);//if default send back to sender
        break;
    }

  }catch(err){
    console.log("Server Error:",err);
  }
});

// Send data to every channel
function broadcast(data, id){
  var res = clients.where((o)=>o.id != id);
  for(var i=0;i<res.length;i++){
    send_var(data, res[i].port, res[i].address);
  }
}

// Send data to a specified channel
function multicast(data, id, channel){
  var res = clients.find({channel, id: {'$ne' : id}});
  for(var i=0;i<res.length;i++){
     send_var(data, res[i].port, res[i].address);
  }
}

// Send data to a specified client
function unicast(data, id){
  var res = clients.findOne({id});
  send_var(data, res.port, res.address);      
}

server.bind(option.port, option.host);
