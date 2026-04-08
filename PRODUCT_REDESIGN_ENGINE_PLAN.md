# GEO Arctic - Product, UX and Engine Direction

## Visual thesis
- Arctic Professional: calm, cold, precise, operational.
- The landing page should feel editorial and premium.
- The product workspace should feel disciplined and useful, not decorative.

## Content plan
- Hero: product name, promise, one strong visual, one primary action.
- Support: what the platform measures and why it matters.
- Detail: how projects, prompts, models and alerts work together.
- Final CTA: login, start analysis, or open workspace.

## Interaction thesis
- Hero reveal: soft upward entrance, delayed text, one strong visual plane.
- Workspace motion: fast panel fades, tab transitions, subtle chart drawing.
- Micro motion: pulse only on live values, active chips, and fresh alerts.

## Art direction
- Background: ice white, steel blue, glacier grey.
- Accent: cyan only for live, active, selected, or positive state.
- Warning: amber.
- Risk: coral red.
- Success: arctic green.
- Typography:
  - Display: elegant serif or sharp editorial face for the landing title.
  - Product UI: neutral sans for density and readability.
- Surfaces:
  - Landing: broad visual planes, fewer boxes, more structure.
  - Product: mostly flat layout with restrained panels, not card mosaics.

## Where imagery should exist
- Landing hero: yes. One strong generated image or photo-grade scene.
- Mid landing proof section: optional cropped visual or product still.
- Login page: yes, but secondary. A quiet side image or blurred arctic scene.
- Workspace app: no lifestyle photography in routine tabs.
- Reports export cover: yes. One branded still or atmospheric abstract image.

## Image generation guidance
- Generate one hero image:
  - cold aerial arctic texture
  - premium editorial lighting
  - no embedded UI
  - no text
  - calm area for headline overlay
- Generate one login-side image:
  - icy glass surface, minimal reflection, professional mood
  - no logos
  - no fake dashboards inside the image
- Do not add photos inside dense product tabs unless they communicate context.

## Global UX flow
1. Landing
2. Login or signup
3. Connected workspace home
4. Project selection or new analysis
5. Dashboard overview
6. Internal tabs
7. Account and logout

## Landing page structure
### Hero
- Headline: direct and short.
- Subheadline: what is measured across which models.
- CTA 1: start analysis.
- CTA 2: see demo.
- Visual: one dominant arctic visual with a restrained product signal.

### Support section
- Three operational outcomes only:
  - detect presence
  - compare rank
  - identify decisive prompts

### Product depth
- Show the chain:
  - project
  - prompts
  - models
  - analysis
  - trend
  - alert
- This section should feel explanatory, not promotional.

### Final CTA
- Login for existing user.
- Start first analysis for new user.

## Login and signup
- Two-column layout on desktop, stacked on mobile.
- Left: form.
- Right: quiet image or atmospheric visual.
- Keep two methods only:
  - email and password
  - Google
- Show very little text.
- Show one line of reassurance:
  - projects, history and benchmarks are restored after login.

## Connected workspace home
- First screen after authentication if no active session is restored.
- This view should do three jobs:
  - resume the last project
  - start a new analysis
  - browse owned projects
- Add freshness labels:
  - last run
  - active models
  - alert count

## Navigation model
- `Vue d'ensemble`
- `Mes marques`
- `Requetes`
- `Benchmarks`
- `Tendances`
- `Alertes`
- `Rapports`
- `Compte`

Order matters. Keep decision views first, management views later.

## Tab-by-tab direction
### Vue d'ensemble
- Purpose: answer "what changed and what matters now?"
- Required blocks:
  - current score
  - rank
  - share of voice
  - movement over 7d and 30d
  - top winning prompt
  - top losing prompt
  - active alert summary
- Motion:
  - number tween on KPI update
  - subtle line draw on trends
  - pulse on live chip only

### Mes marques
- Purpose: portfolio view across tracked brands or projects.
- Layout:
  - dense list or strip, not large cards
  - sortable by score, delta, last run, alert state
- Each item:
  - brand
  - sector
  - rank
  - delta
  - freshness
  - quick actions

### Requetes
- Purpose: proof mode.
- This is one of the most important tabs.
- Required structure:
  - left: prompt list and intent cluster
  - center: model responses or summary
  - right: extracted proof
- For each prompt show:
  - models run
  - was the brand cited
  - position
  - sentiment
  - competitors also cited
- Add filters:
  - intent
  - model
  - brand mentioned yes or no
  - competitive prompt only

### Benchmarks
- Purpose: compare brands on the same prompt universe.
- Show:
  - ranking by brand
  - score deltas
  - strongest model
  - weakest prompt cluster
- Add view switches:
  - by brand
  - by model
  - by prompt cluster

### Tendances
- Purpose: explain movement over time.
- Show:
  - 7d, 30d, 90d toggles
  - events tied to changes
  - major up/down movements
- Add a compact timeline with annotations:
  - analysis rerun
  - prompt set changed
  - competitor surge

### Alertes
- Purpose: operational triage, not settings first.
- Split the view:
  - top: active alerts feed
  - bottom: channels and rules
- Alert types:
  - rank lost
  - mention drop
  - competitor surge
  - model divergence spike
  - coverage gap on strategic prompts

### Rapports
- Purpose: export and executive communication.
- Show:
  - latest report ready state
  - last export date
  - export format
  - executive summary preview
- Offer:
  - PDF
  - CSV
  - JSON

### Compte
- Purpose: control identity, restore trust, manage habits.
- Show:
  - user identity
  - auth provider
  - session state
  - preferences
  - logout
- Keep it short and calm.

## Onboarding direction
- Turn onboarding into a three-step flow, not a long form.
- Step 1:
  - brand
  - sector
- Step 2:
  - competitors
  - market language
- Step 3:
  - prompts
  - models
  - launch
- Add templates:
  - assurance
  - banque
  - retail
  - telecom
- Add one advanced panel:
  - custom system prompt
  - custom prompt rules
  - products to benchmark

## Prompt system direction
### Core principle
- The engine must separate:
  - system prompt
  - generated prompts
  - analysis extraction prompt
  - benchmark prompt

### What the user should see
- Generated prompts should not be hidden.
- For each project, expose:
  - prompt source
  - prompt cluster
  - intent
  - strategic importance
- Let users edit or lock a prompt set.

### Prompt quality controls
- Deduplicate prompts before run.
- Label each prompt with one intent:
  - discovery
  - comparison
  - purchase
  - reassurance
  - support
- Reject prompts that are too generic or off-market.

## Comparison engine direction
- Comparison is not only rank.
- It should include:
  - mention rate
  - first mention rate
  - average position
  - sentiment
  - model agreement
  - prompt coverage
- Add a dedicated metric:
  - competitive pressure
  - how often a competitor appears when the brand does not

## Analysis engine essentials
- Separate three layers:
  - generation
  - execution
  - interpretation
- Generation:
  - build prompt sets from sector, products and templates
- Execution:
  - run models
  - cache repeated inputs
  - timestamp every result
- Interpretation:
  - extract brands
  - positions
  - sentiment
  - confidence
  - divergence between models

## Engine features worth building next
- Intent clustering on prompt sets.
- Prompt scoring by business value.
- Model agreement index.
- Proof snippets per answer.
- Explain why rank changed.
- Suggest missing content opportunities from uncaptured prompt clusters.

## Motion and micro-interactions
- Use motion only where it helps reading.
- Recommended motions:
  - KPI count-up on refresh
  - line chart draw on load
  - chip pulse for active alert or live state
  - tab content fade-slide
  - project switch cross-fade
- Avoid:
  - bouncing cards
  - constant skeleton shimmer everywhere
  - moving gradients in dense data views

## Colored icon system
- Use icons sparingly and meaningfully.
- Cyan:
  - live
  - selected
  - active model
- Green:
  - improvement
  - validated
  - no issue
- Amber:
  - warning
  - partial coverage
- Coral:
  - rank lost
  - regression
- Good places for icons:
  - navigation
  - KPI labels
  - alert feed
  - account provider
  - report status

## Suggested implementation order
1. Remove backend duplication and consolidate imports.
2. Rework onboarding into 3 steps.
3. Rebuild `Vue d'ensemble` around decision blocks.
4. Turn `Requetes` into proof mode.
5. Upgrade `Alertes` into feed + rules.
6. Add generated landing hero and login-side image.
7. Add focused motion and icon color system.
8. Refine reports and benchmarks.

## Design quality bar
- Every screen needs one clear purpose.
- Every heading must help the operator decide.
- Every animation must improve orientation or freshness.
- Every image must do narrative work.
- The product should feel premium without relying on decorative cards.
