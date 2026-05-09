# Asset sources

SVG sources for app icons and splash. Convert them to the PNGs that
Expo expects (`assets/icon.png`, `adaptive-icon.png`, `splash.png`,
`notification-icon.png`) using the script below.

## Generate PNGs

```bash
cd assets/source
npm init -y
npm i -D sharp
node generate.js
```

This writes the converted files into `assets/`:

| Source                   | Output                    | Size       |
|--------------------------|---------------------------|------------|
| `icon.svg`               | `icon.png`                | 1024×1024  |
| `adaptive-icon.svg`      | `adaptive-icon.png`       | 1024×1024  |
| `splash.svg`             | `splash.png`              | 1284×2778  |
| `notification-icon.svg`  | `notification-icon.png`   | 96×96      |

After conversion, run `npx expo-doctor` to verify Expo accepts the assets.

## Replacing with real branded assets

Drop your designer's SVGs into this folder with the same filenames and
re-run `node generate.js`. Or generate the PNGs by other means (Figma export,
Photoshop, etc.) and place them directly in `assets/`.
