import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import {runtime, secretStore} from 'oo7-substrate'
import Identicon from 'polkadot-identicon'
import { Button, Card, Icon, Image, Input, Label,  Menu } from 'semantic-ui-react'
import { copyToClipboard, IfFn, IfMobile, IfNotMobile, setState, setStateTimeout, textEllipsis } from './utils'

const ResponsiveInput = props => (
    <IfMobile
        then={<Input {...props} fluid={true} />}
        else={<Input {...props} />}
    />
)
class WalletItem extends ReactiveComponent {
    constructor(props) {
        super(props, {
            shortForm: props.wallet ? runtime.indices.ss58Encode(runtime.indices.tryIndex(props.wallet.account)) : ''
        })

        this.state = {
            edit: false,
            draft: (props.wallet && props.wallet.name) || '',
            showActions: false,
            showSecret: false
        }
        
        this.handleNameChange = this.handleNameChange.bind(this)
        this.handleDelete = this.handleDelete.bind(this)
        this.handleEdit = this.handleEdit.bind(this)
        this.handleSave = this.handleSave.bind(this)
        this.toggleActions = this.toggleActions.bind(this)
    }
    
    handleNameChange(e, data) {
        this.setState({draft: data.value})
    }

    handleDelete() {
        if (this.props.allowDelete)
		    secretStore().forget(this.props.wallet)
    }
    
    handleEdit() {
        const { edit, draft } = this.state
        this.setState({edit: !edit, draft: draft || wallet.name})
    }

    handleSave() {
        const { wallet } = this.props
        const { draft } = this.state
        if ((draft || '').trim() === '') return;
		secretStore().forget(this.props.wallet)
        secretStore().submit(wallet.uri, draft)
        this.handleEdit()
    }
    
    toggleActions() {
        this.setState({showActions: !this.state.showActions})
    }
    
    render() {
        const { allowDelete, fluid, style, wallet } = this.props
        if (!wallet) return '';
        const { draft, edit, shortForm, showActions, showSecret } = this.state
        const walletType = ['ed25519', 'sr25519'].indexOf(wallet.type) >= 0 ? wallet.type : '???'
        const inputHeader = () => (
            <Card.Header>
                <ResponsiveInput
                    size="mini"
                    action={{
                        color: 'black',
                        icon: 'save',
                        size: 'tiny',
                        onClick: this.handleSave
                    }}
                    onChange={this.handleNameChange}
                    value={draft}
                />
            </Card.Header>
        )
        const titleHeader = () => (
            <Card.Header style={{cursor: 'pointer'}} onClick={this.toggleActions}>
                {wallet.name}
                <Icon
                    link
                    name={ 'angle ' + (showActions ? 'up' : 'down')}
                    className="circular"
                    color="grey"
                    size="small"
                />
            </Card.Header>
        )

        const actions = () => (
            <Card.Content extra>
                <Menu widths={4}>
                    <Menu.Item
                        as={Button}
                        color="grey"
                        onClick={() => setStateTimeout(this, 'showSecret', !showSecret, showSecret, 5000)}
                    >
                        <Icon name={'eye' + (showSecret ? ' slash' : '')}/>
                        <IfNotMobile then={(showSecret ? 'Hide' : 'Show') + ' Seed'} />
                    </Menu.Item>
                    <Menu.Item
                        as={Button}
                        color="grey"
                        onClick={() => copyToClipboard(wallet.address)}
                    >
                        <Icon name="copy"/>
                        <IfNotMobile then={'Copy'} />
                    </Menu.Item>
                    <Menu.Item
                        as={Button}
                        color="grey"
                        onClick={this.handleEdit}
                    >
                        <Icon name={!edit ? 'edit' : 'reply'} />
                        <IfNotMobile then={!edit ? 'Edit' : 'Cancel'} />
                    </Menu.Item>
                    <Menu.Item
                        as={Button}
                        color="grey"
                        disabled={!allowDelete}
                        onClick={this.handleDelete}
                    >
                        <Icon name="trash alternate"/>
                        <IfNotMobile then={'Delete'} />
                    </Menu.Item>
                </Menu>
            </Card.Content>
        )

        const secret = () => (
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
        )

        return (
            <Card fluid={fluid} style={style}>
                <Card.Content style={{paddingTop: '2.25em'}}>
                    <Image floated="left" size="mini">
                        <Identicon account={ wallet.account } />
                    </Image>
                    <IfFn condition={edit} then={inputHeader} else={titleHeader} />
                    <Card.Meta>
                        <IfMobile then={() => textEllipsis(shortForm, 25, 5)} else={shortForm} />
                    </Card.Meta>
                </Card.Content>
                <IfFn condition={showActions} then={actions} />

                <Card.Description>
                    <IfFn condition={showSecret} then={secret} />
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
                </Card.Description>
            </Card>
        )
    }
}

WalletItem.propTypes = {
    // wallet/key item from the secretStore
    wallet: PropTypes.object
}

export default WalletItem