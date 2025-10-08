#!/bin/bash

echo "🧪 Testing KIVU Belt Express USSD Service"
echo "=========================================="

# Test 1: Welcome message (empty text)
echo ""
echo "📱 Test 1: Welcome Message (Empty Text)"
echo "---------------------------------------"
curl -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test123",
    "serviceCode": "*348*67383#",
    "phoneNumber": "+250123456789",
    "text": ""
  }'

echo ""
echo ""
echo "📱 Test 2: Package Tracking (With Tracking Number)"
echo "--------------------------------------------------"
curl -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test123",
    "serviceCode": "*348*67383#",
    "phoneNumber": "+250123456789",
    "text": "PKG-4F88E984"
  }'

echo ""
echo ""
echo "✅ Testing Complete!"
echo "==================="
echo "Check the console logs for detailed progress API calls"
echo "Look for: 'USSD: Real progress from API (progress field): X.X'"
