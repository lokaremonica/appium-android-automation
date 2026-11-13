# Study Resources — Mobile Testing / QA Engineer Interview Prep

Curated for the Beast Industries (MrBeast) Quality Engineer hiring-manager round.
Prioritized for a ~3-day prep window — real, verified links, organized by priority.

## Must-do (highest ROI, short format)

**Appium** (what we're building hands-on — use this to reinforce it)
- [Mobile Automation with Appium in JavaScript](https://www.classcentral.com/course/tau-appium-javascript-tutorial-43748) — Test Automation University, ~1h22m, free, JS-based (matches our stack)

**CI/CD + flaky tests + SLOs** (direct JD match, text-based = fast to read)
- [CI/CD Interview Questions for QA Engineers](https://qajobfit.com/resources/cicd-interview-questions-for-qa)
- [Mobile QA Engineer Interview Questions](https://startup.jobs/interview-questions/mobile-quality-assurance-qa-engineer)
- [Top 40 QA Interview Questions and Answers](https://bugbug.io/blog/software-testing/qa-interview-questions/)

## Nice-to-have (conceptual breadth — enough to talk fluently without hands-on)

**Espresso (Android native)**
- [Android Testing Codelab](https://developer.android.com/codelabs/android-testing) — official Google codelab, covers unit/integration/Espresso together
- [Espresso for UI Testing](https://codelabs.developers.google.com/codelabs/android-training-espresso-for-ui-testing/) — shorter, Espresso-specific

**XCTest/XCUITest (iOS native)**
- [Introduction to iOS Test Automation with XCUITest](https://testautomationu.applitools.com/introduction-to-ios-test-automation-with-xcuitest/chapter1.html) — free TAU course, written + video chapters
- Skip the WWDC videos unless there's spare time — they're deep-dives, not intro material, and Xcode fluency isn't needed for a hiring-manager round

**General**
- [Test Automation University](https://testautomationu.applitools.com) — ~75 free short courses total (Selenium, Playwright, API testing, framework design) if there's time to browse more broadly

## How to spend the time

Given this is a hiring-manager round (likely more "tell me about X" than live coding),
weight it roughly:
- **~60%** continuing hands-on Appium work — real, specific stories beat memorized
  theory (e.g. the IPv4/IPv6 localhost-vs-127.0.0.1 bug in [CHALLENGES.md](./CHALLENGES.md)
  is a genuine root-cause debugging story)
- **~40%** reading the CI/CD / flaky-test / QA-interview-question links above, skimming
  the Espresso/XCTest codelabs just enough to describe how they conceptually differ
  from Appium (native/in-process/fast vs. cross-platform/black-box/WebDriver-based)

## Key concepts covered in this project

- **SLO (Service Level Objective)** — a target for a measured metric (SLI), e.g.
  "99.9% of sessions are crash-free over 28 days"
- **Error budget** — `100% - SLO`; the allowed amount of failure before the team
  halts new feature work to focus on reliability. Applies to flaky-test rates too
  (e.g. "no more than 2% of CI runs may fail for non-code reasons")
- **Page Object Model (POM)** — put selectors/interactions for a screen in one
  dedicated class, so a UI change only requires a fix in one place
- **Locator strategy ranking** — accessibility id > resource-id > XPath (fastest/most
  stable to slowest/most brittle)
- **Appium vs. Espresso vs. XCTest** — Appium is cross-platform, black-box, drives
  the app from outside via the WebDriver protocol (one API, multiple platforms,
  slower). Espresso (Android) and XCTest/XCUITest (iOS) are native, in-process,
  faster, but platform-specific and language-locked (Kotlin/Java vs. Swift/Obj-C)
