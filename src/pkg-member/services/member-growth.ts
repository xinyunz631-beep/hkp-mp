import {
  fetchBffCrmCenter,
  fetchBffCrmGrowth,
  fetchBffCrmGrowthRecords,
  type BffCrmBenefit,
  type BffCrmGrowth,
  type BffCrmGrowthLevel,
  type BffCrmGrowthRecord,
  type BffCrmGrowthRuleSection,
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
  memberName: string;
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

interface FetchMemberGrowthDataOptions {
  includeRecords?: boolean;
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const nextValue = Number(value.trim());
    if (Number.isFinite(nextValue)) return nextValue;
  }

  return fallback;
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

function indexGrowthLevels(levels: BffCrmGrowthLevel[]) {
  return levels.reduce<Record<string, BffCrmGrowthLevel>>((result, level) => {
    const id = normalizeText(level.id);
    if (!id) return result;

    result[id] = level;
    return result;
  }, {});
}

function toMemberGrowthLevel(
  level: BffCrmLevelRule,
  growthLevelMap: Record<string, BffCrmGrowthLevel>,
  benefitMap: Record<string, MemberGrowthBenefit[]>,
): MemberGrowthLevel | null {
  const id = normalizeText(level.levelCode);
  const name = normalizeText(level.levelName);
  if (!id || !name || !isEnabledStatus(level.status)) return null;

  const growthLevel = growthLevelMap[id];
  return {
    id,
    levelNo: Math.max(1, Math.floor(normalizeNumber(growthLevel?.levelNo, normalizeNumber(level.levelNo, 1)))),
    name,
    growthThreshold: Math.max(0, normalizeNumber(growthLevel?.growthThreshold, normalizeNumber(level.growthThreshold))),
    themeColor: normalizeText(growthLevel?.themeColor) || normalizeText(level.badgeColor) || '#ec6d9c',
    imageSrc: normalizeText(level.iconUrl),
    benefits: benefitMap[id] ?? [],
  };
}

function normalizeGrowthRuleSection(
  section: BffCrmGrowthRuleSection,
  index: number,
): MemberGrowthRuleSection | undefined {
  const title = normalizeText(section.title);
  const content = normalizeText(section.content);
  if (!title || !content) return undefined;

  return {
    id: normalizeText(section.id) || `growth-rule-${index + 1}`,
    title,
    content,
  };
}

function normalizeGrowthRecord(record: BffCrmGrowthRecord, index: number): MemberGrowthRecord | undefined {
  const title = normalizeText(record.title);
  if (!title) return undefined;

  return {
    id: normalizeText(record.id) || `growth-record-${index + 1}`,
    title,
    value: normalizeNumber(record.value),
    time: normalizeText(record.time),
  };
}

// 获取成长值聚合数据，组合等级权益、规则说明和真实流水。
export async function fetchMemberGrowthData(options: FetchMemberGrowthDataOptions = {}) {
  const includeRecords = options.includeRecords !== false;
  const [center, growth, growthRecords] = await Promise.all([
    fetchBffCrmCenter(),
    fetchBffCrmGrowth(),
    includeRecords
      ? fetchBffCrmGrowthRecords()
      : Promise.resolve(undefined),
  ]);

  const benefitMap = groupBenefitsByLevel(center.benefits ?? []);
  const growthLevelMap = indexGrowthLevels(growth.levels ?? []);
  const levels = (center.levels ?? [])
    .map((level) => toMemberGrowthLevel(level, growthLevelMap, benefitMap))
    .filter((level): level is MemberGrowthLevel => Boolean(level))
    .sort((firstLevel, secondLevel) => (
      firstLevel.growthThreshold - secondLevel.growthThreshold
      || firstLevel.levelNo - secondLevel.levelNo
    ));

  return {
    backgroundImageSrc: normalizeText(growth.backgroundImageSrc),
    avatarImageSrc: normalizeText(growth.avatarImageSrc) || normalizeText(center.profile.avatarUrl),
    memberName: normalizeText(center.profile.nickName),
    member: {
      levelId: normalizeText(growth.member?.levelId),
      growthValue: Math.max(0, normalizeNumber(growth.member?.growthValue)),
    },
    levels,
    levelRuleIntro: (growth.levelRuleIntro || []).map(normalizeText).filter(Boolean),
    growthRuleSections: (growth.growthRuleSections || [])
      .map(normalizeGrowthRuleSection)
      .filter((section): section is MemberGrowthRuleSection => Boolean(section)),
    growthRecords: (growthRecords || growth.growthRecords || [])
      .map(normalizeGrowthRecord)
      .filter((record): record is MemberGrowthRecord => Boolean(record)),
  };
}
