"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const child_process_1 = require("child_process");
const database_1 = require("./database");
const youtube_1 = require("./services/youtube");
const localMusic_1 = require("./services/localMusic");
const lyrics_1 = require("./services/lyrics");
const auth_1 = require("./services/auth");
let mainWindow = null;
let youtubeService;
let localMusicService;
let lyricsService;
let authService;
let proxyServer = null;
// Store for stream data
const streamUrls = new Map();
// Store active ffmpeg processes for cleanup
const activeStreams = new Map();
const isDev = !electron_1.app.isPackaged;
const PROXY_PORT = 45678;
function startProxyServer() {
    proxyServer = http_1.default.createServer((req, res) => {
        if (!req.url) {
            res.writeHead(400);
            return res.end();
        }
        // Parse URL properly
        const parsedUrl = new URL(req.url, `http://127.0.0.1:${PROXY_PORT}`);
        const streamId = parsedUrl.pathname.slice(1);
        const youtubeUrl = streamUrls.get(streamId);
        if (!youtubeUrl) {
            console.error('Stream not found:', streamId);
            res.writeHead(404);
            return res.end('Stream not found');
        }
        // FIX 3: Handle HEAD requests properly
        if (req.method === 'HEAD') {
            res.writeHead(200, {
                'Content-Type': 'audio/mpeg',
                'Accept-Ranges': 'none',
                'Cache-Control': 'no-cache',
            });
            return res.end();
        }
        // FIX 2: Reject Range requests - force progressive streaming
        if (req.headers.range) {
            res.writeHead(200, {
                'Content-Type': 'audio/mpeg',
                'Accept-Ranges': 'none',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            });
            // Don't return 416, just ignore range and stream from current position
        }
        else {
            res.writeHead(200, {
                'Content-Type': 'audio/mpeg',
                'Accept-Ranges': 'none',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            });
        }
        // FIX 1: Reuse existing FFmpeg process, don't restart
        let ffmpeg = activeStreams.get(streamId);
        if (!ffmpeg || ffmpeg.killed) {
            ffmpeg = (0, child_process_1.spawn)('ffmpeg', [
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
            });
            activeStreams.set(streamId, ffmpeg);
            ffmpeg.stderr?.on('data', (data) => {
                const msg = data.toString();
                if (msg.includes('Error') || msg.includes('error')) {
                    console.error('FFmpeg error:', msg);
                }
            });
            ffmpeg.on('error', (err) => {
                console.error('FFmpeg spawn error:', err);
                activeStreams.delete(streamId);
            });
            ffmpeg.on('close', (code) => {
                activeStreams.delete(streamId);
            });
        }
        // Pipe FFmpeg output to response
        ffmpeg.stdout?.pipe(res, { end: true });
        // Clean up on client disconnect
        req.on('close', () => {
            console.log('Client disconnected');
            // Don't kill FFmpeg here - let it continue for reconnects
        });
    });
    proxyServer.listen(PROXY_PORT, '127.0.0.1', () => {
        console.log(`Audio proxy server running on http://127.0.0.1:${PROXY_PORT}`);
    });
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
    });
    console.log('Preload path:', path_1.default.join(__dirname, 'preload.js'));
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../renderer/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(async () => {
    startProxyServer();
    await (0, database_1.initDatabase)();
    authService = new auth_1.AuthService();
    youtubeService = new youtube_1.YouTubeService();
    youtubeService.setAuthService(authService);
    localMusicService = new localMusic_1.LocalMusicService();
    lyricsService = new lyrics_1.LyricsService();
    await youtubeService.init();
    createWindow();
    registerIpcHandlers();
});
electron_1.app.on('window-all-closed', () => {
    // Kill all active FFmpeg processes
    activeStreams.forEach((proc) => proc.kill('SIGTERM'));
    activeStreams.clear();
    if (proxyServer) {
        proxyServer.close();
    }
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
function registerIpcHandlers() {
    // Window controls
    electron_1.ipcMain.on('window:minimize', () => mainWindow?.minimize());
    electron_1.ipcMain.on('window:maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow?.maximize();
        }
    });
    electron_1.ipcMain.on('window:close', () => mainWindow?.close());
    // YouTube Music API
    electron_1.ipcMain.handle('youtube:search', async (_, query) => {
        return youtubeService.search(query);
    });
    electron_1.ipcMain.handle('youtube:getHome', async () => {
        return youtubeService.getHome();
    });
    electron_1.ipcMain.handle('youtube:getStreamUrl', async (_, videoId) => {
        const result = await youtubeService.getStreamUrl(videoId);
        const streamId = `${videoId}-${Date.now()}`;
        // Store the YouTube URL for FFmpeg to consume
        streamUrls.set(streamId, result.url);
        // Clean up after 1 hour
        setTimeout(() => {
            streamUrls.delete(streamId);
            const proc = activeStreams.get(streamId);
            if (proc) {
                proc.kill('SIGTERM');
                activeStreams.delete(streamId);
            }
        }, 3600000);
        return {
            ...result,
            mimeType: 'audio/mpeg', // We're transcoding to MP3
            url: `http://127.0.0.1:${PROXY_PORT}/${streamId}`,
        };
    });
    electron_1.ipcMain.handle('youtube:getAlbum', async (_, albumId) => {
        return youtubeService.getAlbum(albumId);
    });
    electron_1.ipcMain.handle('youtube:getArtist', async (_, artistId) => {
        return youtubeService.getArtist(artistId);
    });
    electron_1.ipcMain.handle('youtube:getPlaylist', async (_, playlistId) => {
        return youtubeService.getPlaylist(playlistId);
    });
    // Local music
    electron_1.ipcMain.handle('local:scanFolder', async () => {
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
        });
        if (!result.canceled && result.filePaths[0]) {
            return localMusicService.scanFolder(result.filePaths[0]);
        }
        return [];
    });
    electron_1.ipcMain.handle('local:getMetadata', async (_, filePath) => {
        return localMusicService.getMetadata(filePath);
    });
    // Lyrics
    electron_1.ipcMain.handle('lyrics:get', async (_, title, artist, duration) => {
        return lyricsService.getLyrics(title, artist, duration);
    });
    // Database operations
    electron_1.ipcMain.handle('db:getSongs', async () => {
        const db = (0, database_1.getDatabase)();
        return db.prepare('SELECT * FROM songs ORDER BY title').all();
    });
    electron_1.ipcMain.handle('db:addSong', async (_, song) => {
        const db = (0, database_1.getDatabase)();
        // Use INSERT OR IGNORE to not overwrite existing song data (liked status, play count, etc.)
        const stmt = db.prepare(`
      INSERT OR IGNORE INTO songs (id, title, artist, album, duration, thumbnailUrl, isLocal, localPath)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(song.id, song.title, song.artist, song.album, song.duration, song.thumbnailUrl, song.isLocal ? 1 : 0, song.localPath || '');
        // If song already exists, update only the basic info (not liked/playCount/etc)
        if (result.changes === 0) {
            db.prepare(`
        UPDATE songs SET title = ?, artist = ?, album = ?, duration = ?, thumbnailUrl = ?
        WHERE id = ? AND isLocal = 0
      `).run(song.title, song.artist, song.album, song.duration, song.thumbnailUrl, song.id);
        }
        return result;
    });
    electron_1.ipcMain.handle('db:getPlaylists', async () => {
        const db = (0, database_1.getDatabase)();
        // Include song count for each playlist
        return db.prepare(`
      SELECT p.*, COUNT(ps.songId) as songCount 
      FROM playlists p
      LEFT JOIN playlist_songs ps ON p.id = ps.playlistId
      GROUP BY p.id
      ORDER BY p.name
    `).all();
    });
    electron_1.ipcMain.handle('db:createPlaylist', async (_, name) => {
        const db = (0, database_1.getDatabase)();
        const id = `playlist_${Date.now()}`;
        db.prepare('INSERT INTO playlists (id, name, createdAt) VALUES (?, ?, ?)').run(id, name, Date.now());
        return { id, name };
    });
    electron_1.ipcMain.handle('db:addToPlaylist', async (_, playlistId, songId) => {
        const db = (0, database_1.getDatabase)();
        // Check if song already in playlist
        const existing = db.prepare('SELECT 1 FROM playlist_songs WHERE playlistId = ? AND songId = ?').get(playlistId, songId);
        if (existing)
            return; // Already in playlist
        const position = db.prepare('SELECT COUNT(*) as count FROM playlist_songs WHERE playlistId = ?').get(playlistId);
        db.prepare('INSERT INTO playlist_songs (playlistId, songId, position) VALUES (?, ?, ?)').run(playlistId, songId, position.count);
    });
    electron_1.ipcMain.handle('db:getPlaylistSongs', async (_, playlistId) => {
        const db = (0, database_1.getDatabase)();
        return db.prepare(`
      SELECT s.* FROM songs s
      JOIN playlist_songs ps ON s.id = ps.songId
      WHERE ps.playlistId = ?
      ORDER BY ps.position
    `).all(playlistId);
    });
    electron_1.ipcMain.handle('db:getLikedSongs', async () => {
        const db = (0, database_1.getDatabase)();
        return db.prepare('SELECT * FROM songs WHERE liked = 1 ORDER BY likedAt DESC').all();
    });
    electron_1.ipcMain.handle('db:toggleLike', async (_, songId) => {
        const db = (0, database_1.getDatabase)();
        const song = db.prepare('SELECT liked FROM songs WHERE id = ?').get(songId);
        const newLiked = song?.liked ? 0 : 1;
        db.prepare('UPDATE songs SET liked = ?, likedAt = ? WHERE id = ?').run(newLiked, newLiked ? Date.now() : null, songId);
        return newLiked === 1;
    });
    electron_1.ipcMain.handle('db:getRecentlyPlayed', async () => {
        const db = (0, database_1.getDatabase)();
        return db.prepare('SELECT * FROM songs WHERE lastPlayedAt IS NOT NULL ORDER BY lastPlayedAt DESC LIMIT 50').all();
    });
    electron_1.ipcMain.handle('db:updatePlayedAt', async (_, songId) => {
        const db = (0, database_1.getDatabase)();
        db.prepare('UPDATE songs SET lastPlayedAt = ?, playCount = playCount + 1 WHERE id = ?').run(Date.now(), songId);
    });
    electron_1.ipcMain.handle('db:removeFromPlaylist', async (_, playlistId, songId) => {
        const db = (0, database_1.getDatabase)();
        db.prepare('DELETE FROM playlist_songs WHERE playlistId = ? AND songId = ?').run(playlistId, songId);
    });
    electron_1.ipcMain.handle('db:removeFromRecentlyPlayed', async (_, songId) => {
        const db = (0, database_1.getDatabase)();
        db.prepare('UPDATE songs SET lastPlayedAt = NULL WHERE id = ?').run(songId);
    });
    electron_1.ipcMain.handle('db:deleteSong', async (_, songId) => {
        const db = (0, database_1.getDatabase)();
        db.prepare('DELETE FROM playlist_songs WHERE songId = ?').run(songId);
        db.prepare('DELETE FROM songs WHERE id = ?').run(songId);
    });
    // Auth handlers
    electron_1.ipcMain.handle('auth:isLoggedIn', () => {
        return authService.isLoggedIn();
    });
    electron_1.ipcMain.handle('auth:getAccountInfo', () => {
        const authData = authService.getAuthData();
        if (!authData)
            return null;
        return {
            name: authData.accountName,
            email: authData.accountEmail,
            channelHandle: authData.accountChannelHandle,
        };
    });
    electron_1.ipcMain.handle('auth:login', async () => {
        if (!mainWindow)
            return null;
        const authData = await authService.openLoginWindow(mainWindow);
        if (authData) {
            // Fetch and update account info
            const accountInfo = await youtubeService.getAccountInfo();
            if (accountInfo) {
                await authService.updateAccountInfo(accountInfo.name, accountInfo.email, accountInfo.channelHandle);
                return accountInfo;
            }
        }
        return null;
    });
    electron_1.ipcMain.handle('auth:logout', () => {
        authService.logout();
        return true;
    });
    // YouTube Music Library (authenticated)
    electron_1.ipcMain.handle('youtube:getLibraryPlaylists', async () => {
        if (!authService.isLoggedIn())
            return [];
        return youtubeService.getLibraryPlaylists();
    });
    electron_1.ipcMain.handle('youtube:getYTMusicPlaylistSongs', async (_, playlistId) => {
        if (!authService.isLoggedIn())
            return [];
        return youtubeService.getPlaylistSongs(playlistId);
    });
    electron_1.ipcMain.handle('youtube:getLikedSongs', async () => {
        if (!authService.isLoggedIn())
            return [];
        return youtubeService.getLikedSongs();
    });
}
