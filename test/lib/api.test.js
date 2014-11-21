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
      init: sinon.stub()
    };
    dbThen = promiseStub(db, 'init');
    socket = {
      emit: sinon.stub(),
      close: sinon.stub(),
      on: sinon.stub()
    };

    mockery.registerMock('./db', db);

    API = require('../../lib/api');
    api = new API(socket, sinon.stub());
  });

  afterEach(function () {
    mockery.disable();
  });

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
