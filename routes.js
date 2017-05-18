var routes = function(app, logger){
  var Controller = require('./controller.js');
  var ctrl = new Controller(app, logger);
  // GET 
  app.get('/stock/historical',ctrl.getHistorical);
  app.get('/traffic', ctrl.getTraffic);
  app.get('/stock', ctrl.getStock);
  app.get('/weather',ctrl.getWeather);
  app.get('/company',ctrl.searchCompany);
  // POST
  app.post('/traffic', ctrl.postTraffic);
  app.post('/stock', ctrl.postStock);
  app.post('/weather',ctrl.postWeather);

  // GET_FAKE
  app.get('/fakes/:list', ctrl.getFake);

  // Clean Fake
  app.get('/fakes/:list/clean', ctrl.cleanFake);
};

module.exports = exports = routes;