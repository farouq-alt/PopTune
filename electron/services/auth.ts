import { BrowserWindow, session, app } from 'electron'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

interface AuthData {
  cookie: string
  visitorData: string
  dataSyncId: string
  accountName: string
  accountEmail: string
  accountChannelHandle: string
}

// Simple file-based store since electron-store v10 has ESM issues
class SimpleStore {
  private filePath: string
  private data: { auth: AuthData | null }

  constructor() {
    const userDataPath = app.getPath('userData')
    this.filePath = path.join(userDataPath, 'auth-store.json')
    this.data = { auth: null }
    this.load()
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8')
        this.data = JSON.parse(content)
      }
    } catch (err) {
      console.error('Failed to load auth store:', err)
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2))
    } catch (err) {
      console.error('Failed to save auth store:', err)
    }
  }

  get(key: 'auth'): AuthData | null {
    return this.data[key]
  }

  set(key: 'auth', value: AuthData | null) {
    this.data[key] = value
    this.save()
  }

  delete(key: 'auth') {
    this.data[key] = null
    this.save()
  }
}

const store = new SimpleStore()

export class AuthService {
  private authData: AuthData | null = null

  constructor() {
    this.authData = store.get('auth')
  }

  isLoggedIn(): boolean {
    return this.authData !== null && this.hasSAPISID()
  }

  private hasSAPISID(): boolean {
    if (!this.authData?.cookie) return false
    return this.authData.cookie.includes('SAPISID')
  }

  getAuthData(): AuthData | null {
    return this.authData
  }

  getCookie(): string | null {
    return this.authData?.cookie || null
  }

  getVisitorData(): string | null {
    return this.authData?.visitorData || null
  }

  getDataSyncId(): string | null {
    return this.authData?.dataSyncId || null
  }

  /**
   * Generate SAPISIDHASH for YouTube API authentication
   */
  generateSAPISIDHash(origin: string = 'https://music.youtube.com'): string | null {
    if (!this.authData?.cookie) return null
    
    const cookies = this.parseCookies(this.authData.cookie)
    const sapisid = cookies['SAPISID']
    if (!sapisid) return null

    const timestamp = Math.floor(Date.now() / 1000)
    const hashInput = `${timestamp} ${sapisid} ${origin}`
    const hash = crypto.createHash('sha1').update(hashInput).digest('hex')
    
    return `${timestamp}_${hash}`
  }

  private parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {}
    cookieString.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.trim().split('=')
      if (name) {
        cookies[name] = rest.join('=')
      }
    })
    return cookies
  }

  async openLoginWindow(parentWindow: BrowserWindow): Promise<AuthData | null> {
    return new Promise((resolve) => {
      const loginWindow = new BrowserWindow({
        width: 500,
        height: 700,
        parent: parentWindow,
        modal: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      })

      // Clear existing YouTube cookies to force fresh login
      session.defaultSession.cookies.remove('https://music.youtube.com', 'SAPISID')

      let visitorData = ''
      let dataSyncId = ''

      // Inject script to capture visitor data
      loginWindow.webContents.on('did-finish-load', () => {
        const url = loginWindow.webContents.getURL()
        
        if (url.startsWith('https://music.youtube.com')) {
          // Extract visitor data and datasync id from page
          loginWindow.webContents.executeJavaScript(`
            (function() {
              try {
                return {
                  visitorData: window.yt?.config_?.VISITOR_DATA || '',
                  dataSyncId: (window.yt?.config_?.DATASYNC_ID || '').split('||')[0]
                };
              } catch(e) {
                return { visitorData: '', dataSyncId: '' };
              }
            })()
          `).then((data: { visitorData: string; dataSyncId: string }) => {
            if (data.visitorData) visitorData = data.visitorData
            if (data.dataSyncId) dataSyncId = data.dataSyncId
          }).catch(() => {})

          // Get cookies
          session.defaultSession.cookies.get({ url: 'https://music.youtube.com' })
            .then(async (cookies) => {
              const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')
              
              if (cookieString.includes('SAPISID')) {
                // Successfully logged in, fetch account info
                const authData: AuthData = {
                  cookie: cookieString,
                  visitorData,
                  dataSyncId,
                  accountName: '',
                  accountEmail: '',
                  accountChannelHandle: '',
                }
                
                this.authData = authData
                store.set('auth', authData)
                
                loginWindow.close()
                resolve(authData)
              }
            })
        }
      })

      loginWindow.on('closed', () => {
        if (!this.isLoggedIn()) {
          resolve(null)
        }
      })

      // Load Google login page that redirects to YouTube Music
      loginWindow.loadURL('https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fmusic.youtube.com')
    })
  }

  async updateAccountInfo(name: string, email: string, channelHandle: string) {
    if (this.authData) {
      this.authData.accountName = name
      this.authData.accountEmail = email
      this.authData.accountChannelHandle = channelHandle
      store.set('auth', this.authData)
    }
  }

  logout() {
    this.authData = null
    store.delete('auth')
    
    // Clear YouTube cookies
    session.defaultSession.cookies.remove('https://music.youtube.com', 'SAPISID')
    session.defaultSession.cookies.remove('https://youtube.com', 'SAPISID')
  }
}
