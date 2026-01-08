import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FiPlay, FiShuffle, FiUser } from 'react-icons/fi'
import SongList from '../components/SongList'
import MediaCard from '../components/MediaCard'
import { usePlayerStore } from '../store/playerStore'
import type { Artist as ArtistType } from '../types/electron'

export default function Artist() {
  const { id } = useParams<{ id: string }>()
  const [artist, setArtist] = useState<ArtistType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { playSong } = usePlayerStore()

  useEffect(() => {
    if (id) {
      loadArtist(id)
    }
  }, [id])

  const loadArtist = async (artistId: string) => {
    setIsLoading(true)
    try {
      const data = await window.electronAPI.youtube.getArtist(artistId)
      setArtist(data)
    } catch (err) {
      console.error('Failed to load artist:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlayAll = () => {
    if (artist?.songs && artist.songs.length > 0) {
      playSong(artist.songs[0], artist.songs)
    }
  }

  const handleShuffle = () => {
    if (artist?.songs && artist.songs.length > 0) {
      const shuffled = [...artist.songs].sort(() => Math.random() - 0.5)
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

  if (!artist) {
    return (
      <div className="text-center py-20">
        <p className="text-surface-400">Artist not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex gap-6">
        {artist.thumbnailUrl ? (
          <img
            src={artist.thumbnailUrl}
            alt={artist.name}
            className="w-48 h-48 rounded-full object-cover shadow-xl"
          />
        ) : (
          <div className="w-48 h-48 rounded-full bg-surface-700 flex items-center justify-center">
            <FiUser className="w-12 h-12 text-surface-400" />
          </div>
        )}
        
        <div className="flex flex-col justify-end">
          <span className="text-sm text-surface-400 uppercase tracking-wider">Artist</span>
          <h1 className="text-4xl font-bold mt-2">{artist.name}</h1>
          {artist.subscribers && (
            <p className="text-surface-400 mt-2">{artist.subscribers}</p>
          )}
          {artist.description && (
            <p className="text-surface-300 text-sm mt-2 max-w-xl line-clamp-2">
              {artist.description}
            </p>
          )}
          
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
          </div>
        </div>
      </div>

      {/* Top Songs */}
      {artist.songs && artist.songs.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Top Songs</h2>
          <SongList songs={artist.songs.slice(0, 10)} showIndex />
        </section>
      )}

      {/* Albums */}
      {artist.albums && artist.albums.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Albums</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {artist.albums.map((album: any) => (
              <MediaCard
                key={album.id}
                id={album.id}
                title={album.title}
                subtitle={album.year}
                thumbnailUrl={album.thumbnailUrl}
                type="album"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
