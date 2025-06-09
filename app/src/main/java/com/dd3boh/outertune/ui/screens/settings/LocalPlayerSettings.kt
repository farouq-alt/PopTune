/*
 * Copyright (C) 2025 OuterTune Project
 *
 * SPDX-License-Identifier: GPL-3.0
 *
 * For any other attributions, refer to the git commit history
 */

package com.dd3boh.outertune.ui.screens.settings

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Autorenew
import androidx.compose.material.icons.rounded.SdCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarScrollBehavior
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavController
import com.dd3boh.outertune.LocalPlayerAwareWindowInsets
import com.dd3boh.outertune.R
import com.dd3boh.outertune.constants.AutomaticScannerKey
import com.dd3boh.outertune.constants.DEFAULT_ENABLED_TABS
import com.dd3boh.outertune.constants.EnabledTabsKey
import com.dd3boh.outertune.constants.LocalLibraryEnableKey
import com.dd3boh.outertune.constants.TopBarInsets
import com.dd3boh.outertune.ui.component.IconButton
import com.dd3boh.outertune.ui.component.PreferenceGroupTitle
import com.dd3boh.outertune.ui.component.SwitchPreference
import com.dd3boh.outertune.ui.screens.settings.fragments.LocalScannerExtraFrag
import com.dd3boh.outertune.ui.screens.settings.fragments.LocalScannerFrag
import com.dd3boh.outertune.ui.utils.backToMain
import com.dd3boh.outertune.utils.rememberPreference


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocalPlayerSettings(
    navController: NavController,
    scrollBehavior: TopAppBarScrollBehavior,
) {
    val (autoScan, onAutoScanChange) = rememberPreference(AutomaticScannerKey, defaultValue = false)
    val (enabledTabs, onEnabledTabsChange) = rememberPreference(EnabledTabsKey, defaultValue = DEFAULT_ENABLED_TABS)
    val (localLibEnable, onLocalLibEnableChange) = rememberPreference(LocalLibraryEnableKey, defaultValue = true)

    LaunchedEffect(localLibEnable) {
        val containsFolders = enabledTabs.contains('F')
        if (localLibEnable && !containsFolders) {
            onEnabledTabsChange(enabledTabs + "F")
        } else if (!localLibEnable && containsFolders) {
            onEnabledTabsChange(enabledTabs.filterNot { it == 'F' })
        }
    }

    Column(
        Modifier
            .windowInsetsPadding(LocalPlayerAwareWindowInsets.current)
            .verticalScroll(rememberScrollState())
    ) {
        SwitchPreference(
            title = { Text(stringResource(R.string.local_library_enable_title)) },
            description = stringResource(R.string.local_library_enable_description),
            icon = { Icon(Icons.Rounded.SdCard, null) },
            checked = localLibEnable,
            onCheckedChange = onLocalLibEnableChange
        )

        AnimatedVisibility(localLibEnable) {

            // automatic scanner
            SwitchPreference(
                title = { Text(stringResource(R.string.auto_scanner_title)) },
                description = stringResource(R.string.auto_scanner_description),
                icon = { Icon(Icons.Rounded.Autorenew, null) },
                checked = autoScan,
                onCheckedChange = onAutoScanChange
            )

            PreferenceGroupTitle(
                title = stringResource(R.string.grp_manual_scanner)
            )
            LocalScannerFrag()

            PreferenceGroupTitle(
                title = stringResource(R.string.grp_extra_scanner_settings)
            )
            LocalScannerExtraFrag()
        }
    }

    TopAppBar(
        title = { Text(stringResource(R.string.local_player_settings_title)) },
        navigationIcon = {
            IconButton(
                onClick = navController::navigateUp,
                onLongClick = navController::backToMain
            ) {
                Icon(
                    Icons.AutoMirrored.Rounded.ArrowBack,
                    contentDescription = null
                )
            }
        },
        windowInsets = TopBarInsets,
        scrollBehavior = scrollBehavior
    )
}
