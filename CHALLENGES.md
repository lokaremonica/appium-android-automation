# Challenges Log

Running log of real problems hit while building this framework, and how each was
diagnosed and fixed. Useful both as a record and as interview material — these are
genuine root-cause debugging stories, not hypotheticals.

---

### 1. Node/Java were installed as the wrong CPU architecture

**Symptom:** `node -v`, `npm -v`, `java -version` all failed with `Bad CPU type in
executable`.

**Diagnosis:** `uname -m` showed this Mac is Apple Silicon (arm64), but `file
$(which node)` showed an x86_64 (Intel) binary. Checked for Rosetta 2 (Apple's
x86→arm translator) with `arch -x86_64 /usr/bin/true` — it failed, confirming
Rosetta wasn't installed at all. So the x86_64 binaries had no way to run.

**Fix:** Installed native arm64 builds instead of installing Rosetta (faster,
no translation overhead): `brew install openjdk@17` and `brew install node@22`,
then linked them as the active versions and fixed `~/.zshrc` so a new terminal
picks up the right ones.

**Lesson:** Always check `uname -m` vs. `file $(which <tool>)` when you see
"bad CPU type" — it's almost always an architecture mismatch, not a corrupt
install.

---

### 2. `nvm`'s own Node installs were also broken, and shadowed the fix

**Symptom:** Even after installing a working Node via Homebrew, a fresh shell
sometimes still resolved to a broken x86_64 Node.

**Diagnosis:** `which -a node` showed multiple Node binaries on `PATH`, with
`nvm`'s (also corrupted, x86_64) version appearing *before* Homebrew's in PATH
order. `nvm`'s own shell hook was re-injecting its bin directory on every new
shell.

**Fix:** Pointed `nvm`'s default alias at the system Node instead of one of its
own version directories: `nvm alias default system`. Left the broken nvm
versions on disk untouched (not destructive), just stopped relying on them.

**Lesson:** "It's fixed" isn't verified until you test in a *fresh* shell —
env/version managers can silently re-break things on every new session.

---

### 3. First test run failed instantly — but the real cause was a leftover config change

**Symptom:** `npm test` failed immediately with a connection error to Appium.

**Diagnosis:** While debugging something else earlier, `services: []` had been
set in `wdio.conf.js` (disabling WebdriverIO's auto-start of the Appium server)
and never reverted. On top of that, a stale Appium process from earlier manual
testing was still holding the port.

**Fix:** Restored `services: ['appium', {...}]`, and killed the leftover
process squatting on port 4723.

**Lesson:** When debugging by temporarily disabling a piece of config, track
that change explicitly — it's easy to "fix" the original issue and leave a
decoy behind.

---

### 4. Session requests always failed with `ECONNREFUSED` — even though Appium was definitely running

**Symptom:** Appium logged that it started successfully and was listening, but
every single WebDriver session request from the test client got
`ECONNREFUSED`, no matter how many retries.

**Diagnosis:** Checked what Appium was told to bind to (`address: 'localhost'`)
vs. what the WebdriverIO client actually connects to
(`http://127.0.0.1:...`, hardcoded). On this Mac, the hostname `localhost`
resolves to the **IPv6** loopback (`::1`) first, so Appium ended up listening
only on IPv6 — while the client was always connecting via **IPv4**
(`127.0.0.1`). Two different network interfaces, so the connection was never
possible, regardless of timeouts or retry counts.

**Fix:** Changed the Appium service config to bind explicitly to
`address: '127.0.0.1'`, matching what the client uses.

**Lesson:** `localhost` and `127.0.0.1` are *not* guaranteed to be the same
address — IPv4/IPv6 resolution order is OS- and config-dependent. When a
client and server "should" be able to reach each other but can't, check which
literal address each side is actually using.

---

### 5. Session requests then failed with "Request timed out" instead

**Symptom:** After fixing #4, connections were accepted, but session creation
still failed — this time with a timeout, after many retries over ~80 seconds.

**Diagnosis:** An earlier debugging change had set `connectionRetryTimeout:
2000` (2 seconds) per request. But creating an Appium session involves
installing/launching the UiAutomator2 instrumentation on the device, which
genuinely takes several seconds — especially right after an emulator boot.
Every attempt was being killed and retried *before* it had a chance to finish,
so it looped forever without ever succeeding.

**Fix:** Set a realistic per-request timeout (`connectionRetryTimeout: 90000`)
with fewer retries (`connectionRetryCount: 2`) — give each attempt enough time
to actually finish instead of racing it.

**Lesson:** A timeout that's too short doesn't just fail fast — it can mask a
system that was about to succeed, and manifest as nondeterministic-looking
("flaky") failures that are actually a fixed, discoverable timing mismatch.
