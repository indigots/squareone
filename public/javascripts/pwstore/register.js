/* Copyright (c) 2016 Todd Switzer */
$(document).ready(function(){
  $('#register-form').submit(function(event){
    doRegister();
    event.preventDefault();
  });
  kdfWorker = new Worker('/javascripts/pwstore/kdfworker.js');
  kdfWorker.onmessage = gotMessage;
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
  kdfWorker.postMessage({username: username, password: pass});
}

function gotMessage(event){
  //alert(JSON.stringify(event.data));
  psGlobals.encKey = event.data.encKey;
  psGlobals.signKey = event.data.signKey;
  psGlobals.passKey = event.data.passKey;
  if(psGlobals.encKey.length !== 64 || psGlobals.signKey.length !== 32 || psGlobals.passKey.length !== 32){
    updateStatus('Error: Keys were not created properly.<br />\n');
    $('#register-button').toggleClass('pure-button-disabled').attr("disabled", false);
    return;
  }
  updateStatus('done<br />\n');
  apiRegister(psGlobals.username, event.data.passKey, psGlobals.captcha);
}

function apiRegister(username, pass, captcha){
  updateStatus('Registering user...');
  $.ajax({
    type: "POST",
    url: "/apiregister",
    data: {username: username,
      password: pass,
      captcha: captcha}
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
