import { z } from 'zod';

export const roleSchema = z.enum(['public', 'staff', 'coach', 'accountant', 'admin']);
export type Role = z.infer<typeof roleSchema>;

export const ctaSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const highlightSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const introContentSchema = z.object({
  heroTitle: z.string(),
  heroSubtitle: z.string(),
  ctas: z.array(ctaSchema),
  highlights: z.array(highlightSchema),
  heroMediaUrl: z.string().url().optional(),
  lastUpdatedBy: z.string(),
  updatedAt: z.string(),
});
export type IntroContent = z.infer<typeof introContentSchema>;

export const sportSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  featured: z.boolean().optional(),
  order: z.number().optional(),
  mediaUrl: z.string().url().optional(),
});
export type Sport = z.infer<typeof sportSchema>;

export const facilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  specs: z.array(z.string()).optional(),
  mediaUrl: z.string().url().optional(),
});
export type Facility = z.infer<typeof facilitySchema>;

export const eventItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  location: z.string().optional(),
  description: z.string().optional(),
});
export type EventItem = z.infer<typeof eventItemSchema>;

export const newsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  author: z.string(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  pinned: z.boolean().optional(),
});
export type NewsItem = z.infer<typeof newsItemSchema>;

export const docItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  folder: z.string().optional(),
  tags: z.array(z.string()).optional(),
  access: z.array(roleSchema),
  uploadedBy: z.string(),
  uploadedAt: z.string(),
});
export type DocItem = z.infer<typeof docItemSchema>;

export const directoryEntrySchema = z.object({
  id: z.string(),
  fullName: z.string(),
  roleTitle: z.string(),
  department: z.string().optional(),
  email: z.string(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});
export type DirectoryEntry = z.infer<typeof directoryEntrySchema>;

export const budgetLineSchema = z.object({
  id: z.string(),
  department: z.string(),
  period: z.string(),
  planned: z.number(),
  actual: z.number().optional(),
});
export type BudgetLine = z.infer<typeof budgetLineSchema>;

export const invoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  vendor: z.string(),
  amount: z.number(),
  currency: z.enum(['JOD', 'USD', 'EUR']),
  status: z.enum(['Draft', 'Sent', 'Paid', 'Overdue']),
  issueDate: z.string(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const cashFlowEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  category: z.enum(['Income', 'Expense']),
  description: z.string(),
  amount: z.number(),
  currency: z.enum(['JOD', 'USD', 'EUR']),
});
export type CashFlowEntry = z.infer<typeof cashFlowEntrySchema>;

export const pettyCashTxnSchema = z.object({
  id: z.string(),
  date: z.string(),
  requester: z.string(),
  purpose: z.string(),
  amount: z.number(),
  currency: z.enum(['JOD', 'USD', 'EUR']),
  approvedBy: z.string().optional(),
  status: z.enum(['Requested', 'Approved', 'Rejected', 'Reimbursed']),
});
export type PettyCashTxn = z.infer<typeof pettyCashTxnSchema>;

export const financeSnapshotSchema = z.object({
  totalBudget: z.number(),
  totalActual: z.number(),
  invoicesOutstanding: z.number(),
  pettyCashBalance: z.number(),
});
export type FinanceSnapshot = z.infer<typeof financeSnapshotSchema>;

export const socialLinkSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
});
export type SocialLink = z.infer<typeof socialLinkSchema>;

export const landingHeroSchema = z.object({
  title: z.string(),
  titleAr: z.string().optional(),
  subtitle: z.string(),
  subtitleAr: z.string().optional(),
  badge: z.string().optional(),
  primaryCtaLabel: z.string(),
  primaryCtaLink: z.string(),
  secondaryCtaLabel: z.string().optional(),
  secondaryCtaLink: z.string().optional(),
  backgroundImageUrl: z.string().url().optional(),
  backgroundVideoUrl: z.string().optional(), // Can be URL or local path (e.g., /background-main.mp4)
});
export type LandingHero = z.infer<typeof landingHeroSchema>;

export const landingHighlightSchema = z.object({
  id: z.string(),
  title: z.string(),
  titleAr: z.string().optional(),
  description: z.string(),
  descriptionAr: z.string().optional(),
  icon: z.string().optional(),
});
export type LandingHighlight = z.infer<typeof landingHighlightSchema>;

export const landingProgramSchema = z.object({
  id: z.string(),
  title: z.string(),
  titleAr: z.string().optional(),
  description: z.string(),
  descriptionAr: z.string().optional(),
  sportType: z.string(),
  badge: z.string().optional(),
  link: z.string(),
  mediaUrl: z.string().url().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  schedule: z.string().optional(),
  priceLabel: z.string().optional(),
});
export type LandingProgram = z.infer<typeof landingProgramSchema>;

export const landingOfferSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameAr: z.string().optional(),
  price: z.string(),
  badge: z.string().optional(),
  description: z.string(),
  descriptionAr: z.string().optional(),
  features: z.array(z.string()),
  link: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
export type LandingOffer = z.infer<typeof landingOfferSchema>;

export const landingEventSchema = eventItemSchema.extend({
  link: z.string().optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().optional(),
  slug: z.string().optional(),
  endAt: z.string().optional(),
  videoUrl: z.string().optional(),
  galleryUrls: z.array(z.string()).optional(),
  contentType: z.enum(['GALLERY', 'VIDEO']).optional(),
  registrationUrl: z.string().optional(),
});
export type LandingEvent = z.infer<typeof landingEventSchema>;

export const landingAnnouncementSchema = z.object({
  id: z.string(),
  title: z.string(),
  titleAr: z.string().optional(),
  message: z.string(),
  messageAr: z.string().optional(),
  imageUrl: z.string().url().optional(),
  isPinned: z.boolean().optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  link: z.string().optional(),
});
export type LandingAnnouncement = z.infer<typeof landingAnnouncementSchema>;

export const landingFacilityHighlightSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameAr: z.string().optional(),
  description: z.string(),
  descriptionAr: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  badge: z.string().optional(),
});
export type LandingFacilityHighlight = z.infer<typeof landingFacilityHighlightSchema>;

export const landingFooterSchema = z.object({
  address: z.string(),
  addressAr: z.string().optional(),
  phone: z.string(),
  email: z.string(),
  contactRecipientEmail: z.string().email().optional(),
  socialLinks: z.array(socialLinkSchema),
});
export type LandingFooter = z.infer<typeof landingFooterSchema>;

export const landingContentSchema = z.object({
  hero: landingHeroSchema,
  highlights: z.array(landingHighlightSchema),
  programs: z.array(landingProgramSchema),
  offers: z.array(landingOfferSchema),
  events: z.array(landingEventSchema),
  announcements: z.array(landingAnnouncementSchema),
  facilityHighlights: z.array(landingFacilityHighlightSchema),
  footer: landingFooterSchema,
  updatedAt: z.string(),
  updatedBy: z.string(),
});
export type LandingContent = z.infer<typeof landingContentSchema>;

export const contactSubmissionSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  message: z.string(),
  recipient: z.string().email(),
  submittedAt: z.string(),
});
export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;
