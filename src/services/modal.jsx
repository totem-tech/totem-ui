import React from 'react'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { Confirm } from 'semantic-ui-react'
import { isBool, isFn, textCapitalize } from '../utils/utils'
import { translated } from './language'

export const modals = new Map()
// Use Bond as a way to trigger update to the ModalService component
// Stores number of modals currently open
export const trigger = new Bond().defaultTo(0)
const [words, wordsCap] = translated({
    ok: 'ok',
    cancel: 'cancel',
}, true)
const [texts] = translated({
    areYouSure: 'Are you sure?'
})

export class ModalsConainer extends ReactiveComponent {
    constructor() {
        super([], { trigger })
    }

    render = () => (
        <div className="modal-service">
            {Array.from(modals).map(([id, modalEl]) => <span {...{ key: id, id }}>{modalEl}</span>)}
        </div>
    )
}

const add = (id, element) => {
    id = id || uuid.v1()
    modals.set(id, element)
    trigger.changed(modals.size)
    // add class to #app element to inticate one or more modal is open
    document.getElementById('app').classList.add('modal-open')
    return id
}

export const closeModal = (id, delay = 0) => setTimeout(() => {
    modals.delete(id)
    // update modal service
    trigger.changed(modals.size)
    // remove classname if no modal is open
    modals.size === 0 && document.getElementById('app').classList.add('modal-open')
}, delay)

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
        cancelButton = wordsCap.cancel
    }
    if (!confirmButton && confirmButton !== null) {
        confirmButton = wordsCap.ok
    }
    if (!content && content !== null) {
        content = texts.areYouSure
    }
    return add(
        id,
        <Confirm
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

export default {
    closeModal,
    confirm,
    ModalsConainer,
    showForm,
}