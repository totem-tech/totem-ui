import { BehaviorSubject } from 'rxjs'
import storage from '../../services/storage'

const MODULE_KEY = 'crowdsale'
export const rxCrowdsaleData = new BehaviorSubject()

/**
 * @name    crowdsaleData
 * @summary get/set crowdsale data to localStorage
 * 
 * @param   {Object}    data (optional)
 * 
 * @returns {Object}    returns saved data
 */
export const crowdsaleData = data => {
    const saved = storage.settings.module(MODULE_KEY, data) || {}
    data && rxCrowdsaleData.next(saved)
    return saved
}

export const getCrowdsaleIdentity = () => crowdsaleData().identity

// set initial value
rxCrowdsaleData.next(crowdsaleData())