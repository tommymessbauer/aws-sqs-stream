var SqsPlugin = require('../../index.js').SqsPlugin;
var assert = require('assert');
var _ = require('lodash');
var broadway = require('broadway');
var async = require('async');
var MemoryStream = require('memory-stream');
var sqsOptions = require('../private-sqs-options.json');
var validate = require('../validate.js');

suite('Test Sqs Read Stream - Streams 2 interface', function() {

  this.timeout(120000);

  var app = {
    plugins: new broadway.App()
  };

  app.plugins.use(new SqsPlugin('sqs'), sqsOptions);

  setup(function(done) {

    app.plugins.init(function(err) {
      assert.ifError(err);

      var inserts = _.map(_.range(10), function() {

        return function(cb) {

          app.plugins.sqs.sqsClient.sendMessage({
            MessageBody: 'message ' + Math.random(),
            QueueUrl: sqsOptions.QueueUrl,
            DelaySeconds: 0,
          }, cb);
        };
      });

      async.parallel(inserts, done);

    });
  });

  test('Read Stream', function(done) {
    var readStream = app.plugins.sqs.messageStream();
    var writeStream = new MemoryStream({
      objectMode: true
    });

    readStream.on('error', function(err) {
      assert.ifError(err);
    });

    readStream.on('message', function(msg) {
      console.log(msg);
      app.plugins.sqs.ack(msg, function() { console.log('msg ack'); });
    });

    writeStream.on('finish', function() {
      var messages = writeStream.get();

      messages.forEach(validate);
      assert.equal(messages.length, 10, 'Should have processed 10 messages');

      setTimeout(function() {
        done();
      }, 1000);

    });

    readStream.pipe(writeStream);

  });

});
