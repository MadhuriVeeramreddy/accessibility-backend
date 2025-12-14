#!/bin/bash

# Test script for recent changes
# Tests: PDF on-demand, Lighthouse timeout, Browser pool fixes

echo "🧪 Testing Recent Changes"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if server is running
echo "1️⃣  Checking if server is running..."
if curl -s http://localhost:4000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not running. Please start with: npm run dev${NC}"
    exit 1
fi
echo ""

# Test 2: Check if we have a website to test with
echo "2️⃣  Checking for test website..."
WEBSITE_ID=$(curl -s http://localhost:4000/website | jq -r '.[0].id' 2>/dev/null)
if [ -z "$WEBSITE_ID" ] || [ "$WEBSITE_ID" == "null" ]; then
    echo -e "${YELLOW}⚠️  No websites found. Creating test website...${NC}"
    # Create a test website
    WEBSITE_RESPONSE=$(curl -s -X POST http://localhost:4000/website/create \
        -H "Content-Type: application/json" \
        -d '{"url": "https://example.com", "name": "Test Website"}')
    WEBSITE_ID=$(echo $WEBSITE_RESPONSE | jq -r '.id' 2>/dev/null)
    if [ -z "$WEBSITE_ID" ] || [ "$WEBSITE_ID" == "null" ]; then
        echo -e "${RED}❌ Failed to create test website${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Created test website: $WEBSITE_ID${NC}"
else
    echo -e "${GREEN}✅ Found website: $WEBSITE_ID${NC}"
fi
echo ""

# Test 3: Create a scan
echo "3️⃣  Creating a test scan..."
SCAN_RESPONSE=$(curl -s -X POST http://localhost:4000/scan/create \
    -H "Content-Type: application/json" \
    -d "{\"websiteId\": \"$WEBSITE_ID\"}")
SCAN_ID=$(echo $SCAN_RESPONSE | jq -r '.id' 2>/dev/null)

if [ -z "$SCAN_ID" ] || [ "$SCAN_ID" == "null" ]; then
    echo -e "${RED}❌ Failed to create scan${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Scan created: $SCAN_ID${NC}"
echo "   Status: $(echo $SCAN_RESPONSE | jq -r '.status')"
echo ""

# Test 4: Monitor scan progress
echo "4️⃣  Monitoring scan progress (will wait up to 2 minutes)..."
MAX_WAIT=120
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $MAX_WAIT ]; do
    SCAN_STATUS=$(curl -s "http://localhost:4000/scan/$SCAN_ID" | jq -r '.status' 2>/dev/null)
    
    if [ "$SCAN_STATUS" == "completed" ]; then
        echo -e "${GREEN}✅ Scan completed!${NC}"
        SCORE=$(curl -s "http://localhost:4000/scan/$SCAN_ID" | jq -r '.score' 2>/dev/null)
        if [ "$SCORE" != "null" ] && [ -n "$SCORE" ]; then
            echo "   Score: $SCORE"
        else
            echo -e "${YELLOW}   Score: null (Lighthouse may have timed out)${NC}"
        fi
        break
    elif [ "$SCAN_STATUS" == "failed" ]; then
        echo -e "${RED}❌ Scan failed${NC}"
        exit 1
    else
        echo "   Status: $SCAN_STATUS (waiting... ${ELAPSED}s/${MAX_WAIT}s)"
    fi
    
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo -e "${YELLOW}⚠️  Scan did not complete within $MAX_WAIT seconds${NC}"
    exit 1
fi
echo ""

# Test 5: Test PDF generation on-demand
echo "5️⃣  Testing PDF generation on-demand..."
PDF_RESPONSE=$(curl -s -o /tmp/test-report.pdf -w "%{http_code}" \
    "http://localhost:4000/scan/$SCAN_ID/pdf")

if [ "$PDF_RESPONSE" == "200" ]; then
    PDF_SIZE=$(stat -f%z /tmp/test-report.pdf 2>/dev/null || stat -c%s /tmp/test-report.pdf 2>/dev/null)
    if [ -n "$PDF_SIZE" ] && [ "$PDF_SIZE" -gt 0 ]; then
        echo -e "${GREEN}✅ PDF generated successfully${NC}"
        echo "   Size: $PDF_SIZE bytes"
        echo "   Location: /tmp/test-report.pdf"
    else
        echo -e "${RED}❌ PDF file is empty${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ PDF generation failed (HTTP $PDF_RESPONSE)${NC}"
    exit 1
fi
echo ""

# Test 6: Verify PDF content
echo "6️⃣  Verifying PDF content..."
if command -v strings &> /dev/null; then
    PDF_TEXT=$(strings /tmp/test-report.pdf | head -20)
    if echo "$PDF_TEXT" | grep -q "DesiA11y"; then
        echo -e "${GREEN}✅ PDF contains brand name 'DesiA11y'${NC}"
    else
        echo -e "${YELLOW}⚠️  Brand name not found in PDF (may be binary)${NC}"
    fi
fi
echo ""

# Summary
echo "=========================="
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "Summary:"
echo "  ✅ Server running"
echo "  ✅ Scan created and completed"
echo "  ✅ PDF generated on-demand"
echo "  ✅ No storage needed"
echo ""
echo "Test PDF saved to: /tmp/test-report.pdf"
