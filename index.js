#!/usr/bin/env node

var METRIC_COLLECTOR = process.env.METRIC_COLLECTOR ? process.env.METRIC_COLLECTOR : 'http://localhost:8086/hyperflow_tests';
var INTERFACE = process.env.INTERFACE ? process.env.INTERFACE : 'eth0';

var DISK_DEVICE = process.env.DISK_DEVICE ? process.env.DISK_DEVICE : 'xvda1';

var os = require('os');
const si = require('systeminformation');

var os_utils = require('os-utils');
var AWS = require('aws-sdk');
const Influx = require('influxdb-nodejs');

var diskStat = require('disk-stat');

var meta  = new AWS.MetadataService();

function writeDataToDatabase(metric, data,tag)
{
    //console.log("json %s %j",metric,data);
    const client = new Influx(METRIC_COLLECTOR);

    // data["wfid"] = that.getWfId();
    // data["hfId"] = that.getHfId();

    client.write(metric)
    .field(data)
    .tag(tag)
    .then(() => true)
    .catch(console.error);
}

function collectUsage(instance_id)
{
    os_utils.cpuUsage(function(v){
        //console.log( 'CPU Usage (%): ' + v );
        writeDataToDatabase("hyperflow_cpu_usage_ec2",{ cpu_usage:v},{ec2_incance_id: instance_id});
    });

    si.mem(function(data) {
        //console.log('Memory used:');
        var used_memory=data.used/1024;
        //console.log(data.used/1024);
        writeDataToDatabase("hyperflow_memory_usage_ec2",{ used_memory:used_memory},{ec2_incance_id: instance_id});
    });

    si.networkStats(INTERFACE,function(data){
        //console.log('eth0 used:');
        console.log(data);
        if(data.rx_sec!=-1)
        {
            writeDataToDatabase("hyperflow_connection_received",{ received_bytes_per_s:data.rx_sec},{ec2_incance_id: instance_id});
            writeDataToDatabase("hyperflow_connection_transferred",{ transferred_bytes_per_s:data.tx_sec},{ec2_incance_id: instance_id});
        }
    });


    diskStat.usageRead({
        device: DISK_DEVICE,
        units: 'KiB',
      },
      function(kbPerSecond) {
        console.log(kbPerSecond);
        writeDataToDatabase("hyperflow_disc_read",{ read_bytes_per_s:kbPerSecond},{ec2_incance_id: instance_id});
    });

    diskStat.usageWrite({
        device: DISK_DEVICE,
        units: 'KiB',
      },
      function(kbPerSecond) {
        console.log(kbPerSecond);
        writeDataToDatabase("hyperflow_disc_write",{ write_bytes_per_s:kbPerSecond},{ec2_incance_id: instance_id});
    });
}


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
