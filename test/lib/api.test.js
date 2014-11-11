var _ = require('lodash'),
    expect = require('expect.js'),
    mockery = require('mockery'),
    sinon = require('sinon');

describe('api', function () {
  var API,
      db,
      promiseStub,
      socket;

  promiseStub = function () {
    return sinon.stub()
      .returns({
        then: sinon.spy()
      });
  };

  beforeEach(function () {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    mockery.registerMock('./db', db);

    API = require('../../lib/api');
    db = {
      init: promiseStub(),
      setupPlayer: promiseStub(),
      setupGame: promiseStub(),
      handleShot: promiseStub(),
      addShipListener: sinon.stub(),
      addGameListener: sinon.stub()
    };
    socket = {
      emit: sinon.stub(),
      close: sinon.stub(),
      on: sinon.stub()
    };
  });

  afterEach(function () {
    mockery.disable();
  });

  it('should construct a new API', function () {
    var api = new API(socket, db);

    expect(api.dbMock).to.be(db);
    expect(api.socket).to.be(socket);
  });

  it('should connect to the db', function () {
    var api = new API(socket, db);

    api.init();
    expect(socket.emit.calledWith('info', 'Let the battle commence!')).to.be.ok();
    expect(socket.emit.calledWith('info', 'Connecting to DB')).to.be.ok();
  });
});
