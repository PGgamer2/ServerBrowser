var net = require("net");
var config = require('./config.json');
var is_ip_private = require('private-ip');
var express = require('express');
var app = express();

var servers = [];

// GET Servers List
app.get('/', async function (req, res) {
    res.json(servers);
});

// POST Add Server
app.post('/add', async function (req, res) {
    if (!req.query.host || isNaN(req.query.port)) {
        res.status(406).end();
        return;
    }
    var host = req.query.host;
    var port = req.query.port;

    if (!config.acceptPrivateIPs) {
        if (host == "localhost" || is_ip_private(host)) {
            res.status(409).end();
            return;
        }
    }

    for (i = 0; i < servers.length; i++) {
        if (servers[i].host == host && servers[i].port == port) {
            res.status(409).end();
            return;
        }
    }

    var title = req.query.title ? req.query.title : `${host}:${port}`;
    var description = req.query.description ? req.query.description : "";
    servers.push({"host": host, "port": port, "title": title, "description": description});
    await testPort(host, port);
    res.status(200).end();
});

// POST Remove Server
app.post('/remove', async function (req, res) {
    if (!req.query.host || isNaN(req.query.port)) {
        res.status(406).end();
        return;
    }
    removeServer(req.query.host, req.query.port);
    res.status(200).end();
});

function removeServer(host, port) {
    for (i = 0; i < servers.length; i++) {
        if (servers[i].host == host && servers[i].port == port) {
            servers.splice(i, 1);
            return;
        }
    }
}

async function testEveryServer() {
    for (i = 0; i < servers.length; i++) {
        await testPort(servers[i].host, servers[i].port);
    }
}
setInterval(testEveryServer, config.checkOnlineServersInterval);

async function testPort(host, port) {
    // Test if host is online (TCP)
    net.createConnection(port, host).on("connect", function(e) {
        // The server is online
    }).on("error", function(e) {
        removeServer(host, port);
    });    
}

app.listen(config.port, () => {
    console.log(`App listening at http://localhost:${config.port}`);
});