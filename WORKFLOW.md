<!-- managed:linked-repos -->
## Linked Repositories
- alexchong1985/PalletPro
<!-- /managed:linked-repos -->

# PalletPro Code Workflow

## Branch Strategy
- `main` — production-ready code
- Feature branches named `feat/<short-description>` for new work
- Direct pushes to `main` are allowed for initial setup and simple fixes

## Process
1. Engineer commits code to a feature branch and creates a PR
2. Lead reviews the PR and merges (squash) via `gh pr merge`
3. For initial push, engineer can push directly to `main`

## Deployment
- Static site hosted via GitHub Pages from `main` branch
- Any push to `main` triggers deployment