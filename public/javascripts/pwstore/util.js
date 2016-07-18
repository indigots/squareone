function ezenc(clear, hexEncKey, hexSignKey){
  asmCrypto.random.skipSystemRNGWarning = true;
  var IV = new Uint8Array(16);
  asmCrypto.getRandomValues(IV);
  var outBytes = asmCrypto.AES_CBC.encrypt(clear, asmCrypto.hex_to_bytes(hexEncKey), true, IV);
  var base64Sig = asmCrypto.HMAC_SHA512.base64(clear, asmCrypto.hex_to_bytes(hexSignKey));
  var toReturn = {
    cipher: asmCrypto.bytes_to_hex(outBytes),
    iv: asmCrypto.bytes_to_hex(IV),
    sig: base64Sig
  };
  return toReturn;
}

function ezdec(obj, hexEncKey, hexSignKey){
  var clear = asmCrypto.AES_CBC.decrypt(asmCrypto.hex_to_bytes(obj.cipher), asmCrypto.hex_to_bytes(hexEncKey), true, asmCrypto.hex_to_bytes(obj.iv));
  var base64Sig = asmCrypto.HMAC_SHA512.base64(clear, asmCrypto.hex_to_bytes(hexSignKey));
  if(base64Sig === obj.sig){
    return clear;
  } else {
    console.log('Error in signature for decrypted data.');
    return null;
  }
} 
