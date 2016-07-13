/* Copyright (c) 2016 Todd Switzer */
importScripts('/javascripts/sjcl/sjcl.js');
onmessage = function(event){
  //console.log('starting...');
  var hexkey = doKDF(event.data.username, event.data.password);
  //console.log(hexkey);
  toReturn = {
    encKey: hexkey.substring(0,64),
    signKey: hexkey.substring(64,96),
    passKey: hexkey.substring(96)
  }
  postMessage(toReturn);
}

function doKDF(username, password){
  var saltA = 'kbxYOlSNkLOqEZrji1Mch98WYsKop6Kia5Q82SfI0rFRSpMVd2LxnR5xyuTTk3Ao';
  var salt =  username + password + saltA;
  var hexkey = sjcl.misc.pbkdf2(password, salt, 100000, 512);
  return(sjcl.codec.hex.fromBits(hexkey));
}
