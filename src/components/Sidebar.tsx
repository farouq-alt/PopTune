import { NavLink } from 'react-router-dom'
import { FiHome, FiSearch, FiMusic, FiList, FiSettings, FiHeart, FiClock, FiUser } from 'react-icons/fi'
import { useAppStore } from '../store/appStore'

const navItems = [
  { to: '/', icon: FiHome, label: 'Home' },
  { to: '/search', icon: FiSearch, label: 'Search' },
  { to: '/library', icon: FiMusic, label: 'Library' },
  { to: '/playlists', icon: FiList, label: 'Playlists' },
]

export default function Sidebar() {
  const { playlists, ytMusicPlaylists, sidebarCollapsed, isLoggedIn, accountInfo } = useAppStore()

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
        {/* YouTube Music Liked Songs */}
        {isLoggedIn && (
          <NavLink
            to="/ytplaylist/LM"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-surface-400 hover:text-red-400 hover:bg-red-500/10'
              }`
            }
          >
            <FiHeart className="w-5 h-5 flex-shrink-0 text-red-500" />
            {!sidebarCollapsed && <span className="text-sm font-medium">YT Liked Music</span>}
          </NavLink>
        )}
      </nav>

      {/* YouTube Music Playlists */}
      {!sidebarCollapsed && isLoggedIn && ytMusicPlaylists.length > 0 && (
        <>
          <div className="border-t border-surface-800 mx-3 my-2" />
          
          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 px-3 flex items-center gap-1">
              <FiMusic className="w-3 h-3" />
              YouTube Music
            </h3>
            <div className="space-y-1">
              {ytMusicPlaylists.slice(0, 10).map((playlist) => (
                <NavLink
                  key={playlist.id}
                  to={`/ytplaylist/${playlist.id}`}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                      isActive
                        ? 'bg-surface-700 text-white'
                        : 'text-surface-400 hover:text-white hover:bg-surface-800'
                    }`
                  }
                >
                  {playlist.name || playlist.title}
                </NavLink>
              ))}
              {ytMusicPlaylists.length > 10 && (
                <NavLink
                  to="/playlists"
                  className="block px-3 py-2 text-sm text-surface-500 hover:text-surface-300"
                >
                  +{ytMusicPlaylists.length - 10} more...
                </NavLink>
              )}
            </div>
          </div>
        </>
      )}

      {/* Local Playlists */}
      {!sidebarCollapsed && playlists.length > 0 && (
        <>
          <div className="border-t border-surface-800 mx-3 my-2" />
          
          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 px-3">
              Local Playlists
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
        {/* Account indicator */}
        {!sidebarCollapsed && isLoggedIn && accountInfo && (
          <div className="px-3 py-2 mb-2 text-xs text-surface-500 truncate">
            <FiUser className="w-3 h-3 inline mr-1" />
            {accountInfo.name}
          </div>
        )}
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
