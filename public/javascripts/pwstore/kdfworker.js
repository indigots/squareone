/* Copyright (c) 2016 Todd Switzer */
importScripts('/javascripts/asmcrypto/asmcrypto.js');
onmessage = function(event){
  var hexkey = doKDF(event.data.username, event.data.password);
  postMessage(hexkey);
}

function doKDF(username, password){
  var saltA = 'kbxYOlSNkLOqEZrji1Mch98WYsKop6Kia5Q82SfI0rFRSpMVd2LxnR5xyuTTk3Ao';
  var salt =  username + saltA;
  var outkey = asmCrypto.PBKDF2_HMAC_SHA512.hex(password, salt, 50005, 64);
  return(outkey);
}

function kdfVector(p, s, c, len){
  var hexkey = asmCrypto.PBKDF2_HMAC_SHA512.hex(p, s, c, len);
  return(outkey);
}

