package io.github.anilbeesetti.nextlib.media3ext.ffdecoder

import android.content.Context
import androidx.media3.common.audio.SonicAudioProcessor
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.audio.AudioSink
import androidx.media3.exoplayer.audio.DefaultAudioOffloadSupportProvider
import androidx.media3.exoplayer.audio.DefaultAudioSink
import androidx.media3.exoplayer.audio.SilenceSkippingAudioProcessor
import com.dd3boh.outertune.playback.OtOffloadSupportProvider

/**
 * Dud class. This should never be used.
 */
open class NextRenderersFactory(context: Context) : DefaultRenderersFactory(context) {
    init {
        throw NotImplementedError("Dud class. This should never be used.")
    }
}

class FfmpegLibrary() {
    companion object {
        fun isAvailable() = false
        fun getVersion(): String = "N/A"
    }
}
