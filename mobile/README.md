# Rubik's BLD Trainer Mobile

This directory contains the iOS-only React Native port. It uses Expo,
TypeScript, React Native SVG for the touch-rotatable cube, and a vendored
MIT-licensed `cubejs` solver for the JavaScript Kociemba two-phase solve mode.

## iOS Setup

Install the native build prerequisites on macOS:

```bash
brew install node
brew install watchman
sudo gem install cocoapods
```

Install Xcode from the Mac App Store, then open Xcode once and install the
Command Line Tools and at least one iOS Simulator from Xcode Settings.

This repo includes a top-level `.nvmrc`; use Node 22 for the most predictable
Expo/React Native tooling behavior.

## Run Locally

```bash
cd mobile
npm ci
npm run typecheck
npm run ios
```

For a physical iPhone:

```bash
cd mobile
npm run ios:device
```

## Build Downloadable iOS Artifacts

Expo Application Services can build a simulator app, internal device build, or
production archive:

```bash
npm install -g eas-cli
cd mobile
eas login
eas init
npm run ios:simulator
npm run ios:preview
npm run ios:production
```

Use `ios:simulator` for an `.app` simulator artifact, `ios:preview` for an
internal device install, and `ios:production` for TestFlight/App Store
submission. Device and App Store builds require Apple Developer signing.

## Current Port

- 3D touch-rotatable cube view with mobile-style inverted drag controls.
- Brush and face-fill color editing with center stickers locked.
- Speffz labels on sticker pieces when a blind method is selected.
- Old Pochmann, M2, and 3-cycle memo plus execution output.
- Setup, core, undo, and parity algorithms are visually separated.
- Kociemba two-phase solving through vendored `cubejs` code for valid full-cube
  states.
