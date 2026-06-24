# Voice Command Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a practical voice command mode to the camera preview page.

**Architecture:** Add a small command parser module that maps recognized Chinese speech to command objects. Keep visual effects in the existing effects module, and let the app layer execute page controls such as screenshot, clear effects, caption visibility, and camera size. Show the last recognized command and execution result in the existing side panel.

**Tech Stack:** Browser SpeechRecognition, vanilla JavaScript ES modules, Node test runner.

---

### Task 1: Command Parser

**Files:**
- Create: `src/voice-commands.js`
- Test: `tests/voice-commands.test.js`

- [ ] Write failing tests for parsing `拍照`, `清空特效`, `显示字幕`, `隐藏字幕`, `放大摄像头`, `缩小摄像头`, and effect commands.
- [ ] Implement `parseVoiceCommand(text)` with whitespace-insensitive Chinese keyword matching.
- [ ] Run `node --test tests/voice-commands.test.js` and verify it passes.

### Task 2: App Integration

**Files:**
- Modify: `src/app.js`
- Modify: `index.html`
- Modify: `styles.css`
- Test: `tests/app.test.js`
- Test: `tests/styles.test.js`

- [ ] Add DOM hooks for last recognized command, command result, and snapshot preview.
- [ ] Execute voice commands from caption transcripts: effects, clear effects, hide/show subtitles, camera large/normal, and snapshot.
- [ ] Keep typed text commands working through the same effect path.
- [ ] Refresh query strings in `index.html` and `src/app.js` to avoid GitHub Pages cache.
- [ ] Run `node --test`.

### Task 3: Finish

**Files:**
- All modified files

- [ ] Inspect `git diff`.
- [ ] Run `node --test` fresh.
- [ ] Commit and push to `main`.
