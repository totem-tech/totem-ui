import React from 'react'
import PropTypes from 'prop-types'
import { Button, Checkbox, Form, Header, Icon, Label, Message, Modal, Rail } from 'semantic-ui-react'
import { ReactiveComponent } from 'oo7-react'
import { isFn } from './utils';

class ModalForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            values: {}
        }

        // this.handleSubmit = this.handleSubmit.bind(this)
        this.handleChange = this.handleChange.bind(this)
    }

    handleChange(e){
        const { onChange } = this.props
        const { values } = this.state
        let { name, type, value } = e.target
        if ([ 'checkbox', 'radio' ].indexOf(type) !== -1) {
            // convert to boolean
            value = value === 'on'
        }

        values[name] = value
        this.setState({values})
        isFn(onChange) && onChange(e, values)
    }

    render() {
        const {
            closeText,
            defaultOpen,
            header,
            headerIcon,
            message,
            inputs,
            onCancel,
            onChange,
            onClose,
            onOpen,
            onSubmit,
            open,
            subheader,
            submitText,
            success,
            trigger
        } = this.props

        const msg = message || {}
        return (
            <Modal
                as={Form}
                defaultOpen={defaultOpen}
                dimmer={true}
                error={msg.error}
                onChange={this.handleChange }
                onClose={onClose}
                onOpen={onOpen}
                onSubmit={onSubmit}
                open={open}
                success={success}
                trigger={trigger}
            >

                <Rail internal position='right' close style={styles.closeButtonRail}>
                    <Icon link name='times circle outline' color="grey" size="mini" onClick={onClose} />
                </Rail>
                {header && (
                    <Header as={Modal.Header}>
                        <Header.Content>
                            {headerIcon && <Icon name={headerIcon} size="large" />}
                            {header}
                        </Header.Content>
                        {subheader && <Header.Subheader>{subheader}</Header.Subheader>}
                    </Header>
                )}
                <Modal.Content>
                    {Array.isArray(inputs) && inputs.map((item, i) => (
                        <Form.Field key={i}>
                            <label>
                                {item.label}
                                <input
                                    className={'ui ' + (['checkbox', 'radio'].indexOf(item.type) >= 0 ? item.type : 'input')}
                                    name={item.name || i}
                                    minLength={item.minlength}
                                    maxLength={item.maxLength}
                                    min={item.min}
                                    max={item.max}
                                    onChange={(e) => isFn(item.onChange) && item.onChange(e.target.value)}
                                    // pattern={item.pattern}
                                    placeholder={item.placeholder}
                                    required={item.required}
                                    type={item.type || 'text'}
                                />
                                {item.labelAfter}
                            </label>
                            {item.message && (
                                <Label
                                    color={item.message.color || 'red'}
                                    content={item.message.text}
                                    icon={item.icon}
                                />
                            )}
                        </Form.Field>
                    ))}
                </Modal.Content>
                <Modal.Actions>
                    <Button
                        content={closeText || 'Cancel'}
                        negative
                        onClick={(e) => { e.preventDefault(); onCancel && onCancel(); }}
                    />
                    <Button
                        content={submitText || 'Submit'}
                        disabled={success || msg.error}
                        positive
                    />
                </Modal.Actions>
                <Modal.Content>
                    <Message error header='Form Completed' content="You're all signed up for the newsletter" />
                    <Message success header='Form Completed' content="You're all signed up for the newsletter" />
                </Modal.Content>
            </Modal>
        )
    }
}

ModalForm.propTypes = {
    header: PropTypes.string,
    headerIcon: PropTypes.string,
    onSubmit: PropTypes.func,
    open: PropTypes.bool,
    subheader: PropTypes.string,
    trigger: PropTypes.element
}

export default ModalForm

const styles = {
    closeButtonRail: {
      marginTop: -35,
      marginRight: -15,
      padding: 0,
      fontSize: 70,
      width: 50
    }
}