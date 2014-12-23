var _ = require('lodash'),
    db = require('./db'),
    API;

API = function (socket, dbMock) {
  this.dbMock = dbMock;
  this.socket = socket;
};

_.assign(API.prototype, {
  init: function () {
    var error = _.bind(this.handleDBError, this),
        success = _.bind(this.handleDBSuccess, this);

    this.socket.emit('info', 'Let the battle commence!');
    this.socket.emit('info', 'Connecting to DB');

    db.init(this.dbMock)
      .then(success, error);
  },

  handleDBError: function () {
    this.socket.emit('error', 'Failed to connect to DB');
    this.socket.close();
  },

  handleDBSuccess: function () {
    this.socket.emit('info', 'Successfully connected to DB');
    this.addPlayerListeners();
  },

  addPlayerListeners: function () {
    this.socket.emit('info', 'Please tell me who you are, send a `setupPlayer` event with a `playerName` ' +
      '(max 25 char string) and if you have already played send your `playerId`');
    this.socket.on('setupPlayer', _.bind(this.setupPlayer, this));
  },

  setupPlayer: function (data) {
    var error = _.bind(this.handleError, this),
        success = _.bind(this.setupPlayerSuccess, this, data);

    if (this.player) {
      this.socket.emit('error', 'Player is already connected');
    } else {
      _.forEach(data, function (value, key) {
        if (value) {
          data[key] = value + '';
        }
      });

      if (data.playerName && data.playerName.length <= 25) {
        db.setupPlayer(data.playerName, data.playerId)
          .then(success, error);
      } else {
        return this.socket.emit('error', '`playerName` is invalid');
      }
    }
  },

  handleError: function (err) {
    this.socket.emit('error', err);
  },

  setupPlayerSuccess: function (data, player) {
    this.player = player;

    this.socket.emit('player', {
      playerId: player.id
    });
    this.socket.emit('info', 'Hello ' + player.name);
    this.socket.emit('info', 'Your `playerId` is ' + player.id);
    this.socket.emit('info', 'Please join a game by calling `setupGame` with your `playerId` and `ships` as ' +
      '`[{name: name, coord: "top-left coord (a1, xy)", placement: "horizontal (h) or vertical (v)"}]` where `name` ' +
      'is one of each: `carrier`, `battleship`, `sub`, `cruiser`, `patrol`');

    this.socket.on('setupGame', _.bind(this.setupGame, this));
  },

  setupGame: function (data) {
    var allCoords = [],
        error = _.bind(this.handleError, this),
        maxShips = 10,
        maxShipPerType = 2,
        ships = {},
        shipTypeCount = {},
        success = _.bind(this.handleSetupGameSuccess, this),
        xCoords = [
          'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'
        ],
        yMax = 10,
        yMin = 1,
        coords,
        coordsMatched,
        length,
        xCoord,
        xCoordI,
        yCoord;

    if (data.playerId !== this.player.id.toString()) {
      return this.socket.emit('error', '`playerId` does not match');
    }

    if (data.ships.length !== maxShips) {
      return this.socket.emit('error', 'The number of `ships` must be ' + maxShips);
    }

    _.forEach(data.ships, function (ship, key) {
      coords = [];
      shipTypeCount[ship.name] = (shipTypeCount[ship.name] || 0) + 1;

      coordsMatched = ship.coord.match(/[a-z]{1}\d{2}/);

      if (!coordsMatched) {
        return this.socket.emit('error', '`ships` coords are incorrect: ' + ship.name);
      }

      if (shipTypeCount[ship.name] > maxShipPerType) {
        return this.socket.emit('error', 'Too many `ships` of type: ' + ship.name);
      }

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
          return this.socket.emit('error', '`ship` is incorrect: ' + ship.name);
      }

      xCoord = ship.coord[0];

      if (!_.contains(xCoords, xCoord)) {
        return this.socket.emit('error', '`ship` X coords are incorrect: ' + ship.name);
      }

      yCoord = +ship.coord[1];
      console.log(yCoord);
      if (yCoord > yMax || yCoord < yMin) {
        return this.socket.emit('error', '`ship` Y coords are incorrect: ' + ship.name);
      }

      switch (ship.placement) {
        case 'h':
          if (yCoord > yMax - length) {
            return this.socket.emit('error', '`ship` is vertically off the board: ' + ship.name);
          }

          _.times(length, function (i) {
            coords.push(xCoord + i);
          });
          break;

        case 'v':
          xCoordI = xCoords.indexOf(xCoord);

          if (xCoordI + 1 > yMax - length) {
            return this.socket.emit('error', '`ship` is horizontally off the board: ' + ship.name);
          }

          _.forEach(xCoords.slice(xCoordI), function (x, i) {
            coords.push(x + (i + yCoord));
          });
          break;

        default:
          return this.socket.emit('error', '`ship` placement is incorrect: ' + ship.name);
      }

      if (!_.every(coords, function (coord) {
        return !_.contains(allCoords, coord);
      })) {
        return this.socket.emit('error', '`ships` overlap');
      }

      allCoords = allCoords.concat(coords);

      ships[ship.name + key] = coords;
    }, this);

    db.setupGame(this.player.id, ships)
      .then(success, error);
  },

  handleSetupGameSuccess: function (game) {
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
  },

  handleShot: function (data) {
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
  },

  handleShotSuccess: function (shot) {
    this.socket.emit('shot', shot);

    this.socket.emit('info', 'That shot was a ' + (shot.hit ? 'hit' : 'miss') + '!');

    if (shot.sunk) {
      this.socket.emit('info', 'You sunk a ship!');
    }

    if (shot.won) {
      this.socket.emit('info', 'You won the game!');
    }
  },

  addListeners: function () {
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
  },

  handleShipStream: function (ship) {
    this.socket.emit('ship', ship);
    this.socket.emit('info', 'Your ship ' + ship.type + ' has been hit!');

    if (ship.sunk) {
      this.socket.emit('info', 'Your ship ' + ship.type + ' has been sunk!');
    }
  },

  handleGameStream: function (game) {
    this.socket.emit('game', game);

    if (game.ended) {
      this.socket.emit('info', 'The game has ended');
      this.socket.emit('info', 'The winner of the game is: ' + 
        (game.winner === this.player.id.toString() ? 'you' : 'opponent'));
    }
  }
});

module.exports = API;
