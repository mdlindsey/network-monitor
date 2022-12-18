import { useEffect, useState } from 'react'
import LineChart from '../LineChart'
import './style.css'

const HEALTH_CHECK_INTERVAL = 1000 // ms
const MAC_API_INTERVAL = 500 // ms (rate limit 2 reqs per sec)

const checkHealth = ():Promise<any> => new Promise(resolve => {
  window.electron.ipcRenderer.once('healthcheck', (res) => resolve(res))
  window.electron.ipcRenderer.sendMessage('healthcheck', [])
})

const macLookup = (mac:string):Promise<string> => new Promise(resolve => {
  window.electron.ipcRenderer.once('maclookup', (res) => resolve(res as string))
  window.electron.ipcRenderer.sendMessage('maclookup', [mac])
})

const HealthDashboard = () => {
  const [error, setError] = useState('')
  const [healthChecks, setHealthChecks] = useState<any[]>([])
  const [macAddrQueue, setMacAddrQueue] = useState<string[]>([])
  const [macAddrLookups, setMacAddrLookups] = useState<Record<string,string>>({})
  const [showNetworkDeviceList, setShowNetworkDeviceList] = useState(false)

  useEffect(() => {
    setTimeout(async () => {
      const startTime = new Date().getTime()
      const res = await checkHealth()
      const finishTime = new Date().getTime()
      if (res.error) {
        setError(res.error)
      } else {
        setError('')
        setHealthChecks([...healthChecks, { ...res, startTime, finishTime }])
      }
    }, HEALTH_CHECK_INTERVAL)
  }, [healthChecks])

  useEffect(() => {
    if (!macAddrQueue.length) return
    setTimeout(async () => {
      const macAddr = macAddrQueue.shift() as string
      const manufacturer = await macLookup(macAddr)
      if (manufacturer) {
        setMacAddrLookups({...macAddrLookups, [macAddr]: manufacturer })
        setMacAddrQueue([...macAddrQueue])
      }
    }, MAC_API_INTERVAL)
  }, [macAddrQueue])

  const latencyHistory = []
  for(const res of healthChecks || []) {
    for(const { mac } of res.networkDevices) {
      if (!macAddrLookups[mac] && !macAddrQueue.includes(mac)) {
        console.log('pushing mac', mac)
        macAddrQueue.push(mac)
      }
    }
    latencyHistory.push(Math.max(...res.pings.map((p:any) => p.latency)))
  }

  return (
    <div className="health-dashboard">
      <h1>Network Monitor</h1>
      { !error ? null : <h3>Error: {error}</h3> }
      {
        !healthChecks.length ? null : (
          <>
          <pre>
            Cycles: { healthChecks.length }{' '}
            ({ healthChecks[healthChecks.length-1].finishTime - healthChecks[healthChecks.length-1].startTime }ms)
          </pre>
          <pre>
            Latency: { Math.max(...healthChecks[healthChecks.length-1].pings.map((p:any) => p.latency)) }ms
          </pre>
          <pre>
            Local IP: { healthChecks[healthChecks.length-1].localIp }
          </pre>
          <pre>
            Public IP: { healthChecks[healthChecks.length-1].publicIp }
          </pre>
          <pre>
            Network Devices: { healthChecks[healthChecks.length-1].networkDevices.length + 1 }
            <span
              onClick={() => setShowNetworkDeviceList(!showNetworkDeviceList)}
              style={{color: '#333', marginLeft: 12, padding: '0 12px', cursor: 'pointer'}}
            >
              ({showNetworkDeviceList ? 'hide' : 'show'})
            </span>
          </pre>
          {
            !showNetworkDeviceList || !healthChecks[healthChecks.length-1].networkDevices.length ? null : (
              <ul className="network-devices">
                {healthChecks[healthChecks.length-1].networkDevices.map((d:any) => (
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
        <LineChart
          values={latencyHistory}
          style={{
            width: 700,
            height: 250,
            marginTop: 32,
          }}
        />
      }
    </div>
  )
}

export default HealthDashboard