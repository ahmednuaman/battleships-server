var _ = require('lodash'),
    expect = require('expect.js'),
    mockery = require('mockery'),
    sinon = require('sinon');

describe('api', function () {
  var API,
      api,
      db,
      promiseStub,
      socket;

  promiseStub = function (target, method) {
    var then = sinon.spy();

    target[method] = sinon.stub()
      .returns({
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

    mockery.registerMock('./db', db);

    API = require('../../lib/api');
    db = {
      init: null
    };
    socket = {
      emit: sinon.stub(),
      close: sinon.stub(),
      on: sinon.stub()
    };

    api = new API(socket, db);
  });

  afterEach(function () {
    mockery.disable();
  });

  it('should construct a new API', function () {
    expect(api.dbMock).to.be(db);
    expect(api.socket).to.be(socket);
  });

  it('should connect to the db', function () {
    var then = promiseStub(db, 'init');

    api.init();
    expect(socket.emit.calledWith('info', 'Let the battle commence!')).to.be.ok();
    expect(socket.emit.calledWith('info', 'Connecting to DB')).to.be.ok();
    expect(then.called).to.be.ok();
  });

  it('should handle errors', function () {
    var err = 'foo';

    api.handleDBError();
    expect(socket.emit.calledWith('error', 'Failed to connect to DB')).to.be.ok();
    expect(socket.close.called).to.be.ok();

    api.handleError(err);
    expect(socket.emit.calledWith('error', err)).to.be.ok();
  });
});
