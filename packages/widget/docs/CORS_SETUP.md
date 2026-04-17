# S3 CORS Configuration

## Recommended: GitHub Raw URLs (Development)

The simplest way to serve the widget bundle during development is directly from GitHub raw URLs:

```html
<script async defer src="https://raw.githubusercontent.com/yourorg/pagepal/main/packages/widget/dist/widget-bundle.js"></script>
```

GitHub raw URLs serve content with appropriate CORS headers, making them suitable for development and testing without any additional configuration.

---

## S3/MinIO CORS Configuration (Production)

For production use with S3 or S3-compatible storage like MinIO, you need to configure CORS.

### Generic S3 CORS Configuration

Add this CORS configuration to your S3 bucket:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["Content-Type", "Content-Length"],
        "MaxAgeSeconds": 3600
    }
]
```

### Via S3 Console (AWS S3, MinIO, etc.)

1. Go to your bucket's Permissions/CORS settings
2. Add or edit CORS rules
3. Paste the JSON configuration above
4. Save changes

### Via MinIO Client (mc)

If using MinIO:

```bash
# Set alias for your MinIO server
mc alias set myminio http://localhost:9000 ACCESS_KEY SECRET_KEY

# Apply CORS configuration from file
mc admin bucket set myminio/your-bucket cors.json
```

Where `cors.json` contains:

```json
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["Content-Type", "Content-Length"],
            "MaxAgeSeconds": 3600
        }
    ]
}
```
