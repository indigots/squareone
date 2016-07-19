$(document).ready(function(){
  $('#add-pass-button').click(addPassword);
});

function addPassword(){
  console.log('Adding password...');
}

function renderPassword(inPassword, inIndex){
  var addTemplate = 
    '<div id="PASSWORDUID-passitem" class="password-item" tabindex="' + inIndex + '">' +
    '<h4 class="password-label">PASSWORDLABEL</h5>' +
    '</div>';
  var toReturn = addTemplate
    .replace('PASSWORDLABEL', _.escape(inPassword.label))
    .replace('PASSWORDUID', inPassword.uid);
  return toReturn;
}

function renderPasswords(){
  var newHtml = '';
  for(var i=0; i<psGlobals.passwords.length; i++){
    newHtml += renderPassword(psGlobals.passwords[i], i);
  }
  $('#password-list').html(newHtml);
}
