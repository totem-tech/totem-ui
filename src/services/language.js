import DataStorage from '../utils/DataStorage'
import { clearClutter, downloadFile, generateHash, textCapitalize } from '../utils/utils'
import client from './chatClient'
import storage from './storage'
import { getUrlParam } from './window'

const translations = new DataStorage('totem_static_translations')
export const EN = 'EN'
const MODULE_KEY = 'language'
export const BUILD_MODE = getUrlParam('build-mode').toLowerCase() == 'true'
    && window.location.hostname !== 'totem.live'
export const languages = Object.freeze({
    BN: 'Bengali',
    DE: 'German',
    EN: 'English',
    ES: 'Spanish',
    FR: 'French',
    HI: 'Hindi',
    IT: 'Italian',
    JA: 'Japanese',
    KO: 'Korean',
    NL: 'Dutch',
    PL: 'Polish',
    RU: 'Russian',
    TR: 'Turkish',
    UK: 'Ukrainian',
    ZH: 'Chinese',
})
const rw = value => storage.settings.module(MODULE_KEY, value) || {}

// retrieve latest translated texts from server and save to local storage
export const fetchNSaveTexts = async () => {
    const selected = getSelected()
    if (selected === EN) return setTexts(selected, null, null)

    const selectedHash = generateHash(getTexts(selected) || '')
    const engHash = generateHash(getTexts(EN) || '')
    const func = client.languageTranslations.promise
    const [textsEn, texts] = await Promise.all([
        func(EN, engHash),
        func(selected, selectedHash),
    ])

    if (!texts && !textsEn) return
    console.log('Language text list updated', { selected, texts, textsEn })
    // save only if update required
    setTexts(selected, texts, textsEn)
}

// get selected language code
export const getSelected = () => rw().selected || EN

export const getTexts = langCode => translations.get(langCode)

// set selected language code
export const setSelected = selected => rw({ selected })

// save translated list of texts retrieved from server
export const setTexts = (langCode, texts, enTexts) => translations.setAll(new Map(
    // remove all language cache if selected is English
    langCode === EN ? [] : [
        [EN, enTexts || translations.get(EN)],
        [langCode, texts || translations.get(langCode)],
    ].filter(Boolean)
))

export const translated = (texts = {}, capitalized = false) => {
    const langCode = getSelected() || EN
    // translation not required
    if (langCode === EN && !BUILD_MODE) return [texts, capitalized && textCapitalize(texts)]

    const en = translations.get(EN) || []
    // list of selected language texts
    const selected = translations.get(langCode) || []
    // attempt to build a single list of english texts for translation
    if (BUILD_MODE) {
        window.enList = window.enList || []
        Object.values(texts).forEach(text => {
            text = clearClutter(text)
            enList.indexOf(text) === -1 && enList.push(text)
        })
        window.enList = enList.sort()
    }

    Object.keys(texts).forEach(key => {
        const text = clearClutter(texts[key])
        const enIndex = en.indexOf(text)
        const translatedText = selected[enIndex]
        // fall back to original/English,
        // if selected language is not supported 
        // or due to network error language data download failed
        // or somehow supplied text wasn't translated
        if (!translatedText) return
        texts[key] = translatedText
    })
    return [texts, capitalized && textCapitalize(texts)]
}
// downloadTextListCSV generates a CSV file with all the unique application texts
// that can be used to translate by opening the file in Google Drive
// NB: this function should not be used when BUILD_MODE is false (URL param 'build-mode' not 'true')
export const downloadTextListCSV = !BUILD_MODE ? null : () => {
    const langCodes = [EN, ...Object.keys(languages).filter(x => x != EN)]
    const rest = langCodes.slice(1)
    const cols = textCapitalize('abcdefghijklmnopqrstuvwxyz').split('')
    const str = langCodes.join(',') + '\n' + (window.enList || []).map((x, i) => {
        const rowNo = i + 2
        const functions = rest.map((_, c) => `"=GOOGLETRANSLATE($A${rowNo}, $A$1, ${cols[c + 1]}$1)"`).join(',')
        return `"${clearClutter(x)}", ` + functions
    }).join(',\n')
    downloadFile(str, `English-texts-${new Date().toISOString()}.csv`, 'text/csv')
}

export default {
    translations,
    translated,
    setTexts,
    getSelected,
    setSelected,
}

if (BUILD_MODE) {
    // list of files that needs translation
    // MAKE SURE THIS LIST IS UPDATED BEFORE GENERATING translations.json file
    // From the 'src/' directory run in console (exclude any file that shouldn't be translated):
    ////                 ls -R | egrep -v /$
    [
        'app.jsx',
        'index.js',
        'components/buttons.jsx',
        'components/CatchReactErrors.jsx',
        'components/CheckboxGroup.jsx',
        'components/ContentSegment.jsx',
        'components/Currency.jsx',
        'components/DataTable.jsx',
        'components/FormBuilder.jsx',
        'components/FormInput.jsx',
        'components/Message.jsx',
        'components/PageHeader.jsx',
        'components/Paginator.jsx',
        'components/SidebarLeft.jsx',
        'components/TimeSince.jsx',
        'components/UserIdInput.jsx',
        'forms/AdminUtils.jsx',
        'forms/Company.jsx',
        'forms/IdentityDetails.jsx',
        'forms/Identity.jsx',
        'forms/IdentityRequest.jsx',
        'forms/IdentityShare.jsx',
        'forms/IntroduceUser.jsx',
        'forms/KeyRegistryPlayGround.jsx',
        'forms/Partner.jsx',
        'forms/Project.jsx',
        'forms/ProjectReassign.jsx',
        'forms/Register.jsx',
        'forms/RestoreBackup.jsx',
        'forms/RuntimeUpgrade.jsx',
        'forms/Settings.jsx',
        'forms/TimeKeepingInvite.jsx',
        'forms/TimeKeeping.jsx',
        'forms/Transfer.jsx',
        'lists/HistoryList.jsx',
        'lists/IdentityList.jsx',
        'lists/PartnerList.jsx',
        'lists/ProjectList.jsx',
        'lists/ProjectTeamList.jsx',
        'lists/TimeKeepingList.jsx',
        'lists/TimeKeepingSummary.jsx',
        'modules/chat/ChatBar.jsx',
        'modules/chat/chat.js',
        'modules/chat/Inbox.jsx',
        'modules/chat/InboxList.jsx',
        'modules/chat/InboxMessages.jsx',
        'modules/chat/NewInboxForm.jsx',
        'modules/Event/EventList.jsx',
        'modules/notification/ListItem.jsx',
        'modules/notification/List.jsx',
        'modules/notification/notification.js',
        'modules/notification/style.css',
        'modules/task/Form.jsx',
        'modules/task/List.jsx',
        'modules/task/task.js',
        'services/blockchain.js',
        'services/chatClient.js',
        'services/currency.js',
        'services/history.js',
        'services/identity.js',
        'services/language.js',
        'services/modal.jsx',
        'services/partner.js',
        'services/project.js',
        'services/queue.js',
        'services/react.js',
        'services/sidebar.js',
        'services/storage.js',
        'services/tag.js',
        'services/tags.js',
        'services/timeKeeping.js',
        'services/toast.jsx',
        'services/window.js',
        'views/GettingStartedView.jsx',
        'views/PageUtilitiesView.jsx',
        'views/SystemStatusView.jsx',
        'views/TimeKeepingView.jsx',
        'views/UtilitiesView.jsx',
    ]
        // import files to force translated() function call on each file and therefore force build list of English texts
        .forEach(path => require(`../${path}`))
    console.log('Language texts ready to be downloaded for translation.\nGo to the "Utilities > Admin Tools"')
}
