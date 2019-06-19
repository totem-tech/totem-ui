import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { runtimeUp, secretStore } from 'oo7-substrate'
import { Button, Container, Dropdown, Icon, Image, Menu, Responsive, Segment, Sidebar } from 'semantic-ui-react'
// Images
import TotemButtonLogo from'./assets/totem-button-grey.png'
// Components
import ChatWidget from './components/ChatWidget'
import PageHeader from './components/PageHeader'
import SidebarLeft from './components/SidebarLeft'

// function to get window/tab width for use with Semantic UI's Responsive Component
// May or may not be necessary!!!!
const getWidth = () => {
    const isSSR = typeof window === 'undefined'
  
    return isSSR ? Responsive.onlyTablet.minWidth : window.innerWidth
}

class MobileView extends ReactiveComponent {
	constructor(props) {
		super(props, { ensureRuntime: runtimeUp })
    }

    render() {
        const {
            children,
            logoSrc,
            onSidebarToggle,
            sidebarCollapsed,
            sidebarItems,
            sidebarVisible,
            toggleMenuItem
        } = this.props
        const collapsedClass = sidebarCollapsed ? 'sidebar-collapsed' : ''
        return (
            <Responsive
                as={Sidebar.Pushable}
                getWidth={getWidth}
                minWidth={Responsive.onlyMobile.maxWidth}
                fluid
                className={'desktop' + collapsedClass}
            >
                <SidebarLeft
                    items={sidebarItems}
                    isMobile={true}
                    collapsed={false}
                    visible={sidebarVisible === undefined ? false : sidebarVisible}
                    onSidebarToggle={onSidebarToggle}
                    onMenuItemClick={toggleMenuItem}
                />

                <Sidebar.Pusher>
                    <Segment
                        inverted
                        textAlign='center'
                        style={{ minHeight: 350, padding: '1em 0em' }}
                        vertical
                    >
                        <Container>
                            <Menu inverted pointing secondary size='large'>
                                <Menu.Item onClick={this.handleToggle}>
                                <Icon name='sidebar' />
                                </Menu.Item>
                                <Menu.Item position='right'>
                                <Button as='a' inverted>
                                    Log in
                                </Button>
                                <Button as='a' inverted style={{ marginLeft: '0.5em' }}>
                                    Sign Up
                                </Button>
                                </Menu.Item>
                            </Menu>
                        </Container>
                        {/* <TopBarMobile
                            as={Container}
                            logoSrc={logoSrc}
                            onSidebarToggle={onSidebarToggle}
                            sidebarVisible={sidebarVisible}
                        /> */}
                        {/* <PageHeader logo={logoSrc} mobile /> */}
                        <ChatWidget />
                    </Segment>
                    {children}
                </Sidebar.Pusher>
            </Responsive>
        )
    }
}
export default MobileView

export class TopBarMobile extends ReactiveComponent {
    constructor() {
        super([], { secretStore: secretStore() })
    }

    readyRender() {
        const {
            logoSrc,
            onSidebarToggle,
            sidebarVisible
        } = this.props
        const ddOptions = this.state.secretStore.keys.map((key, i) => ({
            key: i,
            text: key.name,
            lablel: {
                content: key.address,
                position: 'right', // not working!!
                description: 'test',
                inverted: true
            },
            value: i
        }))

        return (
                <Menu inverted pointing secondary size='large'>
                    <Menu.Item onClick={() => onSidebarToggle(false, !sidebarVisible)}>
                        <Icon name="sidebar" />
                    </Menu.Item>
                    <Menu.Item>
                        <Image size="mini" src={logoSrc} />
                    </Menu.Item>
                    <Menu.Menu position="right">
                        <Menu.Item as="a" content="Register" icon="sign-in" />
                        <Menu.Item>
                            <Dropdown defaultValue={0} options={ddOptions} />
                        </Menu.Item>
                    </Menu.Menu>
                </Menu> 
        )
    }
}

TopBarMobile.propTypes = {
    logoSrc: PropTypes.string,
    onSidebarToggle: PropTypes.func.isRequired,
    sidebarVisible: PropTypes.bool.isRequired
}