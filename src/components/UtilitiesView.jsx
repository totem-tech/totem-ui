import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import ContentSegment from './ContentSegment'
import UpgradeView from './UpgradeView'
import TransactionsView from './TransactionsView'
import PokeView from './PokeView'

class UtilitiesView extends ReactiveComponent {
    constructor() {
        super([])
        console.log('UtilitiesView')
    }

    render() {
        return (
            <React.Fragment>
                {subItems.map((item, i) => 
                    <ContentSegment 
                        {...item}
                        active={true}
                        key={i}
                        paddingBottom="0"
                        headerTag="h3"
                        vertical={true}
                    />
                )}
            </React.Fragment>
        )
    }
}

export default UtilitiesView


const subItems = [
    {
        content: <UpgradeView />,
        icon: 'wrench',
        header: 'Upgrade',
        subHeader: 'Upgrade the runtime using the UpgradeKey module'
    },
    {
        content: <TransactionsView />,
        icon: 'certificate',
        header: 'Transactions',
        subHeader: 'Send custom transactions'
    },
    {
        content: <PokeView />,
        icon: 'search',
        header: 'Poke',
        subHeader: 'Set a particular key of storage to a particular value'
    }
]