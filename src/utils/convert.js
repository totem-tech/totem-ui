import {
    ss58Encode as ss58Encode1,
    ss58Decode as ss58Decode1
} from 'oo7-substrate/src/ss58'
import {
    hexToBytes as hexToBytes1,
    bytesToHex as bytesToHex1
} from 'oo7-substrate/src/utils.js'
import {
    decodeUTF8 as decodeUTF81,
    encodeUTF8 as encodeUTF81,
    encodeBase64 as encodeBase641,
    decodeBase64 as decodeBase641
} from "tweetnacl-util"
import { isBond, isUint8Arr, isStr } from '../utils/utils'

// For easy access and placeholder for some functions to be copied here
export const ss58Encode = ss58Encode1
export const ss58Decode = ss58Decode1
export const hexToBytes = hexToBytes1
export const bytesToHex = bytesToHex1
export const decodeUTF8 = decodeUTF81
export const encodeUTF8 = encodeUTF81
export const encodeBase64 = encodeBase641
export const decodeBase64 = decodeBase641


// validateAddress checks if an address is valid
//
// Params:
// @address     string/bond 
export const validateAddress = address => runtime.indices.tryIndex(
    new Bond().defaultTo(ss58Decode(isBond(address) ? address._value : address))
)

// hashToBytes converts hash to bytes array. Will return 0x0 if value is unsupported type.
//
// Params:
// @hash    string/Uint8Array/Bond
//
// Returns Uint8Array
export const hashToBytes = hash => isUint8Arr(hash) ? hash : hexToBytes(isBond(hash) ? hash._value : hash)

// hashToStr converts given hash to string prefixed by '0x'.  Will return '0x0', if not invalid hash.
//
// Params:
// @hash    string/Uint8Array/Bond
//
// Returns string
export const hashToStr = hash => {
    hash = isBond(hash) ? hash._value : hash
    try {
        if (isStr(hash) && hexToBytes(hash)) return (hash.startsWith('0x') ? '' : '0x') + hash
        return '0x' + bytesToHex(hash)
    } catch (e) {
        console.log(e)
        return '0x0'
    }
}