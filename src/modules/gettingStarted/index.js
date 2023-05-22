import { generateHash, isStr, isValidNumber, randomInt } from '../../utils/utils'
import { secretBox } from '../../utils/naclHelper'
import { addFromUri, generateUri } from '../identity/identity'

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
    const decrytped = secretBox.decrypt(
        `0x${backup.slice(26, -24)}`,
        `0x${backup.slice(2, 26)}${backup.slice(-24)}`,
        secretBox.keyFromPW(password),
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
    const secretkey = secretBox.keyFromPW(password)
    let { encrypted, nonce } = secretBox.encrypt(
        isStr(data)
            ? data
            : JSON.stringify(data),
        secretkey,
    ) || {}
    if (!encrypted) throw new Error('Encryption failed')

    const encryptedData = `0x${nonce.slice(2, 26)}${encrypted.slice(2)}${nonce.slice(-24)}`
    return encryptedData
}

// generate a new password
export const generatePassword = (specialCharLimit = randomInt(3, 10)) => {
    // in rare case if identity is not successfully generated
    const newIdentity = () => {
        let id
        do {
            try {
                id = addFromUri(generateUri())
            } catch (_) { }
        } while (!id)
        return id
    }
    const { address } = newIdentity()
    const specialChars = '!£$%^&*()_-+=[]{}~#@?/><|'
    return generateHash(address, 'blake2', 256)
        .slice(2) // remove '0x'
        .split('') // convert into char array
        .map((char, i) => {
            // leave first and last 4 characters unchanged
            if (i < 5 || i >= 60) return char

            const num = randomInt(0, 99999)
            const isEven = num % 2 === 0
            if (!isValidNumber(parseInt(char))) {
                // capitalize char
                return isEven
                    ? char.toLowerCase()
                    : char.toUpperCase()
            } else if (specialCharLimit > 0 && num % 7 === 0) {
                specialCharLimit--
                // add a special character
                const spChar = specialChars[randomInt(0, specialChars.length - 1)]
                return spChar || char
            }
            return char
        })
        .join('')
}

export default {
    decryptBackup,
    encryptBackup,
    generatePassword,
}