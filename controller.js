(function () {
  var request = require('request');
  var csv = require('csvtojson');
  var mixpanel = require('mixpanel');
  var SECURITY_TOKEN = "fe8c2e7967c3f1ed91fd664de30333c6";
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
    "weather": [],
    "security": {},
    "reddit": {}
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
      new_weather.dt = parseInt(current_date.getTime() / 1000, 10);
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
    log.info('Se pide el jsonp')
    getJsonFromJsonP(url, function (err, data) {
      log.debug(err);
      log.debug(data);
      if (!err) {
        if (data && data.resourceSets && data.resourceSets.length > 0 && data.resourceSets[0].resources) {
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
    console.log('Log', log);
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

  var makeStockRequest = function (symbol, cb) {
    var url = 'https://www.alphavantage.co/query';
    var params = {
      function: 'TIME_SERIES_DAILY',
      apikey: 'T05EU5YA98ARE5EB',
      symbol: symbol
    };

    request({ uri: url, qs: params }, function (err, response, body) {
      if (err) {
        log.info(err);
        cb(err, null);
      } else {
        body = JSON.parse(body);
        if (body["Error Message"]){
          cb(body, null);
        } else{
          var data = [];
          var ref=body["Time Series (Daily)"];
          for (date in ref){
            var info = {
              Open: ref[date]["1. open"],
              High: ref[date]["2. high"],
              Low: ref[date]["3. low"],
              Close: ref[date]["4. close"],
              Volume: ref[date]["5. volume"],
              Date: date,
              Symbol: symbol
            };
            data.push(info)
          }
          cb(null, data);
        }
      }
    });
  };

  Controller.prototype.getStock = function (req, res) {
    log.info(req.method + " to " + decodeURIComponent(req.originalUrl) + " from " + req.ip);
    if (!req.query.symbol) {
      res.status(400).send({ error: "Symbol is required" })
    } else {
      makeStockRequest(req.query.symbol, function (err, data) {
        if (err || data.error) {
          res.status(400).send(err || data);
          return;
        }
        res.status(200).send(data[0]);
      });
    }
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
    log.info('Datos que llegan:\n', req.body.data);
    req.body.data = req.body.data.replace(/'/g, '"');
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


  // search company symbol
  Controller.prototype.searchCompany = function (req, res) {
    log.info(req.method + " to " + req.originalUrl + " from " + req.ip);
    var url = "https://www.google.com/complete/search?client=finance-immersive&xhr=t&q="
    url += req.query.q;
    request({ url: url }, function (err, response, body) {
      if (err) {
        res.status(response.statusCode).send(err);
      } else {
        body = JSON.parse(body);
        var comp = [];
        body[1].forEach(function (el) {
          if (el.length > 3) {
            comp.push(el[3]);
          }
        });

        res.status(response.statusCode).send({ search: comp });
      }
    });
  };




  /*********************REDDIT**************************** */

  Controller.prototype.getReddit = function (req, res) {
    log.info(req.method + " to " + req.originalUrl + " from " + req.ip);
    var subredit = req.params.subredit;
    var list = req.params.list;

    // request weather info
    var options = {};
    options.url = "https://oauth.reddit.com/r/" + subredit + "/" + list;
    options.headers = {
      "authorization": req.headers.authorization,
      "User-Agent": req.headers["user-agent"]
    };

    request(options, function (err, response, body) {
      // Check errors
      if (err || response.statusCode !== 200) {
        res.status(response.statusCode).send(body);
        return;
      }


      var data = JSON.parse(body);
      if (DATA_CACHE.reddit.data && data.data.children) {
        data.data.children.unshift(DATA_CACHE.reddit);
      }
      res.status(response.statusCode).send(data);
    });

  };

  Controller.prototype.postReddit = function (req, res) {
    // author, texto, selftext, title
    var data = req.body;
    log.info(req.methor + " to " + req.originalUrl + " from " + req.ip);
    log.info(req.body);
    var fake = {
      "kind": "t3",
      "data": {
        "contest_mode": false,
        "subreddit_name_prefixed": "r/worldnews",
        "banned_by": null,
        "media_embed": {},
        "thumbnail_width": 140,
        "subreddit": "worldnews",
        "selftext_html": null,
        "selftext": "",
        "likes": null,
        "suggested_sort": null,
        "user_reports": [],
        "secure_media": null,
        "link_flair_text": "Bill Passed",
        "id": "6keeto",
        "view_count": null,
        "secure_media_embed": {},
        "clicked": false,
        "report_reasons": null,
        "author": "halond",
        "saved": false,
        "mod_reports": [],
        "name": "t3_6keeto",
        "score": 13018,
        "approved_by": null,
        "over_18": false,
        "domain": "dw.com",
        "hidden": false,
        "preview": {
          "images": [
            {
              "source": {
                "url": "https://i.redditmedia.com/9J6rBxecnx8I6EZB_zZbM6g8y2u5smP2TxV3uy3g3gg.jpg?s=2efc0b6079ec2e34be7d5e12ab14ecc4",
                "width": 940,
                "height": 529
              },
              "resolutions": [
                {
                  "url": "https://i.redditmedia.com/9J6rBxecnx8I6EZB_zZbM6g8y2u5smP2TxV3uy3g3gg.jpg?fit=crop&amp;crop=faces%2Centropy&amp;arh=2&amp;w=108&amp;s=23375e904986a9ad9933c79c3cc8c19b",
                  "width": 108,
                  "height": 60
                },
                {
                  "url": "https://i.redditmedia.com/9J6rBxecnx8I6EZB_zZbM6g8y2u5smP2TxV3uy3g3gg.jpg?fit=crop&amp;crop=faces%2Centropy&amp;arh=2&amp;w=216&amp;s=14ab9978ca4657070dd53bf916d29e4d",
                  "width": 216,
                  "height": 121
                },
                {
                  "url": "https://i.redditmedia.com/9J6rBxecnx8I6EZB_zZbM6g8y2u5smP2TxV3uy3g3gg.jpg?fit=crop&amp;crop=faces%2Centropy&amp;arh=2&amp;w=320&amp;s=5f474ec77065fc6ae009db35d79c9a61",
                  "width": 320,
                  "height": 180
                },
                {
                  "url": "https://i.redditmedia.com/9J6rBxecnx8I6EZB_zZbM6g8y2u5smP2TxV3uy3g3gg.jpg?fit=crop&amp;crop=faces%2Centropy&amp;arh=2&amp;w=640&amp;s=515cdf1f2f374d9ee0663bcbffec3e5e",
                  "width": 640,
                  "height": 360
                }
              ],
              "variants": {},
              "id": "soueyLlE33KJLwqw8EYn-LEqVKQ_U5wXvOkvEf_vtcs"
            }
          ],
          "enabled": false
        },
        "thumbnail": "default",
        "subreddit_id": "t5_2qh13",
        "edited": false,
        "link_flair_css_class": "normal",
        "author_flair_css_class": null,
        "gilded": 0,
        "downs": 0,
        "brand_safe": true,
        "archived": false,
        "removal_reason": null,
        "post_hint": "link",
        "can_gild": true,
        "thumbnail_height": 78,
        "hide_score": false,
        "spoiler": false,
        "permalink": "/r/worldnews/comments/6keeto/samesex_marriage_is_now_legal_in_germany/",
        "num_reports": null,
        "locked": false,
        "stickied": false,
        "created": new Date().getTime(),
        "url": "http://www.dw.com/en/germanys-bundestag-passes-bill-on-same-sex-marriage/a-39483785",
        "author_flair_text": null,
        "quarantine": false,
        "title": "Same-sex marriage is now legal in Germany",
        "created_utc": 1498806844,
        "distinguished": null,
        "media": null,
        "num_comments": 1521,
        "is_self": false,
        "visited": false,
        "subreddit_type": "public",
        "is_video": false,
        "ups": 13018
      }
    }

    if (!data.author || !data.selftext || !data.title || !data.subreddit) {
      res.status(404).send({ "error": "Author, selftext, title and subreddit are required" });
      return;
    }
    fake.data.author = data.author;
    fake.data.selftext = data.selftext;
    fake.data.title = data.title;
    fake.data.subreddit = data.subreddit;

    DATA_CACHE.reddit = JSON.parse(JSON.stringify(fake));

    res.status(201).send(fake);
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
  Controller.prototype.getHistorical = function (req, res) {
    log.info(req.method + " to " + decodeURIComponent(req.originalUrl) + " from " + req.ip);
    if (!req.query.symbol) {
      res.status(400).send({ error: "Symbol is required" })
    } else {
      makeStockRequest(req.query.symbol, function (err, data) {
        if (err || data.error) {
          res.status(400).send(err || data);
          return;
        }
        res.status(200).send(data);
      });
    }
  };



  // Security measure
  Controller.prototype.sendSecurity = function (req, res) {
    log.info(req.method + " to " + req.originalUrl + " from " + req.ip);
    log.info(req.body);
    if (!req.body.domain || !req.body.results || !req.body.experiment_id) {
      res.status(404).send({ error: "Experiment_id, domain and results are required" });
      return;
    }
    var mix_security = mixpanel.init(req.body.mixpanelToken || SECURITY_TOKEN);
    req.body.component_name = DATA_CACHE.security[req.body.experiment_id]

    if (!req.body.component_name) {
      var error_info = { error: "Error: component_name must be set first using /security/experiment" };
      log.error(error_info);
      res.status(400).send(error_info);
    }

    mix_security.track(req.body.component_name, req.body, function (err) {
      if (err) {
        var error_info = { error: "Error sending data to mixpanel", body: req.body, origin: req.ip, err: err };
        log.error(error_info);
        res.status(404).send(error_info);
        return;
      }
      log.info("Data sent to mixpanel:", req.body);
      res.status(200).send();
    });

  };
  Controller.prototype.setIdComponent = function (req, res) {
    log.info(req.method + " to " + req.originalUrl + " from " + req.ip);
    log.info(req.body);

    if (!req.body.component || !req.body.experiment_id) {
      log.error("Trying to set a component id withput component name or experiment id");
      res.status(404).send();
      return;
    }
    log.info("Guardando los datos en cache");
    DATA_CACHE.security[req.body.experiment_id] = req.body.component;
    res.status(200).send();
  };

  Controller.prototype.getComponentName = function (req, res) {
    log.info(req.method + " to " + req.originalUrl + " from " + req.ip);
    log.info(req.query);
    var experiment_id = req.query.experiment_id;
    if (!experiment_id) {
      res.status(404).send();
      return;
    }
    res.status(200).send({ component_name: DATA_CACHE.security[experiment_id] });
  }

  module.exports = exports = Controller;
})();
