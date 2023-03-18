import storage from '../../utils/storageHelper'
import { isDefined } from '../../utils/utils'
import { query as queryHelper } from '../../services/blockchain'
import client from '../../utils/chatClient'
import _query from './query'

const MODULE_KEY = 'financial-statement'

/**
 * @name    rwCache
 * @summary read/write to cache storage
 *
 * @param   {String}    key
 * @param   {*}         value (optional) if undefined will only return existing cache.
 *                          If `null`, will clear cache for the suppiled @key.
 * @returns {Map}
 */
export const rwCache = (key, value) => storage.cache(MODULE_KEY, key, value)

export const query = _query