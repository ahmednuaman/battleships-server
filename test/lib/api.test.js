var _ = require('lodash'),
    expect = require('expect.js'),
    mockery = require('mockery'),
    sinon = require('sinon');

describe('api', function () {
  var API,
      api,
      db,
      dbPromise,
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
      setupPlayer: sinon.stub(),
      setupGame: sinon.stub()
    };
    dbPromise = {
      init: promiseStub(db, 'init'),
      setupGame: promiseStub(db, 'setupGame')
    };
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
      expect(dbPromise.init.called).to.be.ok();
      expect(dbPromise.init.alwaysCalledWithMatch(Function, Function)).to.be.ok();
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

  describe('game', function () {
    var badDuplicateShips = [{
          name: 'carrier',
          coord: 'a1',
          placement: 'h'
        }, {
          name: 'carrier',
          coord: 'b1',
          placement: 'h'
        }, {
          name: 'battleship',
          coord: 'c1',
          placement: 'h'
        }, {
          name: 'battleship',
          coord: 'd1',
          placement: 'h'
        }, {
          name: 'sub',
          coord: 'e1',
          placement: 'h'
        }, {
          name: 'sub',
          coord: 'f1',
          placement: 'h'
        }, {
          name: 'cruiser',
          coord: 'g1',
          placement: 'h'
        }, {
          name: 'patrol',
          coord: 'i1',
          placement: 'h'
        }, {
          name: 'patrol',
          coord: 'j1',
          placement: 'h'
        }, {
          name: 'patrol',
          coord: 'j2',
          placement: 'h'
        }],
        badOverlappingShips = [{
          name: 'carrier',
          coord: 'a1',
          placement: 'h'
        }, {
          name: 'carrier',
          coord: 'b1',
          placement: 'h'
        }, {
          name: 'battleship',
          coord: 'c1',
          placement: 'h'
        }, {
          name: 'battleship',
          coord: 'd1',
          placement: 'h'
        }, {
          name: 'sub',
          coord: 'e1',
          placement: 'h'
        }, {
          name: 'sub',
          coord: 'f1',
          placement: 'h'
        }, {
          name: 'cruiser',
          coord: 'g1',
          placement: 'h'
        }, {
          name: 'cruiser',
          coord: 'h1',
          placement: 'h'
        }, {
          name: 'patrol',
          coord: 'i1',
          placement: 'h'
        }, {
          name: 'patrol',
          coord: 'i1',
          placement: 'h'
        }],
        badNumberShips = [{
          name: 'carrier',
          coord: 'a1',
          placement: 'h'
        }, {
          name: 'carrier',
          coord: 'b1',
          placement: 'h'
        }, {
          name: 'battleship',
          coord: 'c1',
          placement: 'h'
        }, {
          name: 'battleship',
          coord: 'd1',
          placement: 'h'
        }, {
          name: 'sub',
          coord: 'e1',
          placement: 'h'
        }, {
          name: 'sub',
          coord: 'f1',
          placement: 'h'
        }, {
          name: 'cruiser',
          coord: 'g1',
          placement: 'h'
        }, {
          name: 'cruiser',
          coord: 'h1',
          placement: 'h'
        }, {
          name: 'patrol',
          coord: 'i1',
          placement: 'h'
        }],
        badTypeOfShip = [{
          name: 'woop',
          coord: 'a1',
          placement: 'h'
        }, {
          name: 'carrier',
          coord: 'b1',
          placement: 'h'
        }, {
          name: 'battleship',
          coord: 'c1',
          placement: 'h'
        }, {
          name: 'battleship',
          coord: 'd1',
          placement: 'h'
        }, {
          name: 'sub',
          coord: 'e1',
          placement: 'h'
        }, {
          name: 'sub',
          coord: 'f1',
          placement: 'h'
        }, {
          name: 'cruiser',
          coord: 'g1',
          placement: 'h'
        }, {
          name: 'cruiser',
          coord: 'h1',
          placement: 'h'
        }, {
          name: 'patrol',
          coord: 'i1',
          placement: 'h'
        }, {
          name: 'patrol',
          coord: 'j1',
          placement: 'h'
        }],
        badXCoordOfShip = [{
          name: 'carrier',
          coord: 'z1',
          placement: 'h'
        }, {
          name: 'carrier',
          coord: 'b1',
          placement: 'h'
        }, {
          name: 'battleship',
          coord: 'c1',
          placement: 'h'
        }, {
          name: 'battleship',
          coord: 'd1',
          placement: 'h'
        }, {
          name: 'sub',
          coord: 'e1',
          placement: 'h'
        }, {
          name: 'sub',
          coord: 'f1',
          placement: 'h'
        }, {
          name: 'cruiser',
          coord: 'g1',
          placement: 'h'
        }, {
          name: 'cruiser',
          coord: 'h1',
          placement: 'h'
        }, {
          name: 'patrol',
          coord: 'i1',
          placement: 'h'
        }, {
          name: 'patrol',
          coord: 'j1',
          placement: 'h'
        }],
        badYCoordOfShip = [{
          name: 'carrier',
          coord: 'a50',
          placement: 'h'
        }, {
          name: 'carrier',
          coord: 'b1',
          placement: 'h'
        }, {
          name: 'battleship',
          coord: 'c1',
          placement: 'h'
        }, {
          name: 'battleship',
          coord: 'd1',
          placement: 'h'
        }, {
          name: 'sub',
          coord: 'e1',
          placement: 'h'
        }, {
          name: 'sub',
          coord: 'f1',
          placement: 'h'
        }, {
          name: 'cruiser',
          coord: 'g1',
          placement: 'h'
        }, {
          name: 'cruiser',
          coord: 'h1',
          placement: 'h'
        }, {
          name: 'patrol',
          coord: 'i1',
          placement: 'h'
        }, {
          name: 'patrol',
          coord: 'j1',
          placement: 'h'
        }],
        goodShips = [{
          name: 'carrier',
          coord: 'a1',
          placement: 'h'
        }, {
          name: 'carrier',
          coord: 'b1',
          placement: 'h'
        }, {
          name: 'battleship',
          coord: 'c1',
          placement: 'h'
        }, {
          name: 'battleship',
          coord: 'd1',
          placement: 'h'
        }, {
          name: 'sub',
          coord: 'e1',
          placement: 'h'
        }, {
          name: 'sub',
          coord: 'f1',
          placement: 'h'
        }, {
          name: 'cruiser',
          coord: 'g1',
          placement: 'h'
        }, {
          name: 'cruiser',
          coord: 'h1',
          placement: 'h'
        }, {
          name: 'patrol',
          coord: 'i1',
          placement: 'h'
        }, {
          name: 'patrol',
          coord: 'j1',
          placement: 'h'
        }],
        playerId = '1',
        func;

    func = function (ships) {
      return {
        playerId: playerId,
        ships: ships
      };
    };

    it('should set up a game', function () {
      api.setupPlayerSuccess({}, {
        id: playerId
      });
      api.setupGame(func(goodShips));

      expect(dbPromise.setupGame.called).to.be.ok();
    });

    it('should complain about duplicate ships', function () {
      api.setupPlayerSuccess({}, {
        id: playerId
      });
      api.setupGame(func(badDuplicateShips));

      expect(socket.emit.calledWith('error', 'Too many `ships` of type: patrol')).to.be.ok();
    });

    it('should complain about overlapping ships', function () {
      api.setupPlayerSuccess({}, {
        id: playerId
      });
      api.setupGame(func(badOverlappingShips));

      expect(socket.emit.calledWith('error', '`ships` overlap')).to.be.ok();
    });

    it('should complain about an incorrect number of ships', function () {
      api.setupPlayerSuccess({}, {
        id: playerId
      });
      api.setupGame(func(badNumberShips));

      expect(socket.emit.calledWith('error', 'The number of `ships` must be 10')).to.be.ok();
    });

    it('should complain about an incorrect type of ship', function () {
      api.setupPlayerSuccess({}, {
        id: playerId
      });
      api.setupGame(func(badTypeOfShip));

      expect(socket.emit.calledWith('error', '`ship` is incorrect: woop')).to.be.ok();
    });

    it('should complain about an incorrect X/Y coords of ships', function () {
      api.setupPlayerSuccess({}, {
        id: playerId
      });
      api.setupGame(func(badXCoordOfShip));

      expect(socket.emit.calledWith('error', '`ship` X coords are incorrect: carrier')).to.be.ok();

      api.setupGame(func(badYCoordOfShip));

      expect(socket.emit.calledWith('error', '`ship` Y coords are incorrect: carrier')).to.be.ok();
    });
  });
});
