// ===================================
// Packages
// ===================================

const snmp = require ("net-snmp");

// ===================================
// Global variables 
// ===================================

let activeMIB = {};
let tableCount = 1;

// ===================================
// SNMP Server
// ===================================

class snmpServer {

    constructor(conf) {
        this.snmpAgent(conf.snmpComunity);
    }

    snmpAgent(community) {
        const options = {
            port: 161,
            disableAuthorization: false,
            accessControlModelType: snmp.AccessControlModelType.None,
            //engineID: "8000B98380", // where the X's are random hex digits
            address: null,
            transport: "udp4",
            version: snmp.Version2c
        };  
        // callback 
        let callback = function (error, data) {
            if ( error ) {
                console.error (error);
            } else {
                console.log (JSON.stringify(data, null, 2));
            }
        };
        // create agent 
        this.agent = snmp.createAgent (options, callback);
        this.mib = this.agent.getMib();
        this.authorizer = this.agent.getAuthorizer();
        this.authorizer.addCommunity(community);
    }

    setData(data) {
        if (!activeMIB[data.name]) {
            activeMIB[data.name] = { id: tableCount };
            tableCount ++;
            // create new table 
            this.createTable(data);
        }
        // add data to table 
        let columns = [data.entryID];
        for (let i = 0; i < data.columns.length; i++) {
            columns.push(data.columns[i].value);
        }
        try {
            this.mib.addTableRow(data.name, columns);
        } catch (err) {
            console.log(err.message);
        };
    };

    // create mib 
    createTable(data) {
        var myTableProvider = {
            name: data.name,
            type: snmp.MibProviderType.Table,
            oid: `1.3.6.1.4.1.54392.5.1464.${activeMIB[data.name].id}`,
            maxAccess: snmp.MaxAccess[data.maxAccess],
            tableColumns: [
                {
                    number: 1,
                    name: "ifIndex",
                    type: snmp.ObjectType.OctetString,
                    maxAccess: snmp.MaxAccess["read-only"]
                },
            ],
            tableIndex: [
                {
                    columnName: "ifIndex"
                }
            ]
        };
        // genetate table columnts 
        for (let i = 0; i < data.columns.length; i++) {
            myTableProvider.tableColumns.push({
                number: i + 2,
                name: data.columns[i].name,
                type: snmp.ObjectType[data.columns[i].type],
                maxAccess: snmp.MaxAccess[data.columns[i].maxAccess]
            });
        }
        this.mib.registerProvider(myTableProvider);
    }
}

module.exports.snmpServer = snmpServer;
