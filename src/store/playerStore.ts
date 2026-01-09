import { create } from 'zustand'
import type { Song } from '../types/electron'

interface PlayerState {
  // Current playback
  currentSong: Song | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  
  // Queue
  queue: Song[]
  queueIndex: number
  shuffleEnabled: boolean
  repeatMode: 'off' | 'one' | 'all'
  
  // Audio element
  audio: HTMLAudioElement | null
  
  // Actions
  setAudio: (audio: HTMLAudioElement) => void
  playSong: (song: Song, queue?: Song[]) => Promise<void>
  togglePlay: () => void
  pause: () => void
  resume: () => void
  seekTo: (time: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  playNext: () => void
  playPrevious: () => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  addToQueue: (song: Song) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (isPlaying: boolean) => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  queue: [],
  queueIndex: -1,
  shuffleEnabled: false,
  repeatMode: 'off',
  audio: null,

  setAudio: (audio) => set({ audio }),

  playSong: async (song, queue) => {
    const { audio } = get()
    if (!audio) {
      console.error('No audio element')
      return
    }

    try {
      // Stop current playback and reset state before loading new song
      audio.pause()
      audio.currentTime = 0
      
      let url: string

      if (song.isLocal && song.localPath) {
        url = `file://${song.localPath}`
      } else {
        const streamData = await window.electronAPI.youtube.getStreamUrl(song.id)
        url = streamData.url
        
        // Update song duration if we got it from the stream
        if (streamData.duration && !song.duration) {
          song = { ...song, duration: streamData.duration }
        }
      }

      audio.src = url
      
      audio.onerror = () => {
        console.error('Audio error:', audio.error?.message, audio.error?.code)
      }
      
      // Force play the new song regardless of previous pause state
      await audio.play()

      // Save song to database first (so liked/recent can work)
      await window.electronAPI.db.addSong({
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album || '',
        duration: song.duration || 0,
        thumbnailUrl: song.thumbnailUrl || '',
        isLocal: song.isLocal || false,
        localPath: song.localPath || '',
      })
      
      // Update play history
      await window.electronAPI.db.updatePlayedAt(song.id)

      set({
        currentSong: song,
        isPlaying: true,
        currentTime: 0,
        queue: queue || [song],
        queueIndex: queue ? queue.findIndex(s => s.id === song.id) : 0,
      })
    } catch (err) {
      console.error('Failed to play song:', err)
    }
  },

  togglePlay: () => {
    const { audio, isPlaying } = get()
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    set({ isPlaying: !isPlaying })
  },

  pause: () => {
    const { audio } = get()
    if (audio) {
      audio.pause()
      set({ isPlaying: false })
    }
  },

  resume: () => {
    const { audio } = get()
    if (audio) {
      audio.play()
      set({ isPlaying: true })
    }
  },

  seekTo: (time) => {
    const { audio } = get()
    if (audio) {
      audio.currentTime = time
      set({ currentTime: time })
    }
  },

  setVolume: (volume) => {
    const { audio } = get()
    if (audio) {
      audio.volume = volume
    }
    set({ volume, isMuted: volume === 0 })
  },

  toggleMute: () => {
    const { audio, isMuted, volume } = get()
    if (audio) {
      audio.volume = isMuted ? volume : 0
    }
    set({ isMuted: !isMuted })
  },

  playNext: () => {
    const { queue, queueIndex, repeatMode, shuffleEnabled } = get()
    if (queue.length === 0) return

    let nextIndex: number

    if (repeatMode === 'one') {
      nextIndex = queueIndex
    } else if (shuffleEnabled) {
      nextIndex = Math.floor(Math.random() * queue.length)
    } else {
      nextIndex = queueIndex + 1
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0
        } else {
          return
        }
      }
    }

    const nextSong = queue[nextIndex]
    if (nextSong) {
      get().playSong(nextSong, queue)
    }
  },

  playPrevious: () => {
    const { queue, queueIndex, currentTime } = get()
    if (queue.length === 0) return

    // If more than 3 seconds in, restart current song
    if (currentTime > 3) {
      get().seekTo(0)
      return
    }

    const prevIndex = queueIndex - 1
    if (prevIndex >= 0) {
      const prevSong = queue[prevIndex]
      if (prevSong) {
        get().playSong(prevSong, queue)
      }
    }
  },

  toggleShuffle: () => {
    set((state) => ({ shuffleEnabled: !state.shuffleEnabled }))
  },

  toggleRepeat: () => {
    set((state) => {
      const modes: ('off' | 'one' | 'all')[] = ['off', 'all', 'one']
      const currentIndex = modes.indexOf(state.repeatMode)
      return { repeatMode: modes[(currentIndex + 1) % modes.length] }
    })
  },

  addToQueue: (song) => {
    set((state) => ({ queue: [...state.queue, song] }))
  },

  removeFromQueue: (index) => {
    set((state) => ({
      queue: state.queue.filter((_, i) => i !== index),
      queueIndex: index < state.queueIndex ? state.queueIndex - 1 : state.queueIndex,
    }))
  },

  clearQueue: () => {
    set({ queue: [], queueIndex: -1 })
  },

  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
}))
