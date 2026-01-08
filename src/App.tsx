import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Search from './pages/Search'
import Library from './pages/Library'
import Playlists from './pages/Playlists'
import PlaylistDetail from './pages/PlaylistDetail'
import Album from './pages/Album'
import Artist from './pages/Artist'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="library" element={<Library />} />
        <Route path="playlists" element={<Playlists />} />
        <Route path="playlist/:id" element={<PlaylistDetail />} />
        <Route path="album/:id" element={<Album />} />
        <Route path="artist/:id" element={<Artist />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
