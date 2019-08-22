import nacl, { box, randomBytes, secretbox, sign } from "tweetnacl"
import util, {
    decodeUTF8,
    encodeUTF8,
    encodeBase64,
    decodeBase64
} from "tweetnacl-util"
import { blake2b } from 'blakejs'
import { hexToBytes, bytesToHex, ss58Encode } from './convert'
// import { secretStore } from 'oo7-substrate'

export const isUint8Array = x => typeof x === Uint8Array
export const newNonce = length => encodeBase64(randomBytes(length || box.nonceLength))

export const encrypt = (message, nonce, externalPubKey, internalSecretKey) => {
    externalPubKey = isUint8Array(externalPubKey) ? externalPubKey : decodeBase64(externalPubKey)
    internalSecretKey = isUint8Array(internalSecretKey) ? internalSecretKey : decodeBase64(internalSecretKey)
    message = isUint8Array(message) ? message : decodeUTF8(JSON.stringify(message))
    nonce = isUint8Array(nonce) ? nonce : decodeBase64(nonce)
    const boxData = box(message, nonce, externalPubKey, internalSecretKey)
    const fullMessage = new Uint8Array(nonce.length + boxData.length)
    fullMessage.set(nonce)
    fullMessage.set(boxData, nonce.length)
    return encodeBase64(fullMessage)
}

export const decrypt = (encryptedMsg, nonce, externalPubKey, internalSecretKey) => {
    externalPubKey = isUint8Array(externalPubKey) ? externalPubKey : decodeBase64(externalPubKey)
    internalSecretKey = isUint8Array(internalSecretKey) ? internalSecretKey : decodeBase64(internalSecretKey)
    encryptedMsg = isUint8Array(encryptedMsg) ? encryptedMsg : decodeBase64(encryptedMsg)
    nonce = isUint8Array(nonce) ? nonce : decodeBase64(nonce)
    const encryptedNonce = encodeBase64(encryptedMsg.slice(0, nonce.length))
    // validate if supplied nonce matches encrypted message's nonce
    if (encryptedNonce !== encodeBase64(nonce)) return null;
    const messageArr = encryptedMsg.slice(
        nonce.length,
        encryptedMsg.length
    )
    const decrypted = box.open(messageArr, nonce, externalPubKey, internalSecretKey)
    return !decrypted ? null : JSON.parse(encodeUTF8(decrypted))
}
export const newSignature = (message, secretKey) => {
    message = isUint8Array(message) ? message : decodeUTF8(message)
    secretKey = isUint8Array(secretKey) ? secretKey : decodeBase64(secretKey)
    return encodeBase64(sign.detached(message, secretKey))
}

export const verifySignature = (message, signature, publicKey) => {
    message = isUint8Array(message) ? message : decodeUTF8(message)
    signature = isUint8Array(signature) ? signature : decodeBase64(signature)
    publicKey = isUint8Array(publicKey) ? publicKey : decodeBase64(publicKey)
    return sign.detached.verify(message, signature, publicKey)
}

export const encryptionKeypair = keyData => {
    const bytes = hexToBytes(keyData)
    const { publicKey, secretKey } = box.keyPair.fromSecretKey(blake2b(bytes.slice(0, 32), null, 32))
    return {
        walletAddress: ss58Encode(bytes.slice(64, 96)),
        publicKey: encodeBase64(publicKey),
        secretKey: encodeBase64(secretKey)
    }
}

export const signingKeyPair = keyData => {
    const bytes = hexToBytes(keyData)
    const { publicKey, secretKey } = sign.keyPair.fromSeed(blake2b(bytes.slice(0, 32), null, 32))
    return {
        publicKey: encodeBase64(publicKey),
        secretKey: encodeBase64(secretKey)
    }
}