var _ = require('lodash'),
    expect = require('expect.js'),
    mockery = require('mockery'),
    sinon = require('sinon');

describe('api', function () {
  var API,
      api,
      db,
      dbThen,
      promiseStub,
      socket;

  promiseStub = function (target, method) {
    var then = sinon.spy();

    target[method].returns({
      then: then
    });

    return then;
  };

  beforeEach(function () {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    db = {
      init: sinon.stub(),
      setupPlayer: sinon.stub()
    };
    dbThen = promiseStub(db, 'init');
    socket = {
      emit: sinon.stub(),
      close: sinon.stub(),
      on: sinon.stub()
    };

    promiseStub(db, 'setupPlayer');
    mockery.registerMock('./db', db);

    API = require('../../lib/api');
    api = new API(socket, sinon.stub());
  });

  afterEach(function () {
    mockery.disable();
  });

  describe('setup', function () {
    it('should construct a new API', function () {
      expect(api.dbMock).to.be.a(Function);
      expect(api.socket).to.be(socket);
    });

    it('should connect to the db', function () {
      api.init();
      expect(socket.emit.calledWith('info', 'Let the battle commence!')).to.be.ok();
      expect(socket.emit.calledWith('info', 'Connecting to DB')).to.be.ok();
      expect(dbThen.called).to.be.ok();
      expect(dbThen.alwaysCalledWithMatch(Function, Function)).to.be.ok();
    });

    it('should handle errors', function () {
      var err = 'foo';

      api.handleDBError();
      expect(socket.emit.calledWith('error', 'Failed to connect to DB')).to.be.ok();
      expect(socket.close.called).to.be.ok();

      api.handleError(err);
      expect(socket.emit.calledWith('error', err)).to.be.ok();
    });

    it('should handle db success', function () {
      sinon.stub(api, 'addPlayerListeners');

      api.handleDBSuccess();
      expect(socket.emit.calledWith('info', 'Successfully connected to DB')).to.be.ok();
      expect(api.addPlayerListeners.called).to.be.ok();
    });
  });

  describe('player', function () {
    var data = function (playerName, playerId) {
      return {
        playerName: playerName,
        playerId: playerId
      };
    };

    it('should listen for new players', function () {
      api.addPlayerListeners();
      expect(socket.emit.calledWith('info', sinon.match('Please tell me who you are'))).to.be.ok();
      expect(socket.on.calledWith('setupPlayer', sinon.match.func)).to.be.ok();
    });

    it('should throw an error if a player is already defined', function () {
      api.player = {};
      api.setupPlayer(data());
      expect(socket.emit.calledWith('error', 'Player is already connected')).to.be.ok();
    });

    it('should convert data values to a string', function () {
      api.setupPlayer(data(1, 1));
      expect(db.setupPlayer.calledWithMatch('1', '1')).to.be.ok();
    });

    it('should require a playerName that is <= 25 chars', function () {
      api.setupPlayer(data());
      expect(socket.emit.calledWith('error', '`playerName` is invalid')).to.be.ok();

      api.setupPlayer(data(new Array(27).join('a')));
      expect(socket.emit.calledWith('error', '`playerName` is invalid')).to.be.ok();
    });

    it('should successfully setup a player', function () {
      var playerName = 'foo',
          playerId;

      [1, 2].forEach(function () {
        api.setupPlayer(data(playerName, playerId));
        expect(db.setupPlayer.calledWith(playerName, playerId)).to.be.ok();
        playerId = 'foo';
      });
    });

    it('should handle player setup success', function () {
      var playerId = '1';

      api.setupPlayerSuccess(data('', playerId), {
        id: playerId
      });
    });
  });
});
