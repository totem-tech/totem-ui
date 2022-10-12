import { isStr } from '../../utils/utils'
import { secretBoxDecrypt, secretBoxEncrypt, secretBoxKeyFromPW } from '../../utils/naclHelper'

/**
 * @name    decryptBackup
 * @summary decrypt backup file contents using TweetNacl Secretbox decryption with a given password
 * 
 * @param   {String}    backup      backup file contents including (hex string)
 * @param   {String}    password    exact password the backup was encrypted with
 * 
 * @returns {*} decrypted data
 */
export const decryptBackup = (backup, password) => {
    const decrytped = secretBoxDecrypt(
        `0x${backup.slice(26, -24)}`,
        `0x${backup.slice(2, 26)}${backup.slice(-24)}`,
        secretBoxKeyFromPW(password),
    )
    return decrytped
}

/**
 * @name    encryptBackup
 * @summary encrypt account backup data using TweetNacl SecretBox encryption with a given password
 * 
 * @param   {Object}    data 
 * @param   {String}    password 
 * 
 * @returns {String}    encrypted hex string
 */
export const encryptBackup = (data, password) => {
    const secretkey = secretBoxKeyFromPW(password)
    let { encrypted, nonce } = secretBoxEncrypt(
        isStr(data)
            ? data
            : JSON.stringify(data),
        secretkey,
    ) || {}
    if (!encrypted) throw new Error('Encryption failed')

    const encryptedData = `0x${nonce.slice(2, 26)}${encrypted.slice(2)}${nonce.slice(-24)}`
    return encryptedData
}

export default {
    decryptBackup,
    encryptBackup,
}