import React, { useState } from 'react'
import { Icon } from 'semantic-ui-react'
import DataTableVertical from '../../../components/DataTableVertical'
import { Linkify } from '../../../components/StringReplace'
import { MOBILE, rxLayout } from '../../../services/window'
import { translated } from '../../../utils/languageHelper'
import { useRxSubject } from '../../../utils/reactHelper'
import { fallbackIfFails, isObj } from '../../../utils/utils'
import { getColumns } from './ApplicationList'

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
    return (
        <Linkify {...{
            content: links.join('\n'),
            replacer: (shortUrl, url) => {
                let { hostname = '' } = fallbackIfFails(() => new URL(url)) || {}
                hostname.replace('www.', '')
                const name = knownIcons[hostname]
                const style = {}
                let color = knownColors[name]
                if (isObj(color)) {
                    color = undefined
                    style = { ...style, ...color }
                }
            
                return (
                    <div style={{ padding: '5px 0' }} title={url}>
                        <Icon {...{
                            className: 'no-margin',
                            color,
                            name: name || 'linkify',
                            size: 'big',
                            style,
                        }} />
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
const knownIcons = {
    'discord.com': 'discord',
    'discord.gg': 'discord',
    'facebook.com': 'facebook',
    'fb.me': 'facebook',
    'github.com': 'github',
    'gitlab.com': 'gitlab',
    'instagram.com': 'instagram',
    'linkedin.com': 'linkedin',
    'medium.com': 'medium',
    'reddit.com': 'reddit',
    'telegram.com': 'telegram',
    't.me': 'telegram',
    'twitter.com': 'twitter',
    'youtube.com': 'youtube',
    'youtu.be': 'youtube',
}