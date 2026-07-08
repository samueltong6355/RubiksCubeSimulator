# iOS Distribution

This project now targets iOS only. The application lives in `mobile/` and uses
React Native, Expo, TypeScript, and Node/npm tooling.

## Local iOS Development

```bash
brew install node
brew install watchman
sudo gem install cocoapods
cd mobile
npm ci
npm run typecheck
npm run ios
```

Xcode is required for local simulator and device builds. Open Xcode once and
install Command Line Tools plus an iOS Simulator before running `npm run ios`.

## iOS Builds

```bash
npm install -g eas-cli
cd mobile
eas login
eas init
npm run ios:simulator
npm run ios:preview
npm run ios:production
```

`ios:simulator` creates a simulator artifact, `ios:preview` creates an internal
device build, and `ios:production` creates a TestFlight/App Store archive.
Device and production builds require Apple Developer signing.
