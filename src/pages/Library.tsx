import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiFolderPlus, FiMusic, FiHeart, FiClock } from 'react-icons/fi'
import SongList from '../components/SongList'
import { useAppStore } from '../store/appStore'

export default function Library() {
  const [searchParams] = useSearchParams()
  const filter = searchParams.get('filter')
  const { songs, likedSongs, recentlyPlayed, loadLibrary, isLoading } = useAppStore()
  const [isScanning, setIsScanning] = useState(false)

  const handleScanFolder = async () => {
    setIsScanning(true)
    try {
      const scannedSongs = await window.electronAPI.local.scanFolder()
      
      // Add scanned songs to database
      for (const song of scannedSongs) {
        await window.electronAPI.db.addSong(song)
      }
      
      // Reload library
      await loadLibrary()
    } catch (err) {
      console.error('Failed to scan folder:', err)
    } finally {
      setIsScanning(false)
    }
  }

  const displaySongs = filter === 'liked' 
    ? likedSongs 
    : filter === 'recent' 
      ? recentlyPlayed 
      : songs

  const title = filter === 'liked' 
    ? 'Liked Songs' 
    : filter === 'recent' 
      ? 'Recently Played' 
      : 'Library'

  const icon = filter === 'liked' 
    ? FiHeart 
    : filter === 'recent' 
      ? FiClock 
      : FiMusic

  const Icon = icon

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-surface-400 text-sm">{displaySongs.length} songs</p>
          </div>
        </div>

        {!filter && (
          <button
            onClick={handleScanFolder}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiFolderPlus className="w-5 h-5" />
            <span>{isScanning ? 'Scanning...' : 'Add Folder'}</span>
          </button>
        )}
      </div>

      {isLoading || isScanning ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displaySongs.length > 0 ? (
        <SongList 
          songs={displaySongs} 
          showIndex 
          isRecentlyPlayed={filter === 'recent'}
        />
      ) : (
        <div className="text-center py-20">
          <FiMusic className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <p className="text-surface-400 mb-4">
            {filter === 'liked' 
              ? "You haven't liked any songs yet" 
              : filter === 'recent'
                ? "No recently played songs"
                : "Your library is empty"}
          </p>
          {!filter && (
            <button
              onClick={handleScanFolder}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Add Music Folder
            </button>
          )}
        </div>
      )}
    </div>
  )
}
