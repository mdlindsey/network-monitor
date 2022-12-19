import { useEffect, useState } from 'react'
import LineChart from '../LineChart'
import './style.css'

const HEALTH_CHECK_INTERVAL = 3000 // ms
const MAC_API_INTERVAL = 500 // ms (rate limit 2 reqs per sec)

const checkHealth = ():Promise<any> => new Promise(resolve => {
  window.electron.ipcRenderer.once('healthcheck', (res) => resolve(res))
  window.electron.ipcRenderer.sendMessage('healthcheck', [])
})

const macLookup = (mac:string):Promise<string> => new Promise(resolve => {
  window.electron.ipcRenderer.once('maclookup', (res) => resolve(res as string))
  window.electron.ipcRenderer.sendMessage('maclookup', [mac])
})

const savedHealthChecks = JSON.parse(localStorage.getItem('healthChecks') || '[]')

const HealthDashboard = () => {
  const [error, setError] = useState('')
  const [healthChecks, setHealthChecks] = useState<any[]>([...savedHealthChecks])
  const [macAddrQueue, setMacAddrQueue] = useState<string[]>([])
  const [macAddrLookups, setMacAddrLookups] = useState<Record<string,string>>({})
  const [showNetworkDeviceList, setShowNetworkDeviceList] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const res = await checkHealth()
      if (res.error) {
        setError(res.error)
      } else {
        setError('')
        const newHealthChecks = [...healthChecks, res]
        setHealthChecks(newHealthChecks)
        localStorage.setItem('healthChecks', JSON.stringify(newHealthChecks))
      }
    }, HEALTH_CHECK_INTERVAL)
    return () => clearTimeout(timeout)
  }, [healthChecks])

  useEffect(() => {
    if (!macAddrQueue.length) return
    const timeout = setTimeout(async () => {
      const macAddr = macAddrQueue.shift() as string
      const manufacturer = await macLookup(macAddr)
      if (manufacturer) {
        setMacAddrLookups({...macAddrLookups, [macAddr]: manufacturer })
        setMacAddrQueue([...macAddrQueue])
      }
    }, MAC_API_INTERVAL)
    return () => clearTimeout(timeout)
  }, [macAddrQueue])

  const latencyHistory = []
  const latencyHistoryDates = []
  for(const res of healthChecks || []) {
    for(const { mac } of res.lan.devices) {
      if (!macAddrLookups[mac] && !macAddrQueue.includes(mac)) {
        console.log('pushing mac', mac)
        macAddrQueue.push(mac)
      }
    }
    latencyHistory.push(Math.max(...res.pings))
    const localeDate = new Date(res.startTime - new Date().getTimezoneOffset() * 60 * 1000)
    latencyHistoryDates.push(localeDate)
  }

  return (
    <>
      <button onClick={() => setHealthChecks([])} className="clear-history">Clear history</button>
      { !error ? null : <h3>Error: {error}</h3> }
      {
        healthChecks.length ? null : (
          <div className="loading-placeholder">
            Loading...
          </div>
        )
      }
      {
        !healthChecks.length ? null : (
          <>
          <pre>
            Cycles: { healthChecks.length }{' '}
            ({ healthChecks[healthChecks.length-1].finishTime - healthChecks[healthChecks.length-1].startTime }ms)
          </pre>
          <pre>
            Latency: { Math.max(...healthChecks[healthChecks.length-1].pings) }ms
          </pre>
          <pre>
            Local IP: { healthChecks[healthChecks.length-1].lan.ip }
          </pre>
          <pre>
            Public IP: { healthChecks[healthChecks.length-1].www.ip }
          </pre>
          <pre>
            Network Devices: { healthChecks[healthChecks.length-1].lan.devices.length + 1 }
            <span
              onClick={() => setShowNetworkDeviceList(!showNetworkDeviceList)}
              style={{color: '#333', marginLeft: 12, padding: '0 12px', cursor: 'pointer'}}
            >
              ({showNetworkDeviceList ? 'hide' : 'show'})
            </span>
          </pre>
          {
            !showNetworkDeviceList || !healthChecks[healthChecks.length-1].lan.devices.length ? null : (
              <ul className="network-devices">
                {healthChecks[healthChecks.length-1].lan.devices.map((d:any) => (
                  <li key={d.mac}>
                    <span>{d.ip}</span>
                    <span>{d.mac}</span>
                    <span>{macAddrLookups[d.mac] || 'Loading...'}</span>
                  </li>
                ))}
              </ul>
            )
          }
          
          </>
        )
      }
      {
        !latencyHistory.length ? null : (
          <>
          <h3 style={{marginTop: 32}}>Latency History</h3>
          <LineChart
            values={latencyHistory}
            labels={latencyHistoryDates}
            style={{
              width: 700,
              height: 250,
              marginTop: 32,
            }}
          />
          </>
        )
      }
    </>
  )
}

export default HealthDashboard