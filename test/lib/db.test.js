var db = require('lib/db');
    expect = require('expect.js'),
    mockgoose = require('mockgoose'),
    mongoose = require('mongoose');

mockgoose(mongoose);

describe('db', function () {
  beforeEach(function () {
    mockgoose.reset();
  });

  it('should connect to the db', function (done) {
    db.init(mockgoose)
      .then(done);
  });
});
