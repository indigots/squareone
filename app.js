var port = 3003;

var express = require('express');
var app = express();
var cookieParser = require('cookie-parser');
var compression = require('compression');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var bodyParser = require('body-parser');

var mysqloptions = require('./mysqloptions');
var options = require('./options');

app.use(morgan('combined'));
app.use(compression());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({extended: true, limit: '50mb'}));
app.use(cookieParser(options.cookieSecret));

var mysql = require('mysql');
var pool = mysql.createPool(mysqloptions);

var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
mysqloptions.database = mysqloptions.sessiondatabase;
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

var captcha = require('easy-captcha');
app.use('/captcha.jpg', captcha.generate());
app.post('/apiregister', captcha.check, apiVerifyCaptcha);
function apiVerifyCaptcha(req, res){
  res.setHeader('Content-Type', 'application/json');
  if(!req.session.captcha.valid){
    res.send(JSON.stringify({result: 'Bad captcha'}));
  } else {
    delete req.session.captcha.text;
    apiRegisterNew(req, res);
  }
}
function apiRegisterNew(req, res){
  var name = req.body.username;
  var pass = req.body.password;
  //user.addUser(name, pass, pool, result);
  console.log('Unimplemented: add user');
  result(null);
  function result(err){
    if(err){
      if(err == 'exists'){
        res.send(JSON.stringify({result: 'User already exists.'}));
      } else {
        console.log('Error api adding new user: ' + err);
        res.send(JSON.stringify({result: 'There was an error creating your user'}));
      }
    } else {
      req.session.user = {};
      req.session.user.name = name;
      req.session.user.authenticated = true;
      res.send(JSON.stringify({result: 'success'}));
    }
  }
}

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});


app.listen(port, function() {
  console.log('PW Store listening on port ' + port);
});
