function pw(a, b){
  if(a===undefined && b===undefined){
    this.recentlynew = true;
    this.label = 'New';
    this.uid = createUID();
    this.username = 'username';
    this.password = 'password';
    this.url = 'url';
    this.notes = 'notes';
    this.tags = 'tags';
    this.history = new Array();
    this.created = new Date();
  } else if(typeof(a)==='string' && b===undefined){
    var x = JSON.parse(a);
    _.extend(this, x);
    this.recentlynew = false;
  }
}

pw.prototype.update = function(fieldName, value){
  var old = this[fieldName];
  if(old===value){
    // No change
    return false;
  } else {
    this[fieldName] = value;
    if(!Array.isArray(this.history)){
      this.history = new Array();
    }
    this.history.push({
      field: fieldName,
      value: old,
      datechanged: new Date()
    });
    return true;
  }
}
