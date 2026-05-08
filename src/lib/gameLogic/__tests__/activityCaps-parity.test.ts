/**
 * Drift-detection test for the duplicated activityCaps module.
 *
 * `src/lib/gameLogic/activityCaps.ts` is copied to
 * `functions/src/gameLogic/activityCaps.ts` so the Cloud Function can run the
 * same cap logic without Next.js path-alias dependencies.
 *
 * This test imports both copies and asserts their cap constants and
 * `eligibleAmountForRewards` behaviour are identical. A failing test here means
 * one copy drifted and the cap being enforced server-side differs from the one
 * shown in the client UI.
 */

import { describe, it, expect } from 'vitest';
import {
  DAILY_ACTIVITY_CAPS as CLIENT_CAPS,
  eligibleAmountForRewards as clientEligible,
} from '../activityCaps';
import {
  DAILY_ACTIVITY_CAPS as FUNCTIONS_CAPS,
  eligibleAmountForRewards as fnEligible,
} from '../../../../functions/src/gameLogic/activityCaps';

describe('activityCaps parity — src vs functions copy', () => {
  it('DAILY_ACTIVITY_CAPS constants are identical', () => {
    expect(FUNCTIONS_CAPS).toEqual(CLIENT_CAPS);
  });

  const cases: [string, number, number][] = [
    ['workout', 0, 60],
    ['workout', 90, 60],
    ['workout', 120, 30],
    ['run', 0, 10],
    ['run', 15, 10],
    ['steps', 0, 20000],
    ['steps', 25000, 10000],
    ['sleep', 0, 8],
    ['water', 0, 12],
    ['nutrition', 0, 4],
  ];

  it.each(cases)(
    'eligibleAmountForRewards(%s, logged=%d, amount=%d) matches',
    (type, logged, amount) => {
      const clientResult = clientEligible(type as never, logged, amount);
      const fnResult = fnEligible(type as never, logged, amount);
      expect(fnResult).toBe(clientResult);
    },
  );
});
