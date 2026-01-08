import { useState, useRef, useEffect } from 'react'
import { FiPlay, FiMoreHorizontal, FiHeart, FiPlus, FiTrash2, FiClock, FiList, FiX } from 'react-icons/fi'
import { usePlayerStore } from '../store/playerStore'
import { useAppStore } from '../store/appStore'
import { formatTime } from '../utils/format'
import type { Song } from '../types/electron'

interface SongListProps {
  songs: Song[]
  showAlbum?: boolean
  showIndex?: boolean
  playlistId?: string // If provided, we're in a playlist view
  isRecentlyPlayed?: boolean // If true, we're in recently played view
  onSongRemoved?: () => void // Callback when a song is removed
}

export default function SongList({ 
  songs, 
  showAlbum = true, 
  showIndex = false,
  playlistId,
  isRecentlyPlayed = false,
  onSongRemoved
}: SongListProps) {
  const { playSong, currentSong, isPlaying } = usePlayerStore()
  const { toggleLikeSong, likedSongs, playlists, loadLibrary } = useAppStore()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [openAddMenuId, setOpenAddMenuId] = useState<string | null>(null)
  const [showNewPlaylistInput, setShowNewPlaylistInput] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setOpenAddMenuId(null)
        setShowNewPlaylistInput(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePlay = (song: Song) => {
    playSong(song, songs)
  }

  const handleAddToPlaylist = async (song: Song, targetPlaylistId: string) => {
    // First ensure song is in database
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
    await window.electronAPI.db.addToPlaylist(targetPlaylistId, song.id)
    setOpenAddMenuId(null)
  }

  const handleCreatePlaylistAndAdd = async (song: Song) => {
    if (!newPlaylistName.trim()) return
    const playlist = await window.electronAPI.db.createPlaylist(newPlaylistName.trim())
    await handleAddToPlaylist(song, playlist.id)
    setNewPlaylistName('')
    setShowNewPlaylistInput(false)
    await loadLibrary()
  }

  const handleRemoveFromPlaylist = async (songId: string) => {
    if (!playlistId) return
    await window.electronAPI.db.removeFromPlaylist(playlistId, songId)
    setOpenMenuId(null)
    onSongRemoved?.()
  }

  const handleRemoveFromRecentlyPlayed = async (songId: string) => {
    await window.electronAPI.db.removeFromRecentlyPlayed(songId)
    setOpenMenuId(null)
    await loadLibrary()
  }

  const handleDeleteSong = async (songId: string) => {
    await window.electronAPI.db.deleteSong(songId)
    setOpenMenuId(null)
    await loadLibrary()
  }

  return (
    <div className="space-y-1">
      {songs.map((song, index) => {
        const isCurrentSong = currentSong?.id === song.id
        const isLiked = likedSongs.some(s => s.id === song.id)

        return (
          <div
            key={`${song.id}-${index}`}
            className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              isCurrentSong ? 'bg-surface-700' : 'hover:bg-surface-800'
            }`}
            onDoubleClick={() => handlePlay(song)}
          >
            {/* Index/Play button */}
            <div className="w-8 flex items-center justify-center">
              {showIndex && !isCurrentSong && (
                <span className="text-sm text-surface-500 group-hover:hidden">
                  {index + 1}
                </span>
              )}
              <button
                onClick={() => handlePlay(song)}
                className={`${showIndex && !isCurrentSong ? 'hidden group-hover:flex' : 'flex'} items-center justify-center`}
              >
                {isCurrentSong && isPlaying ? (
                  <div className="flex items-center gap-0.5">
                    <span className="w-0.5 h-3 bg-primary-500 animate-pulse" />
                    <span className="w-0.5 h-4 bg-primary-500 animate-pulse delay-75" />
                    <span className="w-0.5 h-2 bg-primary-500 animate-pulse delay-150" />
                  </div>
                ) : (
                  <FiPlay className={`w-4 h-4 ${isCurrentSong ? 'text-primary-500' : ''}`} />
                )}
              </button>
            </div>

            {/* Thumbnail */}
            {song.thumbnailUrl ? (
              <img
                src={song.thumbnailUrl}
                alt={song.title}
                className="w-10 h-10 rounded object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-surface-700 flex items-center justify-center">
                <FiPlay className="w-4 h-4 text-surface-400" />
              </div>
            )}

            {/* Song info */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isCurrentSong ? 'text-primary-500' : ''}`}>
                {song.title}
              </p>
              <p className="text-xs text-surface-400 truncate">{song.artist}</p>
            </div>

            {/* Album */}
            {showAlbum && song.album && (
              <p className="text-sm text-surface-400 truncate w-48 hidden lg:block">
                {song.album}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Like button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLikeSong(song.id)
                }}
                className={`p-2 rounded-full transition-colors ${
                  isLiked ? 'text-red-500' : 'text-surface-400 hover:text-white'
                }`}
              >
                <FiHeart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>

              {/* Add to playlist button */}
              <div className="relative" ref={openAddMenuId === song.id ? addMenuRef : null}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenAddMenuId(openAddMenuId === song.id ? null : song.id)
                    setOpenMenuId(null)
                  }}
                  className="p-2 text-surface-400 hover:text-white rounded-full transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                </button>

                {/* Add to playlist dropdown */}
                {openAddMenuId === song.id && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-surface-800 rounded-lg shadow-xl border border-surface-700 py-1 z-50">
                    <div className="px-3 py-2 text-xs font-semibold text-surface-400 uppercase">
                      Add to Playlist
                    </div>
                    
                    {/* Create new playlist */}
                    {showNewPlaylistInput ? (
                      <div className="px-3 py-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreatePlaylistAndAdd(song)
                            if (e.key === 'Escape') setShowNewPlaylistInput(false)
                          }}
                          placeholder="Playlist name"
                          className="flex-1 bg-surface-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCreatePlaylistAndAdd(song)
                          }}
                          className="p-1 text-primary-500 hover:text-primary-400"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowNewPlaylistInput(false)
                          }}
                          className="p-1 text-surface-400 hover:text-white"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowNewPlaylistInput(true)
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-surface-700 flex items-center gap-2"
                      >
                        <FiPlus className="w-4 h-4" />
                        Create new playlist
                      </button>
                    )}

                    {playlists.length > 0 && (
                      <>
                        <div className="border-t border-surface-700 my-1" />
                        {playlists.map((playlist) => (
                          <button
                            key={playlist.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddToPlaylist(song, playlist.id)
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-surface-700 flex items-center gap-2"
                          >
                            <FiList className="w-4 h-4" />
                            {playlist.name}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* More options button */}
              <div className="relative" ref={openMenuId === song.id ? menuRef : null}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenMenuId(openMenuId === song.id ? null : song.id)
                    setOpenAddMenuId(null)
                  }}
                  className="p-2 text-surface-400 hover:text-white rounded-full transition-colors"
                >
                  <FiMoreHorizontal className="w-4 h-4" />
                </button>

                {/* More options dropdown */}
                {openMenuId === song.id && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-surface-800 rounded-lg shadow-xl border border-surface-700 py-1 z-50">
                    {/* Remove from playlist (only show if in playlist view) */}
                    {playlistId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveFromPlaylist(song.id)
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-surface-700 flex items-center gap-2 text-red-400"
                      >
                        <FiTrash2 className="w-4 h-4" />
                        Remove from playlist
                      </button>
                    )}

                    {/* Remove from recently played */}
                    {isRecentlyPlayed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveFromRecentlyPlayed(song.id)
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-surface-700 flex items-center gap-2"
                      >
                        <FiClock className="w-4 h-4" />
                        Remove from history
                      </button>
                    )}

                    {/* Delete from library */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSong(song.id)
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-surface-700 flex items-center gap-2 text-red-400"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      Delete from library
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Duration */}
            <span className="text-sm text-surface-400 w-12 text-right">
              {formatTime(song.duration)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
