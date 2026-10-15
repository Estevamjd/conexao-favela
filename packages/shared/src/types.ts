import type { SupportedLanguageCode } from './languages';

export type FirestoreTimestamp = {
  readonly seconds: number;
  readonly nanoseconds: number;
  toDate(): Date;
};

export type Coordinates = {
  readonly lat: number;
  readonly lng: number;
};

export type LocalizedText = Readonly<Record<SupportedLanguageCode, string>>;

export type DraftLocalizedText = Readonly<
  { pt: string } & Partial<Record<SupportedLanguageCode, string>>
>;

export type CurrencyCode = 'BRL' | 'USD' | 'EUR';

export type PaymentCurrency = CurrencyCode;

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'chargeback'
  | 'expired';

export type PaymentGateway = 'demo' | 'mercado_pago' | 'stripe';

export type PaymentMethod = 'boleto' | 'card' | 'checkout' | 'pix';

export type PaymentPurpose = 'booking' | 'plan';

export type MoneyAmount = {
  readonly amountCents: number;
  readonly currency: PaymentCurrency;
};

export type PaymentPriceCatalog = Partial<Readonly<Record<PaymentCurrency, Readonly<MoneyAmount>>>>;

export type UserType = 'tourist' | 'guide' | 'admin';

export type PoiCategory =
  | 'mirante'
  | 'historico'
  | 'cultural'
  | 'natural'
  | 'gastronomico'
  | 'arte'
  | 'teleferico';

export type TourCategory =
  | 'cultural'
  | 'historico'
  | 'natureza'
  | 'arte'
  | 'gastronomico'
  | 'fotografico';

export type TourDifficulty = 'easy' | 'moderate' | 'hard';

export type TourStatus = 'draft' | 'published' | 'paused' | 'archived';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type NotificationType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'tour_reminder'
  | 'new_review'
  | 'system'
  | 'promotion';

export type AuditLogAction = 'guide_approved' | 'account_erased';

export type AuditLogMetadata = Readonly<Record<string, string | number | boolean | null>>;

export type AuditLog = {
  readonly id: string;
  readonly action: AuditLogAction;
  readonly actorId: string;
  readonly targetUserId: string;
  readonly communityId?: string;
  readonly metadata: AuditLogMetadata;
  readonly createdAt: FirestoreTimestamp;
};

export type PrivacyStatus = 'active' | 'erased';

export type UserPrivacy = {
  readonly anonymizedAt?: FirestoreTimestamp;
  readonly erasureRequestedAt?: FirestoreTimestamp;
  readonly status: PrivacyStatus;
};

export type CommunitySubArea = {
  readonly id: string;
  readonly name: string;
  readonly description: LocalizedText;
  readonly centerCoordinates: Coordinates;
};

export type Community = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly city: string;
  readonly state: string;
  readonly active: boolean;
  readonly description: LocalizedText;
  readonly coverImageUrl: string;
  readonly thumbnailUrl: string;
  readonly centerCoordinates: Coordinates;
  readonly primaryColor: string;
  readonly totalGuides: number;
  readonly totalTours: number;
  readonly subAreas: readonly CommunitySubArea[];
  readonly createdAt?: FirestoreTimestamp;
};

export type GuideProfile = {
  readonly bio: DraftLocalizedText;
  readonly communityId: string;
  readonly subAreaIds: readonly string[];
  readonly languagesSpoken: readonly SupportedLanguageCode[];
  readonly yearsOfExperience: number;
  readonly rating: number;
  readonly totalReviews: number;
  readonly totalToursCompleted: number;
  readonly verified: boolean;
  readonly verifiedAt?: FirestoreTimestamp;
  readonly documents: {
    readonly cpfHash: string;
    readonly documentUrls: readonly string[];
  };
  readonly bankAccount?: {
    readonly type: 'pix' | 'bank';
    readonly key: string;
  };
};

export type TouristProfile = {
  readonly country: string;
  readonly interests: readonly string[];
  readonly favoriteTours: readonly string[];
};

export type User = {
  readonly id: string;
  readonly email: string;
  readonly type: UserType;
  readonly displayName: string;
  readonly photoUrl?: string;
  readonly phone?: string;
  readonly preferredLanguage: SupportedLanguageCode;
  readonly preferredCurrency: CurrencyCode;
  readonly notificationsEnabled: boolean;
  readonly createdAt: FirestoreTimestamp;
  readonly updatedAt: FirestoreTimestamp;
  readonly lastLoginAt: FirestoreTimestamp;
  readonly privacy?: UserPrivacy;
  readonly guideProfile?: GuideProfile;
  readonly touristProfile?: TouristProfile;
};

export type PublicGuide = {
  readonly id: string;
  readonly active: boolean;
  readonly displayName: string;
  readonly photoUrl?: string;
  readonly communityId: string;
  readonly subAreaIds: readonly string[];
  readonly bio: DraftLocalizedText;
  readonly languagesSpoken: readonly SupportedLanguageCode[];
  readonly yearsOfExperience: number;
  readonly rating: number;
  readonly totalReviews: number;
  readonly totalToursCompleted: number;
  readonly verified: boolean;
  readonly verifiedAt?: FirestoreTimestamp;
};

export type Tour = {
  readonly id: string;
  readonly guideId: string;
  readonly communityId: string;
  readonly subAreaIds: readonly string[];
  readonly title: DraftLocalizedText;
  readonly description: DraftLocalizedText;
  readonly route: {
    readonly points: readonly {
      readonly poiId: string;
      readonly order: number;
      readonly estimatedTime: number;
    }[];
    readonly totalDistance: number;
    readonly estimatedDuration: number;
  };
  readonly pricing: {
    readonly type: 'fixed' | 'range' | 'free';
    readonly minPrice: number;
    readonly maxPrice: number;
    readonly currency: 'BRL';
  };
  readonly paymentPrices?: PaymentPriceCatalog;
  readonly capacity: {
    readonly minTourists: number;
    readonly maxTourists: number;
  };
  readonly languages: readonly SupportedLanguageCode[];
  readonly category: TourCategory;
  readonly difficulty: TourDifficulty;
  readonly schedule: {
    readonly isRecurring: boolean;
    readonly recurringDays?: readonly number[];
    readonly availableHours?: readonly string[];
    readonly specificDates?: readonly FirestoreTimestamp[];
  };
  readonly status: TourStatus;
  readonly media: {
    readonly coverImageUrl: string;
    readonly galleryUrls: readonly string[];
    readonly videoUrl?: string;
  };
  readonly stats: {
    readonly totalBookings: number;
    readonly averageRating: number;
    readonly totalReviews: number;
  };
  readonly createdAt?: FirestoreTimestamp;
  readonly updatedAt?: FirestoreTimestamp;
};

export type Booking = {
  readonly id: string;
  readonly tourId: string;
  readonly guideId: string;
  readonly touristId: string;
  readonly communityId: string;
  readonly scheduledFor: FirestoreTimestamp;
  readonly numberOfTourists: number;
  readonly touristsInfo: readonly {
    readonly name: string;
    readonly age?: number;
    readonly nationality?: string;
  }[];
  readonly status: BookingStatus;
  readonly pricing: {
    readonly pricePerPerson: number;
    readonly totalPrice: number;
    readonly currency: 'BRL';
  };
  readonly payment?: {
    readonly currency: PaymentCurrency;
    readonly gateway: PaymentGateway;
    readonly method: PaymentMethod;
    readonly paymentId: string;
    readonly status: PaymentStatus;
  };
  readonly meetingPoint: {
    readonly name: string;
    readonly lat: number;
    readonly lng: number;
    readonly description: LocalizedText;
  };
  readonly shareableLink: string;
  readonly checkIn?: {
    readonly checkedInAt: FirestoreTimestamp;
    readonly location: Coordinates;
  };
  readonly checkOut?: {
    readonly checkedOutAt: FirestoreTimestamp;
    readonly location: Coordinates;
  };
  readonly cancellation?: {
    readonly cancelledBy: 'tourist' | 'guide' | 'admin';
    readonly cancelledAt: FirestoreTimestamp;
    readonly reason: string;
    readonly refundIssued: boolean;
  };
  readonly reviewId?: string;
  readonly createdAt?: FirestoreTimestamp;
  readonly updatedAt?: FirestoreTimestamp;
};

export type AppNotification = {
  readonly id: string;
  readonly userId: string;
  readonly type: NotificationType;
  readonly title: DraftLocalizedText;
  readonly body: DraftLocalizedText;
  readonly data?: Readonly<Record<string, string | number | boolean>>;
  readonly read: boolean;
  readonly readAt?: FirestoreTimestamp;
  readonly createdAt: FirestoreTimestamp;
};

export type PaymentPlan = {
  readonly id: string;
  readonly active: boolean;
  readonly description: DraftLocalizedText;
  readonly interval?: 'annual' | 'monthly';
  readonly isRecurring: boolean;
  readonly name: DraftLocalizedText;
  readonly prices: PaymentPriceCatalog;
  readonly createdAt?: FirestoreTimestamp;
  readonly updatedAt?: FirestoreTimestamp;
};

export type AccessSubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'failed_payment'
  | 'pending'
  | 'refunded'
  | 'chargeback';

export type AccessSubscription = {
  readonly id: string;
  readonly userId: string;
  readonly planId: string;
  readonly status: AccessSubscriptionStatus;
  readonly startsAt: FirestoreTimestamp;
  readonly expiresAt?: FirestoreTimestamp;
  readonly renewsAt?: FirestoreTimestamp;
  readonly cancelledAt?: FirestoreTimestamp;
  readonly gatewaySubscriptionId?: string;
  readonly paymentId?: string;
  readonly bookingId?: string;
  readonly createdAt?: FirestoreTimestamp;
  readonly updatedAt?: FirestoreTimestamp;
};

export type Payment = {
  readonly id: string;
  readonly userId: string;
  readonly bookingId?: string;
  readonly planId?: string;
  readonly orderId?: string;
  readonly gateway: PaymentGateway;
  readonly gatewayPaymentId: string;
  readonly amountCents: number;
  readonly currency: PaymentCurrency;
  readonly country: string;
  readonly paymentMethod: PaymentMethod;
  readonly purpose: PaymentPurpose;
  readonly status: PaymentStatus;
  readonly pixQrCode?: string;
  readonly pixCopyPaste?: string;
  readonly checkoutUrl?: string;
  readonly couponCode?: string;
  readonly couponId?: string;
  readonly couponRedemptionId?: string;
  readonly discountAmountCents?: number;
  readonly originalAmountCents?: number;
  readonly paidAt?: FirestoreTimestamp;
  readonly refundedAt?: FirestoreTimestamp;
  readonly chargebackAt?: FirestoreTimestamp;
  readonly createdAt: FirestoreTimestamp;
  readonly updatedAt: FirestoreTimestamp;
};

export type WebhookEvent = {
  readonly id: string;
  readonly gateway: PaymentGateway;
  readonly gatewayEventId: string;
  readonly paymentId?: string;
  readonly status: 'duplicate' | 'processed' | 'received';
  readonly createdAt: FirestoreTimestamp;
};

export type PointOfInterest = {
  readonly id: string;
  readonly communityId: string;
  readonly subAreaId: string;
  readonly name: LocalizedText;
  readonly description: LocalizedText;
  readonly coordinates: Coordinates;
  readonly category: PoiCategory;
  readonly media: {
    readonly coverImageUrl: string;
    readonly galleryUrls: readonly string[];
  };
  readonly audioGuide?: Partial<
    Record<
      SupportedLanguageCode,
      {
        readonly url: string;
        readonly duration: number;
        readonly transcript: string;
      }
    >
  >;
  readonly historicalInfo?: LocalizedText;
  readonly curiosities?: Readonly<Record<SupportedLanguageCode, readonly string[]>>;
  readonly accessibility: {
    readonly wheelchairAccessible: boolean;
    readonly hasRestrooms: boolean;
    readonly hasParking: boolean;
  };
  readonly bestTimeToVisit?: string;
  readonly createdAt?: FirestoreTimestamp;
};

export type ChatAttachment = {
  readonly type: 'audio' | 'image';
  readonly url: string;
};

export type ChatMessage = {
  readonly id: string;
  readonly chatId: string;
  readonly senderId: string;
  readonly text: string;
  readonly attachments?: readonly ChatAttachment[];
  readonly read: boolean;
  readonly readAt?: FirestoreTimestamp;
  readonly sentAt: FirestoreTimestamp;
};

export type Chat = {
  readonly id: string;
  readonly communityId: string;
  readonly participants: readonly [string, string];
  readonly guideId: string;
  readonly touristId: string;
  readonly bookingId?: string;
  readonly lastMessage?: Pick<ChatMessage, 'read' | 'senderId' | 'sentAt' | 'text'>;
  readonly createdAt: FirestoreTimestamp;
  readonly updatedAt: FirestoreTimestamp;
};

export type TourReview = {
  readonly id: string;
  readonly bookingId: string;
  readonly tourId: string;
  readonly guideId: string;
  readonly touristId: string;
  readonly communityId: string;
  readonly rating: 1 | 2 | 3 | 4 | 5;
  readonly comment: DraftLocalizedText;
  readonly photos: readonly string[];
  readonly status: 'pending_moderation' | 'published' | 'rejected';
  readonly createdAt: FirestoreTimestamp;
  readonly updatedAt: FirestoreTimestamp;
};

export type CouponDiscount =
  | { readonly type: 'fixed'; readonly amountCents: number }
  | { readonly type: 'percentage'; readonly percentage: number };

export type PromotionCoupon = {
  readonly id: string;
  readonly code: string;
  readonly communityId: string;
  readonly active: boolean;
  readonly description: DraftLocalizedText;
  readonly discount: CouponDiscount;
  readonly currencies: readonly PaymentCurrency[];
  readonly tourIds?: readonly string[];
  readonly minimumAmountCents?: number;
  readonly maximumRedemptions?: number;
  readonly redeemedCount: number;
  readonly startsAt: FirestoreTimestamp;
  readonly expiresAt: FirestoreTimestamp;
  readonly createdAt: FirestoreTimestamp;
  readonly updatedAt: FirestoreTimestamp;
};

export type CouponRedemption = {
  readonly id: string;
  readonly couponId: string;
  readonly code: string;
  readonly userId: string;
  readonly bookingId: string;
  readonly paymentId?: string;
  readonly discountAmountCents: number;
  readonly currency: PaymentCurrency;
  readonly status: 'applied' | 'consumed' | 'released';
  readonly createdAt: FirestoreTimestamp;
  readonly updatedAt: FirestoreTimestamp;
};

export type OfflinePackStatus = 'available' | 'downloading' | 'ready' | 'stale' | 'error';

export type OfflineCommunityPack = {
  readonly id: string;
  readonly communityId: string;
  readonly version: number;
  readonly status: OfflinePackStatus;
  readonly poiIds: readonly string[];
  readonly tourIds: readonly string[];
  readonly pois: readonly PointOfInterest[];
  readonly tours: readonly Tour[];
  readonly languageCodes: readonly SupportedLanguageCode[];
  readonly downloadedAt?: FirestoreTimestamp;
  readonly updatedAt: FirestoreTimestamp;
};

export type TourRecommendation = {
  readonly tourId: string;
  readonly communityId: string;
  readonly score: number;
  readonly reasons: readonly ('category' | 'favorite' | 'language' | 'sub_area')[];
};

export type MarketplaceItemCategory = 'accommodation' | 'art' | 'gastronomy' | 'workshop';

export type MarketplaceItem = {
  readonly id: string;
  readonly communityId: string;
  readonly providerId: string;
  readonly category: MarketplaceItemCategory;
  readonly title: DraftLocalizedText;
  readonly description: DraftLocalizedText;
  readonly priceLabel: DraftLocalizedText;
  readonly imageKey: 'art' | 'food' | 'tour';
  readonly status: 'draft' | 'published' | 'paused';
  readonly createdAt: FirestoreTimestamp;
  readonly updatedAt: FirestoreTimestamp;
};

export type MarketplaceInquiry = {
  readonly id: string;
  readonly communityId: string;
  readonly itemId: string;
  readonly providerId: string;
  readonly userId: string;
  readonly message: string;
  readonly status: 'new' | 'contacted' | 'closed';
  readonly createdAt: FirestoreTimestamp;
  readonly updatedAt: FirestoreTimestamp;
};
