#!/bin/bash

# Test script for https://prodontics.in/

echo "🧪 Testing Scan for https://prodontics.in/"
echo "=========================================="
echo ""

BASE_URL="http://localhost:4000/api/v1"

# Step 1: Create or get website
echo "1️⃣  Creating website..."
WEBSITE_RESPONSE=$(curl -s -X POST "$BASE_URL/website/create" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://prodontics.in/", "name": "Prodontics Dental Clinic"}')

WEBSITE_ID=$(echo "$WEBSITE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$WEBSITE_ID" ]; then
    echo "❌ Failed to create website"
    echo "Response: $WEBSITE_RESPONSE"
    exit 1
fi

echo "✅ Website created: $WEBSITE_ID"
echo ""

# Step 2: Create scan
echo "2️⃣  Creating scan..."
SCAN_RESPONSE=$(curl -s -X POST "$BASE_URL/scan/create" \
  -H "Content-Type: application/json" \
  -d "{\"websiteId\": \"$WEBSITE_ID\"}")

SCAN_ID=$(echo "$SCAN_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SCAN_ID" ]; then
    echo "❌ Failed to create scan"
    echo "Response: $SCAN_RESPONSE"
    exit 1
fi

echo "✅ Scan created: $SCAN_ID"
echo "   Status: $(echo "$SCAN_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
echo ""

# Step 3: Monitor scan progress
echo "3️⃣  Monitoring scan progress (max 2 minutes)..."
MAX_WAIT=120
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $MAX_WAIT ]; do
    SCAN_DATA=$(curl -s "$BASE_URL/scan/$SCAN_ID")
    STATUS=$(echo "$SCAN_DATA" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    SCORE=$(echo "$SCAN_DATA" | grep -o '"score":[0-9]*' | cut -d':' -f2)
    
    echo "[${ELAPSED}s] Status: $STATUS ${SCORE:+Score: $SCORE}"
    
    if [ "$STATUS" == "completed" ]; then
        echo ""
        echo "✅ Scan completed!"
        echo "   Score: ${SCORE:-null}"
        break
    elif [ "$STATUS" == "failed" ]; then
        echo ""
        echo "❌ Scan failed"
        echo "   Data: $SCAN_DATA"
        exit 1
    fi
    
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo ""
    echo "⚠️  Scan did not complete within $MAX_WAIT seconds"
    exit 1
fi

echo ""

# Step 4: Test PDF generation
echo "4️⃣  Testing PDF generation (on-demand)..."
PDF_STATUS=$(curl -s -o /tmp/prodontics-report.pdf -w "%{http_code}" \
    "$BASE_URL/scan/$SCAN_ID/pdf")

if [ "$PDF_STATUS" == "200" ]; then
    PDF_SIZE=$(stat -f%z /tmp/prodontics-report.pdf 2>/dev/null || stat -c%s /tmp/prodontics-report.pdf 2>/dev/null)
    if [ -n "$PDF_SIZE" ] && [ "$PDF_SIZE" -gt 0 ]; then
        echo "✅ PDF generated successfully"
        echo "   Size: $PDF_SIZE bytes"
        echo "   Location: /tmp/prodontics-report.pdf"
    else
        echo "❌ PDF file is empty"
        exit 1
    fi
else
    echo "❌ PDF generation failed (HTTP $PDF_STATUS)"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ All tests passed!"
echo ""
echo "Summary:"
echo "  Website ID: $WEBSITE_ID"
echo "  Scan ID: $SCAN_ID"
echo "  Status: completed"
echo "  Score: ${SCORE:-null}"
echo "  PDF: /tmp/prodontics-report.pdf"
