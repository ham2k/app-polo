# General Package Maintenance Tasks


### React Native Share

Versions 12.1.1 and later remove `root-path` from file sharing https://github.com/react-native-share/react-native-share/pull/1680
This seems to break our file exports. We probably need to implement a [custom File Provider](https://react-native-share.github.io/react-native-share/docs/install#adding-your-implementation-of-fileprovider)


### Mapbox

There's a bug that prevents compilation with the latest versions. It's fixed using `patch-package` and a custom patch.

The actual fix is supposed to have been merged in the upcoming 10.1.42 version, but it's not available yet.



### Splash Screen

The existing package has been mostly abandoned, consider migrating to https://github.com/zoontek/react-native-bootsplash



### React Native Vector Icons

They split the package into multiple packages. Also, we should change how PaperIcon is defined in App to allow
for other icon sets, instead of the current implementation in Ham2kIcon

https://github.com/oblador/react-native-vector-icons/blob/master/MIGRATION.md


### React Native Paper

There's a bug with Menu anchors that we're using a patch for.
See https://github.com/callstack/react-native-paper/issues/4763
