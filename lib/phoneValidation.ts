/**
 * Validates phone numbers to ensure they are real, not dummy/test numbers
 */

// Common dummy/test phone number patterns to reject
const DUMMY_PATTERNS = [
  /^\+?0+$/, // All zeros
  /^\+?1+$/, // All ones
  /^\+?2+$/, // All twos
  /^\+?3+$/, // All threes
  /^\+?4+$/, // All fours
  /^\+?5+$/, // All fives
  /^\+?6+$/, // All sixes
  /^\+?7+$/, // All sevens
  /^\+?8+$/, // All eights
  /^\+?9+$/, // All nines
  /^\+?123456789/, // Sequential
  /^\+?987654321/, // Reverse sequential
  /^\+?111111111/, // Repeated single digit
  /^\+?222222222/, // Repeated single digit
  /^\+?333333333/, // Repeated single digit
  /^\+?444444444/, // Repeated single digit
  /^\+?555555555/, // Repeated single digit
  /^\+?666666666/, // Repeated single digit
  /^\+?777777777/, // Repeated single digit
  /^\+?888888888/, // Repeated single digit
  /^\+?999999999/, // Repeated single digit
  /^\+?000000000/, // All zeros
  /^\+?123/, // Too short and sequential
  /^\+?12/, // Too short
  /^\+?1$/, // Single digit
];

/**
 * Normalizes phone number by removing spaces, dashes, and parentheses
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '');
}

/**
 * Validates if a phone number is a real number (not dummy/test)
 */
export function isValidPhoneNumber(phone: string): { valid: boolean; error?: string } {
  if (!phone || phone.trim().length === 0) {
    return { valid: false, error: 'Phone number is required' };
  }

  const normalized = normalizePhone(phone);

  // Must start with + (international format)
  if (!normalized.startsWith('+')) {
    return { valid: false, error: 'Phone number must start with + (e.g., +962 7 9000 2200)' };
  }

  // Check for dummy patterns
  for (const pattern of DUMMY_PATTERNS) {
    if (pattern.test(normalized)) {
      return { valid: false, error: 'Please enter a valid phone number' };
    }
  }

  // Check for Jordanian numbers (+962)
  if (normalized.startsWith('+962')) {
    // Jordanian mobile numbers: +962 7 XXXX XXXX (9 digits after country code)
    // Total length should be: +962 (4) + 7 (1) + 8 digits = 13 characters
    const digitsAfterCountry = normalized.substring(4); // Remove +962
    const digitsOnly = digitsAfterCountry.replace(/\D/g, '');

    // Must start with 7 (Jordanian mobile prefix)
    if (!digitsOnly.startsWith('7')) {
      return { valid: false, error: 'Jordanian mobile numbers must start with 7 (e.g., +962 7 9000 2200)' };
    }

    // Must have exactly 9 digits after +962 (7 + 8 more digits)
    if (digitsOnly.length !== 9) {
      return { valid: false, error: 'Jordanian mobile numbers must have 9 digits after +962 (e.g., +962 7 9000 2200)' };
    }

    // Check for repeated patterns (like 777777777, 788888888, etc.)
    const repeatedPattern = /^7(\d)\1{7}$/;
    if (repeatedPattern.test(digitsOnly)) {
      return { valid: false, error: 'Please enter a valid phone number' };
    }

    // Check for sequential patterns (like 712345678, 765432109, etc.)
    const isSequential = (str: string): boolean => {
      const nums = str.split('').map(Number);
      let ascending = true;
      let descending = true;
      for (let i = 1; i < nums.length; i++) {
        if (nums[i] !== nums[i - 1] + 1) ascending = false;
        if (nums[i] !== nums[i - 1] - 1) descending = false;
      }
      return ascending || descending;
    };
    if (isSequential(digitsOnly)) {
      return { valid: false, error: 'Please enter a valid phone number' };
    }
  } else {
    // For other countries, basic validation
    const digitsOnly = normalized.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      return { valid: false, error: 'Phone number is too short' };
    }
    if (digitsOnly.length > 15) {
      return { valid: false, error: 'Phone number is too long' };
    }
  }

  return { valid: true };
}

/**
 * Formats phone number for display (e.g., +962 7 9000 2200)
 */
export function formatPhoneNumber(phone: string): string {
  const normalized = normalizePhone(phone);
  
  if (normalized.startsWith('+962')) {
    const digits = normalized.substring(4).replace(/\D/g, '');
    if (digits.length === 9 && digits.startsWith('7')) {
      // Format as +962 7 XXXX XXXX
      return `+962 ${digits[0]} ${digits.substring(1, 5)} ${digits.substring(5)}`;
    }
  }
  
  return phone; // Return original if can't format
}
