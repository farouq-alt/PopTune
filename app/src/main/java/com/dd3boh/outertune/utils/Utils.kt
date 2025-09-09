/*
 * Copyright (C) 2025 O​u​t​er​Tu​ne Project
 *
 * SPDX-License-Identifier: GPL-3.0
 *
 * For any other attributions, refer to the git commit history
 */

package com.dd3boh.outertune.utils

import com.dd3boh.outertune.constants.MAX_COIL_JOBS
import com.dd3boh.outertune.constants.MAX_LM_SCANNER_JOBS
import com.dd3boh.outertune.constants.MAX_YTM_SYNC_JOBS
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.newFixedThreadPoolContext


@OptIn(DelicateCoroutinesApi::class, ExperimentalCoroutinesApi::class)
val lmScannerCoroutine = newFixedThreadPoolContext(MAX_LM_SCANNER_JOBS + 4,"lm_scanner").limitedParallelism(MAX_LM_SCANNER_JOBS)
@OptIn(DelicateCoroutinesApi::class, ExperimentalCoroutinesApi::class)
val coilCoroutine = newFixedThreadPoolContext(MAX_COIL_JOBS,"coil_loader")
@OptIn(DelicateCoroutinesApi::class, ExperimentalCoroutinesApi::class)
val syncCoroutine = newFixedThreadPoolContext(MAX_YTM_SYNC_JOBS,"sync_utils")

fun reportException(throwable: Throwable) {
    throwable.printStackTrace()
}
