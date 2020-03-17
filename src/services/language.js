import DataStorage from '../utils/DataStorage'
import { getUrlParam } from './window'
import { clearClutter, downloadFile, textCapitalize } from '../utils/utils'
import storage from './storage'

const translations = new DataStorage('totem_static_translations')
const EN = 'EN'
const MODULE_KEY = 'language'
export const buildMode = getUrlParam('build-mode').toLowerCase() == 'true' && window.location.hostname !== 'totem.live'
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
// get selected language code
export const getSelected = () => rw().selected || EN
// set selected language code
export const setSelected = selected => rw({ selected: selected || EN })

export const translated = (texts = {}, capitalized = false) => {
    const en = translations.get(EN) || []
    // list of selected language texts
    const selected = translations.get(getSelected()) || []
    // attempt to build a single list of english texts for translation
    if (buildMode) {
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

export const getTexts = langCode => translations.get(langCode)
export const setTexts = (langCode, texts) => translations.set(langCode, texts)
export const downloadWordsListCSV = !buildMode ? () => { } : () => {
    const langCodes = [EN, ...Object.keys(languages).filter(x => x != EN)]
    const rest = langCodes.slice(1)
    const cols = textCapitalize('abcdefghijklmnopqrstuvwxyz').split('')
    const str = langCodes.join(',') + '\n' + (window.enList || []).map((x, i) => {
        const rowNo = i + 2
        const functions = rest.map((_, c) => `"=GOOGLETRANSLATE($A${rowNo}, $A$1, ${cols[c + 1]}$1)"`).join(',')
        return `"${clearClutter(x)}", ` + functions
    }).join(',\n')
    downloadFile(str, 'translations.csv', 'text/csv')
}

export default {
    translations,
    translated,
    setTexts,
    getSelected,
    setSelected,
}

if (buildMode) {

    // remove later
    window.getArr = str => `
    [
        ${ str.split('\n').join(' ').split(' ').filter(Boolean).sort().map(x => `    '${x}',`).join('\n')}
    ]
    `
    // list of files that needs translation
    const files = {
        components: [
            'CatchReactErrors.jsx',
            'ChatWidget.jsx',
            'CheckboxGroup.jsx',
            'ContentSegment.jsx',
            'Currency.jsx',
            'DataTable.jsx',
            'FormBuilder.jsx',
            'FormInput.jsx',
            'Message.jsx',
            'PageHeader.jsx',
            'Paginator.jsx',
            'SidebarLeft.jsx',
            'UserIdInput.jsx',
            'buttons.jsx',
        ],
        forms: [
            'AdminUtils.jsx',
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
            'Settings.jsx',
            'TimeKeeping.jsx',
            'TimeKeepingInvite.jsx',
            'Transfer.jsx',
        ],
        lists: [
            'HistoryList.jsx',
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
            'history.js',
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
}
