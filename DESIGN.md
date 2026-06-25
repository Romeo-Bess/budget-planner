---
name: Sophisticated Professional Dashboard
colors:
  surface: '#faf8ff'
  surface-dim: '#d0d8ff'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f2ff'
  surface-container: '#ebedff'
  surface-container-high: '#e3e7ff'
  surface-container-highest: '#dce1ff'
  on-surface: '#0e193b'
  on-surface-variant: '#47464c'
  inverse-surface: '#242f51'
  inverse-on-surface: '#eff0ff'
  outline: '#77767c'
  outline-variant: '#c8c5cc'
  surface-tint: '#5d5d6a'
  primary: '#000004'
  on-primary: '#ffffff'
  primary-container: '#1a1b26'
  on-primary-container: '#838391'
  inverse-primary: '#c6c5d4'
  secondary: '#006b60'
  on-secondary: '#ffffff'
  secondary-container: '#8bf2e1'
  on-secondary-container: '#006f64'
  tertiary: '#030000'
  on-tertiary: '#ffffff'
  tertiary-container: '#41000c'
  on-tertiary-container: '#d1606a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e1f1'
  primary-fixed-dim: '#c6c5d4'
  on-primary-fixed: '#1a1b26'
  on-primary-fixed-variant: '#454652'
  secondary-fixed: '#8ef4e4'
  secondary-fixed-dim: '#71d8c8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#ffb3b6'
  on-tertiary-fixed: '#40000c'
  on-tertiary-fixed-variant: '#822430'
  background: '#faf8ff'
  on-background: '#0e193b'
  surface-variant: '#dce1ff'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max-width: 1280px
  gutter: 24px
  margin-desktop: 48px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The brand personality is authoritative yet approachable, reflecting the precision required for personal finance with a modern, South African tech-forward edge. The target audience consists of professionals seeking a high-clarity overview of their wealth without the friction of traditional banking interfaces. 

The design style is a hybrid of **Minimalism** and **Glassmorphism**. While maintaining the depth of translucent layers, this version pivots to a "Light Mode" execution to provide a clean, high-energy, and paper-like clarity. Surfaces utilize subtle translucent overlays and backdrop blurs to create depth, ensuring the UI feels layered rather than flat. High contrast is maintained through crisp dark typography against a luminous foundation, punctuated by strategic neon and jewel-toned accents for immediate data interpretation.

## Colors
This design system utilizes a sophisticated light palette optimized for clarity and financial status tracking.
- **Base Background**: A clean, light foundation provides a bright workspace that reduces visual weight.
- **Primary Accents**: Deep Slate (#1A1B26) is used for primary brand elements, key buttons, and high-level navigation to provide grounding and authority.
- **Secondary Accents**: Mint Green (#73DACA) is used exclusively for positive financial indicators, income, and growth.
- **Negative Accents**: Muted Sunset Orange (#E06C75) highlights expenses, debt, and negative trends.
- **Neutral/Text**: The deep slate primary color doubles as the primary text color for maximum legibility. Subdued text and secondary labels use a soft lavender-grey (#C0CAF5) to maintain hierarchy.

## Typography
Inter is selected for its exceptional legibility in data-heavy environments. 
- **Currency Formatting**: All ZAR amounts should follow the format "R 1 234,56" using a non-breaking space as a thousands separator and a comma for decimals. 
- **Visual Hierarchy**: Use `headline-xl` for total net worth or account balances. Use `label-md` for table headers and category descriptors to differentiate them from interactive data. 
- **Contrast**: Secondary information (e.g., timestamps, account numbers) should be rendered in `label-sm` with a lower opacity (60-70%) to keep the focus on the primary figures.

## Layout & Spacing
The design system employs a **Fixed Grid** approach for desktop dashboards to ensure data visualizations remain consistent. 
- **Desktop**: 12-column grid with a 1280px max-width, 24px gutters, and 48px side margins.
- **Tablet**: 8-column grid with 24px margins.
- **Mobile**: 4-column grid with 16px margins. 
The spacing rhythm is built on an 8px base unit. Card containers use a uniform 24px internal padding to provide "breathability" for complex financial charts. Avoid clutter by utilizing the `stack-lg` (32px) spacing between distinct functional modules (e.g., moving from "Account Overview" to "Recent Transactions").

## Elevation & Depth
Depth is created through **Glassmorphism** and tonal layering, adapted for a light interface.
- **Level 0 (Base)**: The light neutral background.
- **Level 1 (Cards/Panels)**: White translucent overlays with a `backdrop-filter: blur(12px)` and very low opacity shadows to suggest elevation.
- **Level 2 (Modals/Popovers)**: Solid white surfaces with a 1px subtle border to define edges against the light background.
- **Shadows**: Use "Ambient Shadows" only for Level 2 elements. These should be ultra-diffused: `0px 20px 40px rgba(26, 27, 38, 0.1)`. No shadows are used on primary dashboard cards to maintain a sharp, minimalist aesthetic.

## Shapes
The shape language is "Soft" yet precise.
- **Small Elements (Inputs, Buttons)**: 0.25rem (4px) corner radius to maintain a professional, sharp look.
- **Containers (Cards, Sections)**: 0.5rem (8px) corner radius.
- **Selection Indicators**: Use a vertical 2px pill-shaped bar on the left side of active navigation items or list selections to indicate focus without adding bulk to the layout.

## Components
- **Buttons**: Primary buttons are solid Deep Slate (#1A1B26) with white text for high contrast. Secondary buttons are ghost-style with a 1px slate border.
- **Cards**: Glassmorphic panels with a 1px `black/5%` border to simulate definition on the light canvas.
- **Input Fields**: Slightly lighter or darker than the background for contrast, 4px radius, with a Deep Slate 1px border only when focused. Labels should always be visible above the input in `label-sm`.
- **Chips/Status Labels**: Small, capsules with 4px radius. "Positive" uses a Mint Green background at 15% opacity with Mint Green text. "Negative" uses Muted Sunset Orange at 15% opacity with Orange text.
- **Lists**: Transaction lists should be borderless, using alternating background tints (2% variance) for row separation.
- **Data Visuals**: Line charts use a 2px stroke width. The area under the line should use a subtle gradient fading into the light background.