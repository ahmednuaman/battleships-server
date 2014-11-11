var _ = require('lodash'),
    expect = require('expect.js'),
    mockery = require('mockery'),
    sinon = require('sinon');

describe('handler', function () {
  beforeEach(function () {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });
  });

  afterEach(function () {
    mockery.disable();
  });

  it('should set up a new socket.io session and pass it to the API', function (done) {
    var apiStub = sinon.stub(),
        ioOnStub = sinon.stub(),
        ioStub = sinon.stub(),
        server = sinon.stub(),
        socket = sinon.stub(),
        handler;

    ioStub.returns({
      on: function (event, callback) {
        expect(event).to.be('connection');
        callback.call(null, socket);
        expect(apiStub.calledWith(socket)).to.be.ok();
        done();
      }
    });

    mockery.registerMock('./api', apiStub);
    mockery.registerMock('socket.io', ioStub);

    handler = require('../../lib/handler');
    handler.init(server);

    expect(ioStub.calledWith(server)).to.be.ok();
  });
});
