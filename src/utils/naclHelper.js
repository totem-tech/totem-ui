import { box, randomBytes, secretbox, sign } from "tweetnacl"
import {
    decodeUTF8,
    encodeUTF8,
    encodeBase64,
    decodeBase64
} from "tweetnacl-util"

const newNonce = useSecretBox => randomBytes((useSecretBox ? secretbox : box).nonceLength)

export const generateKey = () => encodeBase64(randomBytes(secretbox.keyLength))

export const encryptWithSecretBox = (json, key) => {
    const keyUint8Array = decodeBase64(key)
    const nonce = newNonce(true)
    const messageUint8 = decodeUTF8(JSON.stringify(json))
    const boxData = secretbox(messageUint8, nonce, keyUint8Array)
    const fullMessage = new Uint8Array(nonce.length + boxData.length)
    fullMessage.set(nonce)
    fullMessage.set(boxData, nonce.length)
    return encodeBase64(fullMessage)
}

export const decryptWithSecretBox = (messageWithNonce, key) => {
    const keyUint8Array = decodeBase64(key)
    const messageWithNonceAsUint8Array = decodeBase64(messageWithNonce)
    const nonce = messageWithNonceAsUint8Array.slice(0, secretbox.nonceLength)
    const message = messageWithNonceAsUint8Array.slice(
        secretbox.nonceLength,
        messageWithNonce.length
    )
    const decrypted = secretbox.open(message, nonce, keyUint8Array)
    return !decrypted ? null : JSON.parse(encodeUTF8(decrypted))
}

export const newBoxKeyPair = () => {
    const pair = box.keyPair()
    pair.publicKey = encodeBase64(pair.publicKey)
    pair.secretKey = encodeBase64(pair.secretKey)
    return pair
}

export const encrypt = (dataObj, externalPubKey, internalSecretKey) => {
    const pubKeyUint8Array = decodeBase64(externalPubKey)
    const secretKeyUint8Array = decodeBase64(internalSecretKey)
    const nonce = newNonce()
    const messageUint8 = decodeUTF8(JSON.stringify(dataObj))
    const boxData = box(messageUint8, nonce, pubKeyUint8Array, secretKeyUint8Array)
    const fullMessage = new Uint8Array(nonce.length + boxData.length)
    fullMessage.set(nonce)
    fullMessage.set(boxData, nonce.length)
    return encodeBase64(fullMessage)
}

export const decrypt = (messageWithNonce, externalPubKey, internalSecretKey) => {
    const pubKeyUint8Array = decodeBase64(externalPubKey)
    const secretKeyUint8Array = decodeBase64(internalSecretKey)
    const messageWithNonceAsUint8Array = decodeBase64(messageWithNonce)
    const nonce = messageWithNonceAsUint8Array.slice(0, box.nonceLength)
    const message = messageWithNonceAsUint8Array.slice(
        box.nonceLength,
        messageWithNonce.length
    )
    const decrypted = box.open(message, nonce, pubKeyUint8Array, secretKeyUint8Array)
    return !decrypted ? null : JSON.parse(encodeUTF8(decrypted))
}
/// ??????????? must use keypair generated for signature
export const verifySignature = (dataObj, secretKey, publicKey) => {
    // const pair = sign.keyPair.fromSecretKey(decodeBase64(secretKey))
    console.log(pair)
    const signature = sign.detached(
        decodeUTF8(JSON.stringify(dataObj)),
        decodeBase64(secretKey)
    )
    return sign.detached.verify(dataObj, signature, decodeBase64(publicKey))
}