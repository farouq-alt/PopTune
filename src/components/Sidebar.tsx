import { NavLink } from 'react-router-dom'
import { FiHome, FiSearch, FiMusic, FiList, FiSettings, FiHeart, FiClock } from 'react-icons/fi'
import { useAppStore } from '../store/appStore'

const navItems = [
  { to: '/', icon: FiHome, label: 'Home' },
  { to: '/search', icon: FiSearch, label: 'Search' },
  { to: '/library', icon: FiMusic, label: 'Library' },
  { to: '/playlists', icon: FiList, label: 'Playlists' },
]

export default function Sidebar() {
  const { playlists, sidebarCollapsed } = useAppStore()

  return (
    <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-surface-900 flex flex-col transition-all duration-200`}>
      <nav className="p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-surface-700 text-white'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-surface-800 mx-3 my-2" />

      <nav className="p-3 space-y-1">
        <NavLink
          to="/library?filter=liked"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
        >
          <FiHeart className="w-5 h-5 flex-shrink-0" />
          {!sidebarCollapsed && <span className="text-sm font-medium">Liked Songs</span>}
        </NavLink>
        <NavLink
          to="/library?filter=recent"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
        >
          <FiClock className="w-5 h-5 flex-shrink-0" />
          {!sidebarCollapsed && <span className="text-sm font-medium">Recently Played</span>}
        </NavLink>
      </nav>

      {!sidebarCollapsed && playlists.length > 0 && (
        <>
          <div className="border-t border-surface-800 mx-3 my-2" />
          
          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 px-3">
              Playlists
            </h3>
            <div className="space-y-1">
              {playlists.map((playlist) => (
                <NavLink
                  key={playlist.id}
                  to={`/playlist/${playlist.id}`}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                      isActive
                        ? 'bg-surface-700 text-white'
                        : 'text-surface-400 hover:text-white hover:bg-surface-800'
                    }`
                  }
                >
                  {playlist.name}
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="p-3 border-t border-surface-800">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive
                ? 'bg-surface-700 text-white'
                : 'text-surface-400 hover:text-white hover:bg-surface-800'
            }`
          }
        >
          <FiSettings className="w-5 h-5 flex-shrink-0" />
          {!sidebarCollapsed && <span className="text-sm font-medium">Settings</span>}
        </NavLink>
      </div>
    </aside>
  )
}
