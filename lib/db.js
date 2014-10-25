var _ = require('lodash'),
    mongoose = require('mongoose'),
    ObjectId = mongoose.Schema.Types.ObjectId,
    q = require('q'),
    connection,
    db,
    models,
    schemas;

db = {
  connect: function () {
    var dfd = q.defer();

    mongoose.connect('mongodb://127.0.0.1/battleships-server');
    db = mongoose.connection;

    db.once('error', dfd.reject)
      .once('open', dfd.resolve);

    return dfd.promise;
  },

  setupSchemasAndModels: function () {
    models = {};
    schemas = {
      player: {
        name: String
      },
      game: {
        player1: ObjectId,
        player2: ObjectId,
        started: Date,
        ended: Date,
        winner: ObjectId,
        turn: ObjectId
      },
      ship: {
        player: ObjectId,
        game: ObjectId,
        coords: mongoose.Schema.Types.Mixed,
        sunk: {
          type: Boolean,
          default: false
        }
      },
      shot: {
        player: ObjectId,
        game: ObjectId,
        coord: String,
        time: {
          type: Date,
          default: Date.now
        }
      }
    };

    _.forEach(schemas, function (schema, name) {
      schema = mongoose.Schema(schema);
      models[name] = mongoose.model(name, schema);
    });
  },

  setupPlayer: function (playerName, playerId) {
    var dfd = q.defer();

    if (!playerName) {
      return dfd.reject('Name required');
    };

    if (playerId) {
      models.player.findOne({
        id: ObjectId.fromString(playerId);
      }, function (err, player) {
        if (err) {
          return dfd.reject(err);
        }

        if (player.name !== playerName) {
          return dfd.reject('Player name mismatch');
        }

        dfd.resolve(player);
      });
    } else {
      dfd.resolve(new models.player({
        name: playerName
      }));
    }

    return dfd.promise;
  },

  setupGame: function (playerId, ships) { 
    var dfd = q.defer();

    playerId = ObjectId.fromString(playerId);

    models.game.findOne({
      started: {
        $exists: false
      }, 
      player2: {
        $exists: false
      }
    }, function (err, game) {
      if (err) {
        return dfd.reject(err);
      }

      if (game) {
        game.player2 = playerId;
        game.started = Date.now;
      } else {
        game = new models.game({
          player1: playerId
        });
      }

      game.save(function (err) {
        if (err) {
          return dfd.reject(err);
        }

        q.all(_.map(ships, function (coords) {
          var dfd = q.defer();

          new models.ship({
            player: playerId,
            game: game.id,
            coords: _.forOwn(_.zipObject(coords), function (value, key, obj) {
              obj[key] = false;
            })
          }).save(function (err) {
            if (err) {
              return dfd.reject(err);
            }

            dfd.resolve();
          });
        }))
          .then(function () {
            dfd.resolve(game);
          });
      });
    });

    return dfd.promise;
  },

  handleShot: function (playerId, gameId, coord) {
    var dfd = q.defer(),
        shot;

    gameId = ObjectId.fromString(gameId);
    playerId = ObjectId.fromString(playerId);

    models.game.findOne({
      $or: [{
        player1: playerId
      }, {
        player2: playerId
      }],
      id: gameId,
      turn: playerId
    }, function (err, game) {
      if (err || !game) {
        return dfd.reject(err || 'No game found');
      }

      new models.shot({
        player: playerId,
        game: gameId,
        coord: coord
      }).save(function (err, shot) {
        if (err) {
          return dfd.reject(err);
        }

        models.ship.find({
          player: playerId,
          game: gameId,
          sunk: false
        }, function (err, ships) {
          var hit,
              sunk,
              won;

          if (err || !ships) {
            return dfd.reject(err || 'No ships found, hmmm');
          }

          q.all(_.forEach(ships, function () {
            
          }))
            .then(dfd.resolve({
              hit: hit,
              sunk: sunk,
              won: won
            }));
        });
      });
    });

    return dfd.promise;
  },

  init: function () {
    return db.connect()
      .then(db.setupSchemasAndModels);
  }
};

module.exports = db;