$(document).ready(function(){
  $('#add-pass-button').click(addPassword);
  $('#undo-button').click(undo);
  $('#redo-button').click(redo);
  $('#clear-header-button').click(selectAndCopy);
});

function addPassword(){
  psGlobals.passwords.push(new pw());
  renderPasswords();
}

function renderPassword(inPassword, inIndex){
  var addTemplate = 
    '<div id="PASSWORDUID" class="password-item pure-g" tabindex="' + inIndex + '">' +
    '<div><div class="password-label editable pure-u-1" field="label">PASSWORDLABEL</div></div>' +
    '<div class="pure-u-1 pure-u-md-1-3">' + 
      '<span class="field-title">Username:</span> <span class="password-username editable field" field="username">PASSWORDUSERNAME</span> <a href="#" class="copy-button pure-button secondary-button"><i class="fa fa-clipboard"></i></a>' + 
    '</div>' +
    '<div class="pure-u-1 pure-u-md-1-3">' + 
      '<span class="field-title">Password:</span> <span class="password-password editable field" field="password">PASSWORDPASSWORD</span> <a href="#" class="copy-button pure-button secondary-button"><i class="fa fa-clipboard"></i></a>' +
    '</div>' + 
    '<div class="pure-u-1 pure-u-md-1-3">' +
      '<span class="field-title">URL:</span> <span class="password-url editable field" field="url">PASSWORDURL</span> <a class="password-url-link pure-button secondary-button" href="PASSWORDURL" target="_blank" field="url"><i class="fa fa-external-link"></i></a>' +
    '</div>' +
    '<div class="pure-u-1">' + 
      '<span class="field-title">Notes:</span> <span class="password-notes editable field" field="notes">PASSWORDNOTES</span>' +
    '</div>' + 
    '<div class="pure-u-1">' +
      '<span class="field-title">Tags:</span> <span class="password-tags editable field" field="tags">PASSWORDTAGS</span>' +
    '</div>' + 
    '<div class="pure-u-1">' +
      '<button class="delete-button pure-button secondary-button"><i class="fa fa-trash"></i></button>' +
    '</div>' +
    '</div>';
  var toReturn = addTemplate
    .replace('PASSWORDLABEL', _.escape(inPassword.label))
    .replace('PASSWORDUID', inPassword.uid)
    .replace('PASSWORDUSERNAME', inPassword.username)
    .replace('PASSWORDPASSWORD', Array(inPassword.password.length+1).join('*'))
    .replace('PASSWORDURL', inPassword.url)
    .replace('PASSWORDURL', normalizeLink(inPassword.url))
    .replace('PASSWORDNOTES', inPassword.notes)
    .replace('PASSWORDTAGS', inPassword.tags);
  return toReturn;
}

function renderPasswords(){
  var newHtml = '';
  var freshpasswords = _.filter(psGlobals.passwords, function(inpw){ return inpw.recentlynew; });
  freshpasswords = _.sortBy(freshpasswords, 'created').reverse();
  var oldpasswords = _.filter(psGlobals.passwords, function(inpw){ return !inpw.recentlynew; });
  oldpasswords = _.sortBy(oldpasswords, 'label');
  psGlobals.passwords = freshpasswords.concat(oldpasswords);
  for(var i=0; i<psGlobals.passwords.length; i++){
    newHtml += renderPassword(psGlobals.passwords[i], i);
  }
  $('#password-list').html(newHtml);
  /*for(var i=0; i<psGlobals.passwords.length; i++){
    var deleteButton = $('<button/>', {
      text: 'Delete',
      id: 'deletepassword-' + psGlobals.passwords[i].uid,
      'class': 'pure-button secondary-button',
      click: clickedDelete
    });
    $('#' + psGlobals.passwords[i].uid + '-passitem').append(deleteButton);
  }*/
  $('.delete-button').click(clickedDelete);
  $('.editable').editable().on('editsubmit', doneEditing);
  $('.copy-button').click(selectAndCopy);
  renderUndo();
}

function renderUndo(){
  if(psGlobals.changelistindex===0){
    $('#undo-button').hide();
  } else {
    $('#undo-button').show();
  }
  if(psGlobals.changelistindex===psGlobals.changelist.length){
    $('#redo-button').hide();
  } else {
    $('#redo-button').show();
  }
}

function doneEditing(event, val, realval){
  var div = event.target.parentNode;
  var edited = getPasswordByUID(div.id);
  if(div.className.indexOf('password-item') === -1) {
    edited = getPasswordByUID(div.parentNode.id);
  }
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
  if(edited.update(field, realval)){
    //console.log('field changed: ' + field + ' ' + val + ' ' + edited.uid);
    storePassword(edited);
    if(field === 'label'){ // Alphabetical order may have changed
      renderPasswords();
    }
    addToUndo({type: 'fieldchange', field: field, previousvalue: oldVal, newvalue: realval, uid: edited.uid});
  } else {
    //console.log('field did not change.');
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
      id: psGlobals.socket.id}
  })
  .done(function(data){
    if(data.result === 'success'){
      //console.log('Password stored.');
    } else {
      alert('Failed to store password: ' + data.result);
      console.log('Failed to store password: ' + data.result);
    }
  }).fail(function() {
    console.log('Failed to store password, could not contact server.');
    alert('Failed to store password, could not contact server.');
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
      alert('Failed to fetch passwords: ' + data.result);
      return; 
    }
    if(Array.isArray(data.data)){
      var rows = data.data;
      //console.log('Got passwords.');
      var clearPasswords = new Array();
      for(var i=0; i<rows.length; i++){
        //console.log(rows[i]);
        //console.log(JSON.stringify(rows[i]));
        var clearBytes = ezdec(JSON.parse(rows[i].data), psGlobals.storageEncKey, psGlobals.storageSignKey);
        var clear = asmCrypto.bytes_to_string(clearBytes);
        //console.log(clear);
        clearPasswords.push(new pw(clear));
      }
      updateGlobalPasswords(clearPasswords);
    } else {
      console.log('Error in returned passwords.');
    }
  }).fail(function() {
    console.log('Failed to fetch passwords, could not contact server.');
    alert('Failed to fetch passwords, could not contact server.');
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
  var uid = event.target.parentNode.parentNode.id;
  var deleted = deletePassword(uid); 
  addToUndo({type: 'delete', password: deleted, uid: deleted.uid});
  renderPasswords();
}

function deletePassword(uid){
  var deleted = getPasswordByUID(uid);
  psGlobals.passwords = _.reject(psGlobals.passwords, function(pass){ return pass.uid === uid; });
  $.ajax({
    type: "POST",
    url: "/apidelete",
    data: {type: 'pass',
      uid: uid,
      id: psGlobals.socket.io.engine.id}
  })
  .done(function(data){
    if(data.result === 'success'){
      //console.log('Password deleted.');
    } else {
      console.log('Failed to delete password: ' + data.result);
      alert('Failed to delete password: ' + data.result);
    }
  }).fail(function() {
    console.log('Failed to delete password, could not contact server.');
    alert('Failed to delete password, could not contact server.');
  });
  return deleted;
}

function getPasswordByUID(inUid){
  return _.findWhere(psGlobals.passwords, {uid: inUid});
}

function selectAndCopy(event){
  event.preventDefault();
  var toSelect = $(this).prev().get(0);
  var pass = getPasswordByUID($(this).parent().parent().attr('id'));
  if($(this).attr('id') === 'clear-header-button') {
    $('#temp-span').html('x');
    selectText(document.getElementById('temp-span'));
  } else if(toSelect.getAttribute('field') === 'password'){
    $('#temp-span').html(pass.password);
    selectText(document.getElementById('temp-span'));
  } else {
    selectText(toSelect);
  }
  try {
    var success = document.execCommand('copy');
    if(!success) console.log('Unable to copy.');
  } catch(err) {
    console.log('Browser does not support copying text.');
  }
  $('#temp-span').html('');
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
  var change = psGlobals.changelist[psGlobals.changelistindex-1];
  if(!change){return;}
  if(change.type==='delete'){
    psGlobals.passwords.push(change.password);
    storePassword(change.password);
  } else if(change.type==='fieldchange'){
    var pass = getPasswordByUID(change.uid);
    pass[change.field] = change.previousvalue;
    storePassword(pass);
  }
  psGlobals.changelistindex--;
  renderPasswords();
}

function redo(){
  var change = psGlobals.changelist[psGlobals.changelistindex];
  if(!change){return;}
  if(change.type==='delete'){
    deletePassword(change.uid);
  } else if(change.type==='fieldchange'){
    var pass = getPasswordByUID(change.uid);
    pass[change.field] = change.newvalue;
    storePassword(pass);
  }
  psGlobals.changelistindex++;
  renderPasswords();
}

function addToUndo(change){
  psGlobals.changelist = _.first(psGlobals.changelist, psGlobals.changelistindex);
  psGlobals.changelist.push(change);
  psGlobals.changelistindex++;
  renderUndo();
}

$.fn.extend({
  editable: function () {
    $(this).each(function () {
      var $el = $(this),
      $edittextbox = $('<input type="text"></input>').css('min-width', $el.width()),
      submitChanges = function () {
        if ($edittextbox.val() !== '') {
          if($el.attr('field') === 'password'){
            $el.html(Array($edittextbox.val().length+1).join('*'));
          } else {  
            $el.html($edittextbox.val());
          }
          $el.show();
          $el.trigger('editsubmit', [$el.html(), $edittextbox.val()]);
          $(document).unbind('click', submitChanges);
          $edittextbox.detach();
        }
      },
      tempVal;
      $edittextbox.click(function (event) {
        event.stopPropagation();
      });

      $el.dblclick(function (e) {
        tempVal = $el.html();
        if($el.attr('field') === 'password'){
          var pass = getPasswordByUID(e.target.parentNode.parentNode.id);
          tempVal = pass.password;
        }
        $edittextbox.val(tempVal).insertBefore(this)
                .bind('keypress', function (e) {
          var code = (e.keyCode ? e.keyCode : e.which);
          if (code == 13) {
            submitChanges();
          }
        }).select();
        $el.hide();
        $(document).click(submitChanges);
      });
    });
    return this;
  }
});
