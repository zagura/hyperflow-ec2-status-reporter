#!/usr/bin/env node

var METRIC_COLLECTOR = process.env.METRIC_COLLECTOR ? process.env.METRIC_COLLECTOR : 'http://localhost:8086/hyperflow_tests';



var os = require('os');

console.log(os.cpus());
console.log(os.totalmem());
console.log(os.freemem())

var os_utils = require('os-utils');
var AWS = require('aws-sdk');
const Influx = require('influxdb-nodejs');

os_utils.cpuUsage(function(v){
    console.log( 'CPU Usage (%): ' + v );
});

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
        console.log( 'CPU Usage (%): ' + v );
        writeDataToDatabase("hyperflow_cpu_usage_ec2",{ cpu_usage:v},{ec2_incance_id: instance_id});
    });

    var freemem=os_utils.freememPercentage();
    console.log('Free Memory (%): '+ freemem);
    writeDataToDatabase("hyperflow_memory_usage_ec2",{ free_memory:freemem},{ec2_incance_id: instance_id});
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
