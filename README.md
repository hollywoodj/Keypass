# Keypass

Keypass is a local-first 1Password clone for **macOS** and **iOS**. It covers the 1Password 8 app: lock and unlock, vaults, item categories, search, favorites, tags, Watchtower, the password generator, Quick Access, and archive / recently deleted.

The vault is encrypted on device with your account password and Secret Key. There is no cloud sync, browser fill, or sharing — those are outside the 1Password app itself.

## Run

```bash
npm install
npm start
```

On a Mac, press `i` in the Expo terminal for the iOS Simulator, or scan the QR code with Expo Go. Press `w` for the web preview used by the desktop shell.

```bash
npm run ios
npm run web
npm run typecheck
npm test
```

## macOS app

```bash
npm run electron:dev      # development
npm run electron:build:mac
```

Installers are written to `release/`.

Every push to `main` automatically cuts the next patch release and publishes a macOS `.dmg` on [GitHub Releases](https://github.com/hollywoodj/Keypass/releases). Include `[skip release]` in a commit message to skip. A specific version can be published from **Actions → Release → Run workflow**.

## What is in the app

| 1Password surface | Keypass |
| --- | --- |
| Unlock with account password | ✅ |
| Emergency Kit / Secret Key | ✅ |
| All Items, Favorites, categories, tags, vaults | ✅ |
| Login, Secure Note, Card, Identity, and the rest of the item categories | ✅ |
| One-time passwords | ✅ |
| Watchtower (weak, reused, HTTP, 2FA, expiry) | ✅ |
| Password / memorable / PIN generator | ✅ |
| Quick Access (`⇧⌘Space`) | ✅ |
| Archive and Recently Deleted | ✅ |
| Light / Dark / System appearance | ✅ |
| Auto-lock | ✅ |
| iOS Home, Items, Search, Watchtower tabs | ✅ |
| Browser Autofill / extensions | not in the app |
| Account sharing / sync | not in the app |

## Shortcuts (Mac)

| Shortcut | Action |
| --- | --- |
| ⌘N | New Item |
| ⌘E | Edit |
| ⌘S | Save |
| ⌘F | Search |
| ⌘C | Copy username |
| ⇧⌘C | Copy password |
| ⌥⌘C | Copy one-time password |
| ⌘R | Reveal secure fields |
| ⇧⌘L | Lock |
| ⇧⌘Space | Quick Access |
| ⇧⌘D | Show or hide sidebar |
| ⌘, | Settings |

Encrypted data is stored in the app’s local storage. If you forget the account password, the vault cannot be recovered.
