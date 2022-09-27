// ===================================
// Packages
// ===================================

const request = require('request');
const EventEmitter = require('events'); 

// ===================================
// Gravityzone API
// ===================================

class gravityzone extends EventEmitter {

    constructor(conf) {
        super();
        this.apiKey = conf.gravityZoneAPI;
        this.endpoints = {};

        // --------------------
        // List of endpoints 
        // --------------------
        // create list of endpoint
        this.generateEndpoint();
        // set interval for the generate endpoint function to run
        setInterval(this.generateEndpoint.bind(this), conf.generateEndpoint);

        // --------------------
        // Endpoint details 
        // --------------------
        // get endpoint details 
        this.getEndpoint();
        // set interval to get endpoint details 
        setInterval(this.getEndpoint.bind(this), conf.getEndpoint);
    }

    /**
     * Make an API call to bitdefender
     * @param {String} location - link location.
     * @param {String} method - name of method to use.
     * @param {Object} params - Object with parameters to send 
     * @returns 
     */
    gzCall(location, method, params) {
        return new Promise((resolve, rejects) => {
            try {
                request({  uri: `https://cloudgz.gravityzone.bitdefender.com/api/v1.0/jsonrpc/${location}`,
                    method: "POST",
                    auth: {
                        username: this.apiKey,
                        password: ""
                    },
                    json: {
                        "id": 1001,
                        "jsonrpc": "2.0",
                        "method": method,
                        "params": params
                    }
                }, function(response, body) {
                    if (body) {
                        resolve(body.body.result)
                    } else {
                        rejects({ err: "body undefiend" })
                    }
                });
            } catch (err) {
                rejects(err.message);
            }
        })
    }

    generateEndpoint() {
        this.gzCall("network", "getEndpointsList")
        .then(result => {
            let endpointList = {};
            Object.keys(result.items).forEach(e => { endpointList[result.items[e].id] = result.items[e] })
            if (!(Object.keys(endpointList).length === 0)) {
                if (Object.keys(this.endpoints).length === 0) {
                    this.endpoints = endpointList;
                } else {
                    // check for new endpoints 
                    Object.keys(endpointList).forEach(a => {
                        if (!this.endpoints[a]) {
                            this.endpoints = endpointList[a];
                        }
                    })
                    // check for old endpoints
                    Object.keys(this.endpoints).forEach(b => {
                        if (!endpointList[b]) {
                            delete this.endpoints[b];
                        }
                    })
                }
            }
        })
        .catch(err => {
            console.log(err.message)
        })
    }

    getEndpoint() {
        const endpointList = Object.keys(this.endpoints);
        if (!(endpointList.length === 0)) {
            endpointList.forEach(e => {
                this.gzCall("network", "getManagedEndpointDetails", { "endpointId": e })
                .then(result => {
                    if (result) {
                        this.endpoints[result.id].data = result;
                    }   
                })
                .catch(err => {
                    console.log(err.message)
                })
            })
        }
    }
}

module.exports.gravityzone = gravityzone;