'use strict';

// imports in the following order: stdlib, 3-rd party, local
// imports in each section ordered alphabetically
var fs = require('fs');
var http = require('http');
var https = require('https');
var process = require('process');

var express = require('express');

var deploymentValidator = require('./validators/apps/v1/deployment');
var podValidator = require('./validators/v1/pod');
var replicasetValidator = require('./validators/apps/v1/replicaset');
var statefulsetValidator = require('./validators/apps/v1/statefulset');

// constants and global variables definition
var PORT = parseInt(process.env.PORT || '3000')
var privateKey = fs.readFileSync('/etc/ssl/server.key.pem', 'utf8');
var certificate = fs.readFileSync('/etc/ssl/server.crt.pem', 'utf8');
var credentials = { key: privateKey, cert: certificate };

var app = express();
app.use(express.json());


var CONFIG = {
    '/v1/Pod': podValidator,
    'apps/v1/Deployment': deploymentValidator,
    'apps/v1/StatefulSet': statefulsetValidator,
    'apps/v1/ReplicaSet': replicasetValidator,
}


// define handlers
app.post('/', function(req, res) {
    var admissionRequest = req.body;
    console.log('Got request: ', admissionRequest);
    var kind = admissionRequest.request.kind;
    var object = admissionRequest.request.object;

    var admissionResponse;

    var validator = CONFIG[kind.group + '/' + kind.version + '/' + kind.kind]
    if (validator !== undefined) {
        admissionResponse = validator(object);
    } else {
        // Default response
        admissionResponse = {
            allowed: true,
        };
    }

    admissionResponse.uid = admissionRequest.request.uid;

    var admissionReview = { response: admissionResponse };
    console.log('Sending response', admissionReview);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(admissionReview));
    res.status(200).end();
});


// Start server
console.log('Listening at http://0.0.0.0:' + PORT);
var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(PORT);
httpsServer.listen(PORT + 1);
