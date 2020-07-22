import React, { useState, useEffect } from 'react'
import { ss58Encode } from '../utils/convert'
// components
import ContentSegment from '../components/ContentSegment'
import PageUtilitiesView from './PageUtilitiesView'
import AdminUtilsForm from '../forms/AdminUtils'
import SystemStatusView from './SystemStatusView'
import RuntimeUpgradeForm from '../forms/RuntimeUpgrade'
// services
import { getConnection } from '../services/blockchain'
import identity from '../services/identity'
import { buildMode, translated } from '../services/language'

// import TransactionsView from './TransactionsView'
// import PokeView from './PokeView'
// import UpgradeView from './UpgradeView'
const [texts] = translated({
    pageUtilsHeader: 'App Tools',
    pageUtilsSubheader: 'Utilities to help fix issues with the app',
    statusHeader: 'Network status',
    statusSubheader: 'Technical information about the Totem Network',
    upgradeHeader: 'Upgrade Runtime',
    upgradeSubheader: 'Upgrade the runtime using the UpgradeKey module',
})

export default function UtilitiesView() {
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        let mounted = true
        getConnection().then(({ api }) =>
            api.query.sudo.key().then(result => {
                if (!mounted) return
                const adminAddress = ss58Encode(result)
                const userIsAdmin = !!identity.find(adminAddress)
                userIsAdmin && setIsAdmin(true)
            })
        )

        return () => mounted = false
    }, [])
    return [
        {
            content: PageUtilitiesView,
            icon: '',
            header: texts.pageUtilsHeader,
            subHeader: texts.pageUtilsSubheader,
        },
        {
            content: SystemStatusView,
            icon: '',
            header: texts.statusHeader,
            subHeader: texts.statusSubheader,
        },
        buildMode && {
            content: AdminUtilsForm,
            header: 'Admin Tools',
        },
        // keeps runtime upgrade form hidden if user does not own the sudo key
        isAdmin && {
            content: RuntimeUpgradeForm,
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
    ]
        .filter(Boolean)
        .map((item, i) =>
            <ContentSegment
                {...item}
                active={true}
                basic={true}
                key={i + item.header}
                headerTag="h3"
                style={{ padding: 0 }}
                vertical={true}
            />
        )
}
