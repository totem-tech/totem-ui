import { ss58Encode } from 'oo7-substrate/src/ss58'

const convert = {
    ss58Encode
}

// Taken from oo7-substrate/src/utils.js
convert.hexToBytes = str => {
    if (!str) {
        return new Uint8Array();
    }
    var a = [];
    for (var i = str.startsWith('0x') ? 2 : 0, len = str.length; i < len; i += 2) {
        a.push(parseInt(str.substr(i, 2), 16));
    }

    return new Uint8Array(a);
}

// Taken from oo7-substrate/src/utils.js
convert.bytesToHex = uint8arr => {
    if (!uint8arr) {
        return '';
    }
    var hexStr = '';
    for (var i = 0; i < uint8arr.length; i++) {
        var hex = (uint8arr[i] & 0xff).toString(16);
        hex = (hex.length === 1) ? '0' + hex : hex;
        hexStr += hex;
    }

    return hexStr.toLowerCase();
}

export default convert
module.exports = convert