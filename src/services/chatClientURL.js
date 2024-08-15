import chatClient from '../utils/chatClient'
import storage from '../utils/storageHelper'

export const getChatClientURL = () => storage.settings.module('chatClient')?.url

export const setChatClientURL = url => storage.settings.module('chatClient', { url })

// instantiate ChatClient using saved URL
chatClient(getChatClientURL() || undefined)

