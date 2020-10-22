import React from 'react'
import { ButtonAcceptOrReject } from '../../components/buttons'
import { find as findIdentity } from '../../modules/identity/identity'
import { translated } from '../../services/language'
import { confirm } from '../../services/modal'
import { statuses } from '../../services/queue'
import { remove, search, setItemViewHandler } from '../notification/notification'

const [texts, textsCap] = translated({
    assigntTaskMsg: 'assigned a task to you.',
    yourIdentity: 'your identity',
}, true)

export const handleTaskAssignment = async (taskId, assigneeAddress, accepted = false) => {
    console.log(taskId, assigneeAddress, accepted)
}

const handleAssignmentItemView = (id, notification = {}, { senderIdBtn }) => {
    const { data, status } = notification
    const { assigneeAddress, taskId } = data || {}
    const { name } = findIdentity(assigneeAddress) || {}
    if (!name) {
        // assigneeAddress doesn't belong to the user!
        remove(id)
        return ''
    }

    return {
        content: (
            <span>
                {senderIdBtn} {texts.assigntTaskMsg}
                <div>{textsCap.yourIdentity}: {name}</div>
                <ButtonAcceptOrReject {...{
                    acceptColor: 'blue',
                    disabled: status === statuses.LOADING,
                    onClick: accepted => confirm({
                        onConfirm: () => handleTaskAssignment(taskId, assigneeAddress, accepted),
                        size: 'mini',
                    })
                }} />

            </span>
        ),
        icon: 'tasks',
        // header: 'this is a test notification ' + id
    }
}

// export const handleAssignmentResponseItemView

setTimeout(() => [
    {
        childType: 'assignment',
        handler: handleAssignmentItemView,
        type: 'task',
    }
].forEach(x => setItemViewHandler(x.type, x.childType, x.handler)))