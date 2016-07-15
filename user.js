var scrypt = require('scrypt');
var pool;
var _newUser = 'INSERT INTO user (name, pass, recoverypass, storagekeys, recoverykeys, joined, lastlogin) VALUES (?,?,?,?,?,NOW(),NOW())';
var _selectUser = 'SELECT * FROM user WHERE name = ?';

function userManager(inPool) {
  pool = inPool;
}
userManager.prototype.addUser = function(inData, callback) {
  var passHash, recoveryHash, connection;
  var name = inData.username;
  var storagekeys = JSON.stringify(inData.storagekeys);
  var recoverykeys = JSON.stringify(inData.recoverystoragekeys);
  var start = new Date();
  scrypt.kdf(inData.password, {'N':18, 'r':8, 'p':1}, passwordHashDone);
  function passwordHashDone(err, hash){
    if(err){
      console.log('Error in scrypt: ' + err);
      callback('error');
      return;
    }
    var end = new Date();
    var diff = end - start;
    console.log('scrypt took: ' + diff + 'ms');
    passHash = hash.toString("base64");
    start = new Date();
    scrypt.kdf(inData.recoverypass, {'N':18, 'r':8, 'p':1}, recoveryHashDone);
  }
  function recoveryHashDone(err, hash){
    if(err){
      console.log('Error in scrypt part 2: ' + err);
      callback('error');
      return;
    }
    var diff = (new Date()) - start;
    console.log('scrypt took: ' + diff + 'ms');
    recoveryHash = hash.toString("base64");
    pool.getConnection(gotConnection);
  }
  function gotConnection(err, inConnection){
    connection = inConnection;
    if(err){console.log('Error getting connection. ' + err)};
    connection.query(_selectUser, [name], gotUser);
  }
  function gotUser(err, result){
    if(!err && result && result.length === 0){
      connection.query(_newUser, [name, passHash, recoveryHash, storagekeys, recoverykeys], inserted);
    } else {
      connection.release();
      callback('exists');
      return;
    }
  }
  function inserted(err, results){
    connection.release();
    if(err){
      callback(err);
    } else{
      callback(null);
    }
  }
}
userManager.prototype.authenticate = function(name, pass, callback){
  if(pass == ""){
    callback('No password given.');
  } else {
    pool.getConnection(gotConnection);
    function gotConnection(err, connection){
      if(err){console.log('Error getting connection. ' + err)};
      connection.query(_selectUser, [name], gotUser);
      function gotUser(err, results){
      connection.release();
        if(err){console.log('Error querying user. ' + err)};
        if(results && results.length == 1){
          //lastSession = results[0].sessionid;
          verify(pass, results[0].pass);
        } else {
          callback(null, false);
        }
      }
    }
    function verify(pass, storedPass){
      scrypt.verifyKdf(new Buffer(storedPass, 'base64'), new Buffer(pass), scryptReturn);
      function scryptReturn(err, result){
        if(!err && result){
          //updateLastLogin(name, sessionId, pool);
          callback(null, true);
        } else {
          callback(null, false);
        }
      };
    };
  }; //blank pass else
};


module.exports = userManager;
