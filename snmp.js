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
        this.snmpAgent(conf);
        this.ttl = conf.snmpTTL;
        setInterval(this.housekeeper.bind(this), conf.snmpHousekeeper)
    }

    /**
     * Create a new SNMP Agent when the function is constructed 
     * @param {Object} conf 
     */
    snmpAgent(conf) {
        const options = {
            port: conf.snmpPort,
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
        this.authorizer.addCommunity(conf.snmpComunity);
    }

    /**
     * Add data to MIB table 
     * @param {Object} data - Object with data to be added to the MIB
     */
    setData(data) {
        if (!activeMIB[data.name]) {
            activeMIB[data.name] = { id: tableCount, entryList: {} };
            tableCount ++;
            // create new table 
            this.createTable(data);
        }
        // renew entry in activeMib table
        activeMIB[data.name].entryList[data.entryID] = new Date();
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

    /**
     * Create a new table if it does not yet exsists 
     * @param {Object} data - Object with detail on the table that needs to be created 
     */
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

    /**
     * Cleanup activeMib table from old data every 30 min
     */
    housekeeper() {
        let currentTime = new Date().getTime();
        let currentTTL = currentTime - this.ttl;
        Object.keys(activeMIB).forEach(key => {
            let table = activeMIB[key].entryList;
            Object.keys(table).forEach(entry => {
                let entryTime = new Date(table[entry]).getTime();
                if (entryTime < currentTTL) {
                    // remove entry from mib
                    try {
                        this.mib.deleteTableRow(key, [entry]);
                        // delete entry from activeMib table 
                        delete activeMIB[key].entryList[entry];
                    } catch (err) {
                        console.log(err.message);
                    }
                }
            })
        })
    }
}

module.exports.snmpServer = snmpServer;
