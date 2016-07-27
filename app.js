var port = 3003;

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var sharedSession = require('express-socket.io-session');
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
var userManager = require('./user');
var user = new userManager(pool);

var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
mysqloptions.database = mysqloptions.sessiondatabase;
var connection = mysql.createConnection(mysqloptions);
var sessionStore = new MySQLStore({}, connection);
var halfHour = 1800000;
var sessionMiddleware = session({
  secret: options.sessionSecret,
  store: sessionStore,
  maxAge: halfHour,
  resave: true,
  saveUninitialized: true
});
app.use(sessionMiddleware);

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
  user.addUser(req.body, result);
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
      req.session.user.name = req.body.username;
      req.session.user.authenticated = true;
      res.send(JSON.stringify({result: 'success'}));
    }
  }
}

app.post('/apilogin', apiLogin);
function apiLogin(req, res){
  res.setHeader('Content-Type', 'application/json');
  user.authenticate(req.body.username, req.body.password, result);
  function result(err, result, userdata){
    if(err){
      console.log('Got error back from authentication.');
      res.send(JSON.stringify({result: 'error'}));
      return;
    }
    if(!result){
      res.send(JSON.stringify({result: 'failure'}));
      return;
    }
    req.session.user = {};
    req.session.user.name = req.body.username;
    req.session.user.authenticated = true;
    res.send(JSON.stringify({result: 'success', userdata: userdata}));
    console.log('Got success back from authentication.');
  }
}

app.post('/apilogout', apiLogout);
function apiLogout(req, res){
  delete req.session.user;
  delete req.session.authenticated;
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({result: 'success'}));
}

app.post('/apistore', apiStore);
function apiStore(req, res){
  res.setHeader('Content-Type', 'application/json');
  if(!req.session.user || !req.session.user.authenticated){
    res.send(JSON.stringify({result: 'noauth'}));
    return;
  }
  var name = req.session.user.name;
  if(name 
    && req.body.uid 
    && req.body.type 
    && req.body.data
    && req.body.id
  ){
    user.upsertObject(name, req.body.uid, req.body.type, req.body.data, doneUpsert);
    io.to(name).emit('updatedobject', {uid: req.body.uid, cipher: req.body.data, origin: req.body.id});
  } else {
    res.send(JSON.stringify({result: 'There was an error in the inputs.'}));
  }
  function doneUpsert(err){
    if(err){
      res.send(JSON.stringify({result: 'Error storing object to the db.'}));
    } else {
      res.send({result: 'success'});
    }
  }
}

app.post('/apidelete', apiDelete);
function apiDelete(req, res){
  res.setHeader('Content-Type', 'application/json');
  if(!req.session.user || !req.session.user.authenticated){
    res.send(JSON.stringify({result: 'noauth'}));
    return;
  }
  var name = req.session.user.name;
  if(name
    && req.body.uid
    && req.body.id
    && req.body.type
  ){
    user.deleteObject(name, req.body.uid, req.body.type, doneDelete);
    io.to(name).emit('deletedobject', {uid: req.body.uid, origin: req.body.id});
  } else {
    res.send(JSON.stringify({result: 'There was an error in the inputs.'}));
  }
  function doneDelete(err){
    if(err){
      res.send(JSON.stringify({result: 'Error deleting object from the db.'}));
    } else {
      res.send({result: 'success'});
    }
  }
}

app.post('/apimassfetch', apiMassFetch);
function apiMassFetch(req, res){
  res.setHeader('Content-Type', 'application/json');
  var name = req.session.user.name;
  if(!req.session.user.authenticated){
    res.send(JSON.stringify({result: 'noauth'}));
    return;
  }
  var name = req.session.user.name;
  if(name && req.body.type){
    user.massFetch(name, req.body.type, doneFetch);
  } else {
    res.send(JSON.stringify({result: 'There was an error in the inputs.'}));
  }
  function doneFetch(err, data){
    if(err){
      res.send(JSON.stringify({result: 'Error fetching objects from the db.'}));
    } else {
      res.send(JSON.stringify({result: 'success', data: data}));
    }
  }
}

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});
io.use(sharedSession(sessionMiddleware, {autoSave: true}));
io.on('connection', function(socket){
  console.log(JSON.stringify(socket.handshake.session));
  if(socket.handshake.session && socket.handshake.session.user && socket.handshake.session.user.authenticated){
    var user = socket.handshake.session.user.name;
    console.log(user + ' is authenticated and on the socket.');
    socket.join(user);
  } else {
    console.log('an unauthed user connected');
  }
});

http.listen(port, function() {
  console.log('PW Store listening on port ' + port);
});
