import { useState } from 'react'
import { FiFolder, FiTrash2, FiInfo } from 'react-icons/fi'

export default function Settings() {
  const [audioQuality, setAudioQuality] = useState('high')

  return (
    <div className="max-w-2xl space-y-8 animate-fadeIn">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* Audio Settings */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Audio</h2>
        
        <div className="bg-surface-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Audio Quality</p>
              <p className="text-sm text-surface-400">Higher quality uses more bandwidth</p>
            </div>
            <select
              value={audioQuality}
              onChange={(e) => setAudioQuality(e.target.value)}
              className="bg-surface-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="low">Low (128kbps)</option>
              <option value="medium">Medium (192kbps)</option>
              <option value="high">High (256kbps)</option>
              <option value="best">Best Available</option>
            </select>
          </div>
        </div>
      </section>

      {/* Library Settings */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Library</h2>
        
        <div className="bg-surface-800 rounded-lg p-4 space-y-4">
          <button className="flex items-center gap-3 w-full text-left hover:bg-surface-700 -m-2 p-2 rounded-lg transition-colors">
            <FiFolder className="w-5 h-5 text-surface-400" />
            <div>
              <p className="font-medium">Music Folders</p>
              <p className="text-sm text-surface-400">Manage folders to scan for local music</p>
            </div>
          </button>
          
          <div className="border-t border-surface-700 pt-4">
            <button className="flex items-center gap-3 w-full text-left hover:bg-surface-700 -m-2 p-2 rounded-lg transition-colors text-red-400">
              <FiTrash2 className="w-5 h-5" />
              <div>
                <p className="font-medium">Clear Cache</p>
                <p className="text-sm text-surface-500">Free up disk space by clearing cached data</p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">About</h2>
        
        <div className="bg-surface-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
              <FiInfo className="w-6 h-6" />
            </div>
            <div>
              <p className="font-medium">Tuner</p>
              <p className="text-sm text-surface-400">Version 1.0.0</p>
            </div>
          </div>
          
          <p className="text-sm text-surface-400 mt-4">
            A desktop music player for YouTube Music and local files.
            Built with Electron and React.
          </p>
          
          <div className="flex gap-4 mt-4 text-sm">
            <a href="#" className="text-primary-400 hover:text-primary-300">GitHub</a>
            <a href="#" className="text-primary-400 hover:text-primary-300">Report Issue</a>
            <a href="#" className="text-primary-400 hover:text-primary-300">License</a>
          </div>
        </div>
      </section>
    </div>
  )
}
