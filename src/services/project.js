import { Bond } from 'oo7'
import { addCodecTransform, hexToBytes, calls, post, runtime } from 'oo7-substrate'
import { isBond, isStr } from '../components/utils'

addCodecTransform('ProjectHash', 'Hash')

export const addNewProject = (address, hash) => {
    if (hash.slice(0, 2) !== '0x') {
        hash = '0x' + hash
    }
    console.log('hexToBytes(hash)', hexToBytes(hash))
    return post({
        sender: runtime.indices.tryIndex(address),
        call: calls.projects.addNewProject(hash),
        compact: false,
        longevity: true
    })

    // expected results:
    // 1. {signing: true/false}
    // 2. {sending: true/false}
    // 3. 'ready'
    // 4. {finalized: 'TXID'}
}