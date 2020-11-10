import storage from '../../services/storage'

const MODULE_KEY = 'crowdsale'

/**
 * @name    crowdsaleData
 * @summary get/set crowdsale data to localStorage
 * 
 * @param {Object} data (optional)
 */
export const crowdsaleData = data => storage.settings.module(MODULE_KEY, data) || {}

export const getCrowdsaleIdentity = () => crowdsaleData().identity