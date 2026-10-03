# Altaf Create Studio — V1

A real mobile-first Canva-style design editor foundation built with React + Fabric.js and packaged for Android with Capacitor.

## Working V1 features
- Touch move / resize / rotate objects
- Editable text
- Rectangle and circle shapes
- Photo upload
- Object fill color
- Canvas background color
- Layers list + forward/backward ordering
- Duplicate / delete
- Undo / redo history
- Canvas presets + custom dimensions
- Local project save
- PNG export
- JPG export
- Native Android share sheet for exported files
- AMOLED-first mobile UI

## Local web run
```bash
npm install
npm run dev
```

## Android build
```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

The APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

This branch intentionally contains only features that are implemented and usable. No fake AI buttons.
