/* Copyright (c) 2016 Todd Switzer */
$(document).ready(function(){
  $('#login-form').submit(function(event){
    doLogin();
    event.preventDefault();
  });
  kdfWorker = new Worker('/javascripts/pwstore/kdfworker.js');
  $('#logout-button').click(logoutClicked);
});

psGlobals = {
  passwords: []
};

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
  psGlobals.encKey = event.data.substr(0,64);
  psGlobals.signKey = event.data.substr(64,64);
  psGlobals.passKey = event.data.substr(128,128);
  if(psGlobals.encKey.length !== 64 || psGlobals.signKey.length !== 64 || psGlobals.passKey.length !== 128){
    updateStatus('Error: Keys were not created properly.<br />\n');
    $('#login-button').toggleClass('pure-button-disabled').attr("disabled", false);
    return;
  }
  updateStatus('done<br />\n');
  apiLogin(psGlobals.username, psGlobals.passKey);
}

function decryptSessionKeys(userdata){
  var encBytes = ezdec(userdata.encryptedEncKey, psGlobals.encKey, psGlobals.signKey);
  psGlobals.storageEncKey = asmCrypto.bytes_to_hex(encBytes);
  var signBytes = ezdec(userdata.encryptedSignKey, psGlobals.encKey, psGlobals.signKey);
  psGlobals.storageSignKey = asmCrypto.bytes_to_hex(signBytes);
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
      decryptSessionKeys(data.userdata);
      $('#login-div').hide();
      $('#password-div').show();
      renderPasswords();
      fetchAllPasswords();
      setupIO();
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
  $('#login-button').toggleClass('pure-button-disabled').attr("disabled", false);
}

function updateStatus(text){
  var orig = $('#login-status').html();
  $('#login-status').html(orig + text);
}

function logoutClicked(){
  //Should prompt here
  logout();
}

function logout(){
  psGlobals.socket.disconnect();
  $.ajax({
    type: "POST",
    url: "/apilogout",
    data: {a: 1}
  })
  .done(function(data){
    console.log('Logged out of server session.');
    finalLogoutSteps();
  })
  .fail(function() {
    console.log('Error contacting remote server logout.');
    finalLogoutSteps();
  });
}

function finalLogoutSteps(){
  zeroKeys();
  resetStatus();
  location.reload(false);
}

function zeroKeys(){
  psGlobals.encKey = '0000000000000000000000000000000000000000000000000000000000000000';
  psGlobals.signKey = '0000000000000000000000000000000000000000000000000000000000000000';
  psGlobals.storageEncKey = '0000000000000000000000000000000000000000000000000000000000000000';
  psGlobals.storageSignKey = '0000000000000000000000000000000000000000000000000000000000000000';
  psGlobals.passKey = '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
}

function setupIO(){
  psGlobals.socket = io();
  psGlobals.socket.on('updatedobject', function(data){
    console.log('Got updatedobject io event: ' + JSON.stringify(data));
    if(psGlobals.socket.io.engine.id === data.origin){
      console.log('Update was from myself, ignoring. UID: ' + data.uid);
    } else {
      console.log('Update was from another session. UID: ' + data.uid);
      console.log('Got cipher text: ' + data.cipher);
      updateFromCipher(data.cipher);
    }
  });
}
