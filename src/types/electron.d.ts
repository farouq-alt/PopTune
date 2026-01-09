export interface Song {
  id: string
  title: string
  artist: string
  artistId?: string
  album?: string
  albumId?: string
  duration: number
  thumbnailUrl?: string
  isLocal?: boolean
  localPath?: string
  liked?: boolean
  likedAt?: number
  playCount?: number
  lastPlayedAt?: number
}

export interface Album {
  id: string
  title: string
  artist: string
  artistId?: string
  thumbnailUrl?: string
  year?: number
  songs?: Song[]
}

export interface Artist {
  id: string
  name: string
  thumbnailUrl?: string
  description?: string
  subscribers?: string
  songs?: Song[]
  albums?: Album[]
}

export interface Playlist {
  id: string
  name: string
  title?: string
  thumbnailUrl?: string
  author?: string
  songCount?: number | string
  songs?: Song[]
  createdAt?: number
  isLocal?: boolean
  isYouTubeMusic?: boolean
}

export interface AccountInfo {
  name: string
  email: string
  channelHandle: string
}

export interface SearchResults {
  songs: Song[]
  albums: Album[]
  artists: Artist[]
  playlists: Playlist[]
}

export interface HomeSection {
  title: string
  contents: any[]
}

export interface LyricsResult {
  synced: string | null
  plain: string | null
  source: string
}

export interface ElectronAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  auth: {
    isLoggedIn: () => Promise<boolean>
    getAccountInfo: () => Promise<AccountInfo | null>
    login: () => Promise<AccountInfo | null>
    logout: () => Promise<boolean>
  }
  youtube: {
    search: (query: string) => Promise<SearchResults>
    getHome: () => Promise<HomeSection[]>
    getStreamUrl: (videoId: string) => Promise<{ url: string; mimeType: string; bitrate: number; duration: number }>
    getAlbum: (albumId: string) => Promise<Album>
    getArtist: (artistId: string) => Promise<Artist>
    getPlaylist: (playlistId: string) => Promise<Playlist>
    getLibraryPlaylists: () => Promise<Playlist[]>
    getYTMusicPlaylistSongs: (playlistId: string) => Promise<Song[]>
    getLikedSongs: () => Promise<Song[]>
  }
  local: {
    scanFolder: () => Promise<Song[]>
    getMetadata: (filePath: string) => Promise<Song>
  }
  lyrics: {
    get: (title: string, artist: string, duration: number) => Promise<LyricsResult | null>
  }
  db: {
    getSongs: () => Promise<Song[]>
    addSong: (song: Song) => Promise<void>
    getPlaylists: () => Promise<Playlist[]>
    createPlaylist: (name: string) => Promise<Playlist>
    addToPlaylist: (playlistId: string, songId: string) => Promise<void>
    getPlaylistSongs: (playlistId: string) => Promise<Song[]>
    getLikedSongs: () => Promise<Song[]>
    toggleLike: (songId: string) => Promise<boolean>
    getRecentlyPlayed: () => Promise<Song[]>
    updatePlayedAt: (songId: string) => Promise<void>
    removeFromPlaylist: (playlistId: string, songId: string) => Promise<void>
    removeFromRecentlyPlayed: (songId: string) => Promise<void>
    deleteSong: (songId: string) => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
