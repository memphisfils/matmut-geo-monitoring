---
name: user_preferences
description: How this user likes to collaborate - terse responses, French speaker
type: user
---

## User Profile
- **Role**: Developer working on GEO Dashboard project
- **Language**: French (responds in French)
- **Communication style**: Prefers terse responses, no summaries at end

## Preferences
- **Responses**: Short and direct, lead with answer/action
- **Code style**: Avoid over-engineering, no premature abstractions
- **Commit style**: Bundle related changes in single commit, focus on "why" not "what"
- **Memory**: Keep memory updated after each session with key decisions and fixes

## What's Been Validated
- LLM timeout fix (`'think': False`) was validated - LLM now returns actual responses
- Neutral GEO_SYSTEM_PROMPT fixed 100% mention rate issue
- Multi-brand benchmark approach validated - all brands analyzed together on same prompts
- 5s delay (increased from 500ms) prevents race condition on results.json

## What to Avoid
- Don't add docstrings or comments to code that wasn't changed
- Don't create files unless absolutely necessary
- Don't use emojis unless explicitly requested
- Don't summarize what was just done - user can read the diff
