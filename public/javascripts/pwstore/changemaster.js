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
    resetChangeStatus();
    $('#change-master-password-button').addClass('pure-button-disabled').attr("disabled", true);
    masterPasswordChange();
  });
});

function masterPasswordChange(){
  if($('#new-master-password').val() !== $('#confirm-master-password').val()){
    alert("Passwords Don't Match!");
    resetMasterForm();
    resetChangeStatus();
  } else if($('#new-master-password').val().length === 0){
    alert("Password Can't be Empty!");
    resetMasterForm();
    resetChangeStatus();
  } else {
    psGlobals.newPassword = $('#new-master-password').val();
    updateChangeStatus('Performing KDF on current password...<br>');
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
    resetChangeStatus();
  } else {
    updateChangeStatus('Performing KDF on new password...<br>');
    kdfWorker.onmessage = gotChangePassKdf;
    kdfWorker.postMessage({username: psGlobals.username, password: psGlobals.newPassword});
  }
};

function gotChangePassKdf(event){
  delete psGlobals.newPassword;
  var newEncKey = event.data.substr(0,64);
  var newSignKey = event.data.substr(64,64);
  var newPassKey = event.data.substr(128,128);
  var encryptedEncKey = ezenc(asmCrypto.hex_to_bytes(psGlobals.storageEncKey), newEncKey, newSignKey);
  var encryptedSignKey = ezenc(asmCrypto.hex_to_bytes(psGlobals.storageSignKey), newEncKey, newSignKey);
  updateChangeStatus('Submitting changes to server...<br>');
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
      psGlobals.encKey = newEncKey;
      psGlobals.signKey = newSignKey;
      psGlobals.passKey = newPassKey;
      endMasterPasswordChange();
      alert('Password changed on server.');
    } else {
      alert('failed: ' + data.result);
      resetChangeStatus();
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
  resetChangeStatus();
}

function resetMasterForm(){
  $('#current-master-password').val('');
  $('#new-master-password').val('');
  $('#confirm-master-password').val('');
  resetChangeStatus();
}

function resetChangeStatus(){
  $('#change-master-password-status').html('');
  $('#change-master-password-button').removeClass('pure-button-disabled').removeAttr("disabled");
}

function updateChangeStatus(text){
  var orig = $('#change-master-password-status').html();
  $('#change-master-password-status').html(orig + text);
}
