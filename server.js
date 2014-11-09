var app = require('express')(),
    handler = require('.lib/handler'),
    server = require('http').Server(app);

server.listen(80);

app.use(express.static(__dirname + '/public'));
handler.init(server);
