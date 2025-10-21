# USSD Integration for KIVU Belt Express

This document provides information about the USSD (Unstructured Supplementary Service Data) integration for package tracking in the KIVU Belt Express system.

## Overview

The USSD service allows customers to track their packages using basic mobile phones by dialing a USSD code (e.g., *123#). The service provides real-time package status, progress, and current location information with geocoded addresses.

## Features

- **Package Status Tracking**: Check current status (Registered, Picked Up, In Transit, Out for Delivery, Delivered)
- **Progress Visualization**: Visual progress bar showing delivery completion percentage
- **Location Information**: Current location with geocoded addresses
- **Route Information**: Origin and destination branch details
- **Sender/Receiver Info**: Package sender and receiver information

## API Endpoint

**Endpoint**: `POST /api/ussd`

**Content-Type**: `application/json`

### Request Format

```json
{
  "sessionId": "unique_session_identifier",
  "serviceCode": "*123#",
  "phoneNumber": "+250123456789",
  "text": "PKG001234"
}
```

### Response Format

USSD responses must be plain text starting with either:
- `CON` - Continue the session (user needs to provide more input)
- `END` - End the session (final response)

Example Response:
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

## USSD Flow

1. **Initial Dial**: User dials USSD code (e.g., *123#)
2. **Welcome Screen**: System displays welcome message and asks for tracking number
3. **Input Tracking Number**: User enters tracking number (e.g., PKG001234)
4. **Display Results**: System shows package status, progress, and location
5. **Session End**: USSD session terminates

## Integration with Telecom Providers

### Africa's Talking USSD Simulator

**Perfect for testing your USSD implementation!**

1. **Create Africa's Talking Account**:
   - Sign up at [Africa's Talking](https://africastalking.com/)
   - Get your API credentials

2. **Use USSD Simulator**:
   - Go to [USSD Simulator](https://simulator.africastalking.com:1517/)
   - Enter your endpoint URL: `https://your-domain.com/api/ussd`
   - Test with different scenarios

3. **Simulator Request Format**:
   Africa's Talking sends form-encoded data:
   ```
   sessionId=1234567890&serviceCode=*123*&phoneNumber=%2B254712345678&text=PKG001234
   ```

### Rwanda (MTN/Airtel)

1. **Register USSD Code**:
   - Contact MTN/Airtel Rwanda for USSD code allocation
   - Provide your server endpoint URL
   - Configure authentication if required

2. **Technical Requirements**:
   - Server must accept POST requests
   - Response time should be < 30 seconds
   - Support for UTF-8 encoding
   - Handle concurrent sessions

3. **Testing**:
   - Use Africa's Talking simulator for initial testing
   - Use the GET endpoint for status checks: `/api/ussd`
   - Test with tools like Postman or curl

### Example Integration Setup

```bash
# Test the USSD endpoint
curl -X GET http://localhost:3000/api/ussd

# Simulate USSD request
curl -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test123",
    "serviceCode": "*123#",
    "phoneNumber": "+250123456789",
    "text": "PKG001234"
  }'
```

## Configuration

### Environment Variables

Ensure the following environment variables are set:

```env
NEXT_PUBLIC_API_URL=http://your-domain.com
NEXT_PUBLIC_LOCATIONIQ_KEY=your_locationiq_api_key
```

### Dependencies

The USSD functionality uses existing tracking infrastructure:
- Package tracking API (`/api/tracking/[trackingNumber]`)
- LocationIQ geocoding service
- Firebase real-time location data

## Error Handling

The USSD service handles various error scenarios:

- **Invalid Tracking Number**: Prompts user to enter a valid tracking number
- **Package Not Found**: Displays appropriate error message
- **Payment Required**: Shows payment status information
- **Location Unavailable**: Gracefully handles missing location data
- **Server Errors**: Generic error message for system issues

### Blocked tracking states

If a package is already delivered or has arrived at its destination, real-time tracking is not available via USSD. In these cases the USSD endpoint will return the following message and end the session:

```
END Package is already delivered or arrived. Tracking is not available.
```

The server treats common status values (case-insensitive) such as `arrived`, `delivered`, `completed`, and `received` as blocked states.

### Debugging package status

For quick debugging there is a lightweight endpoint that returns the raw package row for a given tracking number:

GET /api/ussd/debug?tracking=PKG001234

This returns JSON like:

```json
{ "found": true, "tracking": "PKG001234", "status": "Delivered", "raw": { /* package row */ } }
```

Use the debug endpoint to confirm the DB status value if the USSD flow returns the generic error message.

## Security Considerations

- USSD requests are logged for monitoring
- No sensitive payment information is exposed
- Phone numbers are masked in tracking data
- Rate limiting should be implemented at telecom provider level

## Testing

### Manual Testing

1. Start the development server
2. Use the GET endpoint to verify API status
3. Use Postman/curl to simulate USSD requests
4. Test with various tracking numbers and edge cases

### Automated Testing

Consider adding tests for:
- USSD request parsing
- Tracking number validation
- Response formatting
- Error handling scenarios

## Support

For technical support or questions about USSD integration:

1. Check the API logs for detailed error information
2. Verify tracking API functionality independently
3. Ensure LocationIQ API key is valid and has sufficient quota
4. Confirm Firebase real-time database connectivity

## Future Enhancements

Potential improvements:
- Multi-language support
- Additional menu options (package history, multiple packages)
- Integration with SMS notifications
- Advanced location features (ETA, route visualization)
- User registration and authentication via USSD
