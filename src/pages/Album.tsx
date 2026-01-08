import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FiPlay, FiShuffle, FiHeart } from 'react-icons/fi'
import SongList from '../components/SongList'
import { usePlayerStore } from '../store/playerStore'
import type { Album as AlbumType } from '../types/electron'

export default function Album() {
  const { id } = useParams<{ id: string }>()
  const [album, setAlbum] = useState<AlbumType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { playSong } = usePlayerStore()

  useEffect(() => {
    if (id) {
      loadAlbum(id)
    }
  }, [id])

  const loadAlbum = async (albumId: string) => {
    setIsLoading(true)
    try {
      const data = await window.electronAPI.youtube.getAlbum(albumId)
      setAlbum(data)
    } catch (err) {
      console.error('Failed to load album:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlayAll = () => {
    if (album?.songs && album.songs.length > 0) {
      playSong(album.songs[0], album.songs)
    }
  }

  const handleShuffle = () => {
    if (album?.songs && album.songs.length > 0) {
      const shuffled = [...album.songs].sort(() => Math.random() - 0.5)
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

  if (!album) {
    return (
      <div className="text-center py-20">
        <p className="text-surface-400">Album not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex gap-6">
        {album.thumbnailUrl ? (
          <img
            src={album.thumbnailUrl}
            alt={album.title}
            className="w-48 h-48 rounded-lg object-cover shadow-xl"
          />
        ) : (
          <div className="w-48 h-48 rounded-lg bg-surface-700 flex items-center justify-center">
            <FiPlay className="w-12 h-12 text-surface-400" />
          </div>
        )}
        
        <div className="flex flex-col justify-end">
          <span className="text-sm text-surface-400 uppercase tracking-wider">Album</span>
          <h1 className="text-4xl font-bold mt-2">{album.title}</h1>
          <p className="text-surface-300 mt-2">
            {album.artist} {album.year && `• ${album.year}`}
          </p>
          <p className="text-surface-400 text-sm mt-1">
            {album.songs?.length || 0} songs
          </p>
          
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-full transition-colors"
            >
              <FiPlay className="w-5 h-5" />
              <span className="font-medium">Play</span>
            </button>
            <button
              onClick={handleShuffle}
              className="flex items-center gap-2 px-6 py-3 bg-surface-700 hover:bg-surface-600 rounded-full transition-colors"
            >
              <FiShuffle className="w-5 h-5" />
              <span className="font-medium">Shuffle</span>
            </button>
            <button className="p-3 text-surface-400 hover:text-white transition-colors">
              <FiHeart className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Songs */}
      {album.songs && album.songs.length > 0 && (
        <SongList songs={album.songs} showAlbum={false} showIndex />
      )}
    </div>
  )
}
