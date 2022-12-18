import axios from 'axios'
import { exec } from 'node:child_process'

type NetworkDevice = { mac:string, ip:string, type:string }
export class API {
    public static async MacLookup(mac:string) {
        try {
            const { data } = await axios.get('https://api.maclookup.app/v2/macs/' + mac)
            return data.company || ''
        } catch(e) {
            return ''
        }
    }

    public static async Ping(host:string, count:number=1):Promise<number[]> {
        return new Promise(resolve => {
            const failureRes = [999]
            try {
                exec(`ping -n ${count} ${host}`, (res, stdout, stderr) => {
                    if (res?.code) {
                        return resolve(failureRes)
                    }
                    const latency:number[] = []
                    const lines = stdout.split('\n')
                    for(const line of lines) {
                        if (line.includes('time=')) {
                            const [, msStr] = <any>line.match(/time=([0-9]+)/i)
                            latency.push(Number(msStr))
                        }
                    }
                    resolve(latency)
                })
            } catch(e) {
                resolve(failureRes)
            }
        })
    }

    public static async WWW():Promise<{ ip:string }> {
        return new Promise(resolve => {
            const failureRes = { ip: '::1' }
            try {
                exec(`nslookup myip.opendns.com resolver1.opendns.com`, (res, stdout, stderr) => {
                    if (res?.code) {
                        return resolve(failureRes)
                    }
                    const lines = stdout.trim().split('\n')
                    const lastLine = lines[lines.length - 1]
                    const [, ip] = lastLine.split(':')
                    resolve({ ip: ip?.trim() })
                })
            } catch(e) {
                resolve(failureRes)
            }
        })
    }

    public static async LAN():Promise<{ ip:string, devices:NetworkDevice[] }> {
        return new Promise(resolve => {
            const failureRes = { ip: '::1', devices: [] }
            try {
                exec(`arp -a`, (res, stdout, stderr) => {
                    if (res?.code) {
                        return resolve(failureRes)
                    }
                    let localIp:string = ''
                    const devices = []
                    const lines = stdout.trim().split('\n')
                    for(const line of lines) {
                        if (line.includes('Interface:')) {
                            const [, ip] = line.split(' ')
                            localIp = ip
                            continue
                        }
                        if (line.includes('.')) {
                            const [ip, mac, type] = line.trim().split(/ +/)
                            devices.push({ ip, mac, type })
                        }
                    }
                    resolve({ ip: localIp, devices })
                })
            } catch(e) {
                resolve(failureRes)
            }
        })
    }
}