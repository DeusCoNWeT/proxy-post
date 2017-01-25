var routes = function(app, logger){
  var Controller = require('./controller.js');
  var ctrl = new Controller(app, logger);
  // GET 
  app.get('/traffic', ctrl.getTraffic);
  app.get('/stock', ctrl.getStock);
  app.get('/weather',ctrl.getWeather);

  // POST
  app.post('/traffic', ctrl.postTraffic);
  app.post('/stock', ctrl.postStock);
  app.post('/weather',ctrl.postWeather);

  // GET_FAKE
  app.get('/:list/fakes', ctrl.getFake);

  // Clean Fake
  app.get('/:list/fakes/clean', ctrl.cleanFake);
};

module.exports = exports = routes;