# Project Memory Configuration

This project uses Zep Cloud. Configuration is in `.project-context`.

## Startup Procedure

1. Read `.project-context` to get `ZEP_PROJECT_SESSION`
2. Use `zep_get_memory` with that session to load project facts
3. Acknowledge loaded context

## Memory Rules

**Project-specific facts:**
- Use `zep_store_memory` with session from `.project-context`
- Use `zep_search_memory` with session from `.project-context`

**Global knowledge:**
- Use `zep_store_memory` with session `global`
- Use `zep_search_memory` with session `global`