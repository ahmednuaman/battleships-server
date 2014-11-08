var _ = require('lodash'),
    db = require('../../lib/db'),
    expect = require('expect.js'),
    mockgoose = require('mockgoose'),
    mongoose = require('mongoose'),
    sinon = require('sinon');

mockgoose(mongoose);

describe('db', function () {
  beforeEach(function () {
    mockgoose.reset();
  });

  describe('connection', function () {
    it('should connect to the db', function (done) {
      db.init(mockgoose)
        .then(function () {
          _.forEach(db.schemas, function (schema, name) {
            expect(db.models[name]).to.be.ok();
          });
          done();
        });
    });
  });

  describe('player', function () {
    it('should require a player name set', function (done) {
      db.setupPlayer()
        .then(null, function (msg) {
          expect(msg).to.be('Name required');
          done();
        });
    });

    it('should set up a new player', function (done) {
      db.setupPlayer('foo')
        .then(function (player) {
          expect(player.name).to.be('foo');
          expect(player.id).to.be.ok();
          done();
        });
    });

    it('should only allow unique names', function (done) {
      db.setupPlayer('foo')
        .then(function () {
          db.setupPlayer('foo')
            .then(null, function (err) {
              expect(err).to.be.an(Error);
              done();
            });
        });
    });

    it('should return an existing player', function (done) {
      db.setupPlayer('foo')
        .then(function (player) {
          db.setupPlayer('foo', player.id)
            .then(function (playa) {
              expect(player).to.eql(player);
              done();
            });
        });
    });

    it('should throw an error if the user is not found', function (done) {
      db.setupPlayer('foo', 'foo')
        .then(null, function (err) {
          expect(err).to.be.an(Error);
          done();
        });
    });
  });

  describe('game', function () {
    var ships = {
          a: ['a1', 'b1'], 
          b: ['d1', 'd2', 'd3']
        },
        player;

    beforeEach(function (done) {
      db.setupPlayer('foo')
        .then(function (playa) {
          player = playa;
          done();
        });
    });

    it('should throw an error if the player does not exist', function (done) {
      db.setupGame('foo')
        .then(null, function (err) {
          expect(err).to.be.an(Error);
          done();
        });
    });

    it('should create a game if there are none waiting to be started', function (done) {
      db.setupGame(player.id, ships)
        .then(function (game) {
          expect(game.player1.toString()).to.be(player.id);
          done();
        });
    });

    it('should not allow the same player to join more than one game', function (done) {
      db.setupGame(player.id, ships)
        .then(function (game) {
          db.setupGame(player.id, ships)
            .then(null, function (err) {
              expect(err).to.contain('one game at the same time');
              done();
            });
        });
    });

    it('should join the player to an exisiting game', function (done) {
      db.setupGame(player.id, ships)
        .then(function (game) {
          db.setupPlayer('foo2')
            .then(function (playa) {
              db.setupGame(playa.id, ships)
                .then(function (game) {
                  expect(game.player1.toString()).to.be(player.id);
                  expect(game.player2.toString()).to.be(playa.id);
                  expect(game.started).to.be.a(Date);
                  expect(game.started).to.be.ok();
                  done();
                });
            });
        });
    });
  });

  describe('shot', function () {
    var ships = {
          a: ['a1', 'b1'], 
          b: ['d1']
        },
        game,
        player1, 
        player2;

    beforeEach(function (done) {
      db.setupPlayer('foo')
        .then(function (player) {
          player1 = player;

          db.setupGame(player.id, ships)
            .then(function () {
              db.setupPlayer('foo2')
                .then(function (player) {
                  player2 = player;
                  
                  db.setupGame(player.id, ships)
                    .then(function (g) {
                      game = g;
                      done();
                    });
                });
            });
        });
    });

    it('should throw an error if a game is not found', function (done) {
      db.handleShot(null, null, 'foo')
        .then(null, function (err) {
          expect(err).to.contain('No game found');

          db.handleShot('foo', null, 'foo')
            .then(null, function (err) {
              expect(err).to.be.an(Error);

              db.handleShot(player1.id, 'foo', 'foo')
                .then(null, function (err) {
                  expect(err).to.be.an(Error);
                  done();
                });
            });
        });
    });

    it('should require coords', function (done) {
      db.handleShot(player1.id, game.id)
        .then(null, function (err) {
          expect(err).to.contain('No coord sent');
          done();
        });
    });

    it('should let player1 have first shot', function (done) {
      db.handleShot(player2.id, game.id, 'x1')
        .then(null, function (err) {
          expect(err).to.contain('not your turn');

          db.handleShot(player1.id, game.id, 'x1')
            .then(function (response) {
              expect(response.hit).not.to.be.ok();
              expect(response.sunk).not.to.be.ok();
              expect(response.win).not.to.be.ok();
              done();
            });
        });
    });

    it('should register a hit', function (done) {
      db.handleShot(player1.id, game.id, 'a1')
        .then(function (response) {
          expect(response.hit).to.be('a');
          expect(response.sunk).not.to.be.ok();
          expect(response.win).not.to.be.ok();
          done();
        });
    });

    it('should register a sunk ship', function (done) {
      db.handleShot(player1.id, game.id, 'd1')
        .then(function (response) {
          expect(response.hit).to.be('b');
          expect(response.sunk).to.be('b');
          expect(response.win).not.to.be.ok();
          done();
        });
    });
  });
});
