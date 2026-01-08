import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import http from 'http'
import { spawn, ChildProcess } from 'child_process'
import { initDatabase, getDatabase } from './database'
import { YouTubeService } from './services/youtube'
import { LocalMusicService } from './services/localMusic'
import { LyricsService } from './services/lyrics'

let mainWindow: BrowserWindow | null = null
let youtubeService: YouTubeService
let localMusicService: LocalMusicService
let lyricsService: LyricsService
let proxyServer: http.Server | null = null

// Store for stream data
const streamUrls = new Map<string, string>()
// Store active ffmpeg processes for cleanup
const activeStreams = new Map<string, ChildProcess>()

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged
const PROXY_PORT = 45678

function startProxyServer() {
  proxyServer = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400)
      return res.end()
    }

    // Parse URL properly
    const parsedUrl = new URL(req.url, `http://127.0.0.1:${PROXY_PORT}`)
    const streamId = parsedUrl.pathname.slice(1)
    
    const youtubeUrl = streamUrls.get(streamId)

    if (!youtubeUrl) {
      console.error('Stream not found:', streamId)
      res.writeHead(404)
      return res.end('Stream not found')
    }

    // FIX 3: Handle HEAD requests properly
    if (req.method === 'HEAD') {
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'none',
        'Cache-Control': 'no-cache',
      })
      return res.end()
    }

    // FIX 2: Reject Range requests - force progressive streaming
    if (req.headers.range) {
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'none',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })
      // Don't return 416, just ignore range and stream from current position
    } else {
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'none',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })
    }

    // FIX 1: Reuse existing FFmpeg process, don't restart
    let ffmpeg = activeStreams.get(streamId)
    
    if (!ffmpeg || ffmpeg.killed) {
      ffmpeg = spawn('ffmpeg', [
        '-hide_banner',
        '-loglevel', 'error',
        '-reconnect', '1',
        '-reconnect_streamed', '1', 
        '-reconnect_delay_max', '2',
        '-i', youtubeUrl,
        '-vn',
        '-c:a', 'libmp3lame',
        '-b:a', '128k',
        '-ar', '44100',
        '-f', 'mp3',
        '-fflags', '+nobuffer+fastseek',
        '-flags', '+low_delay',
        '-flush_packets', '1',
        '-',
      ], {
        stdio: ['ignore', 'pipe', 'pipe']
      })

      activeStreams.set(streamId, ffmpeg)

      ffmpeg.stderr?.on('data', (data) => {
        const msg = data.toString()
        if (msg.includes('Error') || msg.includes('error')) {
          console.error('FFmpeg error:', msg)
        }
      })

      ffmpeg.on('error', (err) => {
        console.error('FFmpeg spawn error:', err)
        activeStreams.delete(streamId)
      })

      ffmpeg.on('close', (code) => {
        activeStreams.delete(streamId)
      })
    }

    // Pipe FFmpeg output to response
    ffmpeg.stdout?.pipe(res, { end: true })

    // Clean up on client disconnect
    req.on('close', () => {
      console.log('Client disconnected')
      // Don't kill FFmpeg here - let it continue for reconnects
    })
  })

  proxyServer.listen(PROXY_PORT, '127.0.0.1', () => {
    console.log(`Audio proxy server running on http://127.0.0.1:${PROXY_PORT}`)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#09090b',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  console.log('Preload path:', path.join(__dirname, 'preload.js'))

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  startProxyServer()
  await initDatabase()
  youtubeService = new YouTubeService()
  localMusicService = new LocalMusicService()
  lyricsService = new LyricsService()
  
  await youtubeService.init()
  
  createWindow()
  registerIpcHandlers()
})

app.on('window-all-closed', () => {
  // Kill all active FFmpeg processes
  activeStreams.forEach((proc) => proc.kill('SIGTERM'))
  activeStreams.clear()
  
  if (proxyServer) {
    proxyServer.close()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

function registerIpcHandlers() {
  // Window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow?.close())

  // YouTube Music API
  ipcMain.handle('youtube:search', async (_, query: string) => {
    return youtubeService.search(query)
  })

  ipcMain.handle('youtube:getHome', async () => {
    return youtubeService.getHome()
  })

  ipcMain.handle('youtube:getStreamUrl', async (_, videoId: string) => {
    const result = await youtubeService.getStreamUrl(videoId)
    const streamId = `${videoId}-${Date.now()}`
    
    // Store the YouTube URL for FFmpeg to consume
    streamUrls.set(streamId, result.url)
    
    // Clean up after 1 hour
    setTimeout(() => {
      streamUrls.delete(streamId)
      const proc = activeStreams.get(streamId)
      if (proc) {
        proc.kill('SIGTERM')
        activeStreams.delete(streamId)
      }
    }, 3600000)
    
    return {
      ...result,
      mimeType: 'audio/mpeg', // We're transcoding to MP3
      url: `http://127.0.0.1:${PROXY_PORT}/${streamId}`,
    }
  })

  ipcMain.handle('youtube:getAlbum', async (_, albumId: string) => {
    return youtubeService.getAlbum(albumId)
  })

  ipcMain.handle('youtube:getArtist', async (_, artistId: string) => {
    return youtubeService.getArtist(artistId)
  })

  ipcMain.handle('youtube:getPlaylist', async (_, playlistId: string) => {
    return youtubeService.getPlaylist(playlistId)
  })

  // Local music
  ipcMain.handle('local:scanFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
    })
    if (!result.canceled && result.filePaths[0]) {
      return localMusicService.scanFolder(result.filePaths[0])
    }
    return []
  })

  ipcMain.handle('local:getMetadata', async (_, filePath: string) => {
    return localMusicService.getMetadata(filePath)
  })

  // Lyrics
  ipcMain.handle('lyrics:get', async (_, title: string, artist: string, duration: number) => {
    return lyricsService.getLyrics(title, artist, duration)
  })

  // Database operations
  ipcMain.handle('db:getSongs', async () => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM songs ORDER BY title').all()
  })

  ipcMain.handle('db:addSong', async (_, song: any) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO songs (id, title, artist, album, duration, thumbnailUrl, isLocal, localPath)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(song.id, song.title, song.artist, song.album, song.duration, song.thumbnailUrl, song.isLocal ? 1 : 0, song.localPath)
  })

  ipcMain.handle('db:getPlaylists', async () => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM playlists ORDER BY name').all()
  })

  ipcMain.handle('db:createPlaylist', async (_, name: string) => {
    const db = getDatabase()
    const id = `playlist_${Date.now()}`
    db.prepare('INSERT INTO playlists (id, name, createdAt) VALUES (?, ?, ?)').run(id, name, Date.now())
    return { id, name }
  })

  ipcMain.handle('db:addToPlaylist', async (_, playlistId: string, songId: string) => {
    const db = getDatabase()
    const position = db.prepare('SELECT COUNT(*) as count FROM playlist_songs WHERE playlistId = ?').get(playlistId) as any
    db.prepare('INSERT INTO playlist_songs (playlistId, songId, position) VALUES (?, ?, ?)').run(playlistId, songId, position.count)
  })

  ipcMain.handle('db:getPlaylistSongs', async (_, playlistId: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT s.* FROM songs s
      JOIN playlist_songs ps ON s.id = ps.songId
      WHERE ps.playlistId = ?
      ORDER BY ps.position
    `).all(playlistId)
  })

  ipcMain.handle('db:getLikedSongs', async () => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM songs WHERE liked = 1 ORDER BY likedAt DESC').all()
  })

  ipcMain.handle('db:toggleLike', async (_, songId: string) => {
    const db = getDatabase()
    const song = db.prepare('SELECT liked FROM songs WHERE id = ?').get(songId) as any
    const newLiked = song?.liked ? 0 : 1
    db.prepare('UPDATE songs SET liked = ?, likedAt = ? WHERE id = ?').run(newLiked, newLiked ? Date.now() : null, songId)
    return newLiked === 1
  })

  ipcMain.handle('db:getRecentlyPlayed', async () => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM songs WHERE lastPlayedAt IS NOT NULL ORDER BY lastPlayedAt DESC LIMIT 50').all()
  })

  ipcMain.handle('db:updatePlayedAt', async (_, songId: string) => {
    const db = getDatabase()
    db.prepare('UPDATE songs SET lastPlayedAt = ?, playCount = playCount + 1 WHERE id = ?').run(Date.now(), songId)
  })

  ipcMain.handle('db:removeFromPlaylist', async (_, playlistId: string, songId: string) => {
    const db = getDatabase()
    db.prepare('DELETE FROM playlist_songs WHERE playlistId = ? AND songId = ?').run(playlistId, songId)
  })

  ipcMain.handle('db:removeFromRecentlyPlayed', async (_, songId: string) => {
    const db = getDatabase()
    db.prepare('UPDATE songs SET lastPlayedAt = NULL WHERE id = ?').run(songId)
  })

  ipcMain.handle('db:deleteSong', async (_, songId: string) => {
    const db = getDatabase()
    db.prepare('DELETE FROM playlist_songs WHERE songId = ?').run(songId)
    db.prepare('DELETE FROM songs WHERE id = ?').run(songId)
  })
}
