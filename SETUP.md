# Appium + Android Setup Log

Environment: Apple Silicon (arm64) Mac, macOS (Darwin), zsh.

## 1. Fix the broken Node/Java toolchain

Problem found: `node`, `npm`, and `java` were x86_64 (Intel) binaries, but this Mac
is arm64 and has no Rosetta 2 installed, so every command failed with
`Bad CPU type in executable`.

```bash
# Confirm the arch mismatch
uname -m                          # arm64
file $(which node)                # was: Mach-O 64-bit executable x86_64
arch -x86_64 /usr/bin/true        # fails -> confirms Rosetta 2 isn't installed
```

Fix: install native arm64 Java and Node via Homebrew instead of installing Rosetta.

```bash
brew install openjdk@17                       # native arm64 JDK
brew install node@22                          # native arm64 Node LTS
brew unlink node                               # unlink whatever was linked before
brew link --overwrite node@22                  # make node@22 the active `node`/`npm`
```

Point nvm's "default" at the system node instead of one of its own (corrupted,
x86_64) version directories, so its auto-switch hook doesn't reintroduce the
broken binaries:

```bash
nvm alias default system
```

### `~/.zshrc` edits

- Replaced a hardcoded `export PATH="/usr/local/opt/openjdk@8/bin:$PATH"` (the broken
  Intel JDK 8) with:
  ```bash
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  export PATH="$JAVA_HOME/bin:$PATH"
  ```
- Added `/opt/homebrew/bin` and `/opt/homebrew/sbin` to the front of `PATH`, before
  nvm's init block, so Homebrew-managed tools win.
- Added Android SDK paths (see step 2).

These changes apply in any **new terminal window**.

## 2. Install the Android SDK + emulator

```bash
brew install --cask android-studio            # IDE (optional for CLI workflow, installed per your choice)
brew install --cask android-commandlinetools   # sdkmanager, avdmanager, adb, emulator
```

SDK root ends up at `/opt/homebrew/share/android-commandlinetools`.

```bash
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

yes | sdkmanager --licenses                    # accept all SDK licenses

sdkmanager \
  "platform-tools" \
  "platforms;android-34" \
  "system-images;android-34;google_apis;arm64-v8a" \
  "emulator"
```

Create and boot an emulator (AVD = Android Virtual Device):

```bash
avdmanager create avd \
  -n Pixel_6_API_34 \
  -k "system-images;android-34;google_apis;arm64-v8a" \
  -d pixel_6

emulator -avd Pixel_6_API_34 -no-snapshot -no-boot-anim &

adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 2; done
adb devices    # should list emulator-5554
```

Added to `~/.zshrc`:

```bash
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

## 3. Scaffold the Appium + WebdriverIO project

```bash
git init
npm init -y

npm install --save-dev \
  appium \
  @wdio/cli \
  @wdio/local-runner \
  @wdio/mocha-framework \
  @wdio/spec-reporter \
  @wdio/appium-service

npx appium driver install uiautomator2
```

Versions installed: `appium@3.9.0`, `appium-uiautomator2-driver@8.7.3` (the
uiautomator2 driver's latest release requires Appium `^4.0.0-beta.6`, which isn't
stable yet, so npm picked the newest version compatible with our 3.9.0 server).

## 4. Project files written

- `wdio.conf.js` — WebdriverIO config: capabilities (launches the device's built-in
  Settings app — no APK needed for the first test), framework (`mocha`), and
  connection-retry settings (bumped to `connectionRetryCount: 10` /
  `connectionRetryTimeout: 2000` because Appium takes a few seconds to finish
  starting up before it accepts connections).
- `test/specs/settings.spec.js` — first test: waits for a known element in the
  Settings app and asserts it's displayed.
- `.gitignore` — excludes `node_modules/` and `logs/`.

## Known rough edges

- `nvm`'s own installed Node versions (v18/20/22.21/24) are still on disk and still
  x86_64/corrupted — left untouched (not deleted), but avoid relying on `nvm use`
  for Node version switching in this project; the Homebrew `node@22` is the one
  that works.
- The Android SDK install here doesn't include Build Tools, so `aapt2` is missing
  — Appium logs a harmless warning about it when checking app "badging" info but
  falls back to another method.
- The emulator is memory-hungry; it can get killed by the OS under memory
  pressure and needs restarting (`emulator -avd Pixel_6_API_34 ...` from step 2).
