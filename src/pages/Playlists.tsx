import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiPlus, FiList, FiPlay, FiMusic, FiHeart } from 'react-icons/fi'
import { useAppStore } from '../store/appStore'
import { usePlayerStore } from '../store/playerStore'
import type { Song } from '../types/electron'

export default function Playlists() {
  const { playlists, ytMusicPlaylists, isLoggedIn, createPlaylist } = useAppStore()
  const { playSong } = usePlayerStore()
  const [showModal, setShowModal] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [ytLikedSongs, setYtLikedSongs] = useState<Song[]>([])
  const [isLoadingLiked, setIsLoadingLiked] = useState(false)

  // Load YouTube Music liked songs when logged in
  useEffect(() => {
    if (isLoggedIn) {
      loadYTLikedSongs()
    }
  }, [isLoggedIn])

  const loadYTLikedSongs = async () => {
    setIsLoadingLiked(true)
    try {
      const songs = await window.electronAPI.youtube.getLikedSongs()
      setYtLikedSongs(songs)
    } catch (err) {
      console.error('Failed to load YT liked songs:', err)
    } finally {
      setIsLoadingLiked(false)
    }
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return
    
    await createPlaylist(newPlaylistName.trim())
    setNewPlaylistName('')
    setShowModal(false)
  }

  const handlePlayLikedSongs = () => {
    if (ytLikedSongs.length > 0) {
      playSong(ytLikedSongs[0], ytLikedSongs)
    }
  }

  const allPlaylists = [
    ...playlists.map(p => ({ ...p, isYouTubeMusic: false })),
  ]

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Playlists</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
        >
          <FiPlus className="w-5 h-5" />
          <span>New Playlist</span>
        </button>
      </div>

      {/* YouTube Music Liked Songs */}
      {isLoggedIn && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FiHeart className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-semibold">YouTube Music Liked Songs</h2>
          </div>
          
          <Link
            to="/ytplaylist/LM"
            className="group flex items-center gap-4 bg-gradient-to-r from-red-600/20 to-pink-600/20 hover:from-red-600/30 hover:to-pink-600/30 rounded-lg p-4 transition-colors"
          >
            <div className="relative w-20 h-20 flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                <FiHeart className="w-10 h-10 text-white" />
              </div>
              <button 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handlePlayLikedSongs()
                }}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
              >
                <FiPlay className="w-4 h-4 ml-0.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg">Liked Music</h3>
              <p className="text-sm text-surface-400">
                {isLoadingLiked ? 'Loading...' : `${ytLikedSongs.length} songs from YouTube Music`}
              </p>
            </div>
            <div className="px-3 py-1 bg-red-500/20 rounded-full text-red-400 text-xs font-medium">
              YouTube Music
            </div>
          </Link>
        </section>
      )}

      {/* YouTube Music Playlists */}
      {isLoggedIn && ytMusicPlaylists.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FiMusic className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-semibold">YouTube Music Playlists</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {ytMusicPlaylists.map((playlist) => (
              <Link
                key={playlist.id}
                to={`/ytplaylist/${playlist.id}`}
                className="group bg-surface-800 rounded-lg p-4 hover:bg-surface-700 transition-colors"
              >
                <div className="relative aspect-square mb-3">
                  {playlist.thumbnailUrl ? (
                    <img
                      src={playlist.thumbnailUrl}
                      alt={playlist.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-600 to-pink-600 rounded-md flex items-center justify-center">
                      <FiMusic className="w-12 h-12 text-white/80" />
                    </div>
                  )}
                  <button className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-lg">
                    <FiPlay className="w-5 h-5 ml-0.5" />
                  </button>
                  {/* YouTube Music badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500/90 rounded text-xs font-medium">
                    YTM
                  </div>
                </div>
                <h3 className="font-medium truncate">{playlist.name || playlist.title}</h3>
                <p className="text-sm text-surface-400">
                  {playlist.songCount || 'Playlist'}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Local Playlists */}
      <section className="space-y-4">
        {(isLoggedIn && (ytMusicPlaylists.length > 0 || ytLikedSongs.length > 0)) && (
          <h2 className="text-xl font-semibold">Local Playlists</h2>
        )}
        
        {allPlaylists.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {allPlaylists.map((playlist) => (
              <Link
                key={playlist.id}
                to={`/playlist/${playlist.id}`}
                className="group bg-surface-800 rounded-lg p-4 hover:bg-surface-700 transition-colors"
              >
                <div className="relative aspect-square mb-3">
                  {playlist.thumbnailUrl ? (
                    <img
                      src={playlist.thumbnailUrl}
                      alt={playlist.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-surface-600 to-surface-700 rounded-md flex items-center justify-center">
                      <FiList className="w-12 h-12 text-surface-400" />
                    </div>
                  )}
                  <button className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-lg">
                    <FiPlay className="w-5 h-5 ml-0.5" />
                  </button>
                </div>
                <h3 className="font-medium truncate">{playlist.name}</h3>
                <p className="text-sm text-surface-400">
                  {playlist.songCount || 0} songs
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <FiList className="w-16 h-16 text-surface-600 mx-auto mb-4" />
            <p className="text-surface-400 mb-4">No local playlists yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Create Your First Playlist
            </button>
          </div>
        )}
      </section>

      {/* Create Playlist Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-800 rounded-xl p-6 w-full max-w-md animate-slideUp">
            <h2 className="text-xl font-semibold mb-4">Create Playlist</h2>
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              placeholder="Playlist name"
              className="w-full px-4 py-3 bg-surface-700 rounded-lg text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-surface-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
