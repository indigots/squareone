/* Copyright (c) 2016 Todd Switzer */
$(document).ready(function(){
  $('#register-form').submit(function(event){
    doRegister();
    event.preventDefault();
  });
  kdfWorker = new Worker('/javascripts/pwstore/kdfworker.js');
});

psGlobals = {};

function doRegister(){
  resetStatus();
  $('#register-button').toggleClass('pure-button-disabled').attr("disabled", true);
  var pass = $('#register-password').val();
  var pass2 = $('#register-password2').val();
  var username = $('#register-username').val();
  psGlobals.username = username;
  psGlobals.captcha = $('#register-captcha').val();
  if(pass !== pass2){
    alert("Passwords do not match!");
    $('#register-button').removeClass('pure-button-disabled').attr("disabled", false);
    return;
  }
  //var keyBytes = doScryptLogin(username, pass, scryptGlobal, updateRStatus);
  //var keyHex = Crypto.util.bytesToHex(keyBytes);
  //alert(keyHex);
  //doKDF(username, pass);
  updateStatus('Performing PBKDF2...');
  kdfWorker.onmessage = gotPassKdf;
  kdfWorker.postMessage({username: username, password: pass});
}

function gotPassKdf(event){
  psGlobals.encKey = event.data.substr(0,64);
  psGlobals.signKey = event.data.substr(64,64);
  psGlobals.passKey = event.data.substr(128,128);
  if(psGlobals.encKey.length !== 64 || psGlobals.signKey.length !== 64 || psGlobals.passKey.length !== 128){
    updateStatus('Error: Keys were not created properly.<br />\n');
    $('#register-button').toggleClass('pure-button-disabled').attr("disabled", false);
    return;
  }
  updateStatus('done<br />\n');
  updateStatus('Creating recovery key...<br>\n');
  var possible = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  psGlobals.recoveryPass = "";
  for(var i=0; i<24; i++){
    psGlobals.recoveryPass += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  updateStatus(psGlobals.recoveryPass + '<br>\n');
  updateStatus('Performing PBKDF2...');
  kdfWorker.onmessage = gotRecoveryKdf;
  kdfWorker.postMessage({username: psGlobals.username, password: psGlobals.recoveryPass});
}

function gotRecoveryKdf(event){
  psGlobals.recoveryEncKey = event.data.substr(0,64);
  psGlobals.recoverySignKey = event.data.substr(64,64);
  psGlobals.recoveryPassKey = event.data.substr(128,128);
  var keydata = encryptSessionKeys();
  apiRegister({
    username: psGlobals.username, 
    password: psGlobals.passKey, 
    recoverypass: psGlobals.recoveryPassKey, 
    captcha: psGlobals.captcha,
    userdata: keydata
  });
}

function encryptSessionKeys(){
  var storeEncKey = new Uint8Array(32);
  asmCrypto.getRandomValues(storeEncKey);
  console.log('Storage Enc Key: ' + asmCrypto.bytes_to_hex(storeEncKey));
  var storeSignKey = new Uint8Array(32);
  asmCrypto.getRandomValues(storeSignKey);
  console.log('Storage Sign Key: ' + asmCrypto.bytes_to_hex(storeSignKey));
  var toReturn = {
    encryptedEncKey: ezenc(storeEncKey, psGlobals.encKey, psGlobals.signKey),
    encryptedSignKey: ezenc(storeSignKey, psGlobals.encKey, psGlobals.signKey),
    recoveryEncryptedEncKey: ezenc(storeEncKey, psGlobals.recoveryEncKey, psGlobals.recoverySignKey),
    recoveryEncryptedSignKey: ezenc(storeSignKey, psGlobals.recoveryEncKey, psGlobals.recoverySignKey)
  };
  return toReturn;

}

function apiRegister(inData){
  updateStatus('Registering user...');
  $.ajax({
    type: "POST",
    url: "/apiregister",
    data: inData
  })
  .done(function(data){
    if(data.result == 'success'){
      updateStatus('done<br />\n');
      $('#register-login-button').show();
    } else {
      updateStatus('failed: ' + data.result + '<br />\n');
      $('#register-button').removeClass('pure-button-disabled').attr("disabled", false);
    }
  }).fail(function() {
    updateStatus('failed: Error contacting remote server.<br />\n');
    $('#register-button').removeClass('pure-button-disabled').attr("disabled", false);
  });
}

function resetStatus(){
  $('#register-status').html('');
}

function updateStatus(text){
  var orig = $('#register-status').html();
  $('#register-status').html(orig + text);
}
