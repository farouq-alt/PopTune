import { FiMinus, FiSquare, FiX } from 'react-icons/fi'

export default function TitleBar() {
  return (
    <div className="h-10 bg-surface-900 flex items-center justify-between px-4 drag-region">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-pink-500" />
        <span className="text-sm font-medium text-surface-200">Tuner</span>
      </div>

      <div className="flex items-center no-drag">
        <button
          onClick={() => window.electronAPI.minimize()}
          className="w-10 h-10 flex items-center justify-center hover:bg-surface-700 transition-colors"
        >
          <FiMinus className="w-4 h-4" />
        </button>
        <button
          onClick={() => window.electronAPI.maximize()}
          className="w-10 h-10 flex items-center justify-center hover:bg-surface-700 transition-colors"
        >
          <FiSquare className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => window.electronAPI.close()}
          className="w-10 h-10 flex items-center justify-center hover:bg-red-600 transition-colors"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
