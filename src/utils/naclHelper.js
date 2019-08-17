import { box, randomBytes, secretbox, sign } from "tweetnacl"
import {
    decodeUTF8,
    encodeUTF8,
    encodeBase64,
    decodeBase64
} from "tweetnacl-util"
import { hexToBytes } from 'oo7-substrate/src/utils'

export const newNonce = length => randomBytes(length || box.nonceLength)

export const encrypt = (dataObj, nonce, externalPubKey, internalSecretKey) => {
    const extPubKeyUint8Arr = decodeBase64(externalPubKey)
    const secretKeyUint8Arr = decodeBase64(internalSecretKey)
    const messageArr = decodeUTF8(JSON.stringify(dataObj))
    const boxData = box(messageArr, nonce, extPubKeyUint8Arr, secretKeyUint8Arr)
    const fullMessage = new Uint8Array(nonce.length + boxData.length)
    fullMessage.set(nonce)
    fullMessage.set(boxData, nonce.length)
    return encodeBase64(fullMessage)
}

export const decrypt = (encryptedMsg, nonce, externalPubKey, internalSecretKey) => {
    const extPubKeyUint8Arr = decodeBase64(externalPubKey)
    const secretKeyUint8Arr = decodeBase64(internalSecretKey)
    const encryptedMsgArr = decodeBase64(encryptedMsg)
    const message = encryptedMsgArr.slice(
        nonce.Length,
        encryptedMsg.length
    )
    const decrypted = box.open(message, nonce, extPubKeyUint8Arr, secretKeyUint8Arr)
    return !decrypted ? null : JSON.parse(encodeUTF8(decrypted))
}
// export const verifySignature = (dataObj, secretKey, publicKey) => {
//     const oldLength = sign.secretKeyLength
//     const secretKeyArr = decodeBase64(secretKey)
//     console.log(secretKeyArr.length, oldLength)
//     sign.secretKeyLength = secretKeyArr.length
//     const signature = sign.detached(
//         decodeUTF8(JSON.stringify(dataObj)),
//         secretKeyArr
//     )
//     return sign.detached.verify(dataObj, signature, decodeBase64(publicKey))
// }

export const keyDataToPair = keyData => {
    const arr = hexToBytes(keyData)
    console.log('arr.length', arr.length)
    return {
        publicKey: encodeBase64(new Uint8Array(arr.slice(64, 96))),
        secretKey: encodeBase64(new Uint8Array(arr.slice(0, 64)))
    }
}