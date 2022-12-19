import { useEffect, useState } from 'react'
import { w3cwebsocket as W3CWebSocket } from 'websocket'
import LineChart from '../LineChart'
import './style.css'

const localhost = 'localhost:8080'
const flyHost = 'network-monitor-api-uws.fly.dev'
const customHost = 'network-monitor-api.mdlindsey.com'

const time = () => new Date().getTime()
const wsc = new W3CWebSocket(`ws://${flyHost}`)

const globalLedger:any = { up: {}, down: {} }

const WebSocketMonitor = () => {

    const pingInterval = 1000

    const clearHistory = () => {
        globalLedger.up = {}
        globalLedger.down = {}
        setUpLedger({ ...globalLedger.up })
        setDownLedger({ ...globalLedger.down })
    }

    const [upLedgerSize, setUpLedgerSize] = useState(0)
    const [upLedger, setUpLedger] = useState<Record<string, { ack: string, now: string }>>({})
    const [downLedger, setDownLedger] = useState<Record<string, string>>({})

    useEffect(() => {
        if (Object.keys(globalLedger.up).length === upLedgerSize) return
        setUpLedgerSize(Object.keys(globalLedger.up).length)
    }, [upLedger])

    useEffect(() => {
        const timeout = setTimeout(() => {
            const timeStr = `${time()}`
            globalLedger.up[timeStr] = { ack: '', now: '' }
            setUpLedger({ ...globalLedger.up })
            wsc.send(timeStr)
        }, pingInterval)
        return () => clearTimeout(timeout)
    }, [upLedgerSize])

    wsc.onopen = () => {
        console.log('[+] Websocket connection established')
        setTimeout(() => {
            wsc.send(`${time()}`)
        }, 1000)
    }
    wsc.onclose = () => console.log('[!] Websocket connection closed')
    wsc.onerror = (res) => console.log('[!] Websocket error received:', res)
    wsc.onmessage = (res) => {
        const message = res.data as string
        const ackMatch = message.match(/^:([0-9]+)>([0-9]+)$/)
        if (ackMatch) {
            const [, sentTimeStr, ackTimeStr] = ackMatch
            if (!globalLedger.up[sentTimeStr]) {
                console.log('Got ack for unknown timestamp', sentTimeStr)
                return
            }
            globalLedger.up[sentTimeStr].ack = ackTimeStr
            globalLedger.up[sentTimeStr].now = `${time()}`
            setUpLedger({ ...globalLedger.up })
            return
        }
        const castNum = Number(message)
        if (!globalLedger.down[castNum] && !isNaN(castNum)) {
            globalLedger.down[castNum] = `${time()}`
            setDownLedger({ ...globalLedger.down })
            return
        }
        console.log(`[?] Message unresolved... <${castNum}>:`, message)
    }

    const descUpLedgerKeys = Object.keys(upLedger).sort((a,b) => Number(b)-Number(a))
    const upAckLatencyHistory = descUpLedgerKeys.map(t => !upLedger[t].ack ? 0 : Math.max(0, Number(upLedger[t].ack) - Number(t)))
    const upDownLatencyHistory = descUpLedgerKeys.map(t => !upLedger[t].ack ? 0 :  Math.max(0, Number(upLedger[t].now) - Number(upLedger[t].ack)))
    const upLabels = descUpLedgerKeys.map(t => new Date(Number(t) - new Date().getTimezoneOffset() * 60 * 1000))
    
    const descDownLedgerKeys = Object.keys(downLedger).sort((a,b) => Number(b)-Number(a))
    const downLatencyHistory = descDownLedgerKeys.map(t =>  Math.max(0, Number(downLedger[t]) - Number(t)))
    const downLabels = descDownLedgerKeys.map(t => new Date(Number(t) - new Date().getTimezoneOffset() * 60 * 1000))

    // Sometimes you get an outlier immediately after connecting
    if (upDownLatencyHistory[upDownLatencyHistory.length - 1] > upDownLatencyHistory[upDownLatencyHistory.length - 2] * 10) {
        descUpLedgerKeys.pop()
        upAckLatencyHistory.pop()
        upDownLatencyHistory.pop()
    }

    if (!downLatencyHistory.length) {
        return (
            <div className="loading-placeholder">Loading...</div>
        )
    }

    return (
        <div style={{marginTop: 32}}>
            <button onClick={clearHistory} className="clear-history">Clear history</button>
            <div style={{ display: 'inline-block' }}>
            <h3 style={{marginTop: 32}}>Download Latency</h3>
            <LineChart
                values={downLatencyHistory}
                labels={downLabels}
                style={{
                    width: 233,
                    height: 128,
                }}
            />
            </div>
            <div style={{ display: 'inline-block' }}>
            <h3 style={{marginTop: 32}}>Upload Latency</h3>
            <LineChart
                values={upAckLatencyHistory}
                labels={upLabels}
                style={{
                    width: 233,
                    height: 128,
                }}
            />
            </div>
            <div style={{ display: 'inline-block' }}>
            <h3 style={{marginTop: 32}}>Receipt Latency</h3>
            <LineChart
                values={upDownLatencyHistory}
                labels={upLabels}
                style={{
                    width: 233,
                    height: 128,
                }}
            />
            </div>

            {/* <h3 style={{marginTop: 32}}>WebSocket Traffic Log</h3>
            <ul className="ws-ledger">
                <li>
                    <span className="ack"></span>
                    <span className="time">⬆️</span>
                    <span className="time">⬇️</span>
                    <span className="time">🔄</span>
                    <span className="time">Sent</span>
                </li>
                {
                    descUpLedgerKeys.map((t,i) => (
                        <li key={t + i}>
                            <span className={`ack ${upLedger[t].ack && 'yes'}`}></span>
                            <span className="time">
                                {
                                    !upLedger[t].ack ? '?' : (
                                        `${Number(upLedger[t].ack) - Number(t)}ms`
                                    )
                                }
                            </span>
                            <span className="time">
                                {
                                    !upLedger[t].ack ? '?' : (
                                        `${Number(upLedger[t].now) - Number(upLedger[t].ack)}ms`
                                    )
                                }
                            </span>
                            <span className="time">
                                {
                                    !upLedger[t].ack ? '?' : (
                                        `${Number(upLedger[t].now) - Number(t)}ms`
                                    )
                                }
                            </span>
                            <span className="time">{t}</span>
                        </li>
                    ))
                }
            </ul> */}
        </div>
    )
}

export default WebSocketMonitor
