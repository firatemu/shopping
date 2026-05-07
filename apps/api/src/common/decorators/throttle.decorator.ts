import { SetMetadata } from '@nestjs/common';

/**
 * Custom throttle decorator to apply named throttle profiles.
 * Used in conjunction with ThrottlerGuard and the per-tenant Redis backend.
 *
 * Profiles (defined in ThrottlerModule):
 *  - AUTH  : 10 req / 15 min  (login, register, refresh)
 *  - BARCODE: 300 req / min   (barkod lookup — high frequency)
 *  - REPORT: 20 req / min     (heavy aggregation queries)
 *  - BULK  : 30 req / min     (bulk operations)
 *  - DEFAULT: 200 req / min   (general)
 */

export const THROTTLE_PROFILE_KEY = 'throttle_profile';

export type ThrottleProfile = 'AUTH' | 'BARCODE' | 'REPORT' | 'BULK' | 'DEFAULT';

export const Throttle = (profile: ThrottleProfile) => SetMetadata(THROTTLE_PROFILE_KEY, profile);
