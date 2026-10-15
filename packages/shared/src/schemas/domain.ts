import { z } from 'zod';
import { SUPPORTED_CURRENCY_CODES } from '../currencies';
import { SUPPORTED_LANGUAGE_CODES } from '../languages';

export const supportedLanguageSchema = z.enum(SUPPORTED_LANGUAGE_CODES);

export const paymentCurrencySchema = z.enum(SUPPORTED_CURRENCY_CODES);

export const paymentStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'refunded',
  'chargeback',
  'expired',
]);

export const paymentGatewaySchema = z.enum(['demo', 'mercado_pago', 'stripe']);

export const paymentMethodSchema = z.enum(['boleto', 'card', 'checkout', 'pix']);

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const draftLocalizedTextSchema = z
  .object({
    pt: z.string().trim().min(1),
    en: z.string().trim().min(1).optional(),
    es: z.string().trim().min(1).optional(),
    fr: z.string().trim().min(1).optional(),
    de: z.string().trim().min(1).optional(),
    it: z.string().trim().min(1).optional(),
    zh: z.string().trim().min(1).optional(),
    ja: z.string().trim().min(1).optional(),
  })
  .strict();

export const guideRegistrationSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    email: z.email(),
    communityId: z.string().trim().min(1),
    subAreaIds: z.array(z.string().trim().min(1)).min(1),
    languagesSpoken: z.array(supportedLanguageSchema).min(1),
    yearsOfExperience: z.number().int().min(0).max(80),
    bio: draftLocalizedTextSchema,
    documentUrls: z.array(z.string().trim().min(1)).min(1),
    acceptedTerms: z.literal(true),
  })
  .strict();

export const emailPasswordSignInSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8).max(128),
  })
  .strict();

export const accountRegistrationSchema = emailPasswordSignInSchema
  .extend({
    displayName: z.string().trim().min(2).max(80),
    preferredLanguage: supportedLanguageSchema,
    type: z.enum(['tourist', 'guide']),
    acceptedTerms: z.literal(true),
    country: z.string().trim().min(2).max(80).optional(),
  })
  .strict();

export const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    preferredLanguage: supportedLanguageSchema,
    preferredCurrency: paymentCurrencySchema,
    notificationsEnabled: z.boolean(),
  })
  .strict();

export const tourDraftSchema = z
  .object({
    guideId: z.string().trim().min(1),
    communityId: z.string().trim().min(1),
    subAreaIds: z.array(z.string().trim().min(1)).min(1),
    title: draftLocalizedTextSchema,
    description: draftLocalizedTextSchema,
    poiIds: z.array(z.string().trim().min(1)).min(1),
    minPrice: z.number().min(0),
    maxPrice: z.number().min(0),
    languages: z.array(supportedLanguageSchema).min(1),
    category: z.enum(['cultural', 'historico', 'natureza', 'arte', 'gastronomico', 'fotografico']),
    difficulty: z.enum(['easy', 'moderate', 'hard']),
    maxTourists: z.number().int().min(1).max(30),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.maxPrice < value.minPrice) {
      ctx.addIssue({
        code: 'custom',
        message: 'maxPrice must be greater than or equal to minPrice',
        path: ['maxPrice'],
      });
    }
  });

export const bookingRequestSchema = z
  .object({
    tourId: z.string().trim().min(1),
    guideId: z.string().trim().min(1),
    touristId: z.string().trim().min(1),
    communityId: z.string().trim().min(1),
    scheduledForIso: z.iso.datetime({ offset: true }),
    numberOfTourists: z.number().int().min(1).max(30),
    touristsInfo: z
      .array(
        z
          .object({
            name: z.string().trim().min(2).max(80),
            age: z.number().int().min(0).max(120).optional(),
            nationality: z.string().trim().min(2).max(80).optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.touristsInfo.length !== value.numberOfTourists) {
      ctx.addIssue({
        code: 'custom',
        message: 'touristsInfo length must match numberOfTourists',
        path: ['touristsInfo'],
      });
    }
  });

export const guideApprovalRequestSchema = z
  .object({
    guideId: z.string().trim().min(1).max(128),
  })
  .strict();

export const accountErasureRequestSchema = z
  .object({
    confirmation: z.literal('DELETE_MY_ACCOUNT'),
  })
  .strict();

export const createPaymentRequestSchema = z
  .object({
    bookingId: z.string().trim().min(1),
    country: z
      .string()
      .trim()
      .min(2)
      .max(2)
      .transform((value) => value.toUpperCase()),
    currency: paymentCurrencySchema,
    paymentMethod: paymentMethodSchema,
    couponCode: z
      .string()
      .trim()
      .min(3)
      .max(32)
      .transform((value) => value.toUpperCase())
      .optional(),
  })
  .strict();

export const getPaymentStatusRequestSchema = z
  .object({
    paymentId: z.string().trim().min(1),
  })
  .strict();

export const sendChatMessageSchema = z
  .object({
    chatId: z.string().trim().min(1).max(180),
    text: z.string().trim().min(1).max(2000),
    attachments: z
      .array(
        z
          .object({
            type: z.enum(['audio', 'image']),
            url: z.string().trim().min(1).max(1000),
          })
          .strict(),
      )
      .max(4)
      .optional(),
  })
  .strict();

export const createChatSchema = z
  .object({
    bookingId: z.string().trim().min(1).max(180),
  })
  .strict();

export const submitReviewSchema = z
  .object({
    bookingId: z.string().trim().min(1).max(180),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(10).max(2000),
    photoPaths: z.array(z.string().trim().min(1).max(1000)).max(5),
    language: supportedLanguageSchema,
  })
  .strict();

export const applyCouponSchema = z
  .object({
    bookingId: z.string().trim().min(1).max(180),
    code: z
      .string()
      .trim()
      .min(3)
      .max(32)
      .transform((value) => value.toUpperCase()),
    currency: paymentCurrencySchema,
  })
  .strict();

export const createMarketplaceInquirySchema = z
  .object({
    itemId: z.string().trim().min(1).max(180),
    message: z.string().trim().min(10).max(1000),
  })
  .strict();

export type GuideRegistrationInput = z.infer<typeof guideRegistrationSchema>;
export type EmailPasswordSignInInput = z.infer<typeof emailPasswordSignInSchema>;
export type AccountRegistrationInput = z.infer<typeof accountRegistrationSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type TourDraftInput = z.infer<typeof tourDraftSchema>;
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
export type GuideApprovalRequestInput = z.infer<typeof guideApprovalRequestSchema>;
export type AccountErasureRequestInput = z.infer<typeof accountErasureRequestSchema>;
export type CreatePaymentRequestInput = z.infer<typeof createPaymentRequestSchema>;
export type GetPaymentStatusRequestInput = z.infer<typeof getPaymentStatusRequestSchema>;
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
export type CreateChatInput = z.infer<typeof createChatSchema>;
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
export type CreateMarketplaceInquiryInput = z.infer<typeof createMarketplaceInquirySchema>;
