import React from 'react'
import { Icon } from 'semantic-ui-react'
import DataTableVertical from '../../../components/DataTableVertical'
import { Linkify } from '../../../components/StringReplace'
import { MOBILE, rxLayout } from '../../../services/window'
import { translated } from '../../../utils/languageHelper'
import { useRxSubject } from '../../../utils/reactHelper'
import { fallbackIfFails, isObj, textEllipsis } from '../../../utils/utils'
import { getColumns } from './ApplicationList'

let textsCap = {
    links: 'links',
    proposal: 'proposal',
}
textsCap = translated(textsCap, true)[1]

const ApplicationView = props => {
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    let {
        application,
        modalId,
        taskId,
        task,
    } = props
    const columns = getColumns()

    return (
        <DataTableVertical {...{
            columns: [
                ...columns,
                {
                    content: x => (
                        <div style={{ whiteSpace: 'pre-line' }}>
                            <Linkify>{x.proposal}</Linkify>
                        </div>
                    ),
                    key: 'proposal',
                    title: textsCap.proposal,
                },
                {
                    content: getLinks(isMobile),
                    key: 'links',
                    title: (
                        <div style={{ minWidth: 100 }}>
                            {textsCap.links}
                        </div>
                    ),
                }
            ],
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

const getLinks = isMobile => ({ links = [] }) => (
    <Linkify {...{
        content: links.join('\n'),
        replacer: (shortUrl, url) => {
            const { hostname } = fallbackIfFails(() => new URL(url)) || {}
            const name = knownIcons[hostname]
            const style = {}
            let color = knownColors[name]
            if (isObj(color)) {
                color = undefined
                style = { ...style, ...color }
            }
            
            return (
                <div style={{ padding: '5px 0'}} title={url}>
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