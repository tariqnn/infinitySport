/**
 * Default invoice configuration values
 * These match the landing page defaults from apps/web/lib/apiClient.ts
 * Single source of truth for company information
 * 
 * These can be overridden by environment variables or FooterSettings from database
 */
export const INVOICE_CONFIG = {
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Infinity Sporty',
  companyAddress: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || 'Shemisani, Princess Alia College',
  companyEmail: process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'infinitysportsacademyjo@gmail.com',
  companyPhone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '07 9624 4059',
  noteMaxLength: 1000,
};
