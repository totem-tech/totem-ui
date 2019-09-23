/*
 * Chat & data server running on https
 */
import https from 'https'
import socketIO from 'socket.io'
import { isStr, isArr } from '../src/utils/utils'
import { handleFaucetRequest } from './faucetRequests'
import { handleCompany, handleCompanySearch } from './companies'
import { handleProject, handleProjectStatus, handleProjectsByHashes, handleProjects, handleProjectsSearch } from './projects'
import { findUserByClientId, handleDisconnect, handleIdExists, handleLogin, handleMessage, handleRegister } from './users'
import {
    handleTimeKeepingEntry,
    handleTimeKeepingEntryApproval,
    handleTimeKeepingEntrySearch,
} from './timeKeeping'
const PORT = 3001
const clients = new Map()

export const initChatServer = (httpsOptions, expressApp) => {
    const server = https.createServer(httpsOptions, expressApp)
    const socket = socketIO.listen(server)
    socket.on('connection', client => {
        // User related handlers
        client.on('disconnect', handleDisconnect(clients, client))
        client.on('message', handleMessage(client, emitter))
        client.on('id-exists', handleIdExists)
        client.on('register', handleRegister(clients, client))
        client.on('login', handleLogin(clients, client))

        // Faucet request
        client.on('faucet-request', handleFaucetRequest(client, findUserByClientId))

        // Project related handlers
        client.on('project', handleProject)
        client.on('project-status', handleProjectStatus)
        client.on('projects', handleProjects)
        client.on('projects-by-hashes', handleProjectsByHashes)
        client.on('projects-search', handleProjectsSearch)

        // Company related handlers
        client.on('company', handleCompany)
        client.on('company-search', handleCompanySearch)

        // Time keeping handlers
        client.on('time-keeping-entry', handleTimeKeepingEntry(client, findUserByClientId))
        client.on('time-keeping-entry-approval', handleTimeKeepingEntryApproval)
        client.on('time-keeping-entry-search', handleTimeKeepingEntrySearch)
    })

    // Broadcast message to all users except ignoreClientIds
    const emitter = (ignoreClientIds, eventName, params) => {
        if (!isStr(eventName)) return;
        ignoreClientIds = isArr(ignoreClientIds) ? ignoreClientIds : [ignoreClientIds]
        params = params || []
        params.splice(0, 0, eventName)
        for (const [_, iClient] of clients) {
            if (ignoreClientIds.indexOf(iClient.id) >= 0) continue; // ignore sender client
            iClient.emit.apply(iClient, params)
        }
    }

    // Start listening
    server.listen(PORT, () => console.log('\nChat app https Websocket listening on port ', PORT))
}