import DataStorage from '../src/utils/DataStorage'
import { isObj } from '../src/utils/utils'
import { RATE_PERIODS, calcAmount } from '../src/utils/time'
const timeKeeping = new DataStorage('time-keeping.json', true)

const REQUIRED_KEYS = [
    'address',
    'blockEnd',
    'blockStart',
    'projectHash',
    'rateAmount',
    'rateUnit',
    'ratePeriod',
    //
    // only update from the server
    //
    // 'approved',
    // 'duration',
    // 'blockCount',
    // 'totalAmount',
    // 'tsCreated',
    // 'tsUpdated'
]
const VALID_KEYS = []

// add, get or update a time keeping entry
export const handleTimeKeeping = (hash, entry, callback) => {
    // if 
}

export const handleApprove = (hash, approve = false, callback) => {

}

//
export const handleNotify = (userId, hash, message) => {

}