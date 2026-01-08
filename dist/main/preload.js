"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
console.log('Preload script loading...');
const api = {
    // Window controls
    minimize: () => electron_1.ipcRenderer.send('window:minimize'),
    maximize: () => electron_1.ipcRenderer.send('window:maximize'),
    close: () => electron_1.ipcRenderer.send('window:close'),
    // YouTube Music
    youtube: {
        search: (query) => electron_1.ipcRenderer.invoke('youtube:search', query),
        getHome: () => electron_1.ipcRenderer.invoke('youtube:getHome'),
        getStreamUrl: (videoId) => electron_1.ipcRenderer.invoke('youtube:getStreamUrl', videoId),
        getAlbum: (albumId) => electron_1.ipcRenderer.invoke('youtube:getAlbum', albumId),
        getArtist: (artistId) => electron_1.ipcRenderer.invoke('youtube:getArtist', artistId),
        getPlaylist: (playlistId) => electron_1.ipcRenderer.invoke('youtube:getPlaylist', playlistId),
    },
    // Local music
    local: {
        scanFolder: () => electron_1.ipcRenderer.invoke('local:scanFolder'),
        getMetadata: (filePath) => electron_1.ipcRenderer.invoke('local:getMetadata', filePath),
    },
    // Lyrics
    lyrics: {
        get: (title, artist, duration) => electron_1.ipcRenderer.invoke('lyrics:get', title, artist, duration),
    },
    // Database
    db: {
        getSongs: () => electron_1.ipcRenderer.invoke('db:getSongs'),
        addSong: (song) => electron_1.ipcRenderer.invoke('db:addSong', song),
        getPlaylists: () => electron_1.ipcRenderer.invoke('db:getPlaylists'),
        createPlaylist: (name) => electron_1.ipcRenderer.invoke('db:createPlaylist', name),
        addToPlaylist: (playlistId, songId) => electron_1.ipcRenderer.invoke('db:addToPlaylist', playlistId, songId),
        getPlaylistSongs: (playlistId) => electron_1.ipcRenderer.invoke('db:getPlaylistSongs', playlistId),
        getLikedSongs: () => electron_1.ipcRenderer.invoke('db:getLikedSongs'),
        toggleLike: (songId) => electron_1.ipcRenderer.invoke('db:toggleLike', songId),
        getRecentlyPlayed: () => electron_1.ipcRenderer.invoke('db:getRecentlyPlayed'),
        updatePlayedAt: (songId) => electron_1.ipcRenderer.invoke('db:updatePlayedAt', songId),
        removeFromPlaylist: (playlistId, songId) => electron_1.ipcRenderer.invoke('db:removeFromPlaylist', playlistId, songId),
        removeFromRecentlyPlayed: (songId) => electron_1.ipcRenderer.invoke('db:removeFromRecentlyPlayed', songId),
        deleteSong: (songId) => electron_1.ipcRenderer.invoke('db:deleteSong', songId),
    },
};
try {
    electron_1.contextBridge.exposeInMainWorld('electronAPI', api);
    console.log('electronAPI exposed successfully');
}
catch (err) {
    console.error('Failed to expose electronAPI:', err);
}
