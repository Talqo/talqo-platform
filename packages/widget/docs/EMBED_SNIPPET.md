# Embedding the AI Widget

Add the AI assistant to your website with just a few lines of code.

## Quick Start

Add this snippet to your website's HTML, just before the closing `</body>` tag:

```html
<!-- AI Widget Configuration -->
<script>
  window.__AI_WIDGET_CONFIG__ = {
    clientId: "YOUR_CLIENT_ID", // Required: Get this from your dashboard
    position: "right",          // Optional: "left" or "right" (default: right)
    defaultOpen: false,         // Optional: Start open or closed (default: false)
    botName: "AI Assistant",    // Optional: Name shown in widget header
    colors: {                   // Optional: Customize light mode colors
      primary: "#16a34a",       // Buttons, user messages (default: green)
      bgPrimary: "#ffffff",     // Chat background (default: white)
      bgSecondary: "#f3f4f6",   // Header, bot messages (default: light gray)
      textPrimary: "#111827",   // Main text (default: dark gray)
      textSecondary: "#6b7280", // Footer, placeholders (default: medium gray)
      border: "#e5e7eb"         // Borders (default: light gray)
    },
    darkColors: {               // Optional: Customize dark mode colors
      primary: "#16a34a",       // Buttons, user messages (default: green)
      bgPrimary: "#09090b",     // Chat background (default: black)
      bgSecondary: "#27272a",   // Header, bot messages (default: dark gray)
      textPrimary: "#fafafa",   // Main text (default: white)
      textSecondary: "#a1a1aa", // Footer, placeholders (default: light gray)
      border: "#27272a"         // Borders (default: dark gray)
    },
    icons: {                    // Optional: Custom SVG icon for bot avatar
      botAvatar: "bot"          // Default "bot" icon, or use custom SVG string
    }
  };
</script>

<!-- Load Widget from GitHub raw URL -->
<script async defer src="https://raw.githubusercontent.com/yourorg/pagepal/main/packages/widget/dist/widget-bundle.js"></script>
```

Replace `YOUR_CLIENT_ID` with your actual client ID from the dashboard.

## Configuration Options

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `clientId` | `string` | Your unique client identifier from the dashboard |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `position` | `"left" \| "right"` | `"right"` | Which corner the widget appears in |
| `defaultOpen` | `boolean` | `false` | Whether the chat starts open |
| `botName` | `string` | `"AI Assistant"` | Name shown in widget header |
| `colors` | `object` | See below | Customize light mode colors |
| `darkColors` | `object` | Auto-generated | Customize dark mode colors |
| `icons` | `object` | `{ botAvatar: "bot" }` | Custom SVG icon for bot avatar |

### Color Options

All color values accept any valid CSS color (hex, rgb, hsl, named colors):

**Light Mode (`colors`)**

| Color | Default | Used For |
|-------|---------|----------|
| `primary` | `#16a34a` | Send button, user message bubbles, trigger button |
| `bgPrimary` | `#ffffff` | Chat panel background |
| `bgSecondary` | `#f3f4f6` | Header background, bot message bubbles |
| `textPrimary` | `#111827` | Main text in messages |
| `textSecondary` | `#6b7280` | Footer text, input placeholder |
| `border` | `#e5e7eb` | Input borders, dividers |

**Dark Mode (`darkColors`)**

| Color | Default | Used For |
|-------|---------|----------|
| `primary` | `#16a34a` | Send button, user message bubbles, trigger button |
| `bgPrimary` | `#09090b` | Chat panel background |
| `bgSecondary` | `#27272a` | Header background, bot message bubbles |
| `textPrimary` | `#fafafa` | Main text in messages |
| `textSecondary` | `#a1a1aa` | Footer text, input placeholder |
| `border` | `#27272a` | Input borders, dividers |

### Custom Icons

The `icons` object allows you to customize the bot's avatar:

```javascript
icons: {
  // Use the default bot icon
  botAvatar: "bot",

  // Or provide a custom SVG string
  botAvatar: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='10'/><path d='M9 10h.01'/><path d='M15 10h.01'/><path d='M10 14c.5 1 2 1.5 4 1.5'/></svg>"
}
```

**Important for custom SVG icons:**
- Use `currentColor` for stroke/fill to inherit theme colors
- Avoid `width` and `height` attributes for proper scaling
- Keep the SVG simple and optimized

## Dark Mode

The widget automatically detects dark mode by checking for a `dark` class on the `<html>` or `<body>` element. Users can also manually toggle dark mode within the chat header.

If `darkColors` is not specified, the widget will auto-generate appropriate dark colors from your light theme.

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

## Troubleshooting

### Widget doesn't appear

1. Check the browser console for errors
2. Verify your `clientId` is correct
3. Ensure the script URL is correct and accessible

### Styles look wrong

- Check that color values are valid CSS colors
- Ensure no other CSS on your page has conflicting selectors

### CORS errors

GitHub raw URLs serve content with appropriate CORS headers. If you see CORS errors, try refreshing the page or use a different hosting solution for production.
