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
app.post('/registernew', captcha.check, verifyCaptcha);
function verifyCaptcha(req, res){
  if(!req.session.captcha.valid){
    //res.render('error', {message: 'Captcha was incorrect.'});
    res.send('Captcha Error.');
  } else {
    delete req.session.captcha.text;
    res.send('Success.');
    //checkPasswords(req, res);
  }
};

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});


app.listen(port, function() {
  console.log('PW Store listening on port ' + port);
});
