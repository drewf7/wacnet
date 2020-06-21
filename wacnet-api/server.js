const express = require('express');
const app = express();
const server = require('http').Server(app);
const bodyParser = require('body-parser');
require('dotenv').config()
const expressPort = (process.env.PORT === undefined) ? 3000 : process.env.PORT

const rateLimit = require('express-rate-limit');

const apiRouter = require('./routes/api.routes');

// Trust Nginx Proxy
app.set('trust proxy', 1);

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// Set up rate limiting
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // Every 5 min
  max: 100, // No more than 100 connections
  message: 'Rate Limit Exceeded'
})

// Disable CORS if dev
if (process.env.isLocalDev && process.env.isLocalDev == 'true') {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:4200"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "*");
    next();
  });
}

// Rate Limit API
app.use('/api/', apiLimiter);
// Serve API
app.use('/api', apiRouter);

// Serve dist folder as default and for when non-existing GET request is posted
app.use(express.static(__dirname + '/dist/wacnet-angular'));
app.use('/*', express.static(__dirname + '/dist/wacnet-angular/index.html'));


// Start Express server
server.listen(expressPort, function () {
  console.log('App startup', `env: ${app.get('env')} port: ${expressPort}`);
});