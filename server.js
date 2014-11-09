var api = require('.lib/api'),
    app = require('express')(),
    server = require('http').Server(app);

server.listen(80);

app.use(express.static(__dirname + '/public'));
api.init(server);
