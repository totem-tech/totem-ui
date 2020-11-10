import { BehaviorSubject } from 'rxjs'
import storage from '../../services/storage'

const MODULE_KEY = 'crowdsale'
export const rxData = new BehaviorSubject()

/**
 * @name    crowdsaleData
 * @summary get/set crowdsale data to localStorage
 * 
 * @param {Object} data (optional)
 */
export const crowdsaleData = data => {
    const saved = storage.settings.module(MODULE_KEY, data) || {}
    data && rxData.next(saved)
    return saved
}

export const getCrowdsaleIdentity = () => crowdsaleData().identity

rxData.next(crowdsaleData())