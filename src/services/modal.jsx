import React, { useEffect, useState } from 'react'
import { render } from 'react-dom'
import uuid from 'uuid'
import { Confirm, Icon } from 'semantic-ui-react'
import DataStorage from '../utils/DataStorage'
import { isBool, isFn, className } from '../utils/utils'
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

// confirm opens a confirm dialog
//
// Params: 
// @confirmProps    object: properties to be supplied to the Confirm component
// @id              string: if supplied and any modal with this ID will be replaced
//
// returns
// @id              string : random id assigned to the modal. Can be used to remove using the remove function
export const confirm = (confirmProps, id) => {
    id = id || uuid.v1()
    let { cancelButton, confirmButton, content, header, open, onCancel, onConfirm } = confirmProps
    if (confirmButton !== null && !confirmButton) {
        confirmButton = textsCap.ok
    }
    if (cancelButton !== null && !cancelButton) {
        cancelButton = !confirmButton ? textsCap.close : textsCap.cancel
    }
    if (!content && content !== null) {
        content = textsCap.areYouSure
    }
    if (!confirmButton && !cancelButton && !header && content) {
        // add a close button
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
                        onClick: () => closeModal(id) | (isFn(onCancel) && onCancel(e, d))
                    }} />
                </div>
                    {content}
            </div>
        )
    }
    return add(
        id,
        <IConfirm {...{
            ...confirmProps,
            className: 'confirm-modal',
            cancelButton,
            confirmButton,
            content: content && <div className="content">{content}</div>,
            open: isBool(open) ? open : true,
            onCancel: (e, d) => closeModal(id) | (isFn(onCancel) && onCancel(e, d)),
            onConfirm: (e, d) => closeModal(id) | (isFn(onConfirm) && onConfirm(e, d)),
        }} />
    )
}
// Invertible Confirm component
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

export const get = id => modals.get(id)

// showForm opens form in a modal dialog
//
// Params: 
// @FormComponent   function/class  : FormBuilder or any other form that uses FormBuilder component (not element) class 
// @id              string          : if supplied and any modal with this ID will be replaced
//
// returns
// @id              string : random id assigned to the modal. Can be used to remove using the remove function
export const showForm = (FormComponent, props, id) => {
    // Invalid component supplied
    if (!isFn(FormComponent)) return
    id = id || uuid.v1()
    const form = (
        <FormComponent {...{
            ...props,
            modal: true,
            modalId: id,
            open: true,
            onClose: (e, d) => {
                const { onClose } = props || {}
                closeModal(id)
                isFn(onClose) && onClose(e, d)
            },
        }} />
    )
    return add(id, form)
}

// open any form within './forms/ in a modal
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