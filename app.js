var express = require('express');
var app = express();
var port = 3003;

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.listen(port, function() {
  console.log('PW Store listening on port ' + port);
});
