import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FiPlay, FiShuffle, FiList } from 'react-icons/fi'
import SongList from '../components/SongList'
import { usePlayerStore } from '../store/playerStore'
import { useAppStore } from '../store/appStore'
import type { Song, Playlist } from '../types/electron'

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { playSong } = usePlayerStore()
  const { playlists } = useAppStore()

  useEffect(() => {
    if (id) {
      loadPlaylist(id)
    }
  }, [id])

  const loadPlaylist = async (playlistId: string) => {
    setIsLoading(true)
    try {
      // Check if it's a local playlist
      const localPlaylist = playlists.find(p => p.id === playlistId)
      
      if (localPlaylist) {
        setPlaylist(localPlaylist)
        const playlistSongs = await window.electronAPI.db.getPlaylistSongs(playlistId)
        setSongs(playlistSongs)
      } else {
        // It's a YouTube playlist
        const data = await window.electronAPI.youtube.getPlaylist(playlistId)
        setPlaylist(data)
        setSongs(data.songs || [])
      }
    } catch (err) {
      console.error('Failed to load playlist:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playSong(songs[0], songs)
    }
  }

  const handleShuffle = () => {
    if (songs.length > 0) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5)
      playSong(shuffled[0], shuffled)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="text-center py-20">
        <p className="text-surface-400">Playlist not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex gap-6">
        {playlist.thumbnailUrl ? (
          <img
            src={playlist.thumbnailUrl}
            alt={playlist.name || playlist.title}
            className="w-48 h-48 rounded-lg object-cover shadow-xl"
          />
        ) : (
          <div className="w-48 h-48 rounded-lg bg-gradient-to-br from-surface-600 to-surface-700 flex items-center justify-center">
            <FiList className="w-16 h-16 text-surface-400" />
          </div>
        )}
        
        <div className="flex flex-col justify-end">
          <span className="text-sm text-surface-400 uppercase tracking-wider">Playlist</span>
          <h1 className="text-4xl font-bold mt-2">{playlist.name || playlist.title}</h1>
          {playlist.author && (
            <p className="text-surface-300 mt-2">by {playlist.author}</p>
          )}
          <p className="text-surface-400 text-sm mt-1">
            {songs.length} songs
          </p>
          
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handlePlayAll}
              disabled={songs.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-full transition-colors disabled:opacity-50"
            >
              <FiPlay className="w-5 h-5" />
              <span className="font-medium">Play</span>
            </button>
            <button
              onClick={handleShuffle}
              disabled={songs.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-surface-700 hover:bg-surface-600 rounded-full transition-colors disabled:opacity-50"
            >
              <FiShuffle className="w-5 h-5" />
              <span className="font-medium">Shuffle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Songs */}
      {songs.length > 0 ? (
        <SongList 
          songs={songs} 
          showIndex 
          playlistId={playlists.find(p => p.id === id) ? id : undefined}
          onSongRemoved={() => id && loadPlaylist(id)}
        />
      ) : (
        <div className="text-center py-10">
          <p className="text-surface-400">This playlist is empty</p>
        </div>
      )}
    </div>
  )
}
