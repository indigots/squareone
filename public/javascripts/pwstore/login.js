/* Copyright (c) 2016 Todd Switzer */
$(document).ready(function(){
  $('#login-form').submit(function(event){
    doLogin();
    event.preventDefault();
  });
  kdfWorker = new Worker('/javascripts/pwstore/kdfworker.js');
});

psGlobals = {};

function doLogin(){
  resetStatus();
  $('#login-button').toggleClass('pure-button-disabled').attr("disabled", true);
  var pass = $('#login-password').val();
  var username = $('#login-username').val();
  psGlobals.username = username;
  updateStatus('Performing PBKDF2...');
  kdfWorker.onmessage = gotPassKdf;
  kdfWorker.postMessage({username: username, password: pass});
}

function gotPassKdf(event){
  psGlobals.encKey = event.data.substr(0,32);
  psGlobals.signKey = event.data.substr(32,32);
  psGlobals.passKey = event.data.substr(64,64);
  if(psGlobals.encKey.length !== 32 || psGlobals.signKey.length !== 32 || psGlobals.passKey.length !== 64){
    updateStatus('Error: Keys were not created properly.<br />\n');
    $('#login-button').toggleClass('pure-button-disabled').attr("disabled", false);
    return;
  }
  updateStatus('done<br />\n');
  apiLogin(psGlobals.username, psGlobals.passKey);
}

function decryptSessionKeys(keys){
  //var storeEncKey = new Uint8Array(32);
  //var storeSignKey = new Uint8Array(32);
  var encryptedStorageEncKey = asmCrypto.hex_to_bytes(JSON.parse(keys.storagekeys).encKey);
  psGlobals.storageEncKey = 
    asmCrypto.bytes_to_hex( asmCrypto.AES_CBC.decrypt( encryptedStorageEncKey, asmCrypto.hex_to_bytes(psGlobals.encKey)));
  console.log(psGlobals.storageEncKey);
  var encryptedStorageSignKey = asmCrypto.hex_to_bytes(JSON.parse(keys.storagekeys).signKey);
  psGlobals.storageSignKey = 
    asmCrypto.bytes_to_hex( asmCrypto.AES_CBC.decrypt( encryptedStorageSignKey, asmCrypto.hex_to_bytes(psGlobals.encKey)));
  console.log(psGlobals.storageSignKey);
}

function apiLogin(username, pass){
  updateStatus('Logging in...');
  $.ajax({
    type: "POST",
    url: "/apilogin",
    data: {username: username,
      password: pass}
  })
  .done(function(data){
    if(data.result == 'success'){
      updateStatus('done<br />\n');
      decryptSessionKeys(data.keys);
    } else {
      updateStatus('failed: ' + data.result + '<br />\n');
      $('#login-button').removeClass('pure-button-disabled').attr("disabled", false);
    }
  }).fail(function() {
    updateStatus('failed: Error contacting remote server.<br />\n');
    $('#login-button').removeClass('pure-button-disabled').attr("disabled", false);
  });
}

function resetStatus(){
  $('#login-status').html('');
}

function updateStatus(text){
  var orig = $('#login-status').html();
  $('#login-status').html(orig + text);
}
