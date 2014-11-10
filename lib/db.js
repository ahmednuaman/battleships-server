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
    var schemaOpts = {};

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
        type: String,
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

    schemaOpts = {
      game: {
        capped: 1e+7
      },
      shot: {
        capped: 2e+7
      }
    };

    _.forEach(schemas, function (schema, name) {
      schema = mongoose.Schema(schema, schemaOpts[name]);
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
          /* istanbul ignore if */
          if (err) {
            return dfd.reject(err);
          }

          if (!player) {
            return dfd.reject('Player not found');
          }

          dfd.resolve(player);
        });
      } else {
        player = new models.player({
          name: playerName
        });

        player.save(function (err) {
          /* istanbul ignore if */
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

    models.player.findById(playerId, function (err, player) {
      /* istanbul ignore if */
      if (err) {
        return dfd.reject(err);
      }

      models.game.find({
        $or: [{
          player1: playerId
        }, {
          player2: playerId
        }],
        ended: {
          $exists: false
        }
      }, function (err, game) {
        /* istanbul ignore if */
        if (err) {
          return dfd.reject(err);
        }

        if (!_.isEmpty(game)) {
          return dfd.reject('You can only play one game at the same time!');
        } 

        models.game.findOne({
          started: {
            $exists: false
          }, 
          player2: {
            $exists: false
          }
        }, function (err, game) {
          /* istanbul ignore if */
          if (err) {
            return dfd.reject(err);
          }

          if (game) {
            game.player2 = playerId;
            game.started = Date.now();
          } else {
            game = new models.game({
              player1: playerId,
              turn: playerId
            });
          }

          game.save(function (err) {
            /* istanbul ignore if */
            if (err) {
              return dfd.reject(err);
            }

            q.all(_.forEach(ships, function (coords, type) {
              var dfd = q.defer();

              new models.ship({
                player: playerId,
                game: game.id,
                type: type,
                coords: _.forOwn(_.zipObject(coords), function (value, key, obj) {
                  obj[key] = false;
                })
              }).save(function (err) {
                /* istanbul ignore if */
                if (err) {
                  return dfd.reject(err);
                }

                dfd.resolve();
              });
            }))
              .then(function () {
                dfd.resolve(game);
              }, dfd.reject);
          });
        });
      });
    });

    return dfd.promise;
  },

  handleShot: function (playerId, gameId, coord) {
    var dfd = q.defer(),
        shot;

    if (!coord) {
      dfd.reject('No coord sent');
    } else {
      models.game.findOne({
        $or: [{
          player1: playerId
        }, {
          player2: playerId
        }],
        _id: gameId,
        started: {
          $exists: true
        },
        ended: {
          $exists: false
        }
      }, function (err, game) {
        if (err || !game) {
          return dfd.reject(err || 'No game found');
        }

        if (game.turn.toString() !== playerId) {
          return dfd.reject('It\'s not your turn yet');
        }

        shot = new models.shot({
          player: playerId,
          game: gameId,
          coord: coord
        });

        shot.save(function (err) {
          /* istanbul ignore if */
          if (err) {
            return dfd.reject(err);
          }

          models.ship.find({
            player: playerId,
            game: gameId,
            sunk: false
          }, function (err, ships) {
            var hit = false,
                sunk = false,
                won = false,
                done;

            /* istanbul ignore if */
            if (err || !ships) {
              return dfd.reject(err || 'No ships found, hmmm');
            }

            q.all(_.forEach(ships, function (ship) {
              var d = q.defer();

              if (ship.coords[shot.coord] !== undefined) {
                ship.coords[shot.coord] = true;
                hit = ship.type;
                ship.save(function (err) {
                  /* istanbul ignore if */
                  if (err) {
                    return d.reject(err);
                  }

                  if (_.isEqual(_.uniq(_.values(ship.coords)), [true])) {
                    ship.sunk = true;
                    sunk = ship.type;
                  }

                  ship.save(function (err) {
                    /* istanbul ignore if */
                    if (err) {
                      return d.reject(err);
                    }

                    d.resolve(ship);
                  });
                });
              } else {
                d.resolve(ship);
              }

              return d.promise;
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
                  game.ended = Date.now();
                }

                game.turn = playerId.toString() === game.player1.toString() ? game.player2 : game.player1;
                game.save(function (err) {
                  /* istanbul ignore if */
                  if (err) {
                    return dfd.reject(err);
                  }

                  done();
                });
              });
          });
        });
      });
    }

    return dfd.promise;
  },

  addShipListener: function (playerId, gameId) {
    return models.ship.find({
      player: playerId,
      game: gameId
    });
  },

  addGameListener: function (playerId, gameId) {
    return models.game.find({
      $or: [{
        player1: playerId
      }, {
        player2: playerId
      }],
      _id: gameId,
      started: {
        $exists: true
      },
      ended: {
        $exists: false
      }
    });
  },

  init: function (mock) {
    return db.connect(mock)
      .then(db.setupSchemasAndModels);
  }
};

module.exports = db;
