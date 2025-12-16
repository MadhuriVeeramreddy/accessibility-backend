#!/bin/bash

BASE_URL="http://localhost:4000"

echo "1️⃣ Creating website..."
WEBSITE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/website/create" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.smilecrossdental.com","name":"Test Site"}')
WEBSITE_ID=$(echo $WEBSITE_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "   Website ID: $WEBSITE_ID"

echo ""
echo "2️⃣ Creating scan..."
SCAN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/scan/create" \
  -H "Content-Type: application/json" \
  -d "{\"websiteId\":\"$WEBSITE_ID\"}")
SCAN_ID=$(echo $SCAN_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "   Scan ID: $SCAN_ID"

echo ""
echo "3️⃣ Waiting for scan to complete (checking every 5 seconds)..."
MAX_WAIT=120
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
  STATUS=$(curl -s "$BASE_URL/api/v1/scan/$SCAN_ID" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  echo "   Status: $STATUS (${ELAPSED}s)"
  
  if [ "$STATUS" == "completed" ]; then
    echo "   ✅ Scan completed!"
    break
  elif [ "$STATUS" == "failed" ]; then
    echo "   ❌ Scan failed"
    exit 1
  fi
  
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

echo ""
echo "4️⃣ Downloading PDF..."
curl -s -o test-report.pdf "$BASE_URL/api/v1/scan/$SCAN_ID/pdf"
PDF_SIZE=$(stat -f%z test-report.pdf 2>/dev/null || stat -c%s test-report.pdf 2>/dev/null)

if [ -n "$PDF_SIZE" ] && [ "$PDF_SIZE" -gt 0 ]; then
  echo "   ✅ PDF downloaded successfully"
  echo "   Size: $PDF_SIZE bytes"
  echo "   File: test-report.pdf"
  echo ""
  echo "   Open with: open test-report.pdf"
else
  echo "   ❌ PDF download failed"
  exit 1
fi
