# Repository Context

**IMPORTANT**: This repository contains a deprecated `old-app/` directory that should be IGNORED by agents.

## Active Content

Only work with these files in the root directory:
- `index.html` - Main site page
- `privacy-policy.html` - Privacy policy page
- `terms-of-service.html` - Terms of service page
- `assets/` - Site assets (icons, logos, favicon, etc.)

## Deprecated Content

The `old-app/` directory is **NOT ACTIVE** and should be ignored:
- Contains an old PWA writing application
- Has its own build system (builder.mjs, dev-server.mjs)
- Uses Node.js dependencies (pug, stylus, etc.)
- **Do NOT attempt to build, modify, or analyze old-app/**
