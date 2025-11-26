# Shared Packages

This directory contains shared packages used across multiple apps in the monorepo.

## Future Packages

Consider creating:

- `@exchange/types` - Shared TypeScript types
- `@exchange/ui` - Shared UI components
- `@exchange/utils` - Shared utility functions
- `@exchange/config` - Shared configuration
- `@exchange/eslint-config` - Shared ESLint config
- `@exchange/tsconfig` - Shared TypeScript config

## Creating a New Package

```bash
mkdir packages/package-name
cd packages/package-name
bun init -y
```

Update the package name to use the workspace scope:

```json
{
  "name": "@exchange/package-name",
  "private": true,
  "version": "0.0.0"
}
```
