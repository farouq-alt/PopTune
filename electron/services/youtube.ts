import Innertube from 'youtubei.js'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Cache stream URLs (they expire after ~6 hours, we cache for 30 min)
const streamCache = new Map<string, { url: string; duration: number; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export class YouTubeService {
  private innertube: Innertube | null = null

  async init() {
    try {
      console.log('Initializing YouTube service...')
      this.innertube = await Innertube.create({
        lang: 'en',
        location: 'US',
        retrieve_player: false,
      })
      console.log('YouTube service initialized successfully')
    } catch (err) {
      console.error('Failed to initialize YouTube service:', err)
      throw err
    }
  }

  async search(query: string) {
    if (!this.innertube) throw new Error('YouTube service not initialized')
    
    const results = await this.innertube.music.search(query)
    
    let songs: any[] = []
    let albums: any[] = []
    let artists: any[] = []
    let playlists: any[] = []
    
    // Try the categorized results first (when using search filters)
    if (results.songs?.contents) {
      songs = results.songs.contents.map((item: any) => this.parseSongItem(item)).filter(Boolean)
    }
    
    if (results.albums?.contents) {
      albums = results.albums.contents.map((item: any) => this.parseAlbumItem(item)).filter(Boolean)
    }
    
    if (results.artists?.contents) {
      artists = results.artists.contents.map((item: any) => this.parseArtistItem(item)).filter(Boolean)
    }
    
    if (results.playlists?.contents) {
      playlists = results.playlists.contents.map((item: any) => this.parsePlaylistItem(item)).filter(Boolean)
    }
    
    // If no categorized results, parse the main contents array
    if (songs.length === 0 && results.contents) {
      for (const section of results.contents) {
        const sectionContents = (section as any).contents || []
        for (const rawItem of sectionContents) {
          const item = rawItem as any
          // Check item type
          const itemType = item.type
          
          if (itemType === 'MusicResponsiveListItem') {
            // This could be a song - check if it has playable endpoint
            if (item.overlay?.content?.endpoint?.watch || item.id) {
              const song = this.parseSongItem(item)
              if (song) songs.push(song)
            }
          } else if (itemType === 'MusicTwoRowItem') {
            // Could be album, artist, or playlist
            const browseId = item.endpoint?.browse?.id || item.navigation_endpoint?.browse?.id
            if (browseId) {
              if (browseId.startsWith('UC')) {
                const artist = this.parseArtistItem(item)
                if (artist) artists.push(artist)
              } else if (browseId.startsWith('MPREb')) {
                const album = this.parseAlbumItem(item)
                if (album) albums.push(album)
              } else if (browseId.startsWith('VL') || browseId.startsWith('PL')) {
                const playlist = this.parsePlaylistItem(item)
                if (playlist) playlists.push(playlist)
              }
            }
          }
        }
      }
    }

    return { songs, albums, artists, playlists }
  }
  
  private parseSongItem(item: any) {
    if (!item) return null
    
    const id = item.id || item.video_id || item.overlay?.content?.endpoint?.watch?.video_id
    if (!id) return null
    
    return {
      id,
      title: this.getText(item.title) || this.getText(item.flex_columns?.[0]?.title),
      artist: item.artists?.[0]?.name || this.getText(item.author) || this.getText(item.flex_columns?.[1]?.title?.runs?.[0]) || 'Unknown',
      artistId: item.artists?.[0]?.channel_id,
      album: item.album?.name || this.getText(item.flex_columns?.[2]?.title),
      albumId: item.album?.id,
      duration: item.duration?.seconds || 0,
      thumbnailUrl: this.getThumbnail(item),
    }
  }
  
  private parseAlbumItem(item: any) {
    if (!item) return null
    
    const id = item.id || item.endpoint?.browse?.id || item.navigation_endpoint?.browse?.id
    if (!id) return null
    
    return {
      id,
      title: this.getText(item.title),
      artist: this.getText(item.subtitle) || this.getText(item.author) || item.artists?.[0]?.name,
      artistId: item.author?.channel_id,
      thumbnailUrl: this.getThumbnail(item),
      year: this.getText(item.year),
    }
  }
  
  private parseArtistItem(item: any) {
    if (!item) return null
    
    const id = item.id || item.endpoint?.browse?.id || item.navigation_endpoint?.browse?.id
    if (!id) return null
    
    return {
      id,
      name: this.getText(item.title) || this.getText(item.name),
      thumbnailUrl: this.getThumbnail(item),
      subscribers: this.getText(item.subtitle) || this.getText(item.subscribers),
    }
  }
  
  private parsePlaylistItem(item: any) {
    if (!item) return null
    
    const id = item.id || item.endpoint?.browse?.id || item.navigation_endpoint?.browse?.id
    if (!id) return null
    
    return {
      id,
      title: this.getText(item.title),
      author: this.getText(item.subtitle) || this.getText(item.author),
      thumbnailUrl: this.getThumbnail(item),
      songCount: this.getText(item.item_count),
    }
  }

  async getHome() {
    if (!this.innertube) throw new Error('YouTube service not initialized')
    
    try {
      const home = await this.innertube.music.getHomeFeed()
      console.log('Home feed loaded:', home.sections?.length, 'sections')
      
      return home.sections?.map((section: any) => ({
        title: this.getText(section.title) || this.getText(section.header?.title) || 'Recommendations',
        contents: section.contents?.map((item: any) => this.parseItem(item)) || [],
      })) || []
    } catch (err) {
      console.error('Failed to get home feed:', err)
      throw err
    }
  }

  async getStreamUrl(videoId: string) {
    try {
      // Check cache first
      const cached = streamCache.get(videoId)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return {
          url: cached.url,
          mimeType: 'audio/webm',
          bitrate: 128,
          duration: cached.duration,
        }
      }

      // Use yt-dlp to get URL and duration in one call
      // Try common locations for yt-dlp
      const ytdlpPaths = [
        'yt-dlp', // System PATH
        '/usr/local/bin/yt-dlp',
        '/usr/bin/yt-dlp',
        `${process.env.HOME}/.local/bin/yt-dlp`,
      ]
      
      let ytdlpPath = 'yt-dlp'
      for (const path of ytdlpPaths) {
        try {
          await execAsync(`${path} --version`, { timeout: 5000 })
          ytdlpPath = path
          break
        } catch {
          continue
        }
      }
      
      const url = `https://www.youtube.com/watch?v=${videoId}`
      
      // Get URL and duration together using JSON output
      const { stdout } = await execAsync(
        `${ytdlpPath} -f "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio" -j "${url}"`,
        { timeout: 15000 }
      )
      
      const info = JSON.parse(stdout)
      const streamUrl = info.url
      const duration = info.duration || 0
      
      if (!streamUrl) {
        throw new Error('No stream URL returned from yt-dlp')
      }
      
      // Cache the result
      streamCache.set(videoId, { url: streamUrl, duration, timestamp: Date.now() })
      
      return {
        url: streamUrl,
        mimeType: 'audio/webm',
        bitrate: 128,
        duration,
      }
    } catch (err) {
      console.error('Failed to get stream URL:', err)
      throw err
    }
  }

  async getAlbum(albumId: string) {
    if (!this.innertube) throw new Error('YouTube service not initialized')
    
    const album = await this.innertube.music.getAlbum(albumId)
    const header = album.header as any
    
    return {
      id: albumId,
      title: this.getText(header?.title),
      artist: this.getText(header?.subtitle),
      thumbnailUrl: this.getThumbnail(header),
      year: this.getText(header?.year),
      songs: album.contents?.map((item: any) => ({
        id: item.id,
        title: this.getText(item.title),
        artist: item.artists?.[0]?.name || this.getText(header?.subtitle),
        album: this.getText(header?.title),
        albumId: albumId,
        duration: item.duration?.seconds || 0,
        thumbnailUrl: this.getThumbnail(header),
        trackNumber: this.getText(item.index),
      })) || [],
    }
  }

  async getArtist(artistId: string) {
    if (!this.innertube) throw new Error('YouTube service not initialized')
    
    const artist = await this.innertube.music.getArtist(artistId)
    const header = artist.header as any
    
    return {
      id: artistId,
      name: this.getText(header?.title),
      thumbnailUrl: this.getThumbnail(header),
      description: this.getText(header?.description),
      subscribers: this.getText(header?.subtitle),
      songs: this.findSection(artist.sections, 'Songs')?.contents?.map((item: any) => this.parseItem(item)) || [],
      albums: this.findSection(artist.sections, 'Albums')?.contents?.map((item: any) => this.parseItem(item)) || [],
      singles: this.findSection(artist.sections, 'Singles')?.contents?.map((item: any) => this.parseItem(item)) || [],
    }
  }

  async getPlaylist(playlistId: string) {
    if (!this.innertube) throw new Error('YouTube service not initialized')
    
    const playlist = await this.innertube.music.getPlaylist(playlistId)
    const header = playlist.header as any
    
    return {
      id: playlistId,
      title: this.getText(header?.title),
      author: this.getText(header?.subtitle),
      thumbnailUrl: this.getThumbnail(header),
      songCount: this.getText(header?.second_subtitle),
      songs: playlist.contents?.map((item: any) => ({
        id: item.id,
        title: this.getText(item.title),
        artist: item.artists?.[0]?.name || this.getText(item.author),
        artistId: item.artists?.[0]?.channel_id,
        album: item.album?.name,
        albumId: item.album?.id,
        duration: item.duration?.seconds || 0,
        thumbnailUrl: this.getThumbnail(item),
      })) || [],
    }
  }

  private parseItem(item: any) {
    return {
      id: item.id,
      type: item.item_type || 'song',
      title: this.getText(item.title),
      subtitle: this.getText(item.subtitle),
      thumbnailUrl: this.getThumbnail(item),
      artist: item.artists?.[0]?.name || this.getText(item.author),
      artistId: item.artists?.[0]?.channel_id,
      album: item.album?.name,
      albumId: item.album?.id,
      duration: item.duration?.seconds || 0,
    }
  }

  private getText(obj: any): string {
    if (!obj) return ''
    if (typeof obj === 'string') return obj
    if (obj.text) return obj.text
    if (obj.toString && typeof obj.toString === 'function') return obj.toString()
    return ''
  }

  private getThumbnail(item: any): string | undefined {
    if (!item) return undefined
    const thumbnails = item.thumbnail?.contents || item.thumbnails || item.thumbnail
    if (Array.isArray(thumbnails) && thumbnails.length > 0) {
      return thumbnails[0]?.url
    }
    if (thumbnails?.url) return thumbnails.url
    return undefined
  }

  private findSection(sections: any[], title: string) {
    return sections?.find((s: any) => this.getText(s.title) === title)
  }
}
