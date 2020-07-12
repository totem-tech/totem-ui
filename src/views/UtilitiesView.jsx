import React, { Component } from 'react'
import ContentSegment from '../components/ContentSegment'
import UpgradeView from './UpgradeView'
import PageUtilitiesView from './PageUtilitiesView'
import AdminUtilsForm from '../forms/AdminUtils'
// import TransactionsView from './TransactionsView'
// import PokeView from './PokeView'
import SystemStatusView from './SystemStatusView'
import { buildMode, translated } from '../services/language'

const [texts] = translated({
    pageUtilsHeader: 'App Tools',
    pageUtilsSubheader: 'Utilities to help fix issues with the app',
    statusHeader: 'Network status',
    statusSubheader: 'Technical information about the Totem Network',
    upgradeHeader: 'Upgrade',
    upgradeSubheader: 'Upgrade the runtime using the UpgradeKey module',
})

export default class UtilitiesView extends Component {
    render = () =>
        subItems.map((item, i) =>
            <ContentSegment
                {...item}
                active={true}
                basic={true}
                key={i}
                headerTag="h3"
                style={{ padding: 0 }}
            // vertical={true}
            />
        )
}

const subItems = [
    {
        content: <PageUtilitiesView />,
        icon: '',
        header: texts.pageUtilsHeader,
        subHeader: texts.pageUtilsSubheader,
    },
    !buildMode ? null : {
        content: AdminUtilsForm,
        header: 'Admin Tools'
    },
    {
        content: <SystemStatusView />,
        icon: '',
        header: texts.statusHeader,
        subHeader: texts.statusSubheader,
    },
    {
        content: <UpgradeView />,
        icon: 'wrench',
        header: texts.upgradeHeader,
        subHeader: texts.upgradeSubheader,
    },
    // {
    //     content: <TransactionsView />,
    //     icon: 'certificate',
    //     header: 'Transactions',
    //     subHeader: 'Send custom transactions'
    // },
    // {
    //     content: <PokeView />,
    //     icon: 'search',
    //     header: 'Poke',
    //     subHeader: 'Set a particular key of storage to a particular value'
    // }
].filter(Boolean)