import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { runtime, secretStore } from 'oo7-substrate'
import Identicon from 'polkadot-identicon'
import { Label } from 'semantic-ui-react'
import { copyToClipboard, IfMobile, IfNotMobile, isObj, setState, setStateTimeout, textEllipsis } from '../utils/utils'
import ListFactory, { CardListItem } from '../components/ListFactory'
import storageService from '../services/storage'
import { confirm } from '../services/modal'


export class WalletItem extends ReactiveComponent {
    constructor(props) {
        const validWallet = isObj(props.wallet) && props.wallet.address
        super(props, {
            shortForm: validWallet ? runtime.indices.ss58Encode(runtime.indices.tryIndex(props.wallet.account)) : ''
        })

        this.state = {
            edit: false,
            draft: validWallet ? props.wallet.name : '',
            actionsVisible: false,
            showSecret: false
        }

        this.handleDelete = this.handleDelete.bind(this)
        this.handleEdit = this.handleEdit.bind(this)
        this.handleSave = this.handleSave.bind(this)
    }

    handleDelete() {
        const { index, total, wallet } = this.props
        // Prevent selected wallet to from being deleted
        const selectedIndex = storageService.walletIndex()
        const isSelected = selectedIndex === index
        const isOnlyItem = total === 1
        if (!isSelected && !isOnlyItem) {
            return confirm({
                confirmButton: { content: 'Delete', negative: true },
                header: 'Delete wallet?',
                onConfirm: () => {
                    // If "to be deleted" index is lower than the selected index,
                    // adjust the selected index to keep the same wallet selected
                    if (index < selectedIndex) storageService.walletIndex(selectedIndex - 1);
                    secretStore().forget(wallet)
                },
                size: 'mini'
            })
        }

        return confirm({
            cancelButton: null,
            content: 'You cannot delete ' + (
                isOnlyItem ? 'your only wallet.' : 'selected wallet. Please select a different wallet at the top-right.'
            ),
            header: 'Cannot delete wallet!',
            size: 'mini'
        })
    }

    handleEdit() {
        const { edit, draft } = this.state
        this.setState({ edit: !edit, draft: draft || wallet.name })
    }

    handleSave(e) {
        const { wallet } = this.props
        const { draft } = this.state
        if (!draft || draft.trim() === '') return;
        wallet.name = draft
        secretStore()._sync()
        this.handleEdit()
    }

    render() {
        const { addressLength, fluid, style, wallet } = this.props
        if (!wallet) return '';
        const { handleSave } = this
        const { draft, edit, shortForm, actionsVisible, showSecret } = this.state
        const addr = (shortForm || '').length <= 10 ? shortForm : textEllipsis(shortForm, addressLength)
        const walletType = ['ed25519', 'sr25519'].indexOf(wallet.type) >= 0 ? wallet.type : '???'
        const header = {
            icon: [{
                color: 'grey',
                className: 'circular',
                link: true,
                name: 'angle ' + (actionsVisible ? 'up' : 'down'),
                onClick: () => setState(this, 'actionsVisible', !actionsVisible)
            }],
            content: wallet.name,
            image: <Identicon account={wallet.account} />,
            input: {
                action: {
                    color: 'black',
                    icon: 'save',
                    onClick: handleSave,
                    size: 'tiny'
                },
                name: 'walletName',
                onChange: (e) => setState(this, 'draft', e.target.value),
                size: 'mini',
                value: draft
            },
            inputVisible: edit,
            onClick: () => setState(this, 'actionsVisible', !actionsVisible),
            subheader: <IfMobile then={() => textEllipsis(addr, 25, 5)} else={addr} />
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
                onClick: this.handleDelete,
                icon: 'trash alternate',
                content: <IfNotMobile then={'Delete'} />
            }
        ]

        // ToDo: remove dependency on CardListItem so that can be changed to any list type supported by ListFactory
        return (
            <CardListItem
                actions={menu}
                actionsVisible={actionsVisible}
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
        super(props, { secretStore: secretStore() })
    }

    render() {
        const { itemsPerRow, type } = this.props
        const wallets = this.state.secretStore.keys || []
        const numItemsPerRow = itemsPerRow || 1
        const walletItems = wallets.map((wallet, i) => (
            <WalletItem
                addressLength={numItemsPerRow > 1 && 15}
                index={i}
                key={i + wallet.name + wallet.address}
                fluid={true}
                style={itemsPerRow === 1 ? { margin: 0 } : undefined}
                total={wallets.length}
                wallet={wallet}
            />
        ))

        const getList = mobile => () => (
            <ListFactory
                type={type || 'cardlist'}
                items={walletItems}
                fluid={true}
                itemsPerRow={mobile ? 1 : numItemsPerRow}
                style={!mobile && numItemsPerRow === 1 ? { marginTop: 15 } : {}}
            />
        )

        return (
            <IfMobile then={getList(true)} else={getList(false)} />
        )
    }
}
export default WalletList