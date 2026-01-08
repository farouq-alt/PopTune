import { create } from 'zustand'
import type { Song, Playlist, HomeSection } from '../types/electron'

interface AppState {
  // Library
  songs: Song[]
  playlists: Playlist[]
  likedSongs: Song[]
  recentlyPlayed: Song[]
  
  // Home
  homeSections: HomeSection[]
  
  // UI State
  isLoading: boolean
  sidebarCollapsed: boolean
  
  // Actions
  setSongs: (songs: Song[]) => void
  setPlaylists: (playlists: Playlist[]) => void
  setLikedSongs: (songs: Song[]) => void
  setRecentlyPlayed: (songs: Song[]) => void
  setHomeSections: (sections: HomeSection[]) => void
  setIsLoading: (loading: boolean) => void
  toggleSidebar: () => void
  
  // Data fetching
  loadLibrary: () => Promise<void>
  loadHome: () => Promise<void>
  createPlaylist: (name: string) => Promise<Playlist>
  toggleLikeSong: (songId: string) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  songs: [],
  playlists: [],
  likedSongs: [],
  recentlyPlayed: [],
  homeSections: [],
  isLoading: false,
  sidebarCollapsed: false,

  setSongs: (songs) => set({ songs }),
  setPlaylists: (playlists) => set({ playlists }),
  setLikedSongs: (likedSongs) => set({ likedSongs }),
  setRecentlyPlayed: (recentlyPlayed) => set({ recentlyPlayed }),
  setHomeSections: (homeSections) => set({ homeSections }),
  setIsLoading: (isLoading) => set({ isLoading }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

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

  createPlaylist: async (name) => {
    const playlist = await window.electronAPI.db.createPlaylist(name)
    set((state) => ({ playlists: [...state.playlists, playlist] }))
    return playlist
  },

  toggleLikeSong: async (songId) => {
    const isLiked = await window.electronAPI.db.toggleLike(songId)
    
    // Reload liked songs from database to get fresh data
    const likedSongs = await window.electronAPI.db.getLikedSongs()
    set({ likedSongs })
  },
}))
