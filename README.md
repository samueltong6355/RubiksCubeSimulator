# Rubik's BLD Trainer

iOS-only Rubik's Cube blindfold trainer built with React Native, Expo, and
TypeScript.

## Features

- Touch-rotatable 3D cube render.
- Brush and face-fill sticker coloring with center stickers locked.
- Speffz labels for blindfold methods.
- Old Pochmann, M2, and 3-cycle memo/execution views.
- Kociemba two-phase solve mode for valid full-cube states.

## Requirements

- Node `22.11.0` or newer in the Node 22 LTS line.
- npm.
- Xcode with an installed iOS Simulator.
- CocoaPods for local native iOS builds.

## Run Locally

```bash
nvm use
cd mobile
npm ci
npm run typecheck
npm run ios
```

See `mobile/README.md` for full iOS setup and EAS build commands.

## Publication Notes

This repository intentionally excludes generated local folders such as
`mobile/node_modules/`, `mobile/.expo/`, and `mobile/ios/`. The committed source
and `mobile/package-lock.json` are enough to reproduce the app with `npm ci`.

No open-source license has been selected yet. Add a `LICENSE` file before making
the repository public if you want other people to have explicit reuse rights.

Third-party solver code is documented in `THIRD_PARTY_NOTICES.md`.
