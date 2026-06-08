# Website improvements catalog (2026-06-08)

Scope: `index.html` (landing) plus the hand-authored sub-pages. Constraint honored: vanilla, self-contained, no framework, no external scripts, no build step. All new motion respects `prefers-reduced-motion`.

Status legend: `[x]` shipped to `index.html` this pass and verified in Chrome (desktop, zero console errors). `[ ]` proposed, prioritized backlog.

## A. Shipped this pass (landing page)

### Navigation
1. `[x]` Sticky glass top nav that slides in once the hero scrolls away.
2. `[x]` Brand mark in nav (animated ampersand) linking back to top.
3. `[x]` Section links in nav generated from the section labels (about, projects, notice).
4. `[x]` Scrollspy: the active section link highlights as you scroll (IntersectionObserver, -45/-50 rootMargin).
5. `[x]` Smooth in-page scrolling for every nav and brand link.
6. `[x]` Nav auto-hides over the hero so it never competes with the masthead.
7. `[x]` Nav collapses to brand + search on narrow screens.
8. `[x]` Search button in nav with platform-aware shortcut hint (Cmd on macOS, Ctrl elsewhere).

### Command palette
9. `[x]` Cmd/Ctrl-K command palette overlay (glass, blurred backdrop).
10. `[x]` Fuzzy substring filter over sections and all six projects.
11. `[x]` Keyboard driven: arrow up/down to move, Enter to go, Esc to close.
12. `[x]` Mouse support: hover to select, click to jump.
13. `[x]` Type icons and category meta per row (section vs project).
14. `[x]` Selected row auto-scrolls into view in a long list.
15. `[x]` Backdrop click closes; toggle re-press of Cmd-K closes.
16. `[x]` Opens from the nav Search button as well as the shortcut.
17. `[x]` Empty-state message when no result matches.

### Project filtering
18. `[x]` Filter chip row above the grid (All, Live, In build, Games, Tools).
19. `[x]` Live counts per chip computed from the cards.
20. `[x]` Categories derived from each card's badge and status (no hardcoding).
21. `[x]` `aria-pressed` state on the active chip.
22. `[x]` Chips reachable and operable by keyboard with visible focus ring.

### Bento + glass
23. `[x]` Two-column bento grid for projects at >=760px (was a single column).
24. `[x]` Feature cards (Here Be Hordes, Budget) span the full width for rhythm.
25. `[x]` Glassmorphism on cards: translucent fill + backdrop blur over the live background.
26. `[x]` Grid collapses cleanly to one column below 760px.

### Hero / kinetic type
27. `[x]` Animated gradient shimmer on the hero ampersand (kinetic accent).
28. `[x]` Preserved the existing typewriter headline and animated stat counters.

### Ambient background
29. `[x]` Hand-written canvas constellation layer (nodes + proximity lines).
30. `[x]` Pointer-reactive: nodes gently repel from the cursor.
31. `[x]` DPR-capped at 2 for crispness without overdraw.
32. `[x]` Pauses when the tab is hidden (battery / CPU).
33. `[x]` Skipped entirely under reduced-motion and on sub-600px screens.
34. `[x]` Node count scales to viewport area; resizes with the window.

### Scroll + utility
35. `[x]` Top scroll-progress bar (accent-to-cyan gradient), rAF-throttled.
36. `[x]` Back-to-top button that appears past 600px and smooth-scrolls up.
37. `[x]` Back-to-top honors the bottom safe-area inset on phones.

### Buttons (from the prior pass, retained)
38. `[x]` Project links rendered as real buttons (`.btn` / `.btn.cyan`) with hover fill, lift, glow.
39. `[x]` Focus-visible outlines on buttons and chips.

### Foundation: SEO / meta / structured data
40. `[x]` `og:image` (+ width/height) and `og:site_name` tags.
41. `[x]` Full Twitter card tags (card, title, description, image).
42. `[x]` `rel=canonical` pointing at the apex URL.
43. `[x]` JSON-LD `WebSite` + `hasPart` describing all six projects with correct schema types.
44. `[x]` Existing description / theme-color / color-scheme kept intact.

### Mobile / a11y
45. `[x]` Larger button padding and tighter action gaps under 480px.
46. `[x]` Bottom safe-area padding on the main column.
47. `[x]` Reduced-motion rules extended to every new element (canvas off, shimmer off, nav/progress transitions off).
48. `[x]` All new interactive controls are real `<button>`s with aria labels.
49. `[x]` The load-bearing terms-acknowledge gate and its focus trap were left untouched and still work.

### Engineering
50. `[x]` Entire enhancement is additive: one CSS block, one JS module, one head-meta insert. No existing markup rewritten.
51. `[x]` Written via atomic write-with-readback to dodge the FUSE truncation hazard.
52. `[x]` JS syntax validated (`node --check`) and rendered in Chrome with no console errors.

## B. Backlog to reach 200 (prioritized, not yet shipped)

### Carry the system to the sub-pages
53. `[ ]` Port the top nav + command palette to `projects/scheduler/index.html`.
54. `[ ]` Port them to `projects/budget/index.html` and the budget policy pages.
55. `[ ]` Shared visual language pass on `404.html` (currently plain).
56. `[ ]` Cross-page "back to index" affordance consistent across all sub-pages.
57. `[ ]` Bento treatment for the budget milestone list.
58. `[ ]` Glass cards for the scheduler "what's new" blocks.
59. `[ ]` Breadcrumb component shared by every sub-page.
60. `[ ]` Per-sub-page canonical + OG tags.

### Performance
61. `[ ]` Add `content-visibility:auto` + `contain-intrinsic-size` to offscreen sections.
62. `[ ]` `fetchpriority=high` on the LCP element; defer non-critical work.
63. `[ ]` Self-host the variable mono font (subset) instead of system fallback for consistent kinetic type.
64. `[ ]` `font-display:swap` and a tight unicode-range subset.
65. `[ ]` Inline-critical-CSS / lazy the rest if the file grows past one screen of styles.
66. `[ ]` Idle-callback init for the canvas so it never blocks first paint.
67. `[ ]` Throttle the constellation to 30fps on low-power devices (`navigator.hardwareConcurrency`).
68. `[ ]` Pause the canvas when fully scrolled out of view, not just on tab hide.
69. `[ ]` Precompute proximity links with a spatial grid to cut the O(n^2) loop.
70. `[ ]` `will-change` discipline audit (only on actively animating nodes).
71. `[ ]` Add a Lighthouse CI budget check to the release script.
72. `[ ]` Ship a tiny inline `<link rel=preload>` for any above-the-fold asset.
73. `[ ]` Measure and trim unused CSS once the system stabilizes.
74. `[ ]` Respect `prefers-reduced-data` to drop the canvas and heavy blur.
75. `[ ]` Cap `backdrop-filter` usage on low-end GPUs via `@supports`/feature test.

### Accessibility
76. `[ ]` Visible focus ring on the command-palette rows during keyboard nav.
77. `[ ]` `aria-activedescendant` wiring on the palette list for screen readers.
78. `[ ]` Announce filter results via an `aria-live` region ("showing 4 of 6").
79. `[ ]` `role=tablist`/`tab` semantics for the filter chips.
80. `[ ]` Skip-link target audit after the nav was added.
81. `[ ]` Honor `forced-colors` / Windows high-contrast mode.
82. `[ ]` Color-contrast pass on `--fg-2`/`--fg-3` over glass surfaces.
83. `[ ]` `prefers-contrast: more` variant with stronger borders.
84. `[ ]` Ensure the canvas is fully `aria-hidden` and never tab-focusable.
85. `[ ]` Reduced-motion users get an instant (non-animated) scrollspy.
86. `[ ]` Keyboard shortcut help overlay (press `?`) listing all shortcuts.
87. `[ ]` Trap focus inside the command palette while open.
88. `[ ]` Return focus to the trigger when the palette closes.
89. `[ ]` Larger hit areas (44px min) audited across every control.
90. `[ ]` Descriptive `<title>` per sub-page and accurate heading order.

### Mobile
91. `[ ]` Real-device test sweep at 360 / 390 / 414 px (couldn't force-emulate in this session).
92. `[ ]` Mobile slide-out nav drawer for the section links.
93. `[ ]` Bottom command bar (search + filter) on phones.
94. `[ ]` Larger tap targets on filter chips for touch.
95. `[ ]` Momentum-scroll-safe sticky nav (avoid iOS jump).
96. `[ ]` Disable card tilt on touch (pointer:coarse) to avoid jitter.
97. `[ ]` Test landscape phone layout.
98. `[ ]` `dvh` units for the hero so mobile browser chrome doesn't clip.
99. `[ ]` Pull-to-refresh suppression where it conflicts with overscroll.
100. `[ ]` Verify the gate modal is comfortable at 320px.

### PWA / offline
101. `[ ]` Add a web app manifest (name, icons, theme).
102. `[ ]` Maskable + monochrome icon set generated from the ampersand mark.
103. `[ ]` Service worker for offline shell caching.
104. `[ ]` "Add to home screen" affordance.
105. `[ ]` Offline fallback page styled to match.
106. `[ ]` Real favicon set (ico + apple-touch-icon + 192/512 png).
107. `[ ]` Generate and ship `og.png` (1200x630) so the social meta resolves.
108. `[ ]` `sitemap.xml` listing the landing + sub-pages.
109. `[ ]` Confirm `robots.txt` still excludes the private mirrors after changes.
110. `[ ]` RSS/JSON feed of project changelog highlights.

### Interactions / polish
111. `[ ]` View Transitions API for filter shuffles (where supported).
112. `[ ]` Scroll-driven section reveals via native `animation-timeline: view()`.
113. `[ ]` Parallax depth on the mesh layers tied to scroll.
114. `[ ]` Magnetic hover on buttons (cursor-follow within a small radius).
115. `[ ]` Animated count-up when each stat enters (already partly present; refine easing).
116. `[ ]` Per-letter kinetic entrance on the headline.
117. `[ ]` Copy-link buttons on section headings (deep links).
118. `[ ]` Toast confirming "link copied".
119. `[ ]` Sound-off micro-haptics on supported devices (subtle).
120. `[ ]` Card hover reveals a one-line "what changed recently".
121. `[ ]` Keyboard-driven card focus ring + Enter to open primary link.
122. `[ ]` Animated sparkline draw-in tied to the reveal, not page load.
123. `[ ]` Cursor-aware gradient sheen across the bento on pointer move.
124. `[ ]` Empty/edge state if a filter yields zero cards.
125. `[ ]` Remember last filter in `sessionStorage` within a visit.
126. `[ ]` Animated active-filter underline that slides between chips.
127. `[ ]` Reduced-motion alternative for every one of the above.

### Content / data freshness
128. `[ ]` Pull live versions from `status/data/*.json` instead of hardcoded pills.
129. `[ ]` Auto-render a "last shipped" relative timestamp per project.
130. `[ ]` Link each project card to its status dashboard entry.
131. `[ ]` Surface the portfolio constellation verdict as a subtle banner.
132. `[ ]` Show commit cadence sparkline from real git data per project.
133. `[ ]` "Now / Next / Later" roadmap strip per project.
134. `[ ]` Dedicated changelog page aggregating all six projects.
135. `[ ]` Tag/topic chips on cards (Godot, Cloudflare, PWA, local-first).
136. `[ ]` Search across project descriptions in the command palette.
137. `[ ]` Add a uses/stack page.
138. `[ ]` Add a contact route that routes through the posted-terms gate.

### Navigation depth
139. `[ ]` Per-section anchored URLs that update on scroll (history.replaceState).
140. `[ ]` Restore scroll position on back-navigation.
141. `[ ]` Prev/next project keyboard navigation (j/k).
142. `[ ]` In-palette actions (open external link, copy URL) not just jump.
143. `[ ]` Recent / frequently-visited at the top of the palette.
144. `[ ]` Fuzzy ranking (score by match position) in the palette.
145. `[ ]` Palette command to toggle reduced motion.
146. `[ ]` Palette command to jump to each external project site.
147. `[ ]` Breadcrumbs reflected in the document title.

### SEO / metadata depth
148. `[ ]` Per-project `SoftwareApplication`/`VideoGame` JSON-LD on sub-pages.
149. `[ ]` `BreadcrumbList` structured data.
150. `[ ]` Author/`Person` schema with sameAs links.
151. `[ ]` Open Graph article tags on the notice/terms page.
152. `[ ]` Meta `robots` per page (index/noindex correctness).
153. `[ ]` Hreflang if any localized content is ever added.
154. `[ ]` Descriptive alt text everywhere an image is added.
155. `[ ]` Structured FAQ for the posted-terms notice.

### Design system hardening
156. `[ ]` Extract the v2 styles into clearly delimited token groups.
157. `[ ]` Document the color/spacing/type scale inline.
158. `[ ]` Light-mode variant gated behind a toggle (dark stays default).
159. `[ ]` Theme toggle persisted in `localStorage`.
160. `[ ]` Consistent radius/elevation scale across cards, nav, palette.
161. `[ ]` Motion token set (durations/easings) referenced everywhere.
162. `[ ]` Container queries for cards so they adapt to their column, not the viewport.
163. `[ ]` `:has()`-based layout tweaks where supported.
164. `[ ]` Logical properties (inline/block) for future RTL.
165. `[ ]` Print stylesheet refresh covering the new sections.

### 3D / impressive (optional, gated)
166. `[ ]` Replace the 2D constellation with a depth-parallax starfield (still hand-written canvas).
167. `[ ]` Subtle WebGL shader hero backdrop with graceful 2D fallback.
168. `[ ]` Interactive 3D model of one project (lazy-loaded, reduced-motion off).
169. `[ ]` Tilt-driven light reflection on the feature cards.
170. `[ ]` Depth-of-field blur on background nodes by z.
171. `[ ]` Pointer-velocity-reactive node speed.
172. `[ ]` Optional dot-grid morph into the constellation on first scroll.
173. `[ ]` Frame-budget guard that downgrades effects under 50fps.

### Robustness / quality
174. `[ ]` `<noscript>` content so the page is fully usable without JS.
175. `[ ]` Ensure all enhancements degrade if `IntersectionObserver` is missing.
176. `[ ]` Feature-detect `backdrop-filter` and fall back to solid surfaces.
177. `[ ]` Guard `document.startViewTransition` behind support check (done in code; verify).
178. `[ ]` Error boundary around the canvas init so a failure never blanks the bg.
179. `[ ]` Lint pass (Biome/ESLint config) wired into release.
180. `[ ]` HTML validation in the release gate.
181. `[ ]` Broken-link check across all internal hrefs.
182. `[ ]` Visual-regression snapshot in the release script.
183. `[ ]` Smoke test that the gate still blocks on a fresh profile.
184. `[ ]` Axe-core accessibility scan in CI.
185. `[ ]` Bundle-size budget assertion (the brand promise).
186. `[ ]` CSP meta tag tightening (no inline-script nonce gaps).
187. `[ ]` Subresource-integrity audit (none external today; keep it that way).

### Content delight
188. `[ ]` Terminal-style boot sequence on first visit (skippable).
189. `[ ]` Konami / easter-egg command in the palette.
190. `[ ]` Animated "live" badge tied to actual deploy time.
191. `[ ]` Subtle scanline/CRT toggle for the terminal theme.
192. `[ ]` Time-of-day greeting in the hero.
193. `[ ]` "Built with" mini-stack icons per card.
194. `[ ]` Shareable per-project deep-link cards.
195. `[ ]` Animated section dividers (the `//` marks) on reveal.
196. `[ ]` Hover preview thumbnail for live projects.
197. `[ ]` Tasteful confetti-free success state on the gate accept.
198. `[ ]` Cursor trail in the constellation (reduced-motion off).
199. `[ ]` A "what is this site" one-liner that expands on click.
200. `[ ]` Periodic, automated screenshot-diff so the site never silently regresses.

## Deploy note

The enhanced `index.html` is written and verified locally. It was not committed from the working session because the sandbox's FUSE view of `.git/index` reads corrupt and the lock is not removable there. Commit and push from Windows:

```powershell
cd X:\YesAndEverything
git add index.html docs\IMPROVEMENTS-2026-06-08.md
git commit -m "site: v2 landing - nav, command palette, project filters, bento + glass, ambient canvas, kinetic hero, scroll progress, SEO/structured data"
git push
```

GitHub Pages redeploys from `main` within ~30s; hard-refresh to bust the CDN cache.
