var _ = require('lodash'),
    api,
    io;

api = {
  init: function (server) {
    io = require('socket.io')(server);
  }
};

module.exports = api;
