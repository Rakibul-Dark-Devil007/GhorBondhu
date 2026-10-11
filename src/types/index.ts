// Core Roles
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER' | 'PROVIDER';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export type ProviderVerificationStatus = 
  | 'PENDING' 
  | 'UNDER_REVIEW' 
  | 'VERIFIED' 
  | 'REJECTED' 
  | 'SUSPENDED';

export type BookingStatus = 
  | 'DRAFT' 
  | 'PENDING' 
  | 'PROVIDER_ASSIGNED' 
  | 'PROVIDER_ACCEPTED' 
  | 'ON_THE_WAY' 
  | 'SERVICE_STARTED' 
  | 'SERVICE_COMPLETED' 
  | 'CUSTOMER_CONFIRMED' 
  | 'CANCELLED' 
  | 'DISPUTED' 
  | 'REFUNDED';

export type PaymentStatus = 'UNPAID' | 'INITIATED' | 'PENDING' | 'AUTHORIZED' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

export type PaymentMethod = 'CASH_ON_DELIVERY' | 'BKASH' | 'NAGAD' | 'CARD' | 'SSLCOMMERZ';

// User Account
export interface AppUser {
  userId: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Customer Profile
export interface CustomerProfile {
  customerId: string;
  fullName: string;
  avatarUrl?: string;
  preferredLanguage: 'bn' | 'en';
  defaultAddressId?: string;
  emergencyContactPhone?: string;
  totalBookingsCompleted: number;
  createdAt: string;
}

// Provider Profile
export interface ProviderProfile {
  providerId: string;
  fullName: string;
  avatarUrl?: string;
  phoneNumber: string;
  verificationStatus: ProviderVerificationStatus;
  isOnline: boolean;
  servicesOffered: string[];
  serviceAreas: string[];
  ratingAvg: number;
  ratingCount: number;
  completedJobsCount: number;
  earningsSummary: {
    totalEarnedBDT: number;
    pendingPayoutBDT: number;
  };
}

// Provider Application / KYC
export interface ProviderApplication {
  applicationId: string;
  providerId: string;
  fullName: string;
  phoneNumber: string;
  nidNumber: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  presentAddress: string;
  permanentAddress: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  yearsOfExperience: number;
  experienceDescription?: string;
  nidFrontUrl: string;
  nidBackUrl: string;
  profilePhotoUrl?: string;
  selectedServices: string[];
  selectedAreas: string[];
  status: ProviderVerificationStatus;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt: string;
  updatedAt: string;
}

// Service Category
export interface ServiceCategory {
  categoryId: string;
  nameBn: string;
  nameEn: string;
  descriptionBn: string;
  descriptionEn: string;
  iconUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

// Service Item
export interface ServiceItem {
  serviceId: string;
  categoryId: string;
  nameBn: string;
  nameEn: string;
  descriptionBn: string;
  descriptionEn: string;
  pricingRuleId: string;
  materialsProvidedBy: 'CUSTOMER' | 'PROVIDER' | 'OPTIONAL_ADDON';
  estimatedMinDurationMinutes: number;
  availableDurationsMinutes: number[];
  imageUrl?: string;
  isActive: boolean;
  displayOrder?: number;
}

// Pricing Snapshot
export interface PricingSnapshot {
  pricingRuleId: string;
  ruleVersion: string;
  basePrice: number;
  baseDurationMinutes: number;
  selectedDurationMinutes: number;
  incrementStepMinutes: number;
  incrementPercentage: number;
  calculatedDurationSurcharge: number;
  emergencySurcharge: number;
  discountAmount: number;
  appliedCouponCode?: string;
  customerFinalAmount: number;
  platformCommissionPercent: number;
  platformCommissionAmount: number;
  providerEarningAmount: number;
  currency: 'BDT';
  calculatedAt: string;
}

// Booking Entity
export interface Booking {
  bookingId: string;
  bookingNumber: string;
  customerId: string;
  customerSnapshot: {
    fullName: string;
    phoneNumber: string;
  };
  providerId?: string;
  providerSnapshot?: {
    fullName: string;
    phoneNumber: string;
    avatarUrl?: string;
    ratingAvg: number;
  };
  serviceId: string;
  serviceNameSnapshot: {
    bn: string;
    en: string;
  };
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  selectedDurationMinutes: number;
  status: BookingStatus;
  locationSnapshot: {
    addressLine: string;
    area: string;
    city: string;
    specialInstructions?: string;
  };
  pricingSnapshot: PricingSnapshot;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  customerNotes?: string;
  rejectedProviderIds?: string[];
  startOtp?: string;
  isReviewed?: boolean;
  reviewSnapshot?: {
    rating: number;
    comment?: string;
    tags?: string[];
    createdAt: string;
  };
  statusHistory?: Array<{
    status: BookingStatus;
    changedBy: string;
    timestamp: any;
    note?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Pricing Rule Entity
export interface PricingRule {
  ruleId: string;
  serviceId: string;
  versionTag: string;
  basePriceBDT: number;
  baseDurationMinutes: number;
  incrementDurationMinutes: number;
  incrementPercentage: number;
  platformCommissionPercent: number;
  emergencySurchargeBDT: number;
  peakHourMultiplier: number;
  weekendMultiplier: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Customer Saved Address Entity
export interface CustomerAddress {
  addressId: string;
  customerId: string;
  label: 'HOME' | 'OFFICE' | 'OTHER';
  recipientName: string;
  contactPhone: string;
  addressLine: string;
  area: string;
  city: string;
  postalCode?: string;
  specialInstructions?: string;
  isDefault: boolean;
  createdAt: string;
}

// Roles & Granular Permissions
export interface RolePermission {
  roleName: string;
  description: string;
  permissions: {
    canVerifyProviders: boolean;
    canManageCatalog: boolean;
    canConfigurePricing: boolean;
    canOverrideBookings: boolean;
    canHandleDisputes: boolean;
    canProcessPayouts: boolean;
    canManageAdmins: boolean;
    canViewAuditLogs: boolean;
  };
  updatedAt: string;
  updatedBy: string;
}

// System Global Settings
export interface SystemSettings {
  settingId?: string;
  platformName: string;
  supportPhone: string;
  supportEmail: string;
  operatingCity?: string;
  defaultCommissionPercent?: number;
  serviceFeePercentage?: number;
  minBookingDurationMinutes?: number;
  maxBookingDurationMinutes?: number;
  autoAssignWindowMinutes?: number;
  minimumWithdrawalLimitBDT?: number;
  cancellationGraceMinutes?: number;
  cancellationFeeBDT?: number;
  operationalCities?: string[];
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  allowNewRegistrations?: boolean;
  autoDispatchEnabled?: boolean;
  emergencyBanner?: {
    active: boolean;
    message: string;
    type: 'INFO' | 'WARNING' | 'ALERT';
  };
  updatedAt?: string;
  updatedBy?: string;
}

// Audit Log Entity
export interface AuditLog {
  logId: string;
  actorId: string;
  actorRole: string;
  action: string;
  resourceType: 'PROVIDER' | 'BOOKING' | 'PRICING' | 'USER' | 'PAYMENT' | 'SETTINGS';
  resourceId: string;
  metadata: Record<string, any>;
  timestamp: string;
}

// Review & Rating Entity
export interface Review {
  reviewId?: string;
  id?: string;
  bookingId: string;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName?: string;
  serviceId: string;
  serviceNameBn?: string;
  serviceName?: {
    bn: string;
    en: string;
  };
  rating: number; // 1 to 5
  comment?: string;
  tags?: string[];
  createdAt: string;
}

// Notification Entity
export type NotificationType =
  | 'BOOKING_CREATED'
  | 'PROVIDER_ASSIGNED'
  | 'PROVIDER_ACCEPTED'
  | 'PROVIDER_EN_ROUTE'
  | 'SERVICE_STARTED'
  | 'SERVICE_COMPLETED'
  | 'CUSTOMER_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'REVIEW_RECEIVED'
  | 'SYSTEM_BROADCAST';

export interface AppNotification {
  id?: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  bookingId?: string;
  bookingNumber?: string;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

// SMS Delivery Log Entity
export interface SmsLog {
  id?: string;
  recipientPhone: string;
  message: string;
  provider: 'SSL_WIRELESS' | 'GREENWEB' | 'MOCK_DEV';
  status: 'SENT' | 'FAILED' | 'SIMULATED';
  bookingId?: string;
  type: string;
  timestamp: string;
  gatewayResponse?: any;
}

// Payment Transaction Entity
export interface Payment {
  paymentId: string;
  id?: string;
  bookingId: string;
  bookingNumber?: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  providerId?: string;
  providerName?: string;
  amountBDT: number;
  paymentMethod: PaymentMethod;
  status: 'INITIATED' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  gatewayTransactionId?: string;
  gatewayPayloadSnapshot?: Record<string, any>;
  paidAt?: string;
  refundedAt?: string;
  refundAmountBDT?: number;
  collectedBy?: string; // Provider or Admin UID for Cash on Delivery
  createdAt: string;
  updatedAt?: string;
}

export type PayoutStatus = 'REQUESTED' | 'APPROVED' | 'PROCESSED' | 'REJECTED';

// Provider Payout Request Entity
export interface PayoutRequest {
  payoutId: string;
  id?: string;
  providerId: string;
  providerName?: string;
  providerPhone?: string;
  amountBDT: number;
  payoutMethod: 'BKASH' | 'NAGAD' | 'BANK_TRANSFER';
  accountDetails?: {
    accountNumber: string;
    accountName?: string;
    bankName?: string;
    branchName?: string;
    routingNumber?: string;
  };
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  status: PayoutStatus;
  bookingIdsIncluded?: string[];
  rejectionReason?: string;
  transactionReference?: string;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string; // Admin UID
}

// Provider Wallet Summary Entity
export interface ProviderWallet {
  providerId: string;
  totalEarningsBDT: number;
  platformCommissionBDT: number;
  netEarningsBDT: number;
  totalPaidOutBDT: number;
  availableBalanceBDT: number;
  pendingPayoutBDT: number;
  completedJobsCount: number;
}

// Promotional Marketing Code Entity
export interface PromoCode {
  promoId: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxDiscountBDT: number;
  minBookingAmountBDT: number;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  createdBy?: string;
}

// Customer Dispute & Complaint Entity
export interface Dispute {
  disputeId: string;
  bookingId: string;
  bookingNumber?: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  providerId: string;
  providerName?: string;
  reason: string;
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  resolutionNotes?: string;
  refundAmountBDT?: number;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// Audit Log Entry Entity
export interface AuditLogEntry {
  logId: string;
  actorId: string;
  actorRole: string;
  actorEmail?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
  timestamp: string;
}



