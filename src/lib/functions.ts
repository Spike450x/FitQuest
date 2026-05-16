import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { LogActivityInput, LogActivityResult } from '@/types/cloudFunctions';

export const logActivityFn = httpsCallable<LogActivityInput, LogActivityResult>(
  functions,
  'logActivity',
);
