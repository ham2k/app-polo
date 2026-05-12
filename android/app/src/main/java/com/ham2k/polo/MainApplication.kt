package com.ham2k.polo

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

import cl.json.ShareApplication

class MainApplication : Application(), ReactApplication, ShareApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages
    )
  }

  override fun getFileProviderAuthority(): String = "$packageName.provider"

  override fun onCreate() {
    super.onCreate()

    loadReactNative(this)
  }
}
