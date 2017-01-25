// Require modules
var express = require('express');
var log4js = require('log4js');
var fs = require('fs');
var routes = require('./routes.js');
var bodyParser = require('body-parser')

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
  "port": "8080",
  "host":"localhost",
  "log_level": "info",
};
CONF = extend({},DEFAULT_SETTINGS, CONF_FILE);

// Config logger
if (CONF.log_file){
  log4js.loadAppender(CONF.log_file);
}
var logger = log4js.getLogger('app');
logger.setLevel(CONF.log_level);

// Config express
var app = express();
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

// Enable CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
routes(app,logger);

app.listen(CONF.port, CONF.host, function(){
  logger.info('Proxy working at port ' + CONF.port);
});