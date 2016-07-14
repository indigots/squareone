var scrypt = require('scrypt');
var pool;
var _newUser = 'INSERT INTO user (name, pass, recoverypass, storagekeys, recoverykeys, joined, lastlogin) VALUES (?,?,?,?,?,NOW(),NOW())';
var _selectUser = 'SELECT * FROM user WHERE name = ?';

function userManager(inPool) {
  pool = inPool;
}
userManager.prototype.addUser = function(inData, callback) {
  console.log('Now pool is: ' + Object.prototype.toString.call(this.pool));
  var passHash, recoveryHash, connection;
  var name = inData.username;
  var storagekeys = JSON.stringify(inData.storagekeys);
  var recoverykeys = JSON.stringify(inData.recoverystoragekeys);
  console.log('Unimplemented: add user in userManager');
  console.log('Username: ' + inData.username);
  console.log('Password to scrypt: ' + inData.password);
  scrypt.kdf(inData.password, {N: 1, r:1, p:1}, passwordHashDone);
  function passwordHashDone(err, hash){
    if(err){
      console.log('Error in scrypt: ' + err);
      callback('error');
      return;
    }
    passHash = hash.toString("base64");
    console.log('Scrypted password: ' + passHash);
    console.log('Recovery pass to scrypt: ' + inData.recoverypass);
    scrypt.kdf(inData.recoverypass, {N: 1, r:1, p:1}, recoveryHashDone);
  }
  function recoveryHashDone(err, hash){
    if(err){
      console.log('Error in scrypt part 2: ' + err);
      callback('error');
      return;
    }
    recoveryHash = hash.toString("base64");
    pool.getConnection(gotConnection);
  }
  function gotConnection(err, inConnection){
    connection = inConnection;
    if(err){console.log('Error getting connection. ' + err)};
    console.log('Name now is: ' + name);
    connection.query(_selectUser, [name], gotUser);
  }
  function gotUser(err, result){
    if(!err && result && result.length === 0){
      connection.query(_newUser, [name, passHash, recoveryHash, storagekeys, recoverykeys], inserted);
    } else {
      callback('exists');
      return;
    }
  }
  function inserted(err, results){
    if(err){
      callback(err);
    } else{
      callback(null);
    }
  }
}


module.exports = userManager;
