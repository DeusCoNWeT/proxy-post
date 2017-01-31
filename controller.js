(function () {
  var request = require('request');
  // Handler of JSONP request
  var getJsonFromJsonP = function (url, callback) {
    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var jsonpData = body;
        var json;
        //if you don't know for sure that you are getting jsonp, then i'd do something like this
        try {
          json = JSON.parse(jsonpData);
        }
        catch (e) {
          var startPos = jsonpData.indexOf('({');
          var endPos = jsonpData.indexOf('})');
          var jsonString = jsonpData.substring(startPos + 1, endPos + 1);
          json = JSON.parse(jsonString);
        }
        callback(null, json);
      } else {
        callback(error);
      }
    });
  };
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
  // GLOBAL VALUES
  var log, app;
  var DATA_CACHE = {
    "traffic": [],
    "stock": {},
    "weather": []
  }
  var Controller = function (app, logger) {
    app = app;
    log = logger;
  };


  // CREATE FAKE POST
  var createFakeWeather = function (data) {
    // Get date without hours, min, seconds and ms. jan 27 2017 00:00:00
    var now = new Date();
    var ms = now.getMinutes();
    var seconds = now.getUTCSeconds();
    var minutes = now.getMinutes();
    var hour = now.getHours();
    var rest = ((hour * 60 + minutes) * 60 + seconds) * 1000 + ms;
    var base_date = new Date(now - rest);


    /* data must be a ob
      data: [{
        temp: 6,
        min: 4,
        max: 3,
        icon: "01d"
      },...]
    */


    var base_weather = {
      "dt": now.getTime(),
      "main": {
        "temp": 8.86,
        "temp_min": 8.86,
        "temp_max": 8.86,
        "pressure": 947.76,
        "sea_level": 1034.71,
        "grnd_level": 947.76,
        "humidity": 74,
        "temp_kf": 0
      },
      "weather": [
        {
          "id": 800,
          "main": "Clear",
          "description": "cielo claro",
          "icon": "01d"
        }
      ],
      "clouds": {
        "all": 0
      },
      "wind": {
        "speed": 7.85,
        "deg": 332.004
      },
      "sys": {
        "pod": "d"
      },
      "dt_txt": now.toString(),
      "cache": true
    };

    var added = [];
    data.forEach(function (weather, index) {
      var new_weather = JSON.parse(JSON.stringify(base_weather));
      // set Data
      new_weather.main.temp = weather.temp;
      new_weather.main.temp_min = weather.min;
      new_weather.main.temp_max = weather.max;
      new_weather.weather.icon = weather.icon;

      // Set dt
      var next_hour = index * 3 * 3600 * 1000
      var current_date = new Date(base_date.getTime() + next_hour);// add 3 hour
      new_weather.dt = Math.trunc(current_date.getTime() / 1000);
      new_weather.dt_txt = current_date.toString();

      added.push(new_weather);
    });

    return added;
  };

  var createFakeTraffic = function (description, severity) {
    var now = new Date();
    var end = new Date(now.getTime() + (1000 * 60 * 60 * 24)); // now + 60second * 60min * 60hour * 24h  = now + 1 day
    var issue = {
      "__type": "TrafficIncident:http://schemas.microsoft.com/search/local/ws/rest/v1",
      "point": {
        "type": "Point",
        "coordinates": [51.896277, -0.433215]
      },
      "description": description,
      "end": "/Date(" + end.getTime() + ")/",
      "incidentId": 1276762224686039800 + now.getTime(),
      "lastModified": "/Date(" + now.getTime() + ")/",
      "roadClosed": false,
      "severity": severity || 3,
      "source": 9,
      "start": "/Date(" + now.getTime() + ")/",
      "toPoint": { "type": "Point", "coordinates": [51.896139, -0.433735] },
      "type": 9,
      "verified": true
    };
    return issue;
  };

  var createFakeStock = function (body) {
    var base_stock = {
      "symbol": body.Symbol,
      "Change": body.Change,
      "DaysLow": body.DaysLow,
      "DaysHigh": body.DaysHigh,
      "YearLow": body.YearLow,
      "YearHigh": body.YearHigh,
      "LastTradePriceOnly": body.LastTradePriceOnly,
      "Name": body.Name,
      "Symbol": body.Symbol,
      "Volume": body.Volume,
    };
    return base_stock;
  }

  /************************* TRAFFIC **************************/
  // Traffic
  // Request to traffic
  var makeTrafficRequest = function (stringMap, key, cb) {
    var url = 'https://dev.virtualearth.net/REST/v1/Traffic/Incidents/' + stringMap;
    url += '?key=' + key + '&jsonp=Callback';
    getJsonFromJsonP(url, function (err, data) {
      if (!err) {
        if (data && data.resourceSets && data.resourceSets.length > 0 && data.resourceSets[0].resources) {
          log.debug('Tamaño inicial: ', data.resourceSets[0].resources.length);
          data.resourceSets[0].resources = data.resourceSets[0].resources.concat(DATA_CACHE.traffic);
          data.resourceSets[0].resources = data.resourceSets[0].resources.sort(function (issue1, issue2) {
            // transform "//Date(xxx)  to xxx (integer)"
            var data1 = parseInt(issue1.lastModified.match(/\/Date\(([^\)]*)\)\//)[1]);
            var data2 = parseInt(issue2.lastModified.match(/\/Date\(([^\)]*)\)\//)[1]);
            // descendant order (most recentd, lower index)
            return data2 - data1;
          });
        }
      }
      cb(err, data);
    });

  };

  // Traffic API
  Controller.prototype.getTraffic = function (req, res) {
    // KEY and MAP  are required
    log.info(req.method + " to " + req.originalUrl + " from " + req.ip);
    var stringMap = req.query.map || "";
    var key = req.query.key || "";
    if (!key || !stringMap) {
      res.status(400).send('Key and map param are required');
      return;
    }
    makeTrafficRequest(stringMap, key, function (err, data) {
      if (err) {
        res.status(400).send(err);
      } else {
        res.status(200).send(data);
      }
    });
  };

  Controller.prototype.postTraffic = function (req, res) {
    log.info(req.method + " to " + req.originalUrl + " from " + req.ip);
    var description = req.body.description;
    var severity = req.query.severity;

    if (!description) {
      res.status(400).send('Description is required');
      return;
    }

    var new_issue = createFakeTraffic(description, severity);
    // CACHE politicy: only 1 data stored
    DATA_CACHE.traffic = [new_issue];
    res.status(201).send(new_issue);

  };


  /************************* STOCK **************************/
  // Stock

  var makeStockRequest = function (query, cb) {
    var encodedQuery = encodeURIComponent(query);
    var url = 'https://query.yahooapis.com/v1/public/yql?q=' + encodedQuery + '&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=Callback';
    getJsonFromJsonP(url, function (err, data) {
      if (!err && !data.error) {
        var quote = data.query.results.quote;
        if (!(quote instanceof Array)){
          quote = [quote];
        }
        log.debug(data.query.results.quote);
        // Load data from cache
        quote.forEach(function (enterprise, index) {
          var symbol = enterprise.symbol;
          if (DATA_CACHE.stock[symbol]) {
            // fill with cache data
            quote[index] = extend(enterprise, DATA_CACHE.stock[symbol]);
          }
        });
        data.query.results.quote = quote;
      }
      cb(err, data);
    });
  };

  Controller.prototype.getStock = function (req, res) {
    log.info(req.method + " to " + decodeURIComponent(req.originalUrl) + " from " + req.ip);

    makeStockRequest(req.query.q, function (err, data) {
      if (err || data.error) {
        res.status(400).send(err || data);
        return;
      }
      res.status(200).send(data);
    });
  };

  Controller.prototype.postStock = function (req, res) {
    log.info(req.method + " to " + req.originalUrl + " from " + req.ip);
    // Required params
    var required = ["Symbol", "Change", "DaysLow", "DaysHigh", "YearLow", "YearHigh", "Volume", "LastTradePriceOnly"];
    // If body is empty. Send error
    if (!req.body) {
      req.status(400).send({ error: "Missing params." + required.join(', ') + " are required" });
      return;
    }

    var body = req.body;
    var missing = [];
    // Check if body has all params
    required.forEach(function (el) {
      if (body[el] === undefined || body[el] === "") {
        missing.push(el);
      }
    });

    // If some param is missing send error
    if (missing.length > 0) {
      res.status(400).send({ error: "Missing " + missing.join(', ') + "." });
      return;
    }

    var new_value = createFakeStock(body);

    DATA_CACHE.stock[new_value.symbol] = new_value;
    res.status(200).send(new_value);
  };

  // Weather
  /************************* WEATHER **************************/
  Controller.prototype.getWeather = function (req, res) {
    log.info(req.method + " to " + req.originalUrl + " from " + req.ip);

    // request weather info
    var url = "http://api.openweathermap.org/data/2.5/forecast";
    request({ url: url, qs: req.query }, function (err, response, body) {
      // Check errors
      if (err || response.statusCode !== 200) {
        res.status(response.statusCode).send(JSON.parse(body));
        return;
      }

      var data = JSON.parse(body);
      // Get today data
      var todayLength = data.list.length % 8 || 8;

      // get last todayLength data from cache
      var cacheLength = DATA_CACHE.weather.length;
      // If we have cache data, we update data
      if (cacheLength !== 0) {
        // Get last data 
        var todayDataCache = DATA_CACHE.weather.slice(cacheLength - todayLength, cacheLength);
        // Change today real data with cache data
        var argumSplice = [0, todayLength].concat(todayDataCache);
        Array.prototype.splice.apply(data.list, argumSplice);
      }
      res.status(response.statusCode).send(data);
    });
  };

  Controller.prototype.postWeather = function (req, res) {
    log.info(req.method + " to " + req.originalUrl + " from " + req.ip);
    var data = JSON.parse(req.body.data) || [];
    log.debug(data);
    // Check that 8 data have been sent
    log.info(req.method + " to " + req.originalUrl + " from " + req.ip);
    if (data.length != 8) {
      res.status(400).send('Data must be a array of object with length 8. Each object must has temp, min, max and icon');
      log.error('Trying to push ' + data.length + ' data. Data.length must be 8');
      return;
    }
    // Cheack each data has temp, min, max and icon
    var error = false;
    for (var i = 0; i < data.length && !error; i++) {
      var weather = data[i];
      if (weather.temp === undefined || weather.min === undefined || weather.max === undefined || weather.icon === undefined) {
        error = true;
        log.debug('Index ' + i + ': ' + JSON.stringify(weather, null, 2));
      }
    }
    if (error) {
      res.status(400).send('Data must be a array of object with length 8. Each object must has temp, min, max and icon');
      log.error('Some data has not min, max, temp or icon');
      return;
    }
    // Create new data

    var new_weather = createFakeWeather(data);
    // Cache politicy: only 1 post stored
    DATA_CACHE.weather = new_weather;

    res.status(201).send(DATA_CACHE.weather);
  };


  // Get fakes

  Controller.prototype.getFake = function (req, res) {
    var list = req.params.list;

    res.status(200).send(DATA_CACHE[list]);
  };

  // Clean fakes
  Controller.prototype.cleanFake = function (req, res) {
    var list = req.params.list;

    var deleted = DATA_CACHE[list];
    DATA_CACHE[list] = [];

    res.status(200).send(deleted);
  };
  module.exports = exports = Controller;
})();