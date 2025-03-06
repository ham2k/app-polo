# React Native 0.78 Migration

- [ ] Deal with RNFetchBlob bugs
    File streaming causes crashes, but lack of file streaming causes memory issues.

    See https://github.com/RonRadtke/react-native-blob-util/issues/391

    Maybe we can stop using filestreaming, and use server-side preprocessing to split files into chunks?






