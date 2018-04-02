// Require modules
var express = require('express');
var log4js = require('log4js');
var fs = require('fs');
var routes = require('./routes.js');
var bodyParser = require('body-parser');
var https = require('https');
var http = require('http');
//  Extend json
function extend(target) {
    var sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        for (var prop in source) {
            target[prop] = source[prop];
        }
    });
    return target;
}

// Set conf files
var CONF_FILE = fs.existsSync('config.json') ? JSON.parse(fs.readFileSync('config.json', 'utf8')) : {};
var DEFAULT_SETTINGS = {
  "port": process.env.PORT || "8080",
  "host": process.env.HOST || "localhost",
  "log_level": process.env.LOG_LEVEL || "info",
  "ssl_cert" : process.env.SSL_CERT | "",
  "ssl_key" : process.env.SSL_KEY | "",
  "log_file": process.env.LOG_FILE | "logs/proxy-post.log",
  "ca": process.env.CA | ""
};
CONF = extend({},DEFAULT_SETTINGS, CONF_FILE);

// Config logger
if (CONF.log_file){
  log4js.loadAppender('file');
  log4js.addAppender(log4js.appenders.file(CONF.log_file),'app');
}
var logger = log4js.getLogger('app');
logger.setLevel(CONF.log_level);

// Config express
var app = express();
app.use(log4js.connectLogger(logger, {level: CONF.log_level, format: ':method :url :status :response-time ms'}));
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

// Enable CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, X-Custom-Header, Authorization");
  next();
});

// Enable https
if (CONF.ssl_cert && CONF.ssl_key) {
  var options = {};
  protocol = https;
  options = {
    key: fs.readFileSync(CONF.ssl_key),
    cert: fs.readFileSync(CONF.ssl_cert),
    ca: fs.readFileSync(CONF.ca),
    passphrase: CONF.pwd,
    requestCert: true,
    rejectUnauthorized: false
  };
  https.createServer(options, app).listen(CONF.port, CONF.host, function(){
  logger.info('Proxy working at port ' + CONF.port + ' over HTTPS');
});
} else {
  app.listen(CONF.port, CONF.host, function(){
    logger.info('Proxy working at port ' + CONF.port + ' over HTTP');
  });
}

routes(app,logger);

