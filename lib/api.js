var _ = require('lodash'),
    db = require('db'),
    API;

API = function (socket, dbMock) {
  this.dbMock = dbMock;
  this.socket = socket;

  this.init();
};

API.prototype.init = function () {
  var error = _.bind(this.handleDBError, this),
      success = _.bind(this.handleDBSuccess, this);

  this.socket.emit('info', 'Let the battle commence!');
  this.socket.emit('info', 'Connecting to DB');

  db.init(this.dbMock)
    .then(success, error);
};

API.prototype.handleDBError = function () {
  this.socket.emit('error', 'Failed to connect to DB');
  this.socket.close();
};

API.prototype.handleDBSuccess = function () {
  this.socket.emit('info', 'Successfully connected to DB');
  this.addPlayerListeners();
};

API.prototype.addPlayerListeners = function () {
  this.socket.emit('info', 'Please tell me who you are, send a `setupPlayer` event with a `playerName` (max 25 char string) and if you have already played send your `playerId`');
  this.socket.on('setupPlayer', _.bind(this.setupPlayer, this));
};

API.prototype.setupPlayer = function (data) {
  var error = _.bind(this.handleError, this),
      success = _.bind(this.setupPlayerSuccess, this, data);

  if (this.player) {
    this.socket.emit('error', 'Player is already connected');
  } else {
    _.forEach(data, function (value, key) {
      data[key] = value + '';
    });

    if (!data.playerName || data.playerName.length > 25) {
      return this.socket.emit('error', '`playerName` is invalid');
    }

    if (!data.playerId) {
      return this.socket.emit('error', '`playerId` is invalid');
    }

    db.setupPlayer(data.playerName, data.playerId)
      .then(success, error);
  }
};

API.prototype.handleError = function (err) {
  this.socket.emit('error', err);
};

API.prototype.setupPlayerSuccess = function (data, player) {
  this.player = player;

  if (data.playerId === player.id.toString()) {
    this.socket.emit('info', 'Welcome back ' + player.name);
  } 

  this.socket.emit('info', 'Your `playerID` is ' + player.id);
  this.socket.emit('info', 'Please join a game by calling `setupGame` with your `playerId` and `ships` as `[{name: name, coord: "top-left coord (a1)", placement: "horizontal (h) or vertical (v)"}]` where `name` is one of each: `carrier`, `battleship`, `sub`, `cruiser`, `patrol`');

  this.socket.on('setupGame', _.bind(this.setupGame, this));
};

API.prototype.setupGame = function (data) {
  var errors = [],
      ships = {},
      coords,
      length;

  if (data.playerId !== this.player.id.toString()) {
    return this.socket.emit('error', '`playerId` does not match');
  }

  _.forEach(data.ships, function (ship, key) {
    switch (ship.name) {
      case 'carrier':
        length = 5;
        break;

      case 'battleship':
        length = 4;
        break;

      case 'sub':
        length = 3;
        break;

      case 'cruiser':
        length = 2;
        break;

      case 'patrol':
        length = 1;
        break;

      default:
        errors
        return;
    }

    ships[ship.name + key] = coords;
  });
};

module.exports = API;
