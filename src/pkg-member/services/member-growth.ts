import {
  fetchBffCrmCenter,
  type BffCrmBenefit,
  type BffCrmLevelRule,
} from '@/core/services/bff-crm-api';

export interface MemberGrowthBenefit {
  id: string;
  levelId: string;
  title: string;
  summary: string;
  highlightText: string;
  imageSrc: string;
}

export interface MemberGrowthLevel {
  id: string;
  levelNo: number;
  name: string;
  growthThreshold: number;
  themeColor: string;
  imageSrc: string;
  benefits: MemberGrowthBenefit[];
}

export interface MemberGrowthRuleSection {
  id: string;
  title: string;
  content: string;
}

export interface MemberGrowthRecord {
  id: string;
  title: string;
  value: number;
  time: string;
}

export interface MemberGrowthData {
  backgroundImageSrc: string;
  avatarImageSrc: string;
  member: {
    levelId: string;
    levelNo?: number;
    levelName?: string;
    growthValue: number;
  };
  levels: MemberGrowthLevel[];
  levelRuleIntro: string[];
  growthRuleSections: MemberGrowthRuleSection[];
  growthRecords: MemberGrowthRecord[];
}

function normalizeText(value?: string) {
  return value?.trim() || '';
}

function normalizeNonNegativeNumber(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;

  return Math.floor(value);
}

function isEnabledStatus(status?: string) {
  const normalizedStatus = normalizeText(status).toUpperCase();
  return !normalizedStatus || ['ENABLED', 'ACTIVE', 'PUBLISHED', 'VALID'].includes(normalizedStatus);
}

function toMemberGrowthBenefit(benefit: BffCrmBenefit): MemberGrowthBenefit | null {
  const id = normalizeText(benefit.benefitNo);
  const levelId = normalizeText(benefit.levelCode);
  const title = normalizeText(benefit.benefitTitle);

  if (!id || !levelId || !title || !isEnabledStatus(benefit.status)) return null;

  return {
    id,
    levelId,
    title,
    summary: normalizeText(benefit.benefitSummary || benefit.description),
    highlightText: normalizeText(benefit.highlightText),
    imageSrc: normalizeText(benefit.iconUrl),
  };
}

function groupBenefitsByLevel(benefits: BffCrmBenefit[]) {
  return benefits.reduce<Record<string, MemberGrowthBenefit[]>>((result, benefit) => {
    const nextBenefit = toMemberGrowthBenefit(benefit);
    if (!nextBenefit) return result;

    const levelBenefits = result[nextBenefit.levelId] ?? [];
    levelBenefits.push(nextBenefit);
    result[nextBenefit.levelId] = levelBenefits;
    return result;
  }, {});
}

function toMemberGrowthLevel(
  level: BffCrmLevelRule,
  benefitMap: Record<string, MemberGrowthBenefit[]>,
): MemberGrowthLevel | null {
  const id = normalizeText(level.levelCode);
  const name = normalizeText(level.levelName);

  if (!id || !name || !isEnabledStatus(level.status)) return null;

  return {
    id,
    levelNo: normalizeNonNegativeNumber(level.levelNo),
    name,
    growthThreshold: normalizeNonNegativeNumber(level.growthThreshold),
    themeColor: normalizeText(level.badgeColor) || '#ec6d9c',
    imageSrc: normalizeText(level.iconUrl),
    benefits: benefitMap[id] ?? [],
  };
}

// 获取会员等级及成长值数据，只读取 CRM BFF，不再回退本地等级、规则或记录数据。
export async function fetchMemberGrowthData() {
  const center = await fetchBffCrmCenter();
  const benefitMap = groupBenefitsByLevel(center.benefits ?? []);
  const levels = (center.levels ?? [])
    .map((level) => toMemberGrowthLevel(level, benefitMap))
    .filter((level): level is MemberGrowthLevel => Boolean(level))
    .sort((firstLevel, secondLevel) => (
      firstLevel.growthThreshold - secondLevel.growthThreshold
      || firstLevel.levelNo - secondLevel.levelNo
    ));

  return {
    backgroundImageSrc: '',
    avatarImageSrc: normalizeText(center.profile.avatarUrl),
    member: {
      levelId: normalizeText(center.profile.levelCode),
      levelNo: center.profile.levelNo,
      levelName: normalizeText(center.profile.levelName),
      growthValue: normalizeNonNegativeNumber(center.profile.growthValue),
    },
    levels,
    levelRuleIntro: [],
    growthRuleSections: [],
    growthRecords: [],
  };
}
