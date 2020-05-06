import DataStorage from '../utils/DataStorage'
import client from './chatClient'

const history = new DataStorage(PREFIX + 'chat-history')

export const send = async (userIds, message) => {
    const error
    await client.pm.promise(userIds, message, false, err => error = err)
    return error
}