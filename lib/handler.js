var API = require('api'),
    handler,
    io;

handler = {
  init: function (server) {
    io = require('socket.io')(server);
    io.on('connection', function (socket) {
      new API(socket);
    });
  }
};

module.exports = handler;
