var express = require('express');
var app = express();
var port = 3003;

var mysqloptions = require('./mysqloptions');
var options = require('./options');

var mysql = require('mysql');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);

var connection = mysql.createConnection(mysqloptions);
var sessionStore = new MySQLStore({}, connection);

var halfHour = 1800000;
app.use(session({
  secret: options.sessionSecret,
  store: sessionStore,
  maxAge: halfHour,
  resave: true,
  saveUninitialized: true
}));

app.use(express.static(__dirname + 'public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});


app.listen(port, function() {
  console.log('PW Store listening on port ' + port);
});
