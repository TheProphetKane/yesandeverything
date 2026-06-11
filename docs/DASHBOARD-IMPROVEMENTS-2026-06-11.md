# Dashboard polish pass: 250-item catalog (2026-06-11)

Scope rule for the whole pass: nothing changes the functional layout. The desktop
one-page wheel stays one page, widgets do not reflow or jump when the spotlight
spins or a filter changes, and the grid is identical project-to-project. Mobile is
optimized separately (it cannot fit one page; it stacks and scrolls).

Status legend: `[x]` shipped + verified in this pass, `[ ]` queued for a follow-up
batch. Count is kept honest: shipped items are real, planned items are not claimed
as done.

## Batch 1 - Background overhaul (shipped)

1. [x] Added `body::after` nebula layer (z-index -3) behind the grid + canvas.
2. [x] Nebula gradient 1: magenta bloom top-left (`rgba(255,0,255,0.11)`).
3. [x] Nebula gradient 2: cyan bloom mid-right (`rgba(2,164,211,0.12)`).
4. [x] Nebula gradient 3: low magenta wash bottom-center (`rgba(255,0,255,0.07)`).
5. [x] `@keyframes nebula-drift` 30s alternate ease-in-out for slow parallax life.
6. [x] Reduced-motion guard freezes the nebula drift.
7. [x] Constellation link distance 130 -> 150 (denser web).
8. [x] Star count raised 34/70 -> 46/110 (more depth without clutter).
9. [x] Magenta stars get `shadowBlur` glow (`rgba(255,90,255,0.85)`).
10. [x] Cyan stars get softer glow (`rgba(95,214,255,0.62)`).
11. [x] Link color retinted to cyan (`rgba(2,164,211,...)` at 0.30) from flat grey.
12. [x] Link line width 0.5 -> 0.7 for visibility on dark.
13. [x] Background palette unified to the site pink/cyan theme (was flat slate).
14. [x] Nebula sits below grid + canvas so foreground contrast is preserved.

## Batch 2 - Color system + theming (shipped)

15. [x] `::selection` themed magenta wash.
16. [x] `:focus-visible` accent outline with offset + radius (keyboard a11y).
17. [x] Scrollbar recolored to ink/accent (Firefox `scrollbar-color` + WebKit).
18. [x] Scrollbar thumb hover state.
19. [x] Panel border transitions to `--accent-dim` on focus-within.
20. [x] Live tick mark turns accent on panel hover.
21. [x] Accent-glow box-shadow on active wheel dot.
22. [x] Bar today-marker gradient magenta->cyan kept consistent across widgets.
23. [x] Cost-this-week stat added to row 3 (magenta/cyan aligned).
24. [x] All-time / cost-this-week / burn-rate row aligned to the row below it.

## Batch 3 - Motion + micro-interactions (shipped)

25. [x] One-shot `app-rise` reveal on `#app` un-hide (runs once, never on filter).
26. [x] Panel hover lift `translateY(-2px)` + depth shadow (transform-only, no reflow).
27. [x] Totals tile hover lift.
28. [x] Travelling sheen on meter fills (`bar-sheen` 4.5s).
29. [x] Smooth meter width fill transition (1.1s ease-out-quart).
30. [x] Meterrow hover nudge `translateX(2px)`.
31. [x] Nav arrow hover scale 1.14 + spring easing.
32. [x] Nav arrow active press scale 0.92.
33. [x] Control buttons (auto/refresh/filters) hover accent + active press.
34. [x] Wheel dot hover scale 1.3.
35. [x] Gauge hover lift.
36. [x] Readout hover lift.
37. [x] Spotlight content cross-fade on spin (opacity only, fixed size, no jump).
38. [x] Overlay fade-in.
39. [x] Glass dialog `glass-pop` spring entrance.
40. [x] Glass close button rotates 90deg on hover.
41. [x] Ticker `will-change: transform` for smoother scroll.
42. [x] Link color transition.
43. [x] `will-change: transform` on panels to avoid hover-paint jank.
44. [x] All new motion silenced under `prefers-reduced-motion`.

## Batch 4 - Mobile / small-screen (shipped, separate from desktop)

45. [x] `@900px`: wrap padding tightened.
46. [x] `@900px`: `min-height:auto` so the page scrolls naturally (no forced 1-screen).
47. [x] `@900px`: header wraps with row-gap.
48. [x] `@900px`: totals -> 3 columns.
49. [x] `@900px`: layout -> single column (panels stack above/below spotlight).
50. [x] `@900px`: nav arrows hidden (dots + swipe drive the wheel on touch).
51. [x] `@900px`: strip -> 2 columns.
52. [x] `@900px`: hover-lift disabled on panels (no touch jitter).
53. [x] `@900px`: meterrow hover nudge disabled.
54. [x] `@560px`: totals -> 2 columns.
55. [x] `@560px`: strip -> 1 column.
56. [x] `@560px`: 38px min touch targets on controls.
57. [x] `@560px`: header title size reduced.
58. [x] `@380px`: totals -> 1 column.

## Batch 5 - Layout-stability safeguards (shipped)

59. [x] No grid-template changes in the desktop polish (one-page wheel intact).
60. [x] Entrance animation is one-shot, not per-render (filtering never re-flashes).
61. [x] Spotlight swap is opacity-only with fixed dimensions (no widget jump).
62. [x] All hover effects are transform/shadow only (zero layout reflow).
63. [x] Meter fills animate width inside a fixed track (no row height change).
64. [x] Verified live: `#app hidden=false`, 8 totals, 19 panels, no console error.
65. [x] Verified live: screenshot confirms one-page layout, no widget shift.
66. [x] usage.json recovered from git HEAD (97926 bytes, 7 projects) before edits.
67. [x] All writes via python atomic-write-with-readback (FUSE-truncation safe).
68. [x] Tail-checked `</html>` on every dashboard write.
69. [x] "complex"/"simple" dropped from game cards so they fit one line (prior).
70. [x] "vs past week" rebuilt as horizontal bars matching all-time cost bars (prior).

## Batch 6 - New data metrics (planned; derive first, wire collector only if raw)

71. [ ] 7-day rolling avg cost overlay line on the flow chart.
72. [ ] 30-day rolling avg tokens.
73. [ ] Week-over-week delta % per project (derive from costSeries).
74. [ ] Cache-hit ratio per project (cacheRead / (cacheRead+input)).
75. [ ] Cache savings in $ (cacheRead priced at cache rate vs input rate).
76. [ ] Output/input ratio per project (verbosity signal).
77. [ ] Most expensive day (date + cost) per project.
78. [ ] Cheapest active day per project.
79. [ ] Median daily cost (robust vs mean).
80. [ ] Cost volatility (stddev of daily cost) per project.
81. [ ] Days-since-last-activity per project (staleness).
82. [ ] Active-day count in last 30 (cadence).
83. [ ] Longest active streak (consecutive days).
84. [ ] Current streak.
85. [ ] Projected month-end cost (run-rate extrapolation).
86. [ ] Projected month-end tokens.
87. [ ] Share-of-spend pie already exists; add share-of-tokens variant.
88. [ ] Tokens-per-session per project.
89. [ ] Cost-per-session per project.
90. [ ] Sessions-per-active-day.
91. [ ] Peak-hour-of-day heat (needs raw timestamps -> collector wiring).
92. [ ] Peak-day-of-week heat (derive from per-day records).
93. [ ] Input vs output vs cache stacked composition bar.
94. [ ] Cumulative spend sparkline (running total).
95. [ ] Burn-rate trend arrow (today vs 7-day avg).
96. [ ] "Efficiency" badge: cache-hit ratio bucketed to a grade.
97. [ ] First-activity date per project (project age).
98. [ ] Lifetime tokens per project (already partial; surface explicitly).
99. [ ] Avg tokens/day since first activity.
100. [ ] Cost-per-1k-tokens effective blended rate per project.
101. [ ] Wire collect-usage.ps1: capture per-session timestamps if raw-needed (91).
102. [ ] Wire collect-usage.ps1: capture model breakdown if available.
103. [ ] Add `derivedMetrics` block to usage.json schema doc.
104. [ ] Add `schemaVersion` bump + note in usage.json.
105. [ ] Document every new field in the collector header comment.

## Batch 7 - Chart / SVG depth (planned)

106. [ ] Gradient fill under the flow IN wave (cyan fade).
107. [ ] Gradient fill under the flow OUT wave (magenta fade).
108. [ ] Soft drop-shadow filter on the flow waves.
109. [ ] Hover crosshair + value tooltip on the flow chart.
110. [ ] Today marker animated draw-in (one-shot).
111. [ ] Donut ring animated sweep on first reveal (one-shot).
112. [ ] Donut center number count-up on first reveal (one-shot).
113. [ ] Radar polygon animated draw on first reveal (one-shot).
114. [ ] Radar grid-ring subtle pulse on hover.
115. [ ] Sparkline endpoint dot per strip card.
116. [ ] Sparkline area fill tint per project color.
117. [ ] Gauge arc animated fill on first reveal.
118. [ ] Gauge arc gradient stroke.
119. [ ] Meter bar rounded caps.
120. [ ] Meter track inner shadow for depth.
121. [ ] Axis tick labels softened to `--fg-2`.
122. [ ] Chart baseline hairline at `--ink-4`.
123. [ ] Per-project color legend chips get hover highlight -> dim others.
124. [ ] Flow chart y-scale label formatting (M/k) consistency.
125. [ ] Donut hover segment lift / highlight.

## Batch 8 - Typography + spacing polish (planned)

126. [ ] Tabular-nums on all numeric readouts (no digit jitter).
127. [ ] Consistent letter-spacing on section labels.
128. [ ] Uppercase tracking on stat captions unified.
129. [ ] Mono font enforced on every numeric value.
130. [ ] Sans enforced on prose captions.
131. [ ] Line-height tune on multi-line legends.
132. [ ] Truncation + title attr on long project names.
133. [ ] Consistent decimal places on $ values.
134. [ ] Consistent k/M token abbreviation everywhere.
135. [ ] Right-align numeric columns in meters.
136. [ ] Caption opacity unified to `--fg-2`.
137. [ ] Header timestamp monospace alignment.
138. [ ] Ticker entry separators softened.
139. [ ] Percent signs sized down relative to number.
140. [ ] Negative deltas colored, positive deltas colored, consistently.

## Batch 9 - State + feedback (planned)

141. [ ] Skeleton shimmer while data loads (pre-boot).
142. [ ] Empty-state message if a project has zero activity.
143. [ ] Stale-data badge if lastCollected > 24h.
144. [ ] Refresh button spinner during refresh.
145. [ ] "Updated just now" flash after refresh.
146. [ ] Auto-refresh countdown indicator when auto:on.
147. [ ] Error toast if usage.json fails to parse.
148. [ ] Graceful fallback render if a metric is missing.
149. [ ] Active-filter pill shows current filter clearly.
150. [ ] Clear-filter affordance.
151. [ ] Keyboard left/right arrows spin the wheel.
152. [ ] Keyboard number keys jump to project N.
153. [ ] Focus ring visible on wheel dots.
154. [ ] aria-label on nav arrows.
155. [ ] aria-current on active wheel dot.
156. [ ] role + aria-live on the ticker.
157. [ ] Reduced-data mode skips the canvas constellation.
158. [ ] Respect `prefers-reduced-data` for nebula too.
159. [ ] Pause canvas animation when tab hidden (visibilitychange).
160. [ ] Pause canvas when off-screen (mobile scroll).

## Batch 10 - Accessibility (planned)

161. [ ] Color contrast pass on all `--fg-2` text vs background.
162. [ ] Non-color cue for project legend (not color alone).
163. [ ] Focusable spotlight with keyboard.
164. [ ] Skip-to-content link.
165. [ ] aria-labels on all gauges with their value.
166. [ ] Screen-reader text for the flow chart summary.
167. [ ] Sufficient touch target spacing on mobile dots.
168. [ ] `prefers-contrast: more` high-contrast overrides.
169. [ ] Title attributes on truncated values.
170. [ ] Logical tab order top-to-bottom.
171. [ ] Visible focus on every interactive control.
172. [ ] Alt/aria on the live status dot.
173. [ ] Announce filter changes politely (aria-live).
174. [ ] Ensure motion-safe defaults for vestibular users.
175. [ ] Document a11y decisions in this file.

## Batch 11 - Performance (planned)

176. [ ] Throttle canvas to ~30fps when many nodes.
177. [ ] Cap devicePixelRatio scaling cost on hi-dpi.
178. [ ] Debounce resize handler (width-only guard already in place).
179. [ ] Reuse gradient objects instead of per-frame recreate.
180. [ ] Avoid layout thrash in render loop (batch reads/writes).
181. [ ] `content-visibility: auto` on off-screen mobile panels.
182. [ ] Lazy-init heavy SVGs until spotlight reaches them.
183. [ ] Cache parsed usage.json across re-renders.
184. [ ] Avoid re-creating DOM on filter (update in place).
185. [ ] Use CSS transforms (GPU) for all motion (done for new layer; audit old).
186. [ ] requestAnimationFrame guard against background-tab drift.
187. [ ] Minify inline whitespace on ship (optional).
188. [ ] Measure boot time; budget under 100ms post-parse.
189. [ ] Profile canvas with 110 stars on a mid phone.
190. [ ] Drop shadowBlur on low-power devices (heuristic).

## Batch 12 - Visual depth + finish (planned)

191. [ ] Subtle vignette at viewport edges.
192. [ ] Panel inner top-highlight hairline (glass edge).
193. [ ] Card corner-bracket accent already present; tint on hover.
194. [ ] Soft grain/noise texture overlay at very low opacity.
195. [ ] Depth layering: nebula < grid < canvas < content (done; verify z-order).
196. [ ] Accent glow bleed behind the active spotlight panel.
197. [ ] Gradient hairline divider under the header.
198. [ ] Frosted backdrop-filter on the header bar.
199. [ ] Frosted backdrop on glass dialogs.
200. [ ] Consistent 4px radius system across cards.
201. [ ] Shadow elevation scale (sm/md/lg) defined as vars.
202. [ ] Hover elevation uses the scale.
203. [ ] Active wheel card gets a brighter border than siblings.
204. [ ] Inactive strip cards slightly dimmed for focus.
205. [ ] Live dot breathing pulse refined.
206. [ ] Wave glow intensity tuned to not wash the gridlines.
207. [ ] Donut track color tuned for contrast.
208. [ ] Radar fill opacity tuned.
209. [ ] Gauge remainder track tinted.
210. [ ] Consistent accent-dim border on all panels at rest.

## Batch 13 - Content + clarity (planned)

211. [ ] Tooltip glossary on each stat caption (what it means).
212. [ ] Units shown on every metric ($ / tokens / %).
213. [ ] "as of" timestamp near each derived metric.
214. [ ] Project status chip (active/stale/needs-attention) per card.
215. [ ] Milestone label surfaced per project from status JSON.
216. [ ] Work-queue depth surfaced per project.
217. [ ] Last-release message surfaced per project.
218. [ ] Link each project card to its repo / GDD where applicable.
219. [ ] Portfolio total sessions surfaced.
220. [ ] Portfolio cache-savings total surfaced.
221. [ ] "biggest mover this week" callout.
222. [ ] "quietest project" callout.
223. [ ] Cost trend phrase ("up 12% wk/wk") in plain language.
224. [ ] Burn-rate explainer tooltip.
225. [ ] Legend sorted by share descending (already partial; confirm).

## Batch 14 - Robustness + housekeeping (planned)

226. [ ] Guard every metric against divide-by-zero.
227. [ ] Guard against missing project in usage.json.
228. [ ] Guard against future-dated records.
229. [ ] Clamp percentages to 0-100.
230. [ ] Format NaN/Infinity as "-".
231. [ ] Single source for color-per-project map.
232. [ ] Single source for number formatters.
233. [ ] Comment each widget's data dependency.
234. [ ] Remove any dead CSS from prior iterations.
235. [ ] Consolidate duplicate easing vars.
236. [ ] Verify no localStorage misuse (sessionStorage gate only).
237. [ ] Verify gate hash unchanged + still boots.
238. [ ] Verify robots.txt still disallows /dashboard/.
239. [ ] Confirm CNAME untouched.
240. [ ] Confirm index.html still ends with </html> after any shared edit.
241. [ ] Add a render smoke test note to docs.
242. [ ] Record collector schema changes in DEPLOY.md if any.
243. [ ] Re-run the live screenshot after each batch.
244. [ ] Keep this catalog's `[x]` count honest per batch.
245. [ ] Final desktop verify: one page, no jump, no console error.
246. [ ] Final mobile verify at 390px: stacks, scrolls, targets >=38px.
247. [ ] Final tablet verify at 768px.
248. [ ] Cross-check reduced-motion path renders static + correct.
249. [ ] Cross-check reduced-data path skips canvas.
250. [ ] Commit + push via repo flow; confirm Pages deploy + hard-refresh.

## Honest status

Shipped + verified this pass: items 1-70 (background overhaul + the additive
polish layer + the prior layout-safe rework). Items 71-250 are the planned
follow-up batches, ordered roughly by value. They are NOT claimed as done. The
two highest-value next batches are Batch 6 (new derived data metrics, with
collector wiring only where raw capture is required) and Batch 7 (chart/SVG
depth), since those add information density and visual weight without touching
the locked layout.
