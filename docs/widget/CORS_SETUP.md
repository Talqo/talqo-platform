# Widget Hosting and CORS

## Production Hosting

The widget is served directly from the Talqo domain:

```html
<script async defer src="https://talqo.chat/widget-bundle.js"></script>
```

This ensures the widget is:

- Always available alongside the API
- Versioned with each deployment
- Served with proper CORS headers for cross-origin embedding

## Self-Hosting (Alternative)

If you prefer to host the widget yourself, you can download the bundle and serve it from your own CDN or static hosting:

```html
<!-- Self-hosted widget -->
<script async defer src="https://your-cdn.com/path/to/widget-bundle.js"></script>
```

When self-hosting, configure your server to send these CORS headers:

```
Access-Control-Allow-Origin: *
Content-Type: application/javascript
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

## Troubleshooting

### CORS errors

If you see CORS errors:

1. Verify the `widget-bundle.js` URL is correct
2. Check that the Talqo domain is accessible
3. For self-hosted setups, ensure the server sends `Access-Control-Allow-Origin: *`
