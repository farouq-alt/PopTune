import { useState, useCallback } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import SongList from '../components/SongList'
import MediaCard from '../components/MediaCard'
import type { SearchResults } from '../types/electron'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'songs' | 'albums' | 'artists' | 'playlists'>('songs')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      console.log('Searching for:', query)
      const searchResults = await window.electronAPI.youtube.search(query)
      console.log('Search results:', searchResults)
      setResults(searchResults)
      
      if (searchResults.songs.length === 0 && 
          searchResults.albums.length === 0 && 
          searchResults.artists.length === 0) {
        setError('No results found. YouTube Music might be unavailable in your region.')
      }
    } catch (err: any) {
      console.error('Search failed:', err)
      setError(`Search failed: ${err.message || 'Unknown error'}. Check console for details.`)
    } finally {
      setIsLoading(false)
    }
  }, [query])
  
  const [error, setError] = useState<string | null>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const clearSearch = () => {
    setQuery('')
    setResults(null)
  }

  const tabs = [
    { id: 'songs', label: 'Songs', count: results?.songs.length || 0 },
    { id: 'albums', label: 'Albums', count: results?.albums.length || 0 },
    { id: 'artists', label: 'Artists', count: results?.artists.length || 0 },
    { id: 'playlists', label: 'Playlists', count: results?.playlists.length || 0 },
  ] as const

  return (
    <div className="space-y-6 animate-fadeIn">
      <h1 className="text-3xl font-bold">Search</h1>

      {/* Search Input */}
      <div className="relative max-w-xl">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for songs, albums, artists..."
          className="w-full pl-12 pr-12 py-3 bg-surface-800 rounded-full text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-white"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Results */}
      {results && !isLoading && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 border-b border-surface-800 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-black'
                    : 'text-surface-400 hover:text-white hover:bg-surface-800'
                }`}
              >
                {tab.label} {tab.count > 0 && `(${tab.count})`}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="animate-fadeIn">
            {activeTab === 'songs' && results.songs.length > 0 && (
              <SongList songs={results.songs} />
            )}

            {activeTab === 'albums' && results.albums.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {results.albums.map((album) => (
                  <MediaCard
                    key={album.id}
                    id={album.id}
                    title={album.title}
                    subtitle={album.artist}
                    thumbnailUrl={album.thumbnailUrl}
                    type="album"
                  />
                ))}
              </div>
            )}

            {activeTab === 'artists' && results.artists.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {results.artists.map((artist) => (
                  <MediaCard
                    key={artist.id}
                    id={artist.id}
                    title={artist.name}
                    subtitle={artist.subscribers}
                    thumbnailUrl={artist.thumbnailUrl}
                    type="artist"
                  />
                ))}
              </div>
            )}

            {activeTab === 'playlists' && results.playlists.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {results.playlists.map((playlist) => (
                  <MediaCard
                    key={playlist.id}
                    id={playlist.id}
                    title={playlist.title || playlist.name}
                    subtitle={playlist.author}
                    thumbnailUrl={playlist.thumbnailUrl}
                    type="playlist"
                  />
                ))}
              </div>
            )}

            {/* Empty state for current tab */}
            {((activeTab === 'songs' && results.songs.length === 0) ||
              (activeTab === 'albums' && results.albums.length === 0) ||
              (activeTab === 'artists' && results.artists.length === 0) ||
              (activeTab === 'playlists' && results.playlists.length === 0)) && (
              <p className="text-center text-surface-400 py-10">
                No {activeTab} found for "{query}"
              </p>
            )}
          </div>
        </>
      )}

      {/* Initial state */}
      {!results && !isLoading && (
        <div className="text-center py-20">
          <FiSearch className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <p className="text-surface-400">Search for your favorite music</p>
        </div>
      )}
    </div>
  )
}
