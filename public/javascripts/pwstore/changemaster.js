$(document).ready(function(){
  $('#change-master-button').click(function(event){
    event.preventDefault();
    $('#master-password-div').show();
  });
  $('#close-master-password-button').click(function(event){
    event.preventDefault();
    endMasterPasswordChange();
  });
  $('#master-password-form').submit(function(event){
    event.preventDefault();
    masterPasswordChange();
  });
});

function masterPasswordChange(){
  if($('#new-master-password').val() !== $('#confirm-master-password').val()){
    alert("Passwords Don't Match!");
    resetMasterForm();
  } else if($('#new-master-password').val().length === 0){
    alert("Password Can't be Empty!");
    resetMasterForm();
  } else {
    psGlobals.newPassword = $('#new-master-password').val();
    kdfWorker.onmessage = gotCurrentPassKdf;
    kdfWorker.postMessage({username: psGlobals.username, password: $('#current-master-password').val()});
  }
}

function gotCurrentPassKdf(event){
  var curEncKey = event.data.substr(0,64);
  var curSignKey = event.data.substr(64,64);
  var curPassKey = event.data.substr(128,128);
  if(psGlobals.passKey !== curPassKey){
    alert('Incorrect current password.');
    resetMasterForm();
  } else {
    kdfWorker.onmessage = gotChangePassKdf;
    kdfWorker.postMessage({username: psGlobals.username, password: psGlobals.newPassword});
  }
};

function gotChangePassKdf(event){
  var newEncKey = event.data.substr(0,64);
  var newSignKey = event.data.substr(64,64);
  var newPassKey = event.data.substr(128,128);
  var encryptedEncKey = ezenc(asmCrypto.hex_to_bytes(psGlobals.storageEncKey), newEncKey, newSignKey);
  var encryptedSignKey = ezenc(asmCrypto.hex_to_bytes(psGlobals.storageSignKey), newEncKey, newSignKey);
  $.ajax({
    type: "POST",
    url: "/apichangemasterpassword",
    data: {currentpass: psGlobals.passKey,
      newpass: newPassKey,
      userdata: {encryptedEncKey: encryptedEncKey,
      encryptedSignKey: encryptedSignKey}
    }
  })
  .done(function(data){
    if(data.result == 'success'){
      alert('Password changed on server.');
      psGlobals.encKey = newEncKey;
      psGlobals.signKey = newSignKey;
      psGlobals.passKey = newPassKey;
    } else {
      alert('failed: ' + data.result);
    }
    resetMasterForm();
  }).fail(function() {
    updateStatus('failed: Error contacting remote server.<br />\n');
    resetMasterForm();
  });
};

function endMasterPasswordChange(){
  $('#master-password-div').hide();
  resetMasterForm();
}

function resetMasterForm(){
  $('#current-master-password').val('');
  $('#new-master-password').val('');
  $('#confirm-master-password').val('');
}

