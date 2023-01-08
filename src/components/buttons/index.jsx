import React from 'react'
import _Button from './Button'
import _ButtonAcceptOrReject from './ButtonAcceptOrReject'
import _ButtonDelayed from './ButtonDelayed'
import _ButtonGroup from './ButtonGroup'
import _Reveal from './Reveal'
import _UserID from './UserID'

export const Button = _Button

export const ButtonAcceptOrReject = _ButtonAcceptOrReject

export const ButtonDelayed = _ButtonDelayed

export const ButtonGroup = _ButtonGroup

/**
 * @name    ButtonGroupOr
 * @summary shorthand for `ButtonGroup` with property `or = true`
 *
 * @param   {Object} props
 *
 * @returns {Element}
 */
export const ButtonGroupOr = (props) => <ButtonGroup {...props} or={true} />

export const Reveal = _Reveal

export const UserID = _UserID
