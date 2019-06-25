import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import {runtime, secretStore} from 'oo7-substrate'
import Identicon from 'polkadot-identicon'
import { Label } from 'semantic-ui-react'
import { copyToClipboard, IfMobile, IfNotMobile, setState, setStateTimeout, textEllipsis } from '../utils'
import ListFactory, { CardListItem} from './ListFactory'

class WalletItem extends ReactiveComponent {
    constructor(props) {
        super(props, {
            shortForm: props.wallet ? runtime.indices.ss58Encode(runtime.indices.tryIndex(props.wallet.account)) : ''
        })

        this.state = {
            edit: false,
            draft: props.wallet ? props.wallet.name : '',
            showMenu: false,
            showSecret: false
        }
        
        this.handleDelete = this.handleDelete.bind(this)
        this.handleEdit = this.handleEdit.bind(this)
        this.handleSave = this.handleSave.bind(this)
    }

    handleDelete() {
        this.props.allowDelete && secretStore().forget(this.props.wallet)
    }
    
    handleEdit() {
        const { edit, draft } = this.state
        this.setState({edit: !edit, draft: draft || wallet.name})
    }

    handleSave(e) {
        const { wallet } = this.props
        const { draft } = this.state
        if (!draft || draft.trim() === '') return;
		secretStore().forget(wallet)
        secretStore().submit(wallet.uri, draft)
        this.handleEdit()
    }
    
    render() {
        const { allowDelete, fluid, style, wallet } = this.props
        if (!wallet) return '';
        const { handleSave } = this
        const { draft, edit, shortForm, showMenu, showSecret } = this.state
        const walletType = ['ed25519', 'sr25519'].indexOf(wallet.type) >= 0 ? wallet.type : '???'
        const header = {
            icon: [{
                color: 'grey',
                className: 'circular',
                link: true,
                name: 'angle ' + (showMenu ? 'up' : 'down'),
                onClick: ()=> setState(this, 'showMenu', !showMenu)
            }],
            content: wallet.name,
            image: <Identicon account={ wallet.account } />,
            input: {
                action: {
                    color: 'black',
                    icon: 'save',
                    onClick: handleSave,
                    size: 'tiny'
                },
                name: 'walletName',
                onChange: (e)=> setState(this, 'draft', e.target.value),
                size: 'mini',
                value: draft
            },
            inputVisible: edit,
            onClick: ()=> setState(this, 'showMenu', !showMenu),
            subheader: <IfMobile then={() => textEllipsis(shortForm, 25, 5)} else={shortForm} />
        }

        const menu = [
            {
                color: 'grey',
                onClick: () => setStateTimeout(this, 'showSecret', !showSecret, showSecret, 5000),
                icon: 'eye' + (showSecret ? ' slash' : ''),
                content: <IfNotMobile then={(showSecret ? 'Hide' : 'Show') + ' Seed'} />
            },
            {
                onClick: () => copyToClipboard(wallet.address),
                icon: 'copy',
                content: <IfNotMobile then={'Copy'} />
            },
            {
                onClick: this.handleEdit,
                icon: !edit ? 'edit' : 'reply',
                content: <IfNotMobile then={!edit ? 'Edit' : 'Cancel'} />
            },
            {
                disabled: !allowDelete,
                onClick: this.handleDelete,
                icon: 'trash alternate',
                content: <IfNotMobile then={'Delete'} />
            }
        ]

        return (
            <CardListItem
                actions={menu}
                actionsVisible={showMenu}
                fluid={fluid}
                header={header}
                style={style}
                description={(
                    <React.Fragment>
                        {showSecret && (
                            <div>
                                <Label
                                    as="a"
                                    basic
                                    icon='privacy'
                                    onClick={() => setState(this, 'showSecret', false)}
                                    content='URI '
                                    detail={wallet.uri}
                                />
                            </div>
                        )}
                        <Label attached="top right" size="small">
                            Crypto
                            <Label.Detail>
                                <span style={{
                                    fontWeight: 'bold', 
                                    width: '4em',
                                    textTransform: 'capitalize',
                                    color: walletType == 'sr25519' ? '#050' : '#daa'
                                }}>
                                    {' ' + walletType}
                                </span>
                            </Label.Detail>
                        </Label>
                    </React.Fragment>
                )}
            />
        )
    }
}

WalletItem.propTypes = {
    fluid: PropTypes.bool,
    // wallet/key item from the secretStore
    wallet: PropTypes.object
}

class WalletList extends ReactiveComponent {
    constructor(props) {
        super(props, {secretStore: secretStore()})
    }

    render() {
        const {type, itemsPerRow} = this.props
        const wallets = this.state.secretStore.keys
        const allowDelete = wallets.length > 1
        const walletItems = wallets.map((wallet, i) => (
            <WalletItem
                allowDelete={allowDelete}
                key={wallet.address}
                fluid={true}
                style={ itemsPerRow === 1 ? {margin: 0} : undefined }
                wallet={wallet}
            />
        ))
        return (
            <ListFactory
                type={ type || 'cardlist'}
                items={walletItems}
                fluid={true}
                itemsPerRow={itemsPerRow || 1}
                style={itemsPerRow === 1 ? {marginTop : 15} : {}}
            />
        )
    }
}

export default WalletList