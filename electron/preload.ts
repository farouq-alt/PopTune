import { contextBridge, ipcRenderer } from 'electron'

console.log('Preload script loading...')

const api = {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Auth
  auth: {
    isLoggedIn: () => ipcRenderer.invoke('auth:isLoggedIn'),
    getAccountInfo: () => ipcRenderer.invoke('auth:getAccountInfo'),
    login: () => ipcRenderer.invoke('auth:login'),
    logout: () => ipcRenderer.invoke('auth:logout'),
  },

  // YouTube Music
  youtube: {
    search: (query: string) => ipcRenderer.invoke('youtube:search', query),
    getHome: () => ipcRenderer.invoke('youtube:getHome'),
    getStreamUrl: (videoId: string) => ipcRenderer.invoke('youtube:getStreamUrl', videoId),
    getAlbum: (albumId: string) => ipcRenderer.invoke('youtube:getAlbum', albumId),
    getArtist: (artistId: string) => ipcRenderer.invoke('youtube:getArtist', artistId),
    getPlaylist: (playlistId: string) => ipcRenderer.invoke('youtube:getPlaylist', playlistId),
    // Authenticated endpoints
    getLibraryPlaylists: () => ipcRenderer.invoke('youtube:getLibraryPlaylists'),
    getYTMusicPlaylistSongs: (playlistId: string) => ipcRenderer.invoke('youtube:getYTMusicPlaylistSongs', playlistId),
    getLikedSongs: () => ipcRenderer.invoke('youtube:getLikedSongs'),
  },

  // Local music
  local: {
    scanFolder: () => ipcRenderer.invoke('local:scanFolder'),
    getMetadata: (filePath: string) => ipcRenderer.invoke('local:getMetadata', filePath),
  },

  // Lyrics
  lyrics: {
    get: (title: string, artist: string, duration: number) => 
      ipcRenderer.invoke('lyrics:get', title, artist, duration),
  },

  // Database
  db: {
    getSongs: () => ipcRenderer.invoke('db:getSongs'),
    addSong: (song: any) => ipcRenderer.invoke('db:addSong', song),
    getPlaylists: () => ipcRenderer.invoke('db:getPlaylists'),
    createPlaylist: (name: string) => ipcRenderer.invoke('db:createPlaylist', name),
    addToPlaylist: (playlistId: string, songId: string) => 
      ipcRenderer.invoke('db:addToPlaylist', playlistId, songId),
    getPlaylistSongs: (playlistId: string) => ipcRenderer.invoke('db:getPlaylistSongs', playlistId),
    getLikedSongs: () => ipcRenderer.invoke('db:getLikedSongs'),
    toggleLike: (songId: string) => ipcRenderer.invoke('db:toggleLike', songId),
    getRecentlyPlayed: () => ipcRenderer.invoke('db:getRecentlyPlayed'),
    updatePlayedAt: (songId: string) => ipcRenderer.invoke('db:updatePlayedAt', songId),
    removeFromPlaylist: (playlistId: string, songId: string) =>
      ipcRenderer.invoke('db:removeFromPlaylist', playlistId, songId),
    removeFromRecentlyPlayed: (songId: string) => ipcRenderer.invoke('db:removeFromRecentlyPlayed', songId),
    deleteSong: (songId: string) => ipcRenderer.invoke('db:deleteSong', songId),
  },
}

try {
  contextBridge.exposeInMainWorld('electronAPI', api)
  console.log('electronAPI exposed successfully')
} catch (err) {
  console.error('Failed to expose electronAPI:', err)
}
