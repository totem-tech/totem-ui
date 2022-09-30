import uuid from 'uuid'
import DataStorage from '../../utils/DataStorage'
import { translated } from '../../utils/languageHelper'
import { generateHash, objClean } from '../../utils/utils'
import { TYPES, validate, validateObj } from '../../utils/validator'

const textsCap = translated({
    errInvalidPhone: 'invalid phone number',
}, true)[1]

export const storage = new DataStorage('totem_contact-details')

/**
 * @name    get
 * @summary get entry by ID
 * 
 * @param   {String}    id 
 * 
 * @returns {Object}
 */
export const get = id => storage.get(id)

/**
 * @name    getAll
 * @summary get all entries
 * 
 * @returns {Array}
 */
export const getAll = () => storage.getAll()

/**
 * @name    newId
 * @summary generates a new random hex with 32 byte length (8 characters)
 * 
 * @returns {String}
 */
export const newId = () => generateHash(uuid.v4(), 'blake2', 48)
    .replace('0x', '')

/**
 * @name    remove
 * @summary remove entry by ID
 * 
 * @param   {String}    id 
 */
export const remove = id => { storage.delete(id) }

/**
 * @name    set
 * @summary create/update entry
 * 
 * @param   {Object}    entry                   contact details
 * @param   {String}    entry.email             (optional) email address
 * @param   {String}    entry.id                unique ID
 * @param   {String}    entry.name              name for the entry
 * @param   {String}    entry.partnerAddress    (optional) address of the partner this entry belongs to
 * @param   {String}    entry.phoneCode         (optional) phone country code starting with "+"
 * @param   {String}    entry.phoneNumber       (optional) phone number excluding country code
 */
export const set = entry => {
    let err = validateObj(entry, validationConf, true, true)
    // require phone code if phone number is specified
    if (!err) {
        const { phoneCode, phoneNumber } = entry
        err = phoneNumber && validate(phoneCode, { ...validationConf.phoneCode, required: true })
    }
    if (err) throw new Error(err)

    const { id } = entry
    storage.set(
        id,
        objClean(
            entry,
            Object.keys(validationConf)
        )
    )
}

/**
 * @name    validationConf
 * @summary validation configuration for contact details entry
 * 
 * @example
 * validator.validateObj(entry, validationConf)
 */
export const validationConf = {
    email: {
        maxLength: 128,
        minLength: 6,
        type: TYPES.email,
    },
    id: {
        maxLength: 12,
        minLength: 12,
        required: true,
        type: TYPES.string,
    },
    name: {
        maxLength: 32,
        minLength: 3,
        required: true,
        type: TYPES.string,
    },
    partnerAddress: {
        type: TYPES.identity,
    },
    phoneCode: {
        minLength: 2,
        maxLength: 6,
        type: TYPES.string,
    },
    phoneNumber: {
        customMessages: {
            regex: textsCap.errInvalidPhone,
        },
        maxLength: 12,
        minLength: 6,
        // full phone regex
        // regex: /^[\+]+[0-9]{6,12}$/,
        // regex: /^[1-9][0-9]{5,11}$/,
        type: TYPES.string,
    },
}

export default {
    get,
    getAll,
    newId,
    remove,
    set,
    storage,
    validationConf,
}