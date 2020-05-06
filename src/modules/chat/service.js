import DataStorage from '../../utils/DataStorage'
import uuid from 'uuid'
import { Bond } from 'oo7'
import client, { getUser } from '../../services/chatClient'
import { arrUnique } from '../../utils/utils'

const PREFIX = 'totem_'
const inboxBonds = {} // notifies when a specific inbox view requires update
const chatHistory = new DataStorage(PREFIX + 'chat-history', true)

const saveMessage = (message = '', senderId, receiverIds, encrypted, timestamp, status = 'success', id) => {
    receiverIds = receiverIds.sort()
    const key = getInboxKey(receiverIds)
    const messages = chatHistory.get(key) || []
    let messageItem = messages.find(x => x.id === id)
    if (id && messageItem) {
        messageItem.status = status
        messageItem.timestamp = timestamp
    } else {
        messageItem = {
            senderId,
            receiverIds,
            message,
            encrypted,
            timestamp,
            status,
            id: id || uuid.v1(),
        }
        messages.push(messageItem)
    }
    chatHistory.set(key, messages)
    inboxBonds[key] = inboxBonds[key] || new Bond()
    inboxBonds[key].changed(uuid.v1())
    return messageItem
}

// returns inbox storage key
export const getInboxKey = receiverIds => {
    if (receiverIds.length === 1) return receiverIds[0]
    const { id: userId } = getUser() || {}
    return arrUnique([...receiverIds, userId]).sort().join()
}

export const getMessages = receiverIds => {
    const { id: userId } = getUser() || {}
    if (!userId) return []
    const key = getInboxKey(receiverIds)
    const msgs = chatHistory.get(key) || []
    return msgs
}

export const send = async (receiverIds, message, encrypted = false) => {
    const { id: userId } = getUser() || {}
    let error = null
    let timestamp = null
    const msgId = uuid.v1()
    const saveMsg = (status, timestamp) => saveMessage(
        message,
        userId,
        receiverIds,
        encrypted,
        timestamp,
        status,
        msgId,
    )
    userId && saveMsg('loading', null)
    try {
        await client.message.promise(receiverIds, message, false, (err, ts) => {
            error = err
            timestamp = ts
        })
    } catch (err) {
        alert(err)
    }
    userId && saveMsg(error ? 'error' : 'success', timestamp)
    return error
}

export const newInbox = (receiverIds = []) => {
    const key = getInboxKey(receiverIds)
    inboxBonds[key] = inboxBonds[key] || new Bond()
    return inboxBonds[key]
}


client.onMessage(saveMessage)
// generate bonds for previous messages
Array.from(chatHistory.getAll()).forEach(([key]) => inboxBonds[key] = new Bond())

export default {
    newInbox,
    send,
}