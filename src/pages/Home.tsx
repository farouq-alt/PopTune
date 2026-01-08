import { useEffect, useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import MediaCard from '../components/MediaCard'
import SongList from '../components/SongList'
import { useAppStore } from '../store/appStore'
import { usePlayerStore } from '../store/playerStore'

export default function Home() {
  const { homeSections, loadHome, isLoading, recentlyPlayed, likedSongs } = useAppStore()
  const { playSong } = usePlayerStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (homeSections.length === 0) {
      handleRefresh()
    }
  }, [])

  const handleRefresh = async () => {
    setError(null)
    try {
      await loadHome()
    } catch (err) {
      setError('Failed to load content. Check your internet connection.')
    }
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Good {getGreeting()}</h1>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2 text-surface-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Recently Played</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {recentlyPlayed.slice(0, 6).map((song) => (
              <MediaCard
                key={song.id}
                id={song.id}
                title={song.title}
                subtitle={song.artist}
                thumbnailUrl={song.thumbnailUrl}
                type="song"
                onClick={() => playSong(song, recentlyPlayed)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Liked Songs Quick Access */}
      {likedSongs.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Your Favorites</h2>
          <SongList songs={likedSongs.slice(0, 5)} />
        </section>
      )}

      {/* YouTube Music Sections */}
      {homeSections.map((section, index) => (
        <section key={index}>
          <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {section.contents.slice(0, 12).map((item: any) => (
              <MediaCard
                key={item.id}
                id={item.id}
                title={item.title}
                subtitle={item.subtitle || item.artist}
                thumbnailUrl={item.thumbnailUrl}
                type={item.type || 'song'}
                onClick={item.type === 'song' ? () => playSong(item, section.contents) : undefined}
              />
            ))}
          </div>
        </section>
      ))}

      {isLoading && homeSections.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && homeSections.length === 0 && !error && (
        <div className="text-center py-20">
          <p className="text-surface-400 mb-4">No content loaded yet</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Load Content
          </button>
        </div>
      )}
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}
