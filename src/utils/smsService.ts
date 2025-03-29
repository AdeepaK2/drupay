import axios from 'axios';

// ClickSend API credentials
const CLICKSEND_USERNAME = process.env.CLICK_USER;
const CLICKSEND_API_KEY = process.env.CLICK_API;

// Base64 encode the credentials for Basic Auth
const authHeader = Buffer.from(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`).toString('base64');

/**
 * Send SMS message using ClickSend API
 * @param phoneNumber Target phone number in international format (e.g., +94XXXXXXXXX)
 * @param message SMS message content
 * @param senderName Optional sender name (if supported by your account)
 */
export async function sendSMS(phoneNumber: string, message: string, senderName: string = 'DrUPay') {
  try {
    // Format phone number to ensure it has international format
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // Prepare the request body according to ClickSend API specs
    const requestBody = {
      messages: [
        {
          source: 'sdk',
          body: message,
          to: formattedPhone,
          from: senderName,
        }
      ]
    };

    // Make the API request to ClickSend
    const response = await axios({
      method: 'POST',
      url: 'https://rest.clicksend.com/v3/sms/send',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      data: requestBody
    });

    // Parse and return the response
    if (response.data && response.data.http_code === 200) {
      return {
        success: true,
        messageId: response.data.data.messages[0]?.message_id,
        cost: response.data.data.messages[0]?.message_price,
        details: response.data
      };
    } else {
      throw new Error(response.data?.response_msg || 'Unknown error from ClickSend API');
    }
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS message',
      details: error.response?.data
    };
  }
}

/**
 * Format phone number to ensure it has international format
 * Handles both Sri Lankan and Australian phone numbers
 */
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // Handle phone numbers with existing country codes
  if (phone.startsWith('+')) {
    // International number with + sign
    return `+${digits}`;
  }
  
  // Handle different formats of Australian numbers
  if (digits.startsWith('61')) {
    // Already has Australian country code
    return `+${digits}`;
  } else if (digits.startsWith('04') && digits.length === 10) {
    // Australian mobile without country code (e.g., 0412345678)
    return `+61${digits.substring(1)}`; // Remove the '0' and add +61
  } else if (digits.startsWith('4') && digits.length === 9) {
    // Australian mobile without leading 0 (e.g., 412345678)
    return `+61${digits}`;
  }
  
  // Handle different formats of Sri Lankan numbers
  else if (digits.startsWith('94')) {
    // Already has Sri Lankan country code
    return `+${digits}`;
  } else if (digits.startsWith('0') && digits.length === 10) {
    // Sri Lankan number starting with 0 (e.g., 0764881254)
    return `+94${digits.substring(1)}`;
  } else if (digits.length === 9) {
    // Typical Sri Lankan mobile number without leading 0 (e.g., 764881254)
    return `+94${digits}`;
  } 
  
  // Default case - try to determine by length
  else if (digits.length === 9) {
    // Assume it's a Sri Lankan number
    return `+94${digits}`;
  } else if (digits.length === 10 && digits.startsWith('4')) {
    // Assume it's an Australian number without the leading 0
    return `+61${digits}`;
  } else {
    // If we can't determine, return unmodified but with + sign
    console.warn(`Unable to determine country code for number: ${phone}, using as-is`);
    return `+${digits}`;
  }
}