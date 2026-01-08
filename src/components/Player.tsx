import { FiPlay, FiPause, FiSkipBack, FiSkipForward, FiVolume2, FiVolumeX, FiRepeat, FiShuffle, FiHeart } from 'react-icons/fi'
import { usePlayerStore } from '../store/playerStore'
import { useAppStore } from '../store/appStore'
import { formatTime } from '../utils/format'

export default function Player() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffleEnabled,
    repeatMode,
    togglePlay,
    seekTo,
    setVolume,
    toggleMute,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
  } = usePlayerStore()

  const { toggleLikeSong, likedSongs } = useAppStore()

  const isLiked = currentSong ? likedSongs.some(s => s.id === currentSong.id) : false

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(parseFloat(e.target.value))
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value))
  }

  if (!currentSong) {
    return (
      <div className="h-20 bg-surface-900 border-t border-surface-800 flex items-center justify-center">
        <p className="text-surface-500 text-sm">No song playing</p>
      </div>
    )
  }

  return (
    <div className="h-24 bg-surface-900 border-t border-surface-800 px-4 flex items-center gap-4">
      {/* Song Info */}
      <div className="flex items-center gap-3 w-64 min-w-0">
        {currentSong.thumbnailUrl ? (
          <img
            src={currentSong.thumbnailUrl}
            alt={currentSong.title}
            className="w-14 h-14 rounded-md object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-md bg-surface-700 flex items-center justify-center">
            <FiPlay className="w-6 h-6 text-surface-400" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{currentSong.title}</p>
          <p className="text-xs text-surface-400 truncate">{currentSong.artist}</p>
        </div>
        <button
          onClick={() => toggleLikeSong(currentSong.id)}
          className={`p-2 rounded-full transition-colors ${
            isLiked ? 'text-red-500' : 'text-surface-400 hover:text-white'
          }`}
        >
          <FiHeart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Player Controls */}
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            className={`p-2 rounded-full transition-colors ${
              shuffleEnabled ? 'text-primary-500' : 'text-surface-400 hover:text-white'
            }`}
          >
            <FiShuffle className="w-4 h-4" />
          </button>
          
          <button
            onClick={playPrevious}
            className="p-2 text-surface-300 hover:text-white transition-colors"
          >
            <FiSkipBack className="w-5 h-5" />
          </button>
          
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? <FiPause className="w-5 h-5" /> : <FiPlay className="w-5 h-5 ml-0.5" />}
          </button>
          
          <button
            onClick={playNext}
            className="p-2 text-surface-300 hover:text-white transition-colors"
          >
            <FiSkipForward className="w-5 h-5" />
          </button>
          
          <button
            onClick={toggleRepeat}
            className={`p-2 rounded-full transition-colors relative ${
              repeatMode !== 'off' ? 'text-primary-500' : 'text-surface-400 hover:text-white'
            }`}
          >
            <FiRepeat className="w-4 h-4" />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 text-[10px] font-bold">1</span>
            )}
          </button>
        </div>

        <div className="w-full max-w-xl flex items-center gap-2">
          <span className="text-xs text-surface-400 w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 cursor-pointer"
          />
          <span className="text-xs text-surface-400 w-10">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume */}
      <div className="w-40 flex items-center gap-2">
        <button
          onClick={toggleMute}
          className="p-2 text-surface-400 hover:text-white transition-colors"
        >
          {isMuted || volume === 0 ? (
            <FiVolumeX className="w-5 h-5" />
          ) : (
            <FiVolume2 className="w-5 h-5" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="flex-1 h-1 cursor-pointer"
        />
      </div>
    </div>
  )
}
