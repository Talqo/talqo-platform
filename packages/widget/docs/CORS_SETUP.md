# S3 CORS Configuration

Your S3 bucket must allow cross-origin requests for the widget to work on customer websites.

## AWS S3 CORS Configuration

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

## Via AWS Console

1. Go to S3 Your bucket Permissions tab
2. Scroll to "Cross-origin resource sharing (CORS)"
3. Click Edit
4. Paste the JSON above
5. Save changes

## Via AWS CLI

```bash
aws s3api put-bucket-cors \
    --bucket your-widget-bucket \
    --cors-configuration file://cors.json
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

## CloudFront (Recommended for Production)

For production, use CloudFront in front of S3:

1. Create a CloudFront distribution
2. Set origin to your S3 bucket
3. Enable CORS in the distribution settings
4. Use the CloudFront URL instead of the direct S3 URL

This provides:
- Global CDN caching
- HTTPS by default
- Better performance
- Custom domain support
