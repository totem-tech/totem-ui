import DataStorage from '../utils/DataStorage'
import { getUrlParam } from './window'
import { textCapitalize } from '../utils/utils'

const translations = new DataStorage('totem_translations')
const buildMode = getUrlParam('build-translation-list') == 'true' && window.location.hostname !== 'totem.live'
export const translated = (strObj = {}, capitalized = false) => {
    // const languageCode = 'en' // use from default settings
    // attempt to build a single list of english texts for translation
    if (buildMode) {
        const eng = translations.get('en') || {}
        Object.keys(strObj).forEach(key => {
            eng[key] = eng[key] || strObj[key]
        })
        translations.set('en', eng)
    }

    // const translatedObj = translations.get(languageCode)
    // if (languageCode === 'en' || !translatedObj) return [strObj, capitalized && textCapitalize(strObj)]
    // process...
    return [strObj, capitalized && textCapitalize(strObj)]
}

export const getEnList = () => {
    const enList = translations.get('en') || {}
    return Object.keys(enList).map(key => enList[key]).sort()
}
export const setList = (languageCode, texts) => {
    if (languageCode === 'en') return
    translations.set(languageCode, texts)
}


export default {
    translations,
    translated,
    getEnList,
    setList,
}
if (buildMode) {
    // list of files that needs translation
    // todo: services/modal++
    const files = buildMode && {
        components: [
            'CatchReactErrors.jsx',
            'ChatWidget.jsx',
            'CheckboxGroup.jsx',
            'ContentSegment.jsx',
            'DataTable.jsx',
            'FileUploadBond.jsx',
            'FormBuilder.jsx',
            'FormInput.jsx',
            'Message.jsx',
            'PageHeader.jsx',
            'Paginator.jsx',
            'Pretty.jsx',
            'SidebarLeft.jsx',
            'UserIdInput.jsx',
            'buttons.jsx',
        ],
        forms: [
            'Company.jsx',
            'Identity.jsx',
            'IdentityDetails.jsx',
            'IdentityRequest.jsx',
            'IdentityShare.jsx',
            'IntroduceUser.jsx',
            'KeyRegistryPlayGround.jsx',
            'Partner.jsx',
            'Project.jsx',
            'ProjectReassign.jsx',
            'Register.jsx',
            'TimeKeeping.jsx',
            'TimeKeepingInvite.jsx',
            'Transfer.jsx',
        ],
        lists: [
            'IdentityList.jsx',
            'PartnerList.jsx',
            'ProjectList.jsx',
            'ProjectTeamList.jsx',
            'TimeKeepingList.jsx',
            'TimeKeepingSummary.jsx',
        ],
        services: [
            'blockchain.js',
            'chatClient.js',
            'data.js',
            'identity.js',
            'language.js',
            'modal.jsx',
            'notification.jsx',
            'partner.js',
            'project.js',
            'queue.js',
            'sidebar.js',
            'storage.js',
            'timeKeeping.js',
            'toast.jsx',
            'window.js',
        ],
        views: [
            'GettingStartedView.jsx',
            'PageUtilitiesView.jsx',
            'PokeView.jsx',
            'TimeKeepingView.jsx',
            'TransactionsView.jsx',
            'UpgradeView.jsx',
            'UtilitiesView.jsx',
        ],
    }
    // import files to force run translated on each file and therefore force rebuild 'en' list
    Object.keys(files).forEach(dir => files[dir].forEach(filename => require(`../${dir}/${filename}`)))
    console.log('Language build mode. English text/words list build done.')

    // todo: move to utils
    window.downloadFile = (content, fileName, contentType) => {
        const a = document.createElement("a");
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
    }
    setTimeout(() => downloadFile(services.language.getEnList().map(x => `"${x}"`).join(',\n'), 'texts-en.csv', 'text/csv'), 3000)


    window.getArr = str => `
        [
            ${ str.split('\n').join(' ').split(' ').filter(Boolean).sort().map(x => `    '${x}',`).join('\n')}
        ]
    `
}
