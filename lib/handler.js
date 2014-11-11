var API = require('./api'),
    handler,
    io;

handler = {
  init: function (server) {
    io = require('socket.io')(server);
    io.on('connection', function (socket) {
      var api = new API(socket);
      api.init();
    });
  }
};

module.exports = handler;
