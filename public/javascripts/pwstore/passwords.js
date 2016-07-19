$(document).ready(function(){
  $('#add-pass-button').click(addPassword);
});

function addPassword(){
  console.log('Adding password...');
  psGlobals.passwords.push(new pw('New', createUID()));
  renderPasswords();
}

function renderPassword(inPassword, inIndex){
  var addTemplate = 
    '<div id="PASSWORDUID-passitem" class="password-item" tabindex="' + inIndex + '">' +
    '<h4 class="password-label editable" field="label">PASSWORDLABEL</h4>' +
    '<h5 class="password-username editable" field="username">PASSWORDUSERNAME</h5>' +
    '<h5 class="password-password editable" field="password">PASSWORDPASSWORD</h5>' +
    '<h5><a class="password-url editable" href="PASSWORDURL" target="_blank" field="url">PASSWORDURL</a></h5>' +
    '<h5 class="password-notes editable" field="notes">PASSWORDNOTES</h5>' +
    '<h5 class="password-tags editable" field="tags">PASSWORDTAGS</h5>' +
    '</div>';
  var toReturn = addTemplate
    .replace('PASSWORDLABEL', _.escape(inPassword.label))
    .replace('PASSWORDUID', inPassword.uid)
    .replace('PASSWORDUSERNAME', inPassword.username)
    .replace('PASSWORDPASSWORD', inPassword.password)
    .replace('PASSWORDURL', inPassword.url)
    .replace('PASSWORDURL', inPassword.url)
    .replace('PASSWORDNOTES', inPassword.notes)
    .replace('PASSWORDTAGS', inPassword.tags);
  return toReturn;
}

function renderPasswords(){
  var newHtml = '';
  for(var i=0; i<psGlobals.passwords.length; i++){
    newHtml += renderPassword(psGlobals.passwords[i], i);
  }
  $('#password-list').html(newHtml);
  for(var i=0; i<psGlobals.passwords.length; i++){
    var editButton = $('<button/>', {
      text: 'Edit',
      id: 'editpassword-' + psGlobals.passwords[i].uid,
      'class': 'pure-button secondary-button',
      click: clickedPasswordEdit
    });
    $('#' + psGlobals.passwords[i].uid + '-passitem').append(editButton);
  }
  $('.editable').editable().on('editsubmit', doneEditing);
}

function doneEditing(event, val){
  console.log('ID of parent of edited: ' + event.target.parentNode.id);
  var edited = getPasswordByUID(event.target.parentNode.id.substring(0,26));
  console.log('Label of edited password ' + edited.label);
  var field = event.target.getAttribute('field');
  console.log('Field type edited: ' + field);
  edited[field] = val;
}

function clickedPasswordEdit(event){
  var uid = event.target.id.substring(13);
  console.log('Clicked edit on password with uid: ' + uid);
}

function getPasswordByUID(inUid){
  return _.findWhere(psGlobals.passwords, {uid: inUid});
}