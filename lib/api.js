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
  this.socket.emit('info', 'Please tell me who you are, send a `setupPlayer` event with a `playerName` ' +
    '(max 25 char string) and if you have already played send your `playerId`');
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

  this.socket.emit('player', {
    playerId: player.id
  });
  this.socket.emit('info', 'Your `playerId` is ' + player.id);
  this.socket.emit('info', 'Please join a game by calling `setupGame` with your `playerId` and `ships` as ' +
    '`[{name: name, coord: "top-left coord (a1)", placement: "horizontal (h) or vertical (v)"}]` where `name` ' +
    'is one of each: `carrier`, `battleship`, `sub`, `cruiser`, `patrol`');

  this.socket.on('setupGame', _.bind(this.setupGame, this));
};

API.prototype.setupGame = function (data) {
  var error = _.bind(this.handleError, this),
      errors = [],
      ships = {},
      success = _.bind(this.handleSetupGameSuccess, this),
      xCoords = [
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'
      ],
      yMax = 10,
      yMin = 1,
      coords,
      length,
      xCoord,
      yCoord;

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
        return errors.push(ship);
    }

    xCoord = ship.coord[0];

    if (!_.contains(xCoords, xCoord)) {
      return errors.push(ship);
    }

    yCoord = +ship.coord[1];

    if (yCoord > yMax || yCoord < yMin) {
      return errors.push(ship);
    }

    switch (ship.coord[1]) {
      case 'h':
        if (yCoord > yMax - length) {
          return errors.push(ship);
        }
        break;

      case 'v':
        if (xCoords.indexOf(xCoord) + 1 > yMax - length) {
          return errors.push(ship);
        }
        break;

      default:
        return errors.push(ship);
    }

    ships[ship.name + key] = coords;
  });

  db.setupGame(this.player.id, ships)
    .then(success, error);
};

API.prototype.handleSetupGameSuccess = function (game) {
  this.game = game;

  this.socket.emit('game', {
    gameId: game.id
  });
  this.socket.emit('info', 'Your `gameId` is ' + game.id);

  switch (this.player.id.toString()) {
    case game.player1:
      this.socket.emit('info', 'You\'re player 1');
      break;

    case game.player2:
      this.socket.emit('info', 'You\'re player 2');
      break;
  }

  if (game.player1 && game.player2) {
    this.socket.emit('info', 'The game has started!');
  }

  this.socket.emit('info', 'When it\'s your turn you can fire a shot by calling `handleShot` with `playerId`, ' + 
    '`gameId` and `coord` as "a1"; you\'ll need to listen to `gameStatus` to see if you\'ve been hit or won or ' +
    'lost the game');
  this.socket.on('handleShot', _.bind(this.handleShot, this));
  this.addListeners();
};

API.prototype.handleShot = function (data) {
  var error = _.bind(this.handleError, this),
      success = _.bind(this.handleShotSuccess, this);

  if (data.playerId !== this.player.id.toString()) {
    return this.socket.emit('error', '`playerId` does not match');
  }

  if (data.gameId !== this.game.id.toString()) {
    return this.socket.emit('error', '`gameId` does not match');
  }

  db.handleShot(this.player.id, this.game.id, data.coord)
    .then(success, error);
};

API.prototype.handleShotSuccess = function (shot) {
  this.socket.emit('shot', shot);

  this.socket.emit('info', 'That shot was a ' + (shot.hit ? 'hit' : 'miss') + '!');

  if (shot.sunk) {
    this.socket.emit('info', 'You sunk a ship!');
  }

  if (shot.won) {
    this.socket.emit('info', 'You won the game!');
  }
};

API.prototype.addListeners = function () {
  db.addShipListener(this.player.id, this.game.id)
    .limit(1)
    .tailable()
    .stream()
    .on('data', _.bind(this.handleShipStream, this));

  db.addGameListener(this.player.id, this.game.id)
    .limit(1)
    .tailable()
    .stream()
    .on('data', _.bind(this.handleGameStream, this));
};

API.prototype.handleShipStream = function (ship) {
  this.socket.emit('ship', ship);
  this.socket.emit('info', 'Your ship ' + ship.type + ' has been hit!');

  if (ship.sunk) {
    this.socket.emit('info', 'Your ship ' + ship.type + ' has been sunk!');
  }
};

API.prototype.handleGameStream = function (game) {
  this.socket.emit('game', game);

  if (game.ended) {
    this.socket.emit('info', 'The game has ended');
    this.socket.emit('info', 'The winner of the game is: ' + 
      (game.winner === this.player.id.toString() ? 'you' : 'opponent'));
  }
};

module.exports = API;
