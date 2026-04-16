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
    colors: {                   // Optional: Customize colors
      primary: "#10b981",       // Buttons, user messages (default: green)
      bgPrimary: "#ffffff",     // Chat background (default: white)
      bgSecondary: "#f4f4f5",   // Header, bot messages (default: light gray)
      textPrimary: "#18181b",   // Main text (default: dark gray)
      textSecondary: "#71717a", // Footer, placeholders (default: medium gray)
      border: "#e4e4e7"         // Borders (default: light gray)
    }
  };
</script>

<!-- Load Widget -->
<script async defer src="https://s3.eu-central-1.amazonaws.com/your-bucket/widget-bundle.js"></script>
```

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
| `colors` | `object` | See below | Customize the widget appearance |

### Color Options

All color values accept any valid CSS color (hex, rgb, hsl, named colors):

| Color | Default | Used For |
|-------|---------|----------|
| `primary` | `#10b981` | Send button, user message bubbles, trigger button |
| `bgPrimary` | `#ffffff` | Chat panel background |
| `bgSecondary` | `#f4f4f5` | Header background, bot message bubbles |
| `textPrimary` | `#18181b` | Main text in messages |
| `textSecondary` | `#71717a` | Footer text, input placeholder |
| `border` | `#e4e4e7` | Input borders, dividers |

## Example: Custom Branded Widget

```html
<script>
  window.__AI_WIDGET_CONFIG__ = {
    clientId: "client-abc-123",
    position: "left",
    colors: {
      primary: "#8b5cf6",       // Purple brand color
      bgPrimary: "#fafafa",     // Slightly off-white
      bgSecondary: "#e2e8f0",   // Slate gray
      textPrimary: "#1e293b",
      textSecondary: "#64748b",
      border: "#cbd5e1"
    }
  };
</script>
<script async defer src="https://s3.eu-central-1.amazonaws.com/your-bucket/widget-bundle.js"></script>
```

## Dark Mode

The widget determines theme by checking for a "dark" class on the parent document's root element (or falls back to the provided `defaultTheme` option). Users can also manually toggle dark mode within the chat header using the `toggleTheme()` method.

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

If you see CORS errors in the console, the S3 bucket hosting the widget needs to be configured to allow requests from your domain. Contact support if this persists.
