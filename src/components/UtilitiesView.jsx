import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import ContentSegment from './ContentSegment'
import UpgradeView from './UpgradeView'
import TransactionsView from './TransactionsView'
import PokeView from './PokeView'
import SystemStatus from './SystemStatus'

class UtilitiesView extends ReactiveComponent {
    constructor() {
        super([])
    }

    render() {
        return (
            <React.Fragment>
                {subItems.map((item, i) => 
                    <ContentSegment 
                        {...item}
                        active={true}
                        basic={true}
                        key={i}
                        headerTag="h3"
                        style={{padding:0}}
                        // vertical={true}
                    />
                )}
            </React.Fragment>
        )
    }
}

export default UtilitiesView


const subItems = [
    {
        content: <SystemStatus />,
        icon: '',
        header: 'Network status',
        subHeader: 'Technical information about the Totem Network'
    },
    // {
    //     content: <UpgradeView />,
    //     icon: 'wrench',
    //     header: 'Upgrade',
    //     subHeader: 'Upgrade the runtime using the UpgradeKey module'
    // },
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