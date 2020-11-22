import React, { useEffect, useState } from 'react'
import { render } from 'react-dom'
import uuid from 'uuid'
import { Confirm, Icon } from 'semantic-ui-react'
import DataStorage from '../utils/DataStorage'
import { isBool, isFn, className, isStr } from '../utils/utils'
import { translated } from './language'
import { toggleFullscreen, useInverted, getUrlParam } from './window'

const modals = new DataStorage()
export const rxModals = modals.rxData
const textsCap = translated({
    areYouSure: 'are you sure?',
    cancel: 'cancel',
    close: 'close',
    ok: 'ok',
}, true)[1]

export const ModalsConainer = () => {
    const [modalsArr, setModalsArr] = useState([])

    useEffect(() => {
        let mounted = true
        const subscribed = rxModals.subscribe(map => {
            if (!mounted) return
            setModalsArr(Array.from(map))

            // add/remove class to element to inticate at least one modal is open
            const func = !!map.size ? 'add' : 'remove'
            document.body.classList[func]('modal-open')
        })
        return () => {
            mounted = false
            subscribed.unsubscribe
        }
    }, [])

    return modalsArr.map(([id, modalEl]) => (
        <span {...{ key: id, id }}>{modalEl}</span>
    ))
}

const add = (id, element) => {
    id = id || uuid.v1()
    modals.set(id, element)
    // If already in fullscreen, exit. Otherwise, modal will not be visible.
    toggleFullscreen()
    return id
}

export const closeModal = (id, delay = 0) => setTimeout(() => modals.delete(id), delay)

/**
 * @name        confirm
 * @summary     opens a confirm modal/dialog
 * 
 * @param   {Object|String} confirmProps props to be used in Semantic UI Confirm component.
 *                                       If string supplied, it will be used as `content` prop
 * @param   {String}        modalId      (optional) if supplied and any existing modal with this ID will be replaced.
 *                                       Otherwise, a random UUID will be generated.
 * 
 * @returns {String}       @modalId      can be used with `closeModal` function to externally close the modal
 */
export const confirm = (confirmProps, modalId = uuid.v1()) => {
    if (isStr(confirmProps)) {
        confirmProps = { content: confirmProps }
    }
    let { cancelButton, confirmButton, content, header, open, onCancel, onConfirm } = confirmProps
    if (confirmButton !== null && !confirmButton) {
        // use default translated text for confirm button
        confirmButton = textsCap.ok
    }
    if (cancelButton !== null && !cancelButton) {
        // use default translated text for cancel button
        cancelButton = !confirmButton
            ? textsCap.close
            : textsCap.cancel
    }
    if (!content && content !== null) {
        // use default translated text for content
        content = textsCap.areYouSure
    }
    if (!confirmButton && !cancelButton && (header || content)) {
        // add a close button if both confirm and cancel buttons are hidden
        // (Semantic confirm dialoge doesn't have a close icon by default)
        content = (
            <div>
                <div style={{
                    position: 'absolute',
                    right: 15,
                    top: 15,
                }}>
                    <Icon {...{
                        className: 'grey large link icon no-margin',
                        name: 'times circle outline',
                        onClick: () => closeModal(modalId) | (isFn(onCancel) && onCancel(e, d))
                    }} />
                </div>
                    {content}
            </div>
        )
    }
    return add(
        modalId,
        <IConfirm {...{
            ...confirmProps,
            className: 'confirm-modal',
            cancelButton,
            confirmButton,
            content: content && <div className="content">{content}</div>,
            open: isBool(open) ? open : true,
            onCancel: confirm.handleCloseCb(modalId, onCancel),
            onConfirm: confirm.handleCloseCb(modalId, onConfirm),
        }} />
    )
}
confirm.handleCloseCb = (modalId, cb) => (...args) => {
    closeModal(modalId)
    isFn(cb) && cb(...args)
}
// Invertible Confirm component
// This is a sugar for the Confirm component with auto inverted/dark mode
const IConfirm = props => {
    const inverted = useInverted()
    return (
        <Confirm {...{
            ...props,
            className: className([
                props.className,
                { inverted }
            ]),
            style: {
                borderRadius: inverted ? 5 : undefined,
                ...props.style,
            }
        }} />
    )
}

/**
 * @name    get
 * @summary get modal elememnt by it's ID
 * 
 * @param {String} modalId 
 * 
 * @returns {Element}
 */
export const get = modalId => modals.get(modalId)

/**
 * @name    showForm
 * @summary opens form in a modal dialog
 * 
 * @param   {Function}  FormComponent FormBuilder or any other form that uses FormBuilder component (not element) class 
 * @param   {Object}    props         (optional) any props to supply when instantiating the form element
 * @param   {String}    modalId       (optional) if not supplied, will generate a random UUID
 * 
 * @returns {String}    @modalId      can be used with `closeModal` function to externally close the modal
 */
export const showForm = (FormComponent, props, modalId = uuid.v1()) => {
    // Invalid component supplied
    if (!isFn(FormComponent)) return

    const form = (
        <FormComponent {...{
            ...props,
            modal: true,
            modalId: modalId,
            open: true,
            onClose: (e, d) => {
                const { onClose } = props || {}
                closeModal(modalId)
                isFn(onClose) && onClose(e, d)
            },
        }} />
    )
    return add(modalId, form)
}

// enable user to open any form within './forms/ in a modal by using URL parameter `?form=FormComponentFileName`
// any other URL parameter will be supplied to the from as the `values` prop.
setTimeout(() => {
    let fileName = (getUrlParam('form') || '')
        .trim()
        .toLowerCase()
    if (!fileName) return
    try {
        fileName = (require('./languageFiles').default || [])
            .map(x => x.split('./src/forms/')[1])
            .filter(Boolean)
            .find(x => x.toLowerCase().startsWith(fileName))
        if (!fileName) return
        const Form = require(`../forms/${fileName}`)
        const values = getUrlParam()
        showForm(Form.default, { values })
        history.pushState({}, null, `${location.protocol}//${location.host}`)
    } catch (e) {
        fileName && console.log(e)
    }
})

const el = document.getElementById('modals-container')
el && render(<ModalsConainer />, el)
export default {
    closeModal,
    confirm,
    ModalsConainer,
    rxModals,
    showForm,
}