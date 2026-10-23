import { useState } from 'react';
import type { WaitlistSignupInput } from '@workspace/api-client-react';

// Demo interactions never transmit or retain contact details.
export function useGetDetectedLocale() {
  const [data] = useState(() => {
    const language = navigator.language.split('-')[0];
    return { locale: (language === 'pl' || language === 'ar' ? language : 'en') as 'en' | 'pl' | 'ar', countryCode: null };
  });
  return { data };
}

export function useRecordAnalyticsEvent() {
  return { mutate: (_event: unknown) => {} };
}

export function useSubmitWaitlistSignup() {
  return {
    isPending: false,
    mutate: (_input: { data: WaitlistSignupInput }, callbacks: { onSuccess: (result: { result: 'joined' }) => void; onError: () => void }) => {
      callbacks.onSuccess({ result: 'joined' });
    },
  };
}
