/*
 * Chat & data server running on https
 */
import https from 'https'
import socketIO from 'socket.io'
import { handleCompany, handleCompanySearch } from './companies'
import { handleFaucetRequest } from './faucetRequests'
import {
    handleProject,
    handleProjectStatus,
    handleProjectTimeKeepingBan,
    handleProjects,
    handleProjectsByHashes,
    handleProjectsSearch
} from './projects'
import {
    handleTimeKeepingEntry,
    handleTimeKeepingEntryApproval,
    handleTimeKeepingEntrySearch,
} from './timeKeeping'
import {
    handleDisconnect,
    handleIdExists,
    handleLogin,
    handleMessage,
    handleRegister,
} from './users'
import { handleNotify } from './notify'

export const PORT = 3001
let server, socket
export const initChatServer = (httpsOptions, expressApp) => {
    server = https.createServer(httpsOptions, expressApp)
    socket = socketIO.listen(server)

    socket.on('connection', client => {
        // User related handlers
        client.on('disconnect', handleDisconnect.bind(client))
        client.on('message', handleMessage.bind(client))
        client.on('id-exists', handleIdExists.bind(client))
        client.on('register', handleRegister.bind(client))
        client.on('login', handleLogin.bind(client))

        // Faucet request
        client.on('faucet-request', handleFaucetRequest.bind(client))

        // Notification handler
        client.on('notify', handleNotify.bind(client))

        // Project related handlers
        client.on('project', handleProject.bind(client))
        client.on('project-status', handleProjectStatus.bind(client))
        client.on('project-time-keeping-ban', handleProjectTimeKeepingBan.bind(client))
        client.on('projects', handleProjects.bind(client))
        client.on('projects-by-hashes', handleProjectsByHashes.bind(client))
        client.on('projects-search', handleProjectsSearch.bind(client))

        // Company related handlers
        client.on('company', handleCompany.bind(client))
        client.on('company-search', handleCompanySearch.bind(client))

        // Time keeping handlers
        client.on('time-keeping-entry', handleTimeKeepingEntry.bind(client))
        client.on('time-keeping-entry-approval', handleTimeKeepingEntryApproval.bind(client))
        client.on('time-keeping-entry-search', handleTimeKeepingEntrySearch.bind(client))
    })

    // Start listening
    server.listen(PORT, () => console.log('\nChat app https Websocket listening on port ', PORT))
}