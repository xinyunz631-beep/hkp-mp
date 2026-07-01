export interface LegacyBindAuthorizedPhoneSource {
  phoneNumber?: string;
  purePhoneNumber?: string;
  profile?: {
    phone?: string;
  } | null;
}

function normalizeMainlandMobile(value?: string) {
  const digits = (value || '').trim().replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('86')) return digits.slice(2);
  return digits;
}

function isMainlandMobile(value: string) {
  return /^1[3-9]\d{9}$/.test(value);
}

export function resolveLegacyBindAuthorizedPhone(source?: LegacyBindAuthorizedPhoneSource | null) {
  const candidates = [
    source?.profile?.phone,
    source?.purePhoneNumber,
    source?.phoneNumber,
  ];

  for (const candidate of candidates) {
    const phone = normalizeMainlandMobile(candidate);
    if (isMainlandMobile(phone)) return phone;
  }

  return '';
}
