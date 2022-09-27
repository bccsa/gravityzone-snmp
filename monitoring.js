// ===================================
// Packages
// ===================================

const { gravityzone } = require('./gravityzone.js');
const { snmpServer } = require('./snmp.js');
const fs = require("fs");

// ===================================
// Load Conf 
// ===================================

let rawData = fs.readFileSync("./conf.json");
let conf = JSON.parse(rawData);

// ===================================
// Classes 
// ===================================

const gz = new gravityzone(conf);
const snmp = new snmpServer(conf);

setInterval(createMib, conf.snmpUpdate);
// call create mib for first time (delay with one min to allow enpoin list to be generated)
setTimeout(createMib, 120000);

// ===================================
// Function 
// ===================================

function createMib() {
    const endpoints = gz.endpoints;
    Object.keys(endpoints).forEach(e => {
        let data = endpoints[e].data;
        if (data) {
            let snmpData = [
                { type: "OctetString", name: "ifName", value: data.label, maxAccess: "read-only" },
                { type: "Integer", name: "ifMalwareDetection", value: data.malwareStatus.detection ? 1:0, maxAccess: "read-only" },
                { type: "Integer", name: "ifMalwareInfection", value: data.malwareStatus.infected ? 1:0, maxAccess: "read-only" },
                { type: "OctetString", name: "ifLastSeen", value: `${Date.parse(data.lastSeen)/1000}`, maxAccess: "read-only" },
                { type: "OctetString", name: "ifAgentLastUpdate", value: `${Date.parse(data.agent.lastUpdate)/1000}`, maxAccess: "read-only" },
            ];
            snmp.setData({ entryID: data.id, name: "ifGravityzone", columns: snmpData, maxAccess: "read-only" });
        }
    })
}
