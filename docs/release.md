# Release Checklist

This document covers the unified release workflow for stable and nightly desktop releases.

## What the workflow does

- Workflow: `.github/workflows/release.yml`
- Triggers:
  - push tag matching `v*.*.*` for stable releases
  - scheduled nightly at `09:00 UTC`
  - manual `workflow_dispatch` for either channel
- Runs quality gates first: lint, typecheck, test.
- Builds one desktop artifact for both channels:
  - macOS `arm64` DMG
- Publishes one GitHub Release with the produced macOS files.
  - Stable release tags must use three-part semver core versions.
  - Fork patch releases should use the form `X.Y.Z-t3.N` (for example `0.0.21-t3.1`).
  - Generic semver prerelease tags (for example `1.2.3-alpha.1`) are published as GitHub prereleases.
  - Plain stable `X.Y.Z` releases and fork patch `X.Y.Z-t3.N` releases are marked as the repository's latest release.
  - Nightly runs are always GitHub prereleases and never marked latest.
  - Automatically generated release notes are pinned to the previous tag in the same channel, so stable compares to the previous stable tag and nightly compares to the previous nightly tag.
- Includes Electron auto-update metadata (for example `latest*.yml`, `nightly*.yml`, and `*.blockmap`) in release assets.
- Signing is optional and auto-detected per platform from secrets.

## Nightly builds

- Workflow: `.github/workflows/release.yml`
- Triggers:
  - scheduled every day at `09:00 UTC`
  - manual `workflow_dispatch` with `channel=nightly`
- Runs the same desktop quality gates and macOS arm64 artifact build as the tagged release flow.
- Publishes a GitHub prerelease only:
  - tag format: `nightly-vX.Y.Z-nightly.YYYYMMDD.<run_number>`
  - release name includes the short commit SHA
  - `make_latest` is always `false`
- Uses the next stable patch version as the nightly base. For example, `0.0.17` produces nightlies on `0.0.18-nightly.*`.
- Publishes Electron auto-update metadata to the dedicated `nightly` updater channel, so desktop users can opt into that track independently from stable.
- Does not commit version bumps back to `main`.

## Desktop auto-update notes

- Runtime updater: `electron-updater` in `apps/desktop/src/main.ts`.
- Update UX:
  - Background checks run on startup delay + interval.
  - No automatic download or install.
  - The desktop UI shows a rocket update button when an update is available; click once to download, click again after download to restart/install.
- Provider: GitHub Releases (`provider: github`) configured at build time.
- Repository slug source:
  - `T3CODE_DESKTOP_UPDATE_REPOSITORY` (format `owner/repo`), if set.
  - otherwise `GITHUB_REPOSITORY` from GitHub Actions.
- Temporary private-repo auth workaround:
  - set `T3CODE_DESKTOP_UPDATE_GITHUB_TOKEN` (or `GH_TOKEN`) in the desktop app runtime environment.
  - the app forwards it as an `Authorization: Bearer <token>` request header for updater HTTP calls.
- Required release assets for updater:
  - platform installers (`.exe`, `.dmg`, `.AppImage`, plus macOS `.zip` for Squirrel.Mac update payloads)
  - channel metadata: `latest*.yml` for stable releases, `nightly*.yml` for nightly releases
  - `*.blockmap` files (used for differential downloads)
- macOS metadata note:
  - `electron-updater` reads `latest-mac.yml` on stable and `nightly-mac.yml` on nightly.
  - The release workflow publishes the arm64 mac manifest directly because it no longer builds multiple mac architectures.

## Stable versioning

- Desktop packaging must use semver-safe app versions because electron-builder normalizes the package `version`.
- Do not use four-part numeric stable versions like `0.0.20.3`; electron-builder rewrites them into malformed filenames and update metadata.
- When shipping fork-only patches on top of an upstream base release, use `X.Y.Z-t3.N`.
  - Example: if upstream has `0.0.20` and this repo needs two fork-only follow-up releases before rebasing, tag them `v0.0.21-t3.1` and `v0.0.21-t3.2`.
  - After rebasing to upstream `0.0.21`, start the next fork patch line at `v0.0.22-t3.1`.
- These `-t3.N` tags still publish to the desktop `latest` update channel and are treated as normal stable releases by this workflow.

## 0) Dry-run release without signing

Use this first to validate the release pipeline.

1. Confirm no signing secrets are required for this test.
2. Create a test tag:
   - `git tag v0.0.0-test.1`
   - `git push origin v0.0.0-test.1`
3. Wait for `.github/workflows/release.yml` to finish.
4. Verify the GitHub Release contains the expected macOS artifacts.
5. Download the artifacts and sanity-check installation on Apple Silicon macOS.

## 1) Apple signing + notarization setup (macOS)

Required secrets used by the workflow:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`
- `APPLE_API_KEY`
- `APPLE_API_KEY_ID`
- `APPLE_API_ISSUER`

Checklist:

1. Apple Developer account access:
   - Team has rights to create Developer ID certificates.
2. Create `Developer ID Application` certificate.
3. Export certificate + private key as `.p12` from Keychain.
4. Base64-encode the `.p12` and store as `CSC_LINK`.
5. Store the `.p12` export password as `CSC_KEY_PASSWORD`.
6. In App Store Connect, create an API key (Team key).
7. Add API key values:
   - `APPLE_API_KEY`: contents of the downloaded `.p8`
   - `APPLE_API_KEY_ID`: Key ID
   - `APPLE_API_ISSUER`: Issuer ID
8. Re-run a tag release and confirm macOS artifacts are signed/notarized.

Notes:

- `APPLE_API_KEY` is stored as raw key text in secrets.
- The workflow writes it to a temporary `AuthKey_<id>.p8` file at runtime.

## 2) Ongoing release checklist

1. Ensure `main` is green in CI.
2. Bump app version as needed.
3. Create release tag: `vX.Y.Z` or `vX.Y.Z-t3.N`.
4. Push tag.
5. Verify workflow steps:
   - preflight passes
   - macOS arm64 build passes
   - release job uploads expected files
6. Smoke test downloaded artifacts on Apple Silicon macOS.

## 3) Troubleshooting

- macOS build unsigned when expected signed:
  - Check all Apple secrets are populated and non-empty.
- Build fails with signing error:
  - Retry with secrets removed to confirm unsigned path still works.
  - Re-check Apple certificate and notarization credentials.
