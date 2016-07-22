function ezenc(clear, hexEncKey, hexSignKey){
  asmCrypto.random.skipSystemRNGWarning = true;
  var IV = new Uint8Array(16);
  asmCrypto.getRandomValues(IV);
  var outBytes = asmCrypto.AES_CBC.encrypt(clear, asmCrypto.hex_to_bytes(hexEncKey), true, IV);
  var base64Sig = asmCrypto.HMAC_SHA512.base64(clear, asmCrypto.hex_to_bytes(hexSignKey));
  var toReturn = {
    cipher: asmCrypto.bytes_to_base64(outBytes),
    iv: asmCrypto.bytes_to_hex(IV),
    sig: base64Sig
  };
  return toReturn;
}

function ezdec(obj, hexEncKey, hexSignKey){
  var clear = asmCrypto.AES_CBC.decrypt(asmCrypto.base64_to_bytes(obj.cipher), asmCrypto.hex_to_bytes(hexEncKey), true, asmCrypto.hex_to_bytes(obj.iv));
  var base64Sig = asmCrypto.HMAC_SHA512.base64(clear, asmCrypto.hex_to_bytes(hexSignKey));
  if(base64Sig === obj.sig){
    return clear;
  } else {
    console.log('Error in signature for decrypted data.');
    return null;
  }
} 

function createUID(){
  return (new Date()).getTime() + '-' + Math.floor((Math.random()*1000000000000)+1);
}

$.fn.extend({
  editable: function () {
    $(this).each(function () {
      var $el = $(this),
      $edittextbox = $('<input type="text"></input>').css('min-width', $el.width()),
      submitChanges = function () {
        if ($edittextbox.val() !== '') {
          $el.html($edittextbox.val());
          $el.show();
          $el.trigger('editsubmit', [$el.html()]);
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
