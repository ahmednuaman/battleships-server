var _ = require('lodash'),
    db = require('lib/db');
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
    
  });
});
