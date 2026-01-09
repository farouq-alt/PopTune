import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiPlay, FiShuffle, FiArrowLeft, FiMusic, FiHeart } from 'react-icons/fi'
import { usePlayerStore } from '../store/playerStore'
import { useAppStore } from '../store/appStore'
import SongList from '../components/SongList'
import type { Song } from '../types/electron'

export default function YTPlaylistDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { playSong } = usePlayerStore()
  const { ytMusicPlaylists, isLoggedIn } = useAppStore()
  
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isLikedMusic = id === 'LM'
  const playlist = isLikedMusic ? null : ytMusicPlaylists.find(p => p.id === id)

  useEffect(() => {
    if (!id || !isLoggedIn) return

    const loadPlaylist = async () => {
      setIsLoading(true)
      setError(null)
      try {
        let playlistSongs: Song[]
        if (isLikedMusic) {
          playlistSongs = await window.electronAPI.youtube.getLikedSongs()
        } else {
          playlistSongs = await window.electronAPI.youtube.getYTMusicPlaylistSongs(id)
        }
        setSongs(playlistSongs)
      } catch (err) {
        console.error('Failed to load playlist:', err)
        setError('Failed to load playlist songs')
      } finally {
        setIsLoading(false)
      }
    }

    loadPlaylist()
  }, [id, isLoggedIn, isLikedMusic])

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

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <FiMusic className="w-16 h-16 text-surface-600 mb-4" />
        <p className="text-surface-400">Please sign in to view YouTube Music playlists</p>
      </div>
    )
  }

  const playlistName = isLikedMusic ? 'Liked Music' : (playlist?.name || playlist?.title || 'Playlist')
  const PlaylistIcon = isLikedMusic ? FiHeart : FiMusic

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start gap-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="w-48 h-48 flex-shrink-0">
          {!isLikedMusic && playlist?.thumbnailUrl ? (
            <img
              src={playlist.thumbnailUrl}
              alt={playlistName}
              className="w-full h-full object-cover rounded-lg shadow-lg"
            />
          ) : (
            <div className={`w-full h-full rounded-lg flex items-center justify-center ${
              isLikedMusic 
                ? 'bg-gradient-to-br from-red-500 to-pink-500' 
                : 'bg-gradient-to-br from-red-600 to-pink-600'
            }`}>
              <PlaylistIcon className="w-20 h-20 text-white/80" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-red-500/90 rounded text-xs font-medium">
              YouTube Music
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-2 truncate">
            {playlistName}
          </h1>
          <p className="text-surface-400 mb-4">
            {isLoading ? 'Loading...' : `${songs.length} songs`}
          </p>

          <div className="flex gap-3">
            <button
              onClick={handlePlayAll}
              disabled={songs.length === 0 || isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-full transition-colors disabled:opacity-50"
            >
              <FiPlay className="w-5 h-5" />
              <span>Play</span>
            </button>
            <button
              onClick={handleShuffle}
              disabled={songs.length === 0 || isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-surface-700 hover:bg-surface-600 rounded-full transition-colors disabled:opacity-50"
            >
              <FiShuffle className="w-5 h-5" />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Songs */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-400">{error}</p>
        </div>
      ) : songs.length > 0 ? (
        <SongList songs={songs} />
      ) : (
        <div className="text-center py-10">
          <p className="text-surface-400">This playlist is empty</p>
        </div>
      )}
    </div>
  )
}
