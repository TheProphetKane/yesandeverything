# Domain Lens: PWA / 01 install and offline

## The question

Is the PWA actually installable on iOS + Android? Does it work meaningfully offline (the disc-golf use case demands course access without signal)?

## What to look at

- The web manifest. icons[] complete? start_url correct? display: standalone?
- Service worker presence and registration. Does it actually cache the bundle + the course data?
- iOS/Android meta tags. Apple touch icon at the right sizes?
- The 12MB course_data.json: cached? Available offline?
- Test: install, airplane mode, open app, start a round. Does it work?

## Severity grading

- **HIGH**: Install fails on a target OS, OR offline launch fails the first action a user would take.
- **MEDIUM**: Install works but a feature the user expects (course detail map) needs network unexpectedly.
- **LOW**: Cosmetic install banner timing; icon at one specific size off.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Install + offline
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
