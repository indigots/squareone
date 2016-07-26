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
    '<span class="password-label editable" field="label">PASSWORDLABEL</span><br>' +
    '<span class="password-username editable" field="username">PASSWORDUSERNAME</span><a href="#" class="copy-button">copy</a><br>' +
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
  /*for(var i=0; i<psGlobals.passwords.length; i++){
    var editButton = $('<button/>', {
      text: 'Edit',
      id: 'editpassword-' + psGlobals.passwords[i].uid,
      'class': 'pure-button secondary-button',
      click: clickedPasswordEdit
    });
    $('#' + psGlobals.passwords[i].uid + '-passitem').append(editButton);
  }*/
  $('.editable').editable().on('editsubmit', doneEditing);
  $('.copy-button').click(selectAndCopy);
}

function doneEditing(event, val){
  console.log('ID of parent of edited: ' + event.target.parentNode.id);
  var edited = getPasswordByUID(event.target.parentNode.id.substring(0,26));
  console.log('Label of edited password ' + edited.label);
  var field = event.target.getAttribute('field');
  console.log('Field type edited: ' + field);
  var previousVal = edited[field];
  edited[field] = val;
  if(previousVal !== val){
    console.log('Value changed, storing...');
    storePassword(edited);
  } else {
    console.log('Value remained same skipping save.');
  }
}

function storePassword(edited){
  var encryptedPassword = ezenc(JSON.stringify(edited), psGlobals.storageEncKey, psGlobals.storageSignKey);
  var encryptedPasswordJSON = JSON.stringify(encryptedPassword);
  $.ajax({
    type: "POST",
    url: "/apistore",
    data: {type: 'pass',
      data: encryptedPasswordJSON,
      uid: edited.uid}
  })
  .done(function(data){
    if(data.result === 'success'){
      console.log('Password stored.');
    } else {
      console.log('Failed to store password: ' + data.result);
    }
  }).fail(function() {
    console.log('Failed to store password, could not contact server.');
  });
  psGlobals.socket.emit('updatedobject', {uid: edited.uid, cipher: encryptedPasswordJSON});
}

function fetchAllPasswords(){
  $.ajax({
    type: "POST",
    url: "/apimassfetch",
    data: {type: 'pass'}
  })
  .done(function(data){
    if(data.result !== 'success'){
      console.log('Failed to fetch passwords: ' + data.result);
      return; 
    }
    if(Array.isArray(data.data)){
      var rows = data.data;
      console.log('Got passwords.');
      var clearPasswords = new Array();
      for(var i=0; i<rows.length; i++){
        console.log(rows[i]);
        console.log(JSON.stringify(rows[i]));
        var clearBytes = ezdec(JSON.parse(rows[i].data), psGlobals.storageEncKey, psGlobals.storageSignKey);
        var clear = asmCrypto.bytes_to_string(clearBytes);
        console.log(clear);
        clearPasswords.push(JSON.parse(clear));
      }
      updateGlobalPasswords(clearPasswords);
    } else {
      console.log('Error in returned passwords.');
    }
  }).fail(function() {
    console.log('Failed to fetch passwords, could not contact server.');
  });
}

function updateGlobalPasswords(pws){
  for(var i=0; i<pws.length; i++){
    var dupe = getPasswordByUID(pws[i].uid);
    console.log('Dupe: ' + dupe);
    var index = psGlobals.passwords.indexOf(dupe);
    console.log('index: ' + index);
    if(dupe && index !== -1){
      //This password is already in the global list, overwrite it.
      psGlobals.passwords[index] = pws[i];
    } else {
      //Previously unknown password
      psGlobals.passwords.push(pws[i]);
    }
  }
  renderPasswords();
}

function updateGlobalPassword(pw){
  var arr = new Array();
  arr.push(pw);
  updateGlobalPasswords(arr);
}

function updateFromCipher(cipher){
  var clearBytes = ezdec(JSON.parse(cipher), psGlobals.storageEncKey, psGlobals.storageSignKey);
  var clear = asmCrypto.bytes_to_string(clearBytes);
  updateGlobalPassword(JSON.parse(clear));
  }

function clickedPasswordEdit(event){
  var uid = event.target.id.substring(13);
  console.log('Clicked edit on password with uid: ' + uid);
}

function getPasswordByUID(inUid){
  return _.findWhere(psGlobals.passwords, {uid: inUid});
}

function selectAndCopy(event){
  var toSelect = $(this).prev().get(0);
  selectText(toSelect);
  try {
    var success = document.execCommand('copy');
    if(success) console.log('Copied!');
    else console.log('Unable to copy.');
  } catch(err) {
    console.log('Browser does not support copying text.');
  }
}

function selectText(toSelect){
  var doc = document , toSelect
    , range, selection
  ;    
  if (doc.body.createTextRange) {
    range = document.body.createTextRange();
    range.moveToElementText(toSelect);
    range.select();
  } else if (window.getSelection) {
    selection = window.getSelection();        
    range = document.createRange();
    range.selectNodeContents(toSelect);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
