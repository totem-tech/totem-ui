import React, { useEffect, useState } from 'react'
import uuid from 'uuid'
import { Confirm } from 'semantic-ui-react'
import DataStorage from '../utils/DataStorage'
import { isBool, isFn, className } from '../utils/utils'
import { translated } from './language'
import { toggleFullscreen, useInverted, getUrlParam } from './window'

const modals = new DataStorage()
export const rxModals = modals.rxData
const textsCap = translated({
    areYouSure: 'are you sure?',
    ok: 'ok',
    cancel: 'cancel',
}, true)[1]

export const ModalsConainer = () => {
    const [modalsArr, setModalsArr] = useState([])

    useEffect(() => {
        let mounted = true
        const subscribed = rxModals.subscribe(map => {
            if (!mounted) return
            setModalsArr(Array.from(map))

            // add/remove class to #app element to inticate at least one modal is open
            const func = !!modals.size ? 'add' : 'remove'
            document.getElementById('app').classList[func]('modal-open')
        })
        return () => {
            mounted = false
            subscribed.unsubscribe
        }
    }, [])

    return (
        <div className="modal-service">
            {modalsArr.map(([id, modalEl]) => (
                <span {...{ key: id, id }}>{modalEl}</span>
            ))}
        </div>
    )
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
    let { cancelButton, confirmButton, content, open, onCancel, onConfirm } = confirmProps
    if (!cancelButton && cancelButton !== null) {
        cancelButton = textsCap.cancel
    }
    if (!confirmButton && confirmButton !== null) {
        confirmButton = textsCap.ok
    }
    if (!content && content !== null) {
        content = textsCap.areYouSure
    }
    return add(
        id,
        <IConfirm
            {...confirmProps}
            {...{
                cancelButton,
                confirmButton,
                content: content && <div className="content">{content}</div>,
                open: isBool(open) ? open : true,
                onCancel: (e, d) => closeModal(id) | (isFn(onCancel) && onCancel(e, d)),
                onConfirm: (e, d) => closeModal(id) | (isFn(onConfirm) && onConfirm(e, d)),
            }}
        />
    )
}
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
    if (!isFn(FormComponent)) return;
    id = id || uuid.v1()
    props = props || {}
    return add(
        id,
        <FormComponent
            {...props}
            modal={true}
            onClose={(e, d) => {
                setTimeout(() => closeModal(id))
                isFn(props.onClose) && props.onClose(e, d)
            }}
            open={true}
        />
    )
}

// open any form within './forms/ in a modal
(() => {
    const form = (getUrlParam('form') || '').trim()
    if (!form) return
    try {
        const Form = require('../forms/' + form)
        showForm(Form.default)
    } catch (e) {
        form && console.log(e)
    }
})()
export default {
    closeModal,
    confirm,
    ModalsConainer,
    showForm,
}