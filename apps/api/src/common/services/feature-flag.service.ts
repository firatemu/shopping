import { Injectable, Logger } from '@nestjs/common';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  tenantIds?: string[]; // null = all tenants, [] = no tenants
  rolloutPercentage?: number; // 0-100
  metadata?: Record<string, any>;
}

/**
 * Feature Flag Service for gradual tenant rollout.
 * Flags are stored in tenant settings JSON or a dedicated config.
 */
@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private flags: Map<string, FeatureFlag> = new Map();

  constructor() {
    this.initDefaults();
  }

  private initDefaults() {
    const defaults: FeatureFlag[] = [
      { key: 'multi_branch', enabled: false, rolloutPercentage: 0 },
      { key: 'ecommerce_sync', enabled: false, rolloutPercentage: 0 },
      { key: 'advanced_reporting', enabled: true, rolloutPercentage: 100 },
      { key: 'push_notifications', enabled: false, rolloutPercentage: 0 },
      { key: 'pdf_export', enabled: true, rolloutPercentage: 100 },
    ];
    for (const flag of defaults) {
      this.flags.set(flag.key, flag);
    }
  }

  isEnabled(key: string, tenantId?: string): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Tenant-specific override
    if (flag.tenantIds && flag.tenantIds.length > 0 && tenantId) {
      return flag.tenantIds.includes(tenantId);
    }

    // Rollout percentage (deterministic hash based on tenantId)
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100 && tenantId) {
      const hash = this.hashTenantId(tenantId);
      return hash < flag.rolloutPercentage;
    }

    return flag.enabled;
  }

  setFlag(key: string, updates: Partial<FeatureFlag>) {
    const existing = this.flags.get(key) ?? { key, enabled: false };
    this.flags.set(key, { ...existing, ...updates });
    this.logger.log(`Feature flag updated: ${key} → enabled=${this.flags.get(key)!.enabled}`);
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  private hashTenantId(tenantId: string): number {
    let hash = 0;
    for (let i = 0; i < tenantId.length; i++) {
      const char = tenantId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash) % 100;
  }
}
