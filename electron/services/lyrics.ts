export class LyricsService {
  private readonly LRCLIB_API = 'https://lrclib.net/api'

  async getLyrics(title: string, artist: string, duration: number): Promise<LyricsResult | null> {
    // Try LrcLib first
    const lrcLibResult = await this.getLrcLibLyrics(title, artist, duration)
    if (lrcLibResult) return lrcLibResult

    // Fallback to search
    const searchResult = await this.searchLrcLib(title, artist)
    if (searchResult) return searchResult

    return null
  }

  private async getLrcLibLyrics(title: string, artist: string, duration: number): Promise<LyricsResult | null> {
    try {
      const params = new URLSearchParams({
        track_name: title,
        artist_name: artist,
        duration: duration.toString(),
      })

      const response = await fetch(`${this.LRCLIB_API}/get?${params}`)
      
      if (!response.ok) return null

      const data = await response.json() as any

      if (data.syncedLyrics || data.plainLyrics) {
        return {
          synced: data.syncedLyrics || null,
          plain: data.plainLyrics || null,
          source: 'lrclib',
        }
      }

      return null
    } catch (err) {
      console.error('LrcLib error:', err)
      return null
    }
  }

  private async searchLrcLib(title: string, artist: string): Promise<LyricsResult | null> {
    try {
      const params = new URLSearchParams({
        q: `${title} ${artist}`,
      })

      const response = await fetch(`${this.LRCLIB_API}/search?${params}`)
      
      if (!response.ok) return null

      const results = await response.json() as any[]

      if (results && results.length > 0) {
        const best = results[0]
        return {
          synced: best.syncedLyrics || null,
          plain: best.plainLyrics || null,
          source: 'lrclib',
        }
      }

      return null
    } catch (err) {
      console.error('LrcLib search error:', err)
      return null
    }
  }

  parseSyncedLyrics(syncedLyrics: string): LyricLine[] {
    const lines: LyricLine[] = []
    const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g
    let match

    while ((match = regex.exec(syncedLyrics)) !== null) {
      const minutes = parseInt(match[1])
      const seconds = parseInt(match[2])
      const milliseconds = parseInt(match[3].padEnd(3, '0'))
      const time = minutes * 60 + seconds + milliseconds / 1000
      const text = match[4].trim()

      if (text) {
        lines.push({ time, text })
      }
    }

    return lines.sort((a, b) => a.time - b.time)
  }
}

export interface LyricsResult {
  synced: string | null
  plain: string | null
  source: string
}

export interface LyricLine {
  time: number
  text: string
}
