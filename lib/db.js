var _ = require('lodash'),
    mongoose = require('mongoose'),
    ObjectId = mongoose.Schema.Types.ObjectId,
    q = require('q'),
    connection,
    db,
    models,
    schemas;

db = {
  connect: function (mock) {
    var dfd = q.defer(),
        connection;

    /* istanbul ignore else */
    if (mock) {
      mongoose = mock(mongoose);
      dfd.resolve();
    } else {
      mongoose.connect('mongodb://127.0.0.1/battleships-server');
      connection = mongoose.connection;

      connection.once('error', dfd.reject)
        .once('open', dfd.resolve);
    }

    return dfd.promise;
  },

  setupSchemasAndModels: function () {
    models = {};
    schemas = {
      player: {
        name: {
          type: String,
          unique: true
        }
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

    db.models = models;
    db.schemas = schemas;
  },

  setupPlayer: function (playerName, playerId) {
    var dfd = q.defer(),
        player;

    if (!playerName) {
      dfd.reject('Name required');
    } else {
      if (playerId) {
        models.player.findById(playerId, {
          name: playerName
        }, function (err, player) {
          if (err) {
            return dfd.reject(err);
          }

          dfd.resolve(player);
        });
      } else {
        player = new models.player({
          name: playerName
        });

        player.save(function (err) {
          if (err) {
            return dfd.reject(err);
          }

          dfd.resolve(player);
        });
      }
    }

    return dfd.promise;
  },

  setupGame: function (playerId, ships) { 
    var dfd = q.defer();

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

      shot = new models.shot({
        player: playerId,
        game: gameId,
        coord: coord
      });

      shot.save(function (err) {
        if (err) {
          return dfd.reject(err);
        }

        models.ship.find({
          player: playerId,
          game: gameId,
          sunk: false
        }, function (err, ships) {
          var done,
              hit,
              sunk,
              won;

          if (err || !ships) {
            return dfd.reject(err || 'No ships found, hmmm');
          }

          q.all(_.forEach(ships, function (ship) {
            if (ship.coords[shot.coord] !== undefined) {
              ship.coords[shot.coord] = hit = true;
              ship.save(function (err) {
                if (err) {
                  return dfd.reject(err);
                }

                if (_.isEqual(_.uniq(_.values(ship.coords)), [true])) {
                  ship.sunk = sunk = true;
                }

                ship.save(function (err) {
                  if (err) {
                    return dfd.reject(err);
                  }

                  dfd.resolve(ship);
                });
              });
            } else {
              dfd.resolve(ship);
            }
          }))
            .then(function (ships) {
              done = function () {
                dfd.resolve({
                  hit: hit,
                  sunk: sunk,
                  won: won
                });
              };
              won = _.isEqual(_.uniq(_.map(ships, function (ship) {
                return ship.sunk;
              })), [true]);

              if (won) {
                game.winner = playerId;
                game.ended = Date.now;
                game.save(function (err) {
                  if (err) {
                    return dfd.reject(err);
                  }

                  done();
                });
              } else {
                done();
              }
            });
        });
      });
    });

    return dfd.promise;
  },

  init: function (mock) {
    return db.connect(mock)
      .then(db.setupSchemasAndModels);
  }
};

module.exports = db;
