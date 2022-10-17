import uuid from 'uuid'
import DataStorage from '../../utils/DataStorage'
import { translated } from '../../utils/languageHelper'
import { generateHash, isObj, objClean } from '../../utils/utils'
import { TYPES, validate as _validate, validateObj } from '../../utils/validator'

const textsCap = translated({
    errInvalidPhone: 'invalid phone number',
}, true)[1]

export const contacts = new DataStorage('totem_contacts')
export const rxContacts = contacts.rxData

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
        required: true,
        type: TYPES.email,
    },
    fileBackupTS: {
        maxLength: 24, // "2001-01-001T01:01:01.123Z"
        minLength: 16, // "2001-01-001T01:01"
        type: TYPES.string,
    },
    id: {
        maxLength: 16,
        minLength: 16,
        required: true,
        type: TYPES.string,
    },
    name: {
        maxLength: 32,
        minLength: 3,
        required: true,
        type: TYPES.string,
    },
    partnerIdentity: {
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
export const requiredKeys = Object
    .keys(validationConf)
    .filter(key => validationConf[key].required)

/**
 * @name    get
 * @summary get entry by ID
 * 
 * @param   {String}    id 
 * 
 * @returns {Object}
 */
export const get = id => contacts.get(id)

/**
 * @name    getAll
 * @summary get all entries
 * 
 * @returns {Array}
 */
export const getAll = () => contacts.getAll()

/**
 * @name    newId
 * @summary generates a new random hex with 64 byte length (16 characters)
 * 
 * @returns {String}
 */
export const newId = seed => generateHash(seed || uuid.v1(), 'blake2', 64)
    .replace('0x', '')

/**
 * @name    remove
 * @summary remove entry by ID
 * 
 * @param   {String}    id 
 */
export const remove = id => { contacts.delete(id) }

/**
 * @name    removeByPartnerIdentity
 * 
 * @param   {String}    partnerIdentity 
 */
export const removeByPartnerIdentity = partnerIdentity => {
    const map = search({ partnerIdentity })
    Array
        .from(map)
        .forEach(([id]) => remove(id))
}

/**
 * @name   search
 * @summary search contacts
 * 
 * @param   {Object}    keyValues
 * @param   {...any}    args
 * 
 * @returns {Map}
 */
export const search = (keyValues, ...args) => contacts.search(keyValues, ...args)

/**
 * @name    set
 * @summary create/update entry
 * @description a contact is either associated with a single partner or 0+ identities.
 * If a contact is associated with a partner it cannot be associated with any identity.
 * 
 * @param   {Object}    contact                 contact details
 * @param   {String}    entry.email             (optional) email address
 * @param   {String}    entry.id                unique ID
 * @param   {String}    entry.name              name for the entry
 * @param   {String}    entry.partnerIdentity   (optional) address of the partner this entry belongs to
 * @param   {String}    entry.phoneCode         (optional) phone country code starting with "+"
 * @param   {String}    entry.phoneNumber       (optional) phone number excluding country code
 * @param   {Boolean}   replace                 (optional) whether to replace existing entry. 
 *                                              Default: `false`
 * @param   {Boolean}   silent                  (optional) if true will ignore if validation fails
 *                                              Default: `false`
 */
export const set = (contact, replace = false, silent) => {
    if (!isObj(contact)) {
        if (!silent) throw new Error(textsCap.errInvalidObject)
        return null
    }

    const { id } = contact
    contact = {
        ...(replace ? {} : get(id)), // merge with existing entry if replace is falsy
        ...contact,
    }
    let err = validate(contact)
    // require phone code if phone number is specified
    if (!err) {
        const { phoneCode, phoneNumber } = contact
        err = phoneNumber && _validate(phoneCode, {
            ...validationConf.phoneCode,
            required: true,
        })
    }
    if (err) {
        if (!silent) throw new Error(err)
        return null
    }

    contacts.set(
        id,
        objClean(contact, Object.keys(validationConf))
    )
}

/**
 * @name    validate
 * @summary validate contact
 * 
 * @param   {Object} contact
 * 
 * @returns {String}
 */
export const validate = contact => validateObj(contact, validationConf, true, true)

export default {
    get,
    getAll,
    newId,
    remove,
    removeByPartnerIdentity,
    search,
    set,
    storage: contacts,
    validate,
    validationConf,
}