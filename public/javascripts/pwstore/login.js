/* Copyright (c) 2016 Todd Switzer */
$(document).ready(function(){
  $('#login-form').submit(function(event){
    doLogin();
    event.preventDefault();
  });
  kdfWorker = new Worker('/javascripts/pwstore/kdfworker.js');
  $('#logout-button').click(logoutClicked);
  $('#logout-menu-button').click(function(event){
    event.preventDefault();
    logoutClicked();
  });
});

psGlobals = {
  passwords: [],
  changelist: [],
  changelistindex: 0,
  dashboard: {
    sync: true,
    ping: true 
  }
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
      setInterval(pingStatus, 30000);
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
  psGlobals.socket.on('updatedobject', function(cipher){
    console.log('Got updatedobject io event: ' + JSON.stringify(cipher));
    updateFromCipher(cipher);
  });
  psGlobals.socket.on('deletedobject', function(uid){
    console.log('Got deletedobject io event: ' + uid);
    psGlobals.passwords = _.reject(psGlobals.passwords, function(pass){ return pass.uid === uid; });
    renderPasswords();
  });
  psGlobals.socket.on('disconnect', function(){
    //console.log('Socket was disconnected!');
    dashboardUpdate('sync', false);
  });
  psGlobals.socket.on('reconnect', function(){
    //console.log('Socket reconnected!');
    dashboardUpdate('sync', true)
  });
}

function pingStatus(){
  if(!psGlobals.socket || psGlobals.socket.disconnected){
    //console.log('Sync link down.');
    dashboardUpdate('sync', false);
  } else {
    dashboardUpdate('sync', true);
  }

  $.ajax({
    type: "POST",
    url: "/apiping",
    data: {}
  }).done(function(data){
    if(data.result === 'success'){
      //console.log('Ping Successful.');
      dashboardUpdate('ping', true);
    } else if(data.result === 'noauth'){
      //console.log('No longer authenticated.');
      dashboardUpdate('ping', false);
      location.reload();
    } else {
      //console.log('Ping error: ' + data.result);
      dashboardUpdate('ping', false);
      alert('Error communicating with server: ' + data.result);
    }
  }).fail(function() {
    //console.log('Error pinging server, offline.');
    dashboardUpdate('ping', false);
  });
}

function dashboardUpdate(type, stat){
  //console.log(type + ' ' + stat);
  if(type === 'sync'){
    if(psGlobals.dashboard.sync === stat){
      //console.log('No dashboard change.');
      return;
    } else {
      psGlobals.dashboard.sync = stat;
      if(stat && psGlobals.dashboard.ping){
        $('.dashboard').hide();
        $('#sync-status').html('');
      } else if(stat){
        $('#sync-status').html('');
      } else {
        $('#sync-status').html('Syncing offline');
        $('.dashboard').show();
      }
    }
  } else if(type === 'ping'){
    if(psGlobals.dashboard.ping === stat){
      //console.log('No dashboard change.');
      return;
    } else {
      psGlobals.dashboard.ping = stat;
      if(stat && psGlobals.dashboard.sync){
        $('.dashboard').hide();
        $('#ping-status').html('');
      } else if(stat){
        $('#ping-status').html('');
      } else {
        $('#ping-status').html('Server offline');
        $('.dashboard').show();
      }
    }
  }
}
