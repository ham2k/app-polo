# Issues

## Accessibility

* In Data File Settings, cannot dismiss the dialog.
"I could not double tap on the "Close modal” button to dismiss the screen. I used the VoiceOver two finger scrub gesture but should be able to double tap the button as well"




# General Package Maintenance Tasks


### Pressable Ripple on Android

See https://github.com/facebook/react-native/issues/52939
We work around this by using a simpler Pressable component on Android, as part of H2kPressable.



### Splash Screen

The existing package has been mostly abandoned, consider migrating to https://github.com/zoontek/react-native-bootsplash



### React Native Paper

There's a bug with Menu anchors that we're using a patch for.
See https://github.com/callstack/react-native-paper/issues/4763

There's a bug with Switch not updating immediately inside Portal.
See https://github.com/callstack/react-native-paper/issues/4789.
All Switches inside Dialogs should use code like
```
onValueChange={(v) => {
  dispatch(setSettings({ key: 'example', enabled: !v }))
  setTimeout(() => {
    dispatch(setSettings({ key: 'example', enabled: v }))
  }, 100)
}
```


### Android Edge-to-edge

The bottom nav bar is not fully transparent in Android.
To fix, we need to use https://github.com/kadiraydinli/react-native-system-navigation-bar



### React Native Config

This issue prevents us from updating to 1.5.9
https://github.com/lugg/react-native-config/issues/848



### React Native SQLite

Consider migrating to https://github.com/margelo/react-native-nitro-sqlite
or https://github.com/OP-Engineering/op-sqlite



-----

# SOTAMat

From AB6D - Brian

> Yes, you can easily integrate with SOTAMAT’s mobile app by using a “Deep Link”.  For example, this is the link that the SOTACAT hardware module for Elecraft radios uses:
> sotamat://api/v1?app=sotacat&appversion=2.1&returnpath=http%3A%2F%2Fsotacat.local%2F
> So you can follow that form and replace “sotacat” with “Ham2KLogger”, and replace the “returnpath” with the Deep-Link URL back into your application.
> There are other deep-link settings you can use but that API was designed for talking to a radio hardware module and not another application on the phone.  SOTAMAT has built-in GPS and auto-selection of SOTA Peak and POTA Park based on GPS so no big need to pass it a Peak ID or Park ID.
> You might want to integrate your Logging app with the SOTACAT / MAX-3B REST API and not just SOTAMAT.  Your logger can read the radio’s current VFO frequency and mode from the SOTACAT, and you can QSY the radio too.  The documentation is on:
> https://sotamat.com/sotacat  ß Overview
> https://github.com/SOTAmat/SOTAcat   ß source code showing how to talk with both SOTAMAT and SOTACAT
> https://www.ki6syd.com/max-3b-qrp-radio   ß Overview of Max Praglin’s radio that set the standard to which SOTACAT and SOTAMAT work with
> https://app.swaggerhub.com/apis-docs/KI6SYD_1/MAX-3B/1.0.2  ß Swagger REST API documentation.  The SOTACAT implements a portion of these API’s.  The page might be slow to load.



----

# Other components to consider adding

Locale settings
https://github.com/zoontek/react-native-localize

https://github.com/react-native-masked-view/masked-view
To add a gradient on the secondary exchange scroll area

https://github.com/ArturKalach/react-native-external-keyboard#readme
For better external keyboard support

