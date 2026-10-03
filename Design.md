# FinBridge — UI/UX Design System

> **Design goal:** A light-first, premium fintech interface that feels trustworthy enough for financial decisions, modern enough for an AI product, and energetic enough for a hackathon-winning demo.
>
> **Core visual direction:** **White + Mint + Deep Teal**, supported by restrained blue, emerald, amber, coral, and violet semantic accents.
>
> **Primary product:** FinBridge — AI-Powered Inclusive Micro-Lending & Financial Intelligence Platform.
>
> **Core UX hierarchy:** FT-03 Micro-Lending is the hero capability; FT-05 Financial Analytics, FT-02 Fraud/Risk, FT-04 Scheme Discovery, and FT-01 Financial Coaching are supporting intelligence layers.

---

## 1. Design Intent

FinBridge should communicate four things within the first five seconds:

1. **Trust** — this is a financial product, not a playful consumer app.
2. **Clarity** — financial information should be understandable immediately.
3. **Intelligence** — the platform uses data and AI, but AI should feel useful rather than decorative.
4. **Momentum** — users should always know what the next useful action is.

The interface should therefore use:

- large white surfaces
- subtle mint-tinted backgrounds
- deep teal for primary identity and high-confidence text
- strong but controlled accent colors
- rounded cards with restrained shadows
- dense information only where it improves financial understanding
- charts with a consistent semantic color vocabulary
- minimal gradients
- no neon fintech aesthetic
- no excessive glassmorphism
- no rainbow dashboards

---

# 2. Source Visual Analysis

The supplied reference deck establishes a visual language built around:

- a **light mint / aqua canvas**
- **off-white content panels**
- **deep teal typography**
- a medium **teal accent**
- rounded containers with dark outlines
- occasional brighter colors for illustrations and emphasis
- strong section titles and diagram-driven communication

The first page visually establishes the mint background + off-white panel + deep teal combination; page 3 reinforces the teal identity around the solution architecture; page 4 moves toward a mostly white content table with teal structure; and page 5 uses white/light panels with teal and green accents for technical diagrams.

Reference observations are based on the supplied PDF deck and its rendered pages. fileciteturn4file0L13-L14 fileciteturn4file0L30-L32 fileciteturn4file0L62-L65

### Design interpretation for FinBridge

We should **retain the spirit of the template without copying its heavier mint background**.

Instead:

```text
Reference Deck
Mint Background
       ↓
FinBridge
Near-White Background
       +
Very Light Mint Sections
       +
Deep Teal Identity
       +
Controlled Financial Accents
```

This produces a more product-ready interface while remaining visually compatible with the presentation.

---

# 3. Brand Personality

## Keywords

**Trustworthy · Intelligent · Inclusive · Precise · Calm · Modern · Human**

Avoid:

**Aggressive · Neon · Overly Corporate · Childish · Overly Futuristic · Cryptocurrency-Like**

The product is dealing with:

- money
- financial health
- risk
- borrowing
- repayment
- fraud

Therefore, visual excitement must come from **hierarchy, data visualization, motion, and well-selected accents**, not from excessive colors.

---

# 4. Core Color Philosophy

FinBridge uses a **70 / 20 / 10 visual balance**:

```text
70% — White / Near-white surfaces
20% — Mint + Teal system
10% — Semantic / interaction accents
```

This ensures that:

- the application feels light
- content remains readable
- financial numbers become the visual focus
- accents stay meaningful

---

# 5. Master Color Palette

## 5.1 Brand Core

| Token | Hex | Name | Purpose |
|---|---|---|---|
| `brand-900` | `#123E40` | Deep Teal | strongest identity / headings |
| `brand-800` | `#18575A` | Ocean Teal | primary dark UI |
| `brand-700` | `#237277` | FinBridge Teal | primary brand |
| `brand-600` | `#2D8E92` | Active Teal | primary interactive |
| `brand-500` | `#3DA5A6` | Fresh Teal | secondary accent |
| `brand-100` | `#D9F0EE` | Pale Mint | highlighted sections |
| `brand-50` | `#EEF8F7` | Mist Mint | subtle backgrounds |

### Primary Brand Color

```text
#237277
```

Use for:

- primary buttons
- selected navigation
- progress states
- key charts
- Trust Score visual identity
- links in primary contexts

---

# 6. White / Neutral Palette

The product should be "white-first", not "pure-white everywhere".

| Token | Hex | Usage |
|---|---|---|
| `surface-0` | `#FFFFFF` | cards / modals / main surfaces |
| `surface-50` | `#FCFEFD` | page background |
| `surface-100` | `#F7FAF9` | application background |
| `surface-200` | `#EFF5F3` | subtle containers |
| `surface-300` | `#E3ECE9` | borders / separators |
| `surface-400` | `#CBD9D5` | disabled borders / inactive |
| `surface-500` | `#94A7A1` | secondary metadata |
| `surface-600` | `#687A75` | secondary text |
| `surface-700` | `#40524E` | body text |
| `surface-800` | `#263A37` | strong body text |
| `surface-900` | `#172825` | primary text |

### Important

Never use pure black `#000000` for normal UI text.

Primary text:

```text
#172825
```

Heading text:

```text
#123E40
```

---

# 7. Supporting Accent Palette

These accents exist to prevent the application from feeling monotonous while keeping the overall design coherent.

## FinBlue

```text
#2563EB
```

Use for:

- informational states
- transaction insights
- neutral data series
- navigation secondary accent
- AI information indicators

Light:

```text
#EAF2FF
```

---

## FinGreen

```text
#169C73
```

Use for:

- healthy financial status
- positive cash flow
- successful repayment
- low-risk state
- improvement

Light:

```text
#E8F7F1
```

---

## FinAmber

```text
#D89B22
```

Use for:

- warnings
- medium risk
- attention required
- financial caution
- scheme verification

Light:

```text
#FFF6DF
```

---

## FinCoral

```text
#D96559
```

Use for:

- high-risk fraud alerts
- negative trends
- failed validation
- destructive actions

Light:

```text
#FDECEA
```

---

## FinViolet

```text
#7457C8
```

Use sparingly for:

- AI-generated insight
- advanced intelligence
- recommendation explanation
- "AI Coach" identity

Light:

```text
#F2EEFF
```

Violet must never compete with the main teal identity.

---

# 8. Semantic Color System

The same meaning must always have the same color.

## Success

```text
Primary: #169C73
Background: #E8F7F1
Text: #0B694E
```

Examples:

- positive cash flow
- healthy repayment
- successful upload
- low-risk transaction
- eligible match confirmed

---

## Warning

```text
Primary: #D89B22
Background: #FFF6DF
Text: #825D0D
```

Examples:

- medium fraud risk
- unusual expense
- scheme information needs verification
- repayment caution

---

## Danger

```text
Primary: #D96559
Background: #FDECEA
Text: #96382F
```

Examples:

- high-risk transaction
- validation failure
- severe cash-flow decline
- destructive action

---

## Information

```text
Primary: #2563EB
Background: #EAF2FF
Text: #1746A2
```

Examples:

- informational insight
- tutorial
- neutral financial explanation

---

## AI

```text
Primary: #7457C8
Background: #F2EEFF
Text: #513D94
```

AI should feel like an **intelligence layer**, not the main brand color.

---

# 9. FinBridge Product Color Map

| Product Area | Primary Color | Supporting Color |
|---|---|---|
| Dashboard | Teal | Mint |
| FT-03 Lending | Deep Teal | Blue |
| Financial Trust Score | Teal | Green |
| FT-05 Analytics | Blue | Teal |
| FT-02 Fraud | Coral | Amber |
| FT-04 Schemes | Green | Amber |
| FT-01 Financial Coach | Violet | Teal |
| Transactions | Blue | Neutral |
| Repayments | Green | Teal |
| Alerts | Amber/Coral | Neutral |
| AI Explanations | Violet | Mint |

---

# 10. Color Usage Rules

## Primary CTA

Use:

```text
background: #237277
text: #FFFFFF
```

Hover:

```text
#18575A
```

Pressed:

```text
#123E40
```

---

## Secondary CTA

White button:

```text
background: #FFFFFF
border: #BFD3CF
text: #18575A
```

Hover:

```text
background: #EEF8F7
```

---

## Tertiary Action

Use text only:

```text
#237277
```

Never introduce another color simply because a button is tertiary.

---

# 11. Design Tokens

Recommended CSS variables:

```css
:root {
  --background: #F7FAF9;
  --surface: #FFFFFF;
  --surface-subtle: #EEF8F7;
  --surface-muted: #EFF5F3;

  --text-primary: #172825;
  --text-secondary: #40524E;
  --text-muted: #687A75;
  --text-on-brand: #FFFFFF;

  --border: #E3ECE9;
  --border-strong: #CBD9D5;

  --brand-900: #123E40;
  --brand-800: #18575A;
  --brand-700: #237277;
  --brand-600: #2D8E92;
  --brand-500: #3DA5A6;
  --brand-100: #D9F0EE;
  --brand-50: #EEF8F7;

  --info: #2563EB;
  --info-soft: #EAF2FF;

  --success: #169C73;
  --success-soft: #E8F7F1;

  --warning: #D89B22;
  --warning-soft: #FFF6DF;

  --danger: #D96559;
  --danger-soft: #FDECEA;

  --ai: #7457C8;
  --ai-soft: #F2EEFF;

  --shadow-sm: 0 1px 2px rgba(18, 62, 64, 0.05);
  --shadow-md: 0 8px 24px rgba(18, 62, 64, 0.08);
  --shadow-lg: 0 18px 48px rgba(18, 62, 64, 0.12);

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
}
```

---

# 12. Typography

## Primary Typeface

Recommended:

**Inter**

Alternative:

**Manrope**

Use one primary family across the entire application.

Do not mix three or four font families.

---

## Typography Scale

| Token | Size | Weight | Usage |
|---|---:|---:|---|
| Display | 40–48px | 700 | landing/dashboard hero |
| H1 | 32px | 700 | page heading |
| H2 | 24px | 700 | section heading |
| H3 | 20px | 650 | card heading |
| Body Large | 16px | 500 | important copy |
| Body | 14–15px | 450 | normal content |
| Small | 13px | 450 | metadata |
| Caption | 12px | 500 | labels |

### Financial numbers

Important numbers may use:

```text
font-size: 28–36px
font-weight: 700
letter-spacing: -0.02em
```

Large financial numbers should use `tabular-nums`.

---

# 13. Layout System

Use an 8px spacing system.

```text
4px
8px
12px
16px
24px
32px
40px
48px
64px
80px
```

Recommended dashboard spacing:

```text
Page padding:
24px desktop
16px mobile

Card gap:
16px

Section gap:
32px

Major section:
48px
```

---

# 14. Grid System

Desktop:

```text
12-column grid
24px gutter
```

Tablet:

```text
8-column grid
16px gutter
```

Mobile:

```text
4-column grid
12px gutter
```

---

# 15. Radius System

FinBridge should feel modern but not toy-like.

Recommended:

```text
Small controls: 8px
Buttons: 10px
Inputs: 10px
Cards: 16px
Large feature cards: 20px
Modal: 20px
```

Avoid excessive 32px–40px corner radii.

---

# 16. Shadows

Do not rely on dark shadows.

## Small

```css
box-shadow:
0 1px 2px rgba(18, 62, 64, 0.05);
```

## Medium

```css
box-shadow:
0 8px 24px rgba(18, 62, 64, 0.08);
```

## Large

```css
box-shadow:
0 18px 48px rgba(18, 62, 64, 0.12);
```

Borders should carry more visual structure than shadows.

---

# 17. Background Strategy

The application should be white-first.

### Main application

```text
#F7FAF9
```

### Card

```text
#FFFFFF
```

### Highlighted module

```text
#EEF8F7
```

### AI section

```text
#F2EEFF
```

### Warning surface

```text
#FFF6DF
```

### Danger surface

```text
#FDECEA
```

Never place large amounts of saturated color behind dense financial information.

---

# 18. Dashboard Design

## Top Navigation

Structure:

```text
[FinBridge Logo]

Dashboard
Transactions
Analytics
Credit Profile
Loans
Schemes
Coach

                     Notifications
                     Profile
```

Active navigation:

```text
background: #EEF8F7
text: #18575A
icon: #237277
```

---

# 19. Dashboard Hero

Recommended:

```text
Good morning, Rahul

Your business financial snapshot is ready.

[Trust Score 78]
```

Use a subtle mint gradient:

```css
background:
linear-gradient(
  135deg,
  #EEF8F7 0%,
  #FFFFFF 70%
);
```

Avoid strong gradients.

---

# 20. Primary Dashboard Cards

The six core cards:

```text
Revenue
Expenses
Net Cash Flow

Financial Trust Score
Fraud Risk
Prototype Loan Range
```

### Card hierarchy

Label:

```text
12–13px
#687A75
```

Value:

```text
28–32px
#172825
```

Trend:

```text
success → #169C73
negative → #D96559
```

---

# 21. Financial Trust Score Component

This is a hero FinBridge component.

## Visual

Use a semi-circular or circular progress visualization.

Main color:

```text
#237277
```

Supporting arc:

```text
#D9F0EE
```

Example:

```text
78 / 100
Financial Trust Score
```

Below:

```text
Strong financial profile

+ Positive cash flow
+ Stable revenue
+ Low anomaly activity
```

The score should never use red simply because it is below 100.

Semantic interpretation should be contextual.

---

# 22. Score Bands

Suggested prototype presentation:

```text
0–39   → Needs Attention
40–59  → Developing
60–79  → Stable
80–100 → Strong
```

Colors:

```text
Needs Attention → #D96559
Developing      → #D89B22
Stable          → #237277
Strong          → #169C73
```

These are presentation bands, not regulated credit classifications.

---

# 23. Loan Recommendation Card

This should visually dominate the FT-03 experience.

Example:

```text
Prototype Loan Recommendation

₹50K — ₹75K

Estimated EMI
₹7,200 / month

Why this range?

✓ Stable revenue
✓ Positive monthly cash flow
✓ Low transaction risk

Review:
Inventory expenses increased recently.

[Simulate Loan]
[View Explanation]
```

Color:

- Header → Deep Teal
- amount → brand teal
- positive factors → green
- caution → amber

---

# 24. Fraud Alert Cards

Use strong semantic visual cues.

### Low

```text
Mint/Green
```

### Medium

```text
Amber
```

### High

```text
Coral
```

High-risk cards should not fill the entire background with red.

Instead:

```text
white card
+
4px coral left border
+
coral icon
+
soft red badge
```

This keeps the product professional.

---

# 25. Transaction Table

Header:

```text
background: #F7FAF9
text: #687A75
```

Rows:

```text
background: #FFFFFF
border-bottom: #E3ECE9
```

Amount formatting:

Income:

```text
#169C73
```

Expense:

```text
#40524E
```

Suspicious:

```text
#D96559
```

Avoid coloring every amount excessively.

---

# 26. Charts

Charts must be visually consistent.

## Primary series

```text
#237277
```

## Secondary series

```text
#2563EB
```

## Positive

```text
#169C73
```

## Warning

```text
#D89B22
```

## Negative

```text
#D96559
```

## AI / forecast

```text
#7457C8
```

Grid:

```text
#E3ECE9
```

Axis text:

```text
#687A75
```

Chart backgrounds:

```text
transparent
```

---

# 27. Recommended Chart Palette

For multi-series financial charts use:

```text
1. #237277
2. #2563EB
3. #169C73
4. #D89B22
5. #7457C8
6. #D96559
```

Never introduce another random chart color.

---

# 28. Loan Simulator Visual Language

The Loan Simulator should feel interactive.

Layout:

```text
Loan Amount
[==========●====]

Tenure
[=====●========]

          ↓

Monthly EMI
₹7,200

Total Interest
₹11,400

Projected Monthly Surplus
₹19,800
```

Use:

- Teal for controls
- Blue for neutral financial values
- Green for healthy projected surplus
- Amber if repayment burden becomes concerning

---

# 29. Financial Coach

AI should have a distinct visual identity without taking over the brand.

## AI panel

Background:

```text
#F2EEFF
```

Accent:

```text
#7457C8
```

Header:

```text
FinBridge AI Coach
```

Message cards:

White with subtle violet border.

The AI should cite the financial metrics it used:

```text
"Based on your ₹63K monthly surplus and estimated ₹7.2K EMI..."
```

This makes AI feel grounded.

---

# 30. Government Scheme Cards

Use green + amber.

Structure:

```text
Scheme Name

91% Match

✓ Turnover matches
✓ Business type matches
✓ Location appears eligible

! Documentation must be verified

[View Official Source]
```

Match badge:

```text
#E8F7F1
#0B694E
```

Verification badge:

```text
#FFF6DF
#825D0D
```

---

# 31. Form Design

Inputs should feel calm and trustworthy.

Default:

```text
background: #FFFFFF
border: #CBD9D5
text: #172825
```

Focus:

```text
border: #237277
box-shadow:
0 0 0 3px #D9F0EE;
```

Error:

```text
border: #D96559
```

Success:

```text
border: #169C73
```

Never use bright blue focus rings if the rest of the system is teal.

---

# 32. Buttons

## Primary

```text
Background: #237277
Text: #FFFFFF
Hover: #18575A
Pressed: #123E40
```

## Secondary

```text
Background: #FFFFFF
Text: #18575A
Border: #BFD3CF
Hover: #EEF8F7
```

## AI

```text
Background: #7457C8
Text: #FFFFFF
Hover: #6045AD
```

## Danger

```text
Background: #D96559
Text: #FFFFFF
Hover: #B84F46
```

Do not use red for normal "Cancel" buttons.

---

# 33. Navigation Color Rules

Sidebar:

```text
background: #FFFFFF
border-right: #E3ECE9
```

Default item:

```text
#40524E
```

Hover:

```text
#EEF8F7
```

Active:

```text
background: #D9F0EE
color: #18575A
```

Selected icon:

```text
#237277
```

---

# 34. Iconography

Use one icon family.

Recommended:

**Lucide React**

Icon rules:

- default: 18–20px
- cards: 20–22px
- hero: 24–28px
- use stroke icons
- avoid mixing filled and line styles randomly

Semantic icon colors should match semantic colors.

---

# 35. Illustration Style

The presentation reference contains friendly illustrated visual assets and a mint/teal environment. The product website should use a more refined version of this approach.

Preferred style:

- clean vector illustration
- soft mint
- teal
- warm amber
- small coral accents
- white negative space

Avoid:

- hyper-realistic stock finance photos
- cliché handshake photographs
- excessive 3D crypto-style art

---

# 36. Logo Treatment

FinBridge logo should work in:

### Primary

```text
Deep Teal logo
on white
```

### Inverse

```text
White logo
on Deep Teal
```

### App icon

Use a simplified symbol combining:

- bridge / connection
- financial upward movement
- subtle F shape

Keep icon simple enough to work at 24px.

---

# 37. Micro-interactions

Motion should communicate system state.

Recommended duration:

```text
Fast: 120ms
Normal: 180ms
Emphasis: 240ms
```

Use:

```text
ease-out
```

Good animations:

- card hover elevation
- Trust Score count-up
- chart draw-in
- loan simulator number transition
- toast appearance
- navigation selection

Avoid:

- bouncing buttons
- excessive parallax
- spinning financial numbers
- constant pulsing

---

# 38. Loading States

Use skeletons rather than spinners whenever content structure is known.

Example:

```text
██████████████
████████
██████████████████
```

Skeleton:

```text
#EAF1EF
```

Do not use brand green as a skeleton.

---

# 39. Empty States

Every empty state needs:

1. explanation
2. next action

Example:

```text
No transactions yet

Upload your transaction CSV to generate your
financial health profile.

[Upload Transactions]
```

Illustration:

Soft mint + teal.

---

# 40. Toasts

Success:

```text
Green
```

Warning:

```text
Amber
```

Error:

```text
Coral
```

Info:

```text
Blue
```

AI:

```text
Violet
```

Use small colored icon + neutral white container.

---

# 41. Accessibility

Target:

**WCAG 2.2 AA where practical.**

Rules:

- never rely on color alone
- pair color with icon/text
- maintain readable contrast
- provide keyboard focus
- use 44px minimum touch target where practical
- avoid low-contrast mint text
- do not use pale teal for body copy

Good text:

```text
#172825
```

Bad:

```text
#A7C7C3
```

for normal body text.

---

# 42. Contrast Rules

On white:

Use:

```text
#123E40
#18575A
#237277
#172825
#40524E
```

Do not use:

```text
#3DA5A6
```

for small body text.

It is better as an accent.

---

# 43. Responsive Strategy

## Desktop

12-column layout.

Sidebar visible.

Dense dashboard cards allowed.

---

## Tablet

Sidebar collapses.

Cards become 2-column.

---

## Mobile

Order:

```text
Trust Score
↓
Loan Recommendation
↓
Cash Flow
↓
Fraud Risk
↓
Analytics
↓
Schemes
↓
Coach
```

The FT-03 experience must remain obvious even on mobile.

---

# 44. Page-by-Page Visual Specification

## Dashboard

Primary color:
Teal

Hero:
Mint → White

Main emphasis:
Trust Score + Loan Recommendation

Secondary:
Analytics + Fraud + Schemes

---

## Transactions

Primary:
Blue + Teal

Emphasis:
Search, filter, anomaly flags

---

## Analytics

Primary:
Teal + Blue

Emphasis:
Charts and financial trends

---

## Fraud Alerts

Primary:
Coral + Amber

Emphasis:
Reason visibility

---

## Credit Profile

Primary:
Teal + Green

Emphasis:
Trust Score explanation

---

## Loan

Primary:
Deep Teal

Emphasis:
Loan amount + recommendation

---

## Loan Simulator

Primary:
Teal

Secondary:
Blue

Warning:
Amber

Healthy outcome:
Green

---

## Schemes

Primary:
Green

Secondary:
Amber

---

## Financial Coach

Primary:
Violet

Supporting:
Mint + White

---

# 45. FinBridge Visual Hierarchy

Always prioritize in this sequence:

```text
1. What should I do?
2. Why?
3. What does the data say?
4. What risk exists?
5. What happens next?
```

For example:

```text
Recommended Loan Range
       ↓
Why this range?
       ↓
Trust Score
       ↓
Financial Metrics
       ↓
Risks / Cautions
       ↓
Simulate
```

---

# 46. Component Color Contract

Every component should have a defined semantic owner.

| Component | Default | Hover | Active | Error | Success |
|---|---|---|---|---|---|
| Button | Teal | Dark Teal | Deep Teal | Coral | Green |
| Input | White | Mint | Teal border | Coral | Green |
| Card | White | subtle shadow | Teal border | Coral border | Green border |
| Badge | Neutral | — | — | Semantic | Semantic |
| Chart | Teal | — | — | Coral series | Green series |
| Alert | Neutral | — | — | Coral | Green |
| AI block | Violet | Dark Violet | Deep Violet | — | — |

---

# 47. Dark Color Restrictions

The product is intentionally light-first.

Dark surfaces may be used only for:

- code snippets
- advanced data views
- developer/debug views
- optional modal emphasis
- footer

Do not introduce a dark mode during the 48-hour MVP unless the rest of the system is already complete.

---

# 48. Gradient Rules

Use gradients only for large hero areas.

Recommended:

```css
background:
linear-gradient(
  135deg,
  #EEF8F7 0%,
  #FFFFFF 68%,
  #F7FAF9 100%
);
```

AI:

```css
background:
linear-gradient(
  135deg,
  #F2EEFF 0%,
  #FFFFFF 78%
);
```

Do not use gradients on:

- table rows
- buttons
- badges
- inputs
- small cards

---

# 49. Financial Visualization Standards

Numbers should always show:

- unit
- trend
- timeframe
- comparison when available

Good:

```text
₹1.82L
Monthly revenue
+8.4% vs previous month
```

Bad:

```text
₹1.82L
```

without context.

---

# 50. Number Formatting

Use Indian number formatting for this project.

Examples:

```text
₹75,000
₹1.82L
₹12.4L
₹1.15Cr
```

Rules:

- use ₹ symbol
- use Indian grouping
- keep decimal precision low
- avoid excessive decimals

---

# 51. Status Labels

Use text + icon.

Examples:

```text
● Healthy
⚠ Review Needed
▲ High Risk
✓ Complete
ⓘ Informational
✦ AI Insight
```

Icons should come from Lucide, not emoji in production UI.

---

# 52. AI Trust Rules

AI explanations should visually communicate:

```text
AI-generated explanation
```

but never:

```text
AI-decided loan approval
```

Recommended label:

```text
✦ AI Insight
Based on your financial profile...
```

This creates transparency.

---

# 53. Fraud UX Rules

When a transaction is flagged:

DO:

```text
HIGH RISK

₹48,000

Why?
• Above historical transaction range
• New merchant
• Unusual transaction time
```

DO NOT:

```text
FRAUD!!!
```

The model reports a risk signal, not a final accusation.

---

# 54. Financial Trust Score UX Rules

Always show:

```text
Score
+
Component breakdown
+
Reasons
+
Improvement actions
```

Example:

```text
78 / 100

Strengths
✓ Revenue stability
✓ Positive cash flow

Improve
→ Reduce expense volatility
→ Maintain consistent repayment behavior
```

---

# 55. Design System File Structure

Recommended frontend:

```text
src/
  styles/
    tokens.css
    globals.css

  components/
    ui/
      Button.tsx
      Input.tsx
      Card.tsx
      Badge.tsx
      Modal.tsx
      Toast.tsx

    fintech/
      MetricCard.tsx
      TrustScore.tsx
      LoanRecommendation.tsx
      FraudAlert.tsx
      TransactionTable.tsx
      CashFlowChart.tsx
      SchemeCard.tsx
      AIInsight.tsx
      CoachMessage.tsx
```

---

# 56. Tailwind Mapping

Recommended semantic colors:

```ts
colors: {
  brand: {
    50: '#EEF8F7',
    100: '#D9F0EE',
    500: '#3DA5A6',
    600: '#2D8E92',
    700: '#237277',
    800: '#18575A',
    900: '#123E40',
  },

  info: {
    DEFAULT: '#2563EB',
    soft: '#EAF2FF',
  },

  success: {
    DEFAULT: '#169C73',
    soft: '#E8F7F1',
  },

  warning: {
    DEFAULT: '#D89B22',
    soft: '#FFF6DF',
  },

  danger: {
    DEFAULT: '#D96559',
    soft: '#FDECEA',
  },

  ai: {
    DEFAULT: '#7457C8',
    soft: '#F2EEFF',
  },
}
```

---

# 57. Do Not Add Colors Without a Reason

Before introducing a new color ask:

1. What semantic meaning does it represent?
2. Does that meaning already have a color?
3. Does it conflict with existing meanings?
4. Does it pass accessibility checks?
5. Does it work against white and mint surfaces?

If the answer to any of these is unclear, do not add the color.

---

# 58. Design "Unfair Advantage"

The visual design itself should reinforce FinBridge's central product idea:

```text
Financial Data
      ↓
Financial Intelligence
      ↓
Trust
      ↓
Access to Capital
```

The UI should therefore move visually:

```text
Mint / neutral
      ↓
Teal
      ↓
Green
```

when a user's financial state becomes healthier.

Risk should move:

```text
Neutral
      ↓
Amber
      ↓
Coral
```

AI should remain:

```text
Violet
```

across the product.

This gives the product a consistent "visual language of finance".

---

# 59. Final Master Palette

```text
══════════════════════════════════════════
FINBRIDGE MASTER PALETTE
══════════════════════════════════════════

BRAND
#123E40  Deep Teal
#18575A  Ocean Teal
#237277  FinBridge Teal
#2D8E92  Active Teal
#3DA5A6  Fresh Teal

MINT
#D9F0EE  Pale Mint
#EEF8F7  Mist Mint

SURFACE
#FFFFFF  White
#FCFEFD  Warm White
#F7FAF9  App Background
#EFF5F3  Subtle Surface
#E3ECE9  Border
#CBD9D5  Strong Border

TEXT
#172825  Primary
#40524E  Secondary
#687A75  Muted

SEMANTIC
#169C73  Success
#D89B22  Warning
#D96559  Danger
#2563EB  Info
#7457C8  AI

SEMANTIC SOFT
#E8F7F1  Success Soft
#FFF6DF  Warning Soft
#FDECEA  Danger Soft
#EAF2FF  Info Soft
#F2EEFF  AI Soft
══════════════════════════════════════════
```

---

# 60. Final UI Rule

Every FinBridge screen should pass this visual test:

### Does it feel trustworthy?

→ White + Deep Teal

### Does it feel intelligent?

→ Teal + structured data + restrained AI violet

### Does it feel alive?

→ Mint + small accent moments

### Does it feel financially responsible?

→ Semantic colors are meaningful, never decorative

### Does it feel like one product?

→ Same typography, spacing, radius, border, shadow, icon and color system everywhere

---

# 61. One-Line Design Direction

> **FinBridge should feel like a premium digital bank dashboard redesigned for underserved businesses — calm, intelligent, transparent, human and unmistakably modern.**

That is the visual standard this design system should enforce across the entire website.
