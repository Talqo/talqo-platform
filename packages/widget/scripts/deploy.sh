#!/bin/bash

# S3 Deployment Script for AI Widget
# Usage: ./scripts/deploy.sh [bucket-name]

set -e

BUCKET_NAME="${1:-your-widget-bucket}"
BUNDLE_PATH="dist/widget-bundle.js"
REGION="${AWS_REGION:-eu-central-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Deploying widget to S3...${NC}"

# Check if bundle exists
if [ ! -f "$BUNDLE_PATH" ]; then
    echo -e "${RED}Error: Bundle not found at $BUNDLE_PATH${NC}"
    echo "Run 'bun run build' first"
    exit 1
fi

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Upload to S3 with proper headers
echo -e "${YELLOW}Uploading to s3://$BUCKET_NAME/widget-bundle.js${NC}"

aws s3 cp "$BUNDLE_PATH" "s3://$BUCKET_NAME/widget-bundle.js" \
    --content-type "application/javascript" \
    --cache-control "max-age=3600" \
    --region "$REGION"

echo -e "${GREEN}Upload successful!${NC}"
echo ""
echo "Widget URL: https://s3.$REGION.amazonaws.com/$BUCKET_NAME/widget-bundle.js"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "1. Ensure S3 bucket has CORS configured to allow GET from *"
echo "2. Consider using CloudFront for CDN distribution"
echo "3. For production, set Cache-Control to a longer value (e.g., max-age=86400)"
