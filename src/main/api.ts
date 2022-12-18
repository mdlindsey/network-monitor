import axios from 'axios'
import { exec } from 'node:child_process'

export class API {
    public static async MacLookup(mac:string) {
        try {
            const { data } = await axios.get('https://api.maclookup.app/v2/macs/' + mac)
            return data.company || ''
        } catch(e) {
            return ''
        }
    }
}

const ipLocal = () => new Promise((resolve,reject) => 
    exec(`ipconfig`, (res, stdout, stderr) => {
        if (res?.code) {
            return reject(stderr || stdout)
        }
        const lines = stdout.trim().split('\n')
        for(const line of lines) {
            if (line.includes('IPv4 Address')) {
                const [, ip] = line.split(':')
                resolve(ip?.trim())
            }
        }
        resolve('')
    }))

const forceFailure = () => new Promise((resolve,reject) => 
    exec(`ping -c 3 google.com`, (res, stdout, stderr) => {
        if (res?.code) {
            return reject(stderr || stdout)
        }
        const lines = stdout.trim().split('\n')
        for(const line of lines) {
            if (line.includes('IPv4 Address')) {
                const [, ip] = line.split(':')
                resolve(ip?.trim())
            }
        }
        resolve('')
    }))

const ipPublic = () => new Promise((resolve,reject) => 
    exec(`nslookup myip.opendns.com resolver1.opendns.com`, (res, stdout, stderr) => {
        if (res?.code) {
            return reject(stderr || stdout)
        }
        const lines = stdout.trim().split('\n')
        const lastLine = lines[lines.length - 1]
        const [, ip] = lastLine.split(':')
        resolve(ip?.trim())
    }))

const ping = (host:string, count:number=3) => new Promise((resolve,reject) => {
    try {
        exec(`ping -n ${count} ${host}`, (res, stdout, stderr) => {
            if (res?.code) {
                return reject(stderr || stdout)
            }
            const latency = []
            const lines = stdout.split('\n')
            for(const line of lines) {
                if (line.includes('time=')) {
                    const [, msStr] = <any>line.match(/time=([0-9]+)/i)
                    latency.push({ host, latency: Number(msStr) })
                }
            }
            resolve(latency)
        })
    } catch(e) {
        reject([999])
    }
})

    const arp = ():Promise<any> => new Promise((resolve,reject) => 
        exec(`arp -a`, (res, stdout, stderr) => {
            if (res?.code) {
                return reject(stderr || stdout)
            }
            let localIp:string = ''
            const networkDevices = []
            const lines = stdout.trim().split('\n')
            for(const line of lines) {
                if (line.includes('Interface:')) {
                    const [, ip] = line.split(' ')
                    localIp = ip
                    continue
                }
                if (line.includes('.')) {
                    const [ip, mac, type] = line.trim().split(/ +/)
                    networkDevices.push({ ip, mac, type })
                }
            }
            resolve({ localIp, networkDevices })
        }))

const loadParallel = ():Promise<any> => new Promise(async resolve => {
    let pings, publicIp, localIp, networkDevices
    await Promise.all([
        ping('google.com', 1).then(p => pings = p),
        ipPublic().then(ip => publicIp = ip),
        arp().then(res => {
            localIp = res.localIp
            networkDevices = res.networkDevices
        }),
    ])
    resolve({ pings, publicIp, localIp, networkDevices })
})
export default async () => {
    try {
        // await forceFailure()
        const output = await loadParallel()
        return { success: true, ...output }
    } catch(error) {
        return { success: false, error }
    }
}
