import { BehaviorSubject } from 'rxjs'
import storage from '../../utils/storageHelper'
import { durationToSeconds, secondsToDuration } from '../../utils/time'
import {
    isArr,
    isObj,
    isStr,
    objClean
} from '../../utils/utils'
import { MODULE_KEY } from './timekeeping'

const rwCache = (key, value) => storage.cache(MODULE_KEY, key, value)

export default class Timer {
    constructor(
        initialValue = 0,
        interval = 1000,
        autoStart = true,
        cacheKey = '',
        saveKeys,
    ) {
        this.autoStarted = autoStart
        this.cacheKey = isStr(cacheKey) && cacheKey
            ? cacheKey
            : null
        this.interval = interval
        this.initialValue = initialValue
        this.intervalId = null
        this.incrementBy = interval / 1000
        this.rxInprogress = new BehaviorSubject(!!autoStart)
        this.rxInterval = new BehaviorSubject(0)
        this.rxValues = new BehaviorSubject(
            this.cacheKey
            && rwCache(this.cacheKey)
            || {}
        )
        this.saveKeys = saveKeys

        const init = () => {
            const subject = this.rxValues
            const nextOrg = this.rxValues.next.bind(subject)
            subject.next = value => nextOrg({
                ...subject.value,
                ...isObj(value)
                    ? value
                    : {
                        tsFrom: null,
                        tsStarted: null,
                        tsStopped: null,
                    },
            })
            const { tsFrom, tsStopped } = this.rxValues.value || {}
            const inprogress = this.rxInprogress.value || !tsStopped && !!tsFrom
            this.initialValue = this.getSeconds() || initialValue
            this.rxInterval.value !== this.initialValue
                && this.rxInterval.next(this.initialValue)
            inprogress && this.start()

            // automatically save values to cached storage
            this.subscriptions = {
                saveValues: this.cacheKey
                    && this.rxValues.subscribe(values =>
                        rwCache(
                            this.cacheKey,
                            isArr(this.saveKeys)
                                ? objClean(values, this.saveKeys)
                                : values
                        )
                    )
            }
        }
        setTimeout(init)
    }

    getDuration = values => secondsToDuration(
        this.getSeconds(values)
    )

    getSeconds = values => {
        const { tsFrom, tsStopped } = isObj(values)
            && values
            || this.rxValues.value
            || {}
        if (!tsFrom) return 0

        const tsTo = !!tsStopped
            ? new Date(tsStopped)
            : new Date()
        const seconds = (tsTo - new Date(tsFrom)) / 1000
        return Math.round(seconds) || 0
    }

    getValues = () => this.rxValues.value || {}

    pause = (extraValues = {}) => {
        const {
            manualEntry: me = false,
            tsFrom,
            tsStopped
        } = this.rxValues.value || {}
        this.rxInprogress.next(false)
        if (!tsFrom || !!tsStopped) return

        const now = new Date().toISOString()
        clearInterval(this.intervalId)
        extraValues.manualEntry ??= me
        this.rxValues.next({
            ...extraValues,
            inprogress: false,
            tsStopped: now,
        })
    }

    /**
     * @name stop
     * @summary stop timer and clear values
     */
    reset = (extraValues) => {
        clearInterval(this.intervalId)
        this.rxInprogress.next(false)
        this.rxInterval.next(0)
        this.rxValues.next({
            ...extraValues,
            breakCount: 0,
            inprogress: false,
            tsStopped: null,
            tsStarted: null,
            tsFrom: null,
            manualEntry: false,
        })
    }

    /**
     * @name    start
     * @summary start/resume timer
     */
    start = (extraValues) => {
        const values = { ...this.getValues() }
        let {
            breakCount = 0,
            tsStarted,
            tsFrom,
            tsStopped,
        } = values
        this.rxInprogress.next(true)
        clearInterval(this.intervalId)
        this.intervalId = setInterval(
            () => this.rxInterval.next(
                this.rxInterval.value + this.incrementBy
            ),
            this.interval,
        )
        // timer is already running
        if (tsFrom && !tsStopped) return

        const now = new Date()
        const nowStr = now.toISOString()
        this.rxValues.next({
            ...extraValues,
            breakCount: !tsFrom
                ? 0
                : !tsStopped
                    ? breakCount
                    : breakCount + 1,
            manualEntry: false,
            inprogress: true,
            tsFrom: !tsFrom
                ? nowStr
                // timer was already stopped. Calculate and set tsFrom.
                : new Date(
                    now - (new Date(tsStopped) - new Date(tsFrom))
                ).toISOString(),
            tsStarted: tsStarted || nowStr,
            tsStopped: null,
        })
    }

    /**
     * 
     * @param {*} duration 
     */
    setTimeByDuration = (duration, extraValues) => {
        const now = new Date()
        const tsStopped = now.toISOString()
        const { tsStarted } = this.getValues()
        const milliseconds = durationToSeconds(duration) * 1000
        const tsFrom = new Date(now - milliseconds)
            .toISOString()
        this.rxValues.next({
            ...extraValues,
            tsFrom,
            tsStopped: tsStopped,
            tsStarted: tsStarted && tsStarted < tsStopped
                ? tsStarted
                : tsFrom,
        })
    }
}