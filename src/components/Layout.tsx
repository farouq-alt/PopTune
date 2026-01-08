import { Outlet } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Sidebar from './Sidebar'
import TitleBar from './TitleBar'
import Player from './Player'
import { usePlayerStore } from '../store/playerStore'
import { useAppStore } from '../store/appStore'

export default function Layout() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const { setAudio, setCurrentTime, setDuration, setIsPlaying, playNext } = usePlayerStore()
  const { loadLibrary } = useAppStore()

  useEffect(() => {
    if (audioRef.current) {
      setAudio(audioRef.current)

      const audio = audioRef.current

      audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime))
      audio.addEventListener('durationchange', () => setDuration(audio.duration))
      audio.addEventListener('play', () => setIsPlaying(true))
      audio.addEventListener('pause', () => setIsPlaying(false))
      audio.addEventListener('ended', () => playNext())

      return () => {
        audio.removeEventListener('timeupdate', () => {})
        audio.removeEventListener('durationchange', () => {})
        audio.removeEventListener('play', () => {})
        audio.removeEventListener('pause', () => {})
        audio.removeEventListener('ended', () => {})
      }
    }
  }, [])

  useEffect(() => {
    loadLibrary()
  }, [])

  return (
    <div className="h-screen flex flex-col bg-surface-950">
      <TitleBar />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <Player />
      
      <audio ref={audioRef} />
    </div>
  )
}
