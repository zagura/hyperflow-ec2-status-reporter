#!/usr/bin/env node

var INTERFACE = process.env.INTERFACE ? process.env.INTERFACE : 'eth0';
var DISK_DEVICE = process.env.DISK_DEVICE ? process.env.DISK_DEVICE : 'xvda1';

const os = require('os');
const si = require('systeminformation');

var os_utils = require('os-utils');
const AWS = require('aws-sdk');
const http = require('http');
const Prometeus = require('prom-client');

var diskStat = require('disk-stat');
var meta  = new AWS.MetadataService();

const collectDefaultMetrics = Prometeus.collectDefaultMetrics;
const register = Prometeus.register

const int_tx_gauge = new Prometeus.Gauge({
    name: 'hyperflow_connection_transferred',
    help: 'hyperflow hyperflow_connection_transferred',
    labelNames: ['instance_id']
});
const int_rx_gauge = new Prometeus.Gauge({
    name: 'hyperflow_connection_received',
    help: 'hyperflow hyperflow_connection_received',
    labelNames: ['instance_id']
});

collectDefaultMetrics({ timeout: 1000 });

const cpu_gauge = new Prometeus.Gauge({
    name: 'hyperflow_cpu_usage_ec2',
    help: 'Usage of cpu for ec2 instance',
    labelNames: ['instance_id']
});

const mem_gauge = new Prometeus.Gauge({
    name: 'hyperflow_memory_usage_ec2',
    help: 'Usage memory of EC2 instance',
    labelNames: ['instance_id']
});

const disk_usage_read = new Prometeus.Gauge({
    name: 'hyperflow_disc_read',
    help: 'hyperflow_disc_read',
    labelNames: ['instance_id']
});

const disk_usage_write = new Prometeus.Gauge({
    name: 'hyperflow_disc_write',
    help: 'hyperflow_disc_write',
    labelNames: ['instance_id']
});

function collectUsage(instance_id)
{

    os_utils.cpuUsage(function(v){
        cpu_gauge.set({'instance_id': instance_id}, v, Date.now());
    });

    si.mem(function(data) {
        mem_gauge.set({'instance_id' : instance_id}, data.used , Date.now());
    });


    si.networkStats(INTERFACE,function(data){
        //console.log('eth0 used:');
        console.log(data);
        if(data.rx_sec!=-1)
        {
            int_tx_gauge.set({'instance_id': instance_id}, data.tx_sec, Date.now());
            int_rx_gauge.set({'instance_id': instance_id}, data.rx_sec, Date.now());
        }
    });


    diskStat.usageRead({
        device: DISK_DEVICE,
        units: 'KiB',
      },
      function(kbPerSecond) {
        console.log(kbPerSecond);
        disk_usage_read.set({'instance_id': instance_id}, kbPerSecond, Date.now());
    });

    diskStat.usageWrite({
        device: DISK_DEVICE,
        units: 'KiB',
      },
      function(kbPerSecond) {
        console.log(kbPerSecond);
        disk_usage_write.set({'instance_id': instance_id}, kbPerSecond, Date.now());
    });
    
}

setInterval(function () {
    collectUsage('test');
}, 1000);

console.log(register.metrics(timestamp=true))

meta.request("/latest/meta-data/instance-id", function(err, data){
    var instance_id = "undef" ;
    if(err)
    {
        console.log("err");
    }else
    {
        console.log(data);
        instance_id = data;
    }
        
    setInterval(function () {
        collectUsage(instance_id);
    }, 1000);
});

// meta.request("/metric/disk_usage", function(err, data) {

// }

http.createServer(function(req, res) {
    if (req.url == '/metrics') {
        res.writeHeader(200);
        res.end(register.metrics(timestamp=true));
    } else (res.writeHeader(404));
}).listen(9100);
