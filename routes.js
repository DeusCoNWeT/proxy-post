var routes = function(app, logger){
  var Controller = require('./controller.js');
  var ctrl = new Controller(app, logger);
  // GET 
  app.get('/stock/historical',ctrl.getHistorical);
  app.get('/traffic', ctrl.getTraffic);
  app.get('/stock', ctrl.getStock);
  app.get('/weather',ctrl.getWeather);
  app.get('/company',ctrl.searchCompany);
  app.get('/reddit/:subredit/:list',ctrl.getReddit);
  
  // POST
  app.post('/traffic', ctrl.postTraffic);
  app.post('/stock', ctrl.postStock);
  app.post('/weather',ctrl.postWeather);
  app.post('/reddit',ctrl.postReddit);
  // GET_FAKE
  
  app.get('/fakes/:list', ctrl.getFake);

  // Clean Fake
  app.get('/fakes/:list/clean', ctrl.cleanFake);

  // Security
  // Security measure
  app.post('/security', ctrl.sendSecurity);
  app.get('/security', ctrl.getComponentName);
  app.post('/security/experiment',ctrl.setIdComponent);
};

module.exports = exports = routes;
