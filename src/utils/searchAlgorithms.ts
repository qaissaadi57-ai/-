// Search Algorithms & Arabic / Phone Technical Equations for Edara App

/**
 * Normalizes Arabic text for flexible and tolerant search.
 * - Removes diacritics (tashkeel: َ ً ُ ٌ ِ ٍ ْ ّ)
 * - Unifies Alef variants: أ, إ, آ, ٱ -> ا
 * - Unifies Teh Marbuta and Heh: ة -> ه
 * - Unifies Alef Maqsura and Yeh: ى -> ي
 * - Collapses spaces and converts to lowercase
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel
    .replace(/[أإآٱ]/g, 'ا')              // Unify Alef
    .replace(/ة/g, 'ه')                  // Teh Marbuta -> Heh
    .replace(/ى/g, 'ي')                  // Alef Maqsura -> Yeh
    .replace(/\s+/g, ' ')                // Collapse spaces
    .trim()
    .toLowerCase();
}

/**
 * Normalizes phone numbers for accurate digit-matching:
 * - Converts Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) to standard ASCII (0123456789)
 * - Strips all non-digit characters (+, -, spaces, brackets)
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const str = String(phone);
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let converted = '';
  for (let i = 0; i < str.length; i++) {
    const idx = arabicDigits.indexOf(str[i]);
    if (idx !== -1) {
      converted += idx;
    } else {
      converted += str[i];
    }
  }
  return converted.replace(/\D/g, '');
}

export type SearchCriterion = 'all' | 'ownerName' | 'stationName' | 'phone' | 'governorate' | 'stationCode';

export interface SearchMatchResult {
  isMatch: boolean;
  matchedFieldLabel: string;
  matchedValue: string;
  primaryTitle: string;
  secondaryInfo: string;
}

/**
 * Evaluates whether a record matches the user's specific technical search equation,
 * and extracts the exact matched field to display prominently in search results.
 */
export function evaluateSearchMatch(
  rec: Record<string, any>,
  criterion: SearchCriterion,
  query: string,
  activeSheet: 'stations' | 'agents'
): SearchMatchResult {
  const normQ = normalizeArabic(query);
  const phoneQ = normalizePhone(query);

  if (!query || !query.trim()) {
    return {
      isMatch: true,
      matchedFieldLabel: '',
      matchedValue: '',
      primaryTitle: rec.stationName || rec.gasAgentName || rec.ownerName || 'سجل',
      secondaryInfo: rec.governorate || ''
    };
  }

  // Extract field values based on active sheet context
  const ownerVal = activeSheet === 'stations'
    ? (rec.ownerName || rec.ownerManagerName || '')
    : (rec.gasAgentName || rec.agentOwnerName || rec.ownerName || '');

  const stationVal = activeSheet === 'stations'
    ? (rec.stationName || rec.stationCode || '')
    : (rec.gasOfficeName || rec.officeName || rec.gasAgentName || '');

  const phoneVal = activeSheet === 'stations'
    ? (rec.phone || rec.ownerPhone || '')
    : (rec.gasAgentPhone || rec.phone || '');

  const govVal = activeSheet === 'stations'
    ? (rec.governorate || rec.city || '')
    : (rec.gasAgentGovernorate || rec.gasAgentCity || rec.governorate || '');

  const codeVal = rec.stationCode || rec.code || rec.id || '';

  // Primary title for context
  const primaryTitle = activeSheet === 'stations'
    ? (rec.stationName || rec.ownerName || 'محطة')
    : (rec.gasAgentName || rec.ownerName || 'وكيل غاز');

  // 1. OWNER NAME SEARCH EQUATION
  if (criterion === 'ownerName') {
    const isMatch = normalizeArabic(ownerVal).includes(normQ);
    return {
      isMatch,
      matchedFieldLabel: activeSheet === 'stations' ? 'اسم صاحب المحطة' : 'اسم الوكيل',
      matchedValue: String(ownerVal || 'غير مدخل'),
      primaryTitle: String(ownerVal || primaryTitle),
      secondaryInfo: activeSheet === 'stations' ? `المحطة: ${stationVal}` : `المحافظة: ${govVal}`
    };
  }

  // 2. STATION / OFFICE NAME SEARCH EQUATION
  if (criterion === 'stationName') {
    const isMatch = normalizeArabic(stationVal).includes(normQ);
    return {
      isMatch,
      matchedFieldLabel: activeSheet === 'stations' ? 'اسم المحطة' : 'اسم المكتب/الوكالة',
      matchedValue: String(stationVal || 'غير مدخل'),
      primaryTitle: String(stationVal || primaryTitle),
      secondaryInfo: `صاحب المحطة/الوكيل: ${ownerVal}`
    };
  }

  // 3. PHONE NUMBER SEARCH EQUATION
  if (criterion === 'phone') {
    const recPhoneNorm = normalizePhone(phoneVal);
    let isMatch = false;
    if (phoneQ.length > 0) {
      isMatch = recPhoneNorm.includes(phoneQ);
    } else {
      isMatch = String(phoneVal).toLowerCase().includes(query.toLowerCase());
    }
    return {
      isMatch,
      matchedFieldLabel: 'رقم الهاتف',
      matchedValue: String(phoneVal || 'غير مدخل'),
      primaryTitle: `📞 ${phoneVal || 'بدون رقم'}`,
      secondaryInfo: `${primaryTitle} - ${govVal}`
    };
  }

  // 4. GOVERNORATE SEARCH EQUATION
  if (criterion === 'governorate') {
    const isMatch = normalizeArabic(govVal).includes(normQ);
    return {
      isMatch,
      matchedFieldLabel: 'المحافظة',
      matchedValue: String(govVal || 'غير مدخل'),
      primaryTitle: `🏛️ محافظة: ${govVal}`,
      secondaryInfo: `${primaryTitle} (${ownerVal})`
    };
  }

  // 5. STATION CODE SEARCH EQUATION
  if (criterion === 'stationCode') {
    const isMatch = normalizeArabic(codeVal).includes(normQ);
    return {
      isMatch,
      matchedFieldLabel: 'رقم/كود المحطة',
      matchedValue: String(codeVal || 'غير مدخل'),
      primaryTitle: `🔢 كود المحطة: ${codeVal}`,
      secondaryInfo: primaryTitle
    };
  }

  // 6. ALL FIELDS SEARCH EQUATION
  const matchAny = Object.values(rec).some((val) => {
    if (!val) return false;
    const strVal = String(val);
    if (normalizeArabic(strVal).includes(normQ)) return true;
    if (phoneQ && normalizePhone(strVal).includes(phoneQ)) return true;
    return false;
  });

  return {
    isMatch: matchAny,
    matchedFieldLabel: 'جميع الحقول',
    matchedValue: String(primaryTitle),
    primaryTitle,
    secondaryInfo: `المحافظة: ${govVal} - هاتف: ${phoneVal}`
  };
}
