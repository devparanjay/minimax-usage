# Changelog

All notable user-facing changes to this project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-06-03

The first public release. See the [README](https://github.com/devparanjay/minimax-usage#readme) for the full feature list and setup steps.

### Added

- A VSCode status bar entry that shows your live MiniMax Token Plan usage (5-Hour Limit and Weekly Limit).
- A click-to-open modal with full progress bars, "Resets in" countdowns, and "Quota used" percentages.
- Optional display of your Credits Balance alongside the Token Plan data.
- A region picker for overseas and Mainland China subscribers; a wrong region surfaces as "Sign in" rather than a silent failure.
- Subscription Key storage in VSCode's `SecretStorage` (encrypted at rest); the key never leaves your machine.
- A "no silent cookie fallback" rule for the credits endpoint: if the platform's programmatic credits endpoint is unavailable, the modal surfaces a clear "Credits Balance unavailable" placeholder rather than silently hiding the failure.
- A "Star on GitHub" callout in the README so the project can be discovered.

### Privacy

- No telemetry, no analytics, no crash reporting. The extension does not phone home.
- The Subscription Key is held in VSCode's `SecretStorage`; the only network request is the `Authorization: Bearer <key>` request to the MiniMax platform.
