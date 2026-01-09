import { create } from 'zustand'
import type { Song, Playlist, HomeSection, AccountInfo } from '../types/electron'

interface AppState {
  // Library
  songs: Song[]
  playlists: Playlist[]
  ytMusicPlaylists: Playlist[]
  likedSongs: Song[]
  recentlyPlayed: Song[]
  
  // Home
  homeSections: HomeSection[]
  
  // Auth
  isLoggedIn: boolean
  accountInfo: AccountInfo | null
  
  // UI State
  isLoading: boolean
  sidebarCollapsed: boolean
  
  // Actions
  setSongs: (songs: Song[]) => void
  setPlaylists: (playlists: Playlist[]) => void
  setYTMusicPlaylists: (playlists: Playlist[]) => void
  setLikedSongs: (songs: Song[]) => void
  setRecentlyPlayed: (songs: Song[]) => void
  setHomeSections: (sections: HomeSection[]) => void
  setIsLoading: (loading: boolean) => void
  toggleSidebar: () => void
  setIsLoggedIn: (loggedIn: boolean) => void
  setAccountInfo: (info: AccountInfo | null) => void
  
  // Data fetching
  loadLibrary: () => Promise<void>
  loadHome: () => Promise<void>
  loadYTMusicPlaylists: () => Promise<void>
  checkAuthStatus: () => Promise<void>
  login: () => Promise<boolean>
  logout: () => Promise<void>
  createPlaylist: (name: string) => Promise<Playlist>
  toggleLikeSong: (songId: string) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  songs: [],
  playlists: [],
  ytMusicPlaylists: [],
  likedSongs: [],
  recentlyPlayed: [],
  homeSections: [],
  isLoggedIn: false,
  accountInfo: null,
  isLoading: false,
  sidebarCollapsed: false,

  setSongs: (songs) => set({ songs }),
  setPlaylists: (playlists) => set({ playlists }),
  setYTMusicPlaylists: (ytMusicPlaylists) => set({ ytMusicPlaylists }),
  setLikedSongs: (likedSongs) => set({ likedSongs }),
  setRecentlyPlayed: (recentlyPlayed) => set({ recentlyPlayed }),
  setHomeSections: (homeSections) => set({ homeSections }),
  setIsLoading: (isLoading) => set({ isLoading }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
  setAccountInfo: (accountInfo) => set({ accountInfo }),

  checkAuthStatus: async () => {
    try {
      const isLoggedIn = await window.electronAPI.auth.isLoggedIn()
      set({ isLoggedIn })
      
      if (isLoggedIn) {
        const accountInfo = await window.electronAPI.auth.getAccountInfo()
        set({ accountInfo })
        // Load YouTube Music playlists
        get().loadYTMusicPlaylists()
      }
    } catch (err) {
      console.error('Failed to check auth status:', err)
    }
  },

  login: async () => {
    try {
      const accountInfo = await window.electronAPI.auth.login()
      if (accountInfo) {
        set({ isLoggedIn: true, accountInfo })
        // Load YouTube Music playlists after login
        get().loadYTMusicPlaylists()
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to login:', err)
      return false
    }
  },

  logout: async () => {
    try {
      await window.electronAPI.auth.logout()
      set({ isLoggedIn: false, accountInfo: null, ytMusicPlaylists: [] })
    } catch (err) {
      console.error('Failed to logout:', err)
    }
  },

  loadLibrary: async () => {
    set({ isLoading: true })
    try {
      const [songs, playlists, likedSongs, recentlyPlayed] = await Promise.all([
        window.electronAPI.db.getSongs(),
        window.electronAPI.db.getPlaylists(),
        window.electronAPI.db.getLikedSongs(),
        window.electronAPI.db.getRecentlyPlayed(),
      ])
      set({ songs, playlists, likedSongs, recentlyPlayed })
    } catch (err) {
      console.error('Failed to load library:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  loadHome: async () => {
    set({ isLoading: true })
    try {
      const homeSections = await window.electronAPI.youtube.getHome()
      set({ homeSections })
    } catch (err) {
      console.error('Failed to load home:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  loadYTMusicPlaylists: async () => {
    try {
      const playlists = await window.electronAPI.youtube.getLibraryPlaylists()
      // Map to consistent format
      const ytMusicPlaylists = playlists.map(p => ({
        ...p,
        name: p.title || p.name || 'Unknown Playlist',
        isYouTubeMusic: true,
      }))
      set({ ytMusicPlaylists })
    } catch (err) {
      console.error('Failed to load YouTube Music playlists:', err)
    }
  },

  createPlaylist: async (name) => {
    const playlist = await window.electronAPI.db.createPlaylist(name)
    set((state) => ({ playlists: [...state.playlists, playlist] }))
    return playlist
  },

  toggleLikeSong: async (songId) => {
    await window.electronAPI.db.toggleLike(songId)
    
    // Reload liked songs from database to get fresh data
    const likedSongs = await window.electronAPI.db.getLikedSongs()
    set({ likedSongs })
  },
}))
