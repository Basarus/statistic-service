export type StatEventName =
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'payment.success'
  | 'meter.reading.sent'
  | 'receipt.downloaded'
  | 'request.lka.sent'
  | 'request.provider.sent'
  | 'user.created'
  | 'user.activated'
  | 'user.deleted'
  | 'account.linked'
  | 'account.unlinked';

export type StatEventDimension =
  | 'platform'
  | 'authMethod'
  | 'organizationId'
  | 'userId'
  | 'providerId'
  | 'requestType'
  | 'payload.paymentType';

export interface StatEventMapItem {
  eventName: StatEventName;
  category: 'auth' | 'payment' | 'meter' | 'receipt' | 'request';
  requiredDimensions: readonly StatEventDimension[];
  optional: boolean;
}

export const STAT_EVENT_MAP: readonly StatEventMapItem[] = [
  {
    eventName: 'auth.login.success',
    category: 'auth',
    requiredDimensions: ['platform', 'authMethod', 'organizationId', 'userId'],
    optional: false,
  },
  {
    eventName: 'auth.login.failed',
    category: 'auth',
    requiredDimensions: ['platform', 'authMethod', 'organizationId', 'userId'],
    optional: true,
  },
  {
    eventName: 'payment.success',
    category: 'payment',
    requiredDimensions: ['platform', 'organizationId', 'userId', 'providerId', 'payload.paymentType'],
    optional: false,
  },
  {
    eventName: 'meter.reading.sent',
    category: 'meter',
    requiredDimensions: ['platform', 'organizationId', 'userId'],
    optional: false,
  },
  {
    eventName: 'receipt.downloaded',
    category: 'receipt',
    requiredDimensions: ['platform', 'organizationId', 'userId'],
    optional: false,
  },
  {
    eventName: 'request.lka.sent',
    category: 'request',
    requiredDimensions: ['platform', 'organizationId', 'userId', 'requestType'],
    optional: false,
  },
  {
    eventName: 'request.provider.sent',
    category: 'request',
    requiredDimensions: ['platform', 'organizationId', 'userId', 'providerId', 'requestType'],
    optional: false,
  },

  {
    eventName: 'user.created',
    category: 'request',
    requiredDimensions: ['organizationId', 'userId'],
    optional: true,
  },
  {
    eventName: 'user.activated',
    category: 'request',
    requiredDimensions: ['organizationId', 'userId'],
    optional: true,
  },
  {
    eventName: 'user.deleted',
    category: 'request',
    requiredDimensions: ['organizationId', 'userId'],
    optional: true,
  },
  {
    eventName: 'account.linked',
    category: 'request',
    requiredDimensions: ['organizationId', 'userId'],
    optional: true,
  },
  {
    eventName: 'account.unlinked',
    category: 'request',
    requiredDimensions: ['organizationId', 'userId'],
    optional: true,
  },
];
