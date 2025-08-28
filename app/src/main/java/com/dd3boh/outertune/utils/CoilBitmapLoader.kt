/*
 * Copyright (C) 2024 z-huang/InnerTune
 * Copyright (C) 2025 O⁠ute⁠rTu⁠ne Project
 *
 * SPDX-License-Identifier: GPL-3.0
 *
 * For any other attributions, refer to the git commit history
 */

package com.dd3boh.outertune.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import androidx.media3.common.util.BitmapLoader
import coil3.ImageLoader
import coil3.asImage
import coil3.decode.DataSource
import coil3.fetch.FetchResult
import coil3.fetch.Fetcher
import coil3.fetch.ImageFetchResult
import coil3.imageLoader
import coil3.request.CachePolicy
import coil3.request.ErrorResult
import coil3.request.ImageRequest
import coil3.request.ImageResult
import coil3.request.Options
import coil3.request.allowHardware
import coil3.toBitmap
import com.dd3boh.outertune.R
import com.google.common.util.concurrent.ListenableFuture
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.guava.future
import java.util.concurrent.ExecutionException
import javax.inject.Inject
import kotlin.math.min
import kotlin.toString

class CoilBitmapLoader @Inject constructor(
    private val context: Context,
    private val scope: CoroutineScope,
    private val data: LocalArtworkPath = LocalArtworkPath(null),
) : Fetcher, BitmapLoader {

    override fun supportsMimeType(mimeType: String): Boolean {
        return mimeType.startsWith("image/")
    }

    override fun decodeBitmap(data: ByteArray): ListenableFuture<Bitmap> =
        scope.future(Dispatchers.IO) {
            BitmapFactory.decodeByteArray(data, 0, data.size) ?: drawPlaceholder(context)
        }

    override fun loadBitmap(uri: Uri): ListenableFuture<Bitmap> =
        scope.future(Dispatchers.IO) {
            try {
                // local images
                val result = if (uri.toString().startsWith("/storage/")) {
                    context.imageLoader.execute(
                        ImageRequest.Builder(context)
                            .data(LocalArtworkPath(uri.toString()))
                            .allowHardware(Build.VERSION.SDK_INT >= Build.VERSION_CODES.P)
                            .diskCachePolicy(CachePolicy.DISABLED)
                            .build()
                    )
                } else {
                    context.imageLoader.execute(
                        ImageRequest.Builder(context)
                            .data(uri)
                            .allowHardware(Build.VERSION.SDK_INT >= Build.VERSION_CODES.P)
                            .build()
                    )
                }
                if (result is ErrorResult) {
                    reportException(ExecutionException(result.throwable))
                    return@future drawPlaceholder(context)
                }

                result.image!!.toBitmap()
            } catch (e: Exception) {
                reportException(ExecutionException(e))
                return@future drawPlaceholder(context)
            }
        }

    fun loadBitmapOrNull(uri: Uri): ListenableFuture<Bitmap?> =
        scope.future(Dispatchers.IO) {
            try {
                // local images
                val result = if (uri.toString().startsWith("/storage/")) {
                    context.imageLoader.execute(
                        ImageRequest.Builder(context)
                            .data(LocalArtworkPath(uri.toString()))
                            .allowHardware(Build.VERSION.SDK_INT >= Build.VERSION_CODES.P)
                            .diskCachePolicy(CachePolicy.DISABLED)
                            .build()
                    )
                } else {
                    context.imageLoader.execute(
                        ImageRequest.Builder(context)
                            .data(uri)
                            .allowHardware(Build.VERSION.SDK_INT >= Build.VERSION_CODES.P)
                            .build()
                    )
                }
                if (result is ErrorResult) {
                    reportException(ExecutionException(result.throwable))
                    return@future null
                }

                result.image!!.toBitmap()
            } catch (e: Exception) {
                reportException(ExecutionException(e))
                return@future null
            }
        }

    override suspend fun fetch(): FetchResult? {
        return try {
            if (data.path?.startsWith("/storage/") == true) {
                val mData = MediaMetadataRetriever()
                val image: Bitmap = try {
                    mData.setDataSource(data.path)
                    val art = mData.embeddedPicture
                    BitmapFactory.decodeByteArray(art, 0, art!!.size)
                } catch (e: Exception) {
                    drawPlaceholder(context)
                } ?: drawPlaceholder(context)

                ImageFetchResult(
                    image = image.asImage(),
                    isSampled = false,
                    dataSource = DataSource.DISK
                )
            } else {
                null
            }
        } catch (e: Exception) {
            reportException(e)
            ImageFetchResult(
                image = drawPlaceholder(context).asImage(),
                isSampled = false,
                dataSource = DataSource.MEMORY
            )
        }
    }

    companion object {
        // TODO: re eval dimens after a few months
        /**
         * Draw a centered square app icon with the maximum possible size while maintaining aspect ratio.
         *
         * @param context
         * @param x Desired final x dimension
         * @param y Desired final y dimension
         * @param size Percentage size of valid draw frame. Must be a value between 0.0 and 1.0. For example, 0.8
         *      means that inner frame should be 80% of the size of the final frame, and centered within that frame.
         */
        fun drawPlaceholder(context: Context, x: Int = 2000, y: Int = 2000, size: Float = 0.8f): Bitmap {
            val padding = size.coerceIn(0f, 1f)
            val innerRecWidth = x * padding
            val innerRecHeight = y * padding

            val squareLength = min(innerRecWidth, innerRecHeight).toInt()
            val squareLeft = ((x - squareLength) / 2)
            val squareTop = ((y - squareLength) / 2)

            val drawable: Drawable? = ContextCompat.getDrawable(context, R.drawable.placeholder_icon)
            val bitmap = Bitmap.createBitmap(x, y, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)

            drawable?.setBounds(squareLeft, squareTop, squareLeft + squareLength, squareTop + squareLength)
            drawable?.draw(canvas)
            return bitmap
        }
    }

    class Factory(
        private val context: Context,
    ) : Fetcher.Factory<LocalArtworkPath> {
        override fun create(data: LocalArtworkPath, options: Options, imageLoader: ImageLoader): Fetcher? {
            println("asshole are you fucking " + data.toString())
            return CoilBitmapLoader(context, CoroutineScope(Dispatchers.IO), data)
        }
    }
}

data class LocalArtworkPath(val path: String?)
