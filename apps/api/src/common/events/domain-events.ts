/**
 * SoftShopping Domain Events
 *
 * Centralised list of domain event names and payloads.
 * Used with @nestjs/event-emitter for decoupled, event-driven workflows.
 *
 * Naming: past tense (ProductCreatedEvent, not CreateProductEvent).
 */

export const DOMAIN_EVENTS = {
  // Product events
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',

  // Stock events
  STOCK_RESERVED: 'stock.reserved',
  STOCK_RELEASED: 'stock.released',
  STOCK_ADJUSTED: 'stock.adjusted',

  // Order events
  ORDER_CREATED: 'order.created',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_RETURNED: 'order.returned',

  // Campaign events
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_UPDATED: 'campaign.updated',
  CAMPAIGN_DELETED: 'campaign.deleted',
  CAMPAIGN_ACTIVATED: 'campaign.activated',

  // Notification events
  NOTIFICATION_CREATED: 'notification.created',
} as const;

export type DomainEventName = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];
