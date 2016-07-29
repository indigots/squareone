$(document).ready(function(){
  $('#add-pass-button').click(addPassword);
  $('#undo-button').click(undo);
});

function addPassword(){
  psGlobals.passwords.push(new pw('New', createUID()));
  renderPasswords();
}

function renderPassword(inPassword, inIndex){
  var addTemplate = 
    '<div id="PASSWORDUID-passitem" class="password-item" tabindex="' + inIndex + '">' +
    '<span class="password-label editable" field="label">PASSWORDLABEL</span><br>' +
    '<span class="password-username editable" field="username">PASSWORDUSERNAME</span> <a href="#" class="copy-button">copy</a><br>' +
    '<span class="password-password editable" field="password">PASSWORDPASSWORD</span> <a href="#" class="copy-button">copy</a><br>' +
    '<span class="password-url editable" field="url">PASSWORDURL</span> <a class="password-url-link" href="PASSWORDURL" target="_blank" field="url">link</a><br>' +
    '<span class="password-notes editable" field="notes">PASSWORDNOTES</span><br>' +
    '<span class="password-tags editable" field="tags">PASSWORDTAGS</span>' +
    '</div>';
  var toReturn = addTemplate
    .replace('PASSWORDLABEL', _.escape(inPassword.label))
    .replace('PASSWORDUID', inPassword.uid)
    .replace('PASSWORDUSERNAME', inPassword.username)
    .replace('PASSWORDPASSWORD', inPassword.password)
    .replace('PASSWORDURL', inPassword.url)
    .replace('PASSWORDURL', normalizeLink(inPassword.url))
    .replace('PASSWORDNOTES', inPassword.notes)
    .replace('PASSWORDTAGS', inPassword.tags);
  return toReturn;
}

function renderPasswords(){
  var newHtml = '';
  psGlobals.passwords = _.sortBy(psGlobals.passwords, 'label');
  for(var i=0; i<psGlobals.passwords.length; i++){
    newHtml += renderPassword(psGlobals.passwords[i], i);
  }
  $('#password-list').html(newHtml);
  for(var i=0; i<psGlobals.passwords.length; i++){
    var deleteButton = $('<button/>', {
      text: 'Delete',
      id: 'deletepassword-' + psGlobals.passwords[i].uid,
      'class': 'pure-button secondary-button',
      click: clickedDelete
    });
    $('#' + psGlobals.passwords[i].uid + '-passitem').append(deleteButton);
  }
  $('.editable').editable().on('editsubmit', doneEditing);
  $('.copy-button').click(selectAndCopy);
  renderUndo();
}

function renderUndo(){
  if(psGlobals.undo.length===0){
    $('#undo-button').prop('disabled', true);
  } else {
    $('#undo-button').prop('disabled', false);
  }
}

function doneEditing(event, val){
  var edited = getPasswordByUID(event.target.parentNode.id.substring(0,26));
  var field = event.target.getAttribute('field');
  /*var previousVal = edited[field];
  edited[field] = val;
  if(previousVal !== val){
    storePassword(edited);
    if(field === 'url'){
      $('#' + event.target.parentNode.id + ' .password-url-link').attr('href', normalizeLink(val));
    }
    if(field === 'label'){ // Alphabetical order may have changed
      renderPasswords();
    }
  } else {
  } */
  var oldVal = edited[field];
  if(edited.update(field, val)){
    console.log('field changed: ' + field + ' ' + val + ' ' + edited.uid);
    storePassword(edited);
    if(field === 'label'){ // Alphabetical order may have changed
      renderPasswords();
    }
    psGlobals.undo.push({type: 'fieldchange', field: field, previousvalue: oldVal, uid: edited.uid});
    renderUndo();
  } else {
    console.log('field did not change.');
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
      uid: edited.uid,
      id: psGlobals.socket.io.engine.id}
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
  //psGlobals.socket.emit('updatedobject', {uid: edited.uid, cipher: encryptedPasswordJSON});
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
      //console.log('Got passwords.');
      var clearPasswords = new Array();
      for(var i=0; i<rows.length; i++){
        console.log(rows[i]);
        console.log(JSON.stringify(rows[i]));
        var clearBytes = ezdec(JSON.parse(rows[i].data), psGlobals.storageEncKey, psGlobals.storageSignKey);
        var clear = asmCrypto.bytes_to_string(clearBytes);
        console.log(clear);
        clearPasswords.push(new pw(clear));
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
    var index = psGlobals.passwords.indexOf(dupe);
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
  updateGlobalPassword(new pw(clear));
}

function clickedDelete(event){
  var uid = event.target.id.substring(15);
  var deleted = getPasswordByUID(uid);
  psGlobals.passwords = _.reject(psGlobals.passwords, function(pass){ return pass.uid === uid; });
  psGlobals.undo.push({type: 'delete', password: deleted});
  renderPasswords();
  $.ajax({
    type: "POST",
    url: "/apidelete",
    data: {type: 'pass',
      uid: uid,
      id: psGlobals.socket.io.engine.id}
  })
  .done(function(data){
    if(data.result === 'success'){
      console.log('Password deleted.');
    } else {
      console.log('Failed to delete password: ' + data.result);
    }
  }).fail(function() {
    console.log('Failed to delete password, could not contact server.');
  });
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

function normalizeLink(val){
  return ((val.indexOf('://') == -1) ? 'http://' + val : val);
}

function undo(){
  var change = psGlobals.undo.pop();
  if(!change){return;}
  if(change.type==='delete'){
    psGlobals.passwords.push(change.password);
    storePassword(change.password);
  } else if(change.type==='fieldchange'){
    var pass = getPasswordByUID(change.uid);
    pass[change.field] = change.previousvalue;
    storePassword(pass);
  }
  psGlobals.redo.push(change);
  renderPasswords();
}
