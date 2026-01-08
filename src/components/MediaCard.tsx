import { Link } from 'react-router-dom'
import { FiPlay } from 'react-icons/fi'
import { usePlayerStore } from '../store/playerStore'

interface MediaCardProps {
  id: string
  title: string
  subtitle?: string
  thumbnailUrl?: string
  type: 'song' | 'album' | 'artist' | 'playlist'
  onClick?: () => void
}

export default function MediaCard({ id, title, subtitle, thumbnailUrl, type, onClick }: MediaCardProps) {
  const { playSong } = usePlayerStore()

  const getLink = () => {
    switch (type) {
      case 'album':
        return `/album/${id}`
      case 'artist':
        return `/artist/${id}`
      case 'playlist':
        return `/playlist/${id}`
      default:
        return '#'
    }
  }

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (type === 'song' && onClick) {
      onClick()
    }
  }

  const content = (
    <div className="group relative bg-surface-800 rounded-lg p-3 hover:bg-surface-700 transition-colors cursor-pointer">
      <div className="relative aspect-square mb-3">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className={`w-full h-full object-cover ${type === 'artist' ? 'rounded-full' : 'rounded-md'}`}
          />
        ) : (
          <div className={`w-full h-full bg-surface-600 flex items-center justify-center ${type === 'artist' ? 'rounded-full' : 'rounded-md'}`}>
            <FiPlay className="w-8 h-8 text-surface-400" />
          </div>
        )}
        
        <button
          onClick={handlePlayClick}
          className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-lg hover:scale-105"
        >
          <FiPlay className="w-5 h-5 ml-0.5" />
        </button>
      </div>
      
      <h3 className="font-medium text-sm truncate">{title}</h3>
      {subtitle && (
        <p className="text-xs text-surface-400 truncate mt-1">{subtitle}</p>
      )}
    </div>
  )

  if (type === 'song') {
    return <div onClick={onClick}>{content}</div>
  }

  return <Link to={getLink()}>{content}</Link>
}
