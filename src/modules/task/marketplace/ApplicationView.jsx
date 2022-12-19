import React, { useState } from 'react'
import { Icon } from 'semantic-ui-react'
import DataTableVertical from '../../../components/DataTableVertical'
import { Linkify } from '../../../components/StringReplace'
import { MOBILE, rxLayout } from '../../../services/window'
import { translated } from '../../../utils/languageHelper'
import { useRxSubject } from '../../../utils/reactHelper'
import { fallbackIfFails, isObj } from '../../../utils/utils'
import { getColumns } from './ApplicationList'
import TotemButtonLogo from '../../../assets/logos/button-288-colour.png' //button-240-colour.png'

let textsCap = {
    links: 'links',
    proposal: 'proposal',
}
textsCap = translated(textsCap, true)[1]

const ApplicationView = props => {
    let {
        application,
        modalId,
        taskId,
        task,
    } = props
    const [columns] = useState(() => [
        ...getColumns(),
        {
            content: x => <Linkify content={x.proposal} />,
            key: 'proposal',
            headerProps: {
                style: {
                    minWidth: 100,
                    verticalAlign: 'top',
                },
            },
            style: { whiteSpace: 'pre-line' },
            title: textsCap.proposal,
        },
        {
            content: x => <Links {...x} />,
            key: 'links',
            title: textsCap.links,
        }
    ])

    return (
        <DataTableVertical {...{
            columns,
            columnsHidden: ['view'],
            data: [application],

            // properties used by column contents
            modalId,
            taskId,
            task,
        }} />
    )
}
export default ApplicationView
const Links = ({ links = [] }) => {
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    links = [...new Set([...links, 'https://totemaccounting.com'])]
    return (
        <Linkify {...{
            content: links.join('\n'),
            replacer: (shortUrl, url) => {
                let { hostname = '' } = fallbackIfFails(() => new URL(url)) || {}
                hostname = hostname.replace('www.', '')
                const name = knownIcons[hostname]
                const style = {}
                let color = knownColors[name]
                if (isObj(color)) {
                    color = undefined
                    style = { ...style, ...color }
                }
                const icon = React.isValidElement(name)
                    ? name
                    : (
                        <Icon {...{
                            className: 'no-margin',
                            color,
                            name: name || 'linkify',
                            size: 'big',
                            style,
                        }} />
                    )
            
                return (
                    <div style={{ padding: '5px 0' }} title={url}>
                        {icon}
                        <span> {name ? hostname : shortUrl}</span>
                    </div>
                )
            },
            shorten: isMobile
                ? 40
                : 50,
        }} />
    )
}
const knownColors = {
    gitlab: 'orange',
    medium: 'black',
    reddit: { color: 'rgb(255, 69, 0)' },
    youtube: 'red',
}
const totemLogo = (
    <img {...{
        src: TotemButtonLogo,
        style: {
            marginRight: 5,
            verticalAlign: 'middle',
            width: 28,
        }
    }} />
)
const knownIcons = {
    'angel.co': 'angellist',
    'apple.com': 'apple',
    'bitbucket.org': 'bitbucket',
    'blogger.com': 'blogger',
    'discord.com': 'discord',
    'discord.gg': 'discord',
    'drive.google.com': 'google drive',
    'dropbox.com': 'dropbox',
    'facebook.com': 'facebook',
    'fb.me': 'facebook',
    'github.com': 'github',
    'gitlab.com': 'gitlab',
    'google.com': 'google',
    'hub.docker.com': 'docker',
    'instagram.com': 'instagram',
    'linkedin.com': 'linkedin',
    'medium.com': 'medium',
    'npmjs.com': 'npm',
    'pinterest.com': 'pinterest',
    'producthunt.com': 'product hunt',
    'play.google.com': 'google play',
    'reddit.com': 'reddit',
    'slideshare.net': 'slideshare',
    'stumbleupon.com': 'stumbleupon circle',
    't.me': 'telegram',
    'telegram.com': 'telegram',
    'totem.live': totemLogo,
    'totemaccounting.com': totemLogo,
    'trello.com': 'trello',
    'tumblr.com': 'tumblr square',
    'twitch.tv': 'twitch',
    'twitter.com': 'twitter',
    'wa.me': 'whatsapp',
    'youtube.com': 'youtube',
    'youtu.be': 'youtube',
}