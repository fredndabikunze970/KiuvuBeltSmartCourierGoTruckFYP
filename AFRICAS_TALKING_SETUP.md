# Africa's Talking USSD Testing Guide

This guide will help you test your KIVU Belt Express USSD implementation using Africa's Talking simulator.

## 🚀 Quick Start

### 1. Start Your Development Server
```bash
cd v0-final-year-project
npm run dev
```

Your app should be running at `http://localhost:3000`

### 2. Make Your App Public (Using ngrok)

Since Africa's Talking simulator needs to access your local server, use ngrok:

```bash
# Install ngrok if you don't have it
npm install -g ngrok

# Expose your local server
ngrok http 3000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

### 3. Test with Africa's Talking Simulator

1. **Go to Simulator**: Visit [https://simulator.africastalking.com:1517/](https://simulator.africastalking.com:1517/)

2. **Configure Simulator**:
   - **URL**: `https://your-ngrok-url.ngrok.io/api/ussd`
   - **HTTP Method**: POST
   - **Service Code**: `*123#`

3. **Test Scenarios**:

   **Scenario 1: Welcome Screen**
   - Dial: `*123#`
   - Expected: Welcome message asking for tracking number

   **Scenario 2: Valid Tracking Number**
   - Dial: `*123#`
   - Enter: `PKG001234` (use a real tracking number from your database)
   - Expected: Package status, progress, and location

   **Scenario 3: Invalid Tracking Number**
   - Dial: `*123#`
   - Enter: `INVALID`
   - Expected: Error message prompting for valid tracking number

## 📱 USSD Flow Examples

### Welcome Screen
```
CON Welcome to KIVU Belt Express Tracking

Enter your tracking number to check package status:

Example: PKG001234
```

### Package Found
```
END Package Status: 🚛 In Transit

Tracking: PKG001234
Progress: 65.0%
[██████░░░░]

Current Location:
📍 KG 123 St, Kigali, Rwanda

From: Kigali Central
To: Huye Branch

Sender: John Doe
Receiver: Jane Smith

Thank you for using KIVU Belt Express!
```

### Package Not Found
```
END Package not found or tracking not available.

Error: Package not found

Please check your tracking number and try again.
```

## 🔧 Troubleshooting

### Common Issues

1. **404 Error**
   - Make sure your dev server is running
   - Check ngrok URL is correct
   - Verify `/api/ussd` endpoint exists

2. **Connection Timeout**
   - Ensure ngrok tunnel is active
   - Check firewall settings
   - Verify server responds within 30 seconds

3. **Invalid Response Format**
   - Responses must start with `CON` or `END`
   - Use plain text, not JSON
   - Keep responses under 160 characters

### Debug Tips

1. **Check Server Logs**: Monitor your terminal for USSD requests
2. **Test Locally**: Use curl/Postman first
3. **Verify Database**: Ensure tracking numbers exist in your database

## 📋 Testing Checklist

- [ ] Development server running
- [ ] ngrok tunnel active
- [ ] Africa's Talking simulator configured
- [ ] Welcome screen works
- [ ] Valid tracking number returns package info
- [ ] Invalid tracking number shows error
- [ ] Package not found handled gracefully
- [ ] Location data displays correctly

## 🎯 Next Steps

Once testing is successful:

1. **Deploy to Production**: Host your app on a public server
2. **Register USSD Code**: Contact MTN/Airtel Rwanda
3. **Configure Live Gateway**: Point telecom provider to your production URL
4. **Monitor Usage**: Track USSD usage and performance

## 📞 Support

If you encounter issues:

1. Check the server logs for detailed error messages
2. Verify your tracking API works independently
3. Ensure LocationIQ API key is configured
4. Test with different tracking numbers

Happy testing! 🎉
