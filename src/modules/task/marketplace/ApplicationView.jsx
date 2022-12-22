import React, { useState } from 'react'
import { Icon } from 'semantic-ui-react'
import TotemButtonLogo from '../../../assets/logos/button-288-colour.png'
import DataTableVertical from '../../../components/DataTableVertical'
import { Linkify } from '../../../components/StringReplace'
import { showInfo } from '../../../services/modal'
import { MOBILE, rxLayout } from '../../../services/window'
import { translated } from '../../../utils/languageHelper'
import { useRxSubject } from '../../../utils/reactHelper'
import {
    fallbackIfFails,
    generateHash,
    isObj,
} from '../../../utils/utils'
import { getColumns } from './ApplicationList'

let textsCap = {
    links: 'links',
    proposal: 'proposal',
    reviewApp: 'review appliation',
    title: 'title',
    viewApp: 'view appliation',
}
textsCap = translated(textsCap, true)[1]

const ApplicationView = props => {
    let {
        application,
        modalId,
        taskId,
        task = {},
    } = props
    const { proposalRequired } = task
    const [columns] = useState(() => [
        ...getColumns(),
        proposalRequired && {
            content: x => (
                <div style={{ whiteSpace: 'pre-wrap' }}>
                    <Linkify content={x.proposal.trim()} />
                </div>
            ),
            key: 'proposal',
            headerProps: {
                style: {
                    minWidth: 100,
                    verticalAlign: 'top',
                },
            },
            title: textsCap.proposal,
        },
        proposalRequired && {
            content: x => <Links {...x} />,
            key: 'links',
            title: textsCap.links,
        },
    ].filter(Boolean))

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
ApplicationView.asModal = (props, modalId, modalProps) => {
    const { 
        application,
        modalId: _modalId,
        task = {},
        taskId,
    } = props
    const { isOwner } = task
    modalId = _modalId || generateHash(
        `${taskId}-${application.workerAddress}`
    )
    const content = (
        <ApplicationView {...{
            application,
            modalId,
            task,
            taskId,
        }} />
    )
    modalProps = {
        collapsing: true,
        header: !isOwner
            ? textsCap.viewApp
            : textsCap.reviewApp,
        size: 'tiny',
        subheader: `${textsCap.title}: ${task.title}`,
        ...modalProps,
        content,
    }
    return showInfo(modalProps, modalId)
}
export default ApplicationView

const Links = ({ links = [] }) => {
    if (!links.length) return ''

    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const urls = links.reduce((obj, url) => ({
        ...obj,
        [url]: fallbackIfFails(() => new URL(url))
            || { hostname: '' },
    }), {})
    const [knownurls, unknownUrls] = links
        .reduce(([known, unknown], url) => {
            const hn = urls[url]
                .hostname
                .replace('www.', '')
            urls[url].hostname = hn
            const target = knownIcons[hn]
                ? known
                : unknown
            target.push(url)
            return [known, unknown]
        }, [[], []])

    return (
        <Linkify {...{
            content: [...knownurls, ...unknownUrls].join('\t'),
            replacer: (shortUrl, url) => {
                let { hostname = '' } = urls[url]
                const icon = knownIcons[hostname]
                const style = {}
                let color = knownColors[icon]
                if (isObj(color)) {
                    color = undefined
                    style = { ...style, ...color }
                }
                const iconOnly = unknownUrls.length === 0
                const Component = iconOnly
                    ? 'span'
                    : 'div'

                return (
                    <Component style={{ padding: '5px 0' }} title={url}>
                        {React.isValidElement(icon)
                            ? icon
                            : (
                                <Icon {...{
                                    className: 'no-margin',
                                    color,
                                    name: icon || 'linkify',
                                    size: 'big',
                                    style,
                                }} />
                            )}
                        {!iconOnly && (
                            <span>
                                {' '}
                                {!icon ? shortUrl : hostname}
                            </span>
                        )}
                    </Component>
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