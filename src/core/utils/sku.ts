import type { HkpSkuGroup, HkpSkuVariantBase } from '@/core/types/hkp';

type SkuSelectionMap = Record<string, string | undefined>;

export interface HkpSkuResolvedState<TVariant extends HkpSkuVariantBase> {
  groups: HkpSkuGroup[];
  selectionMap: SkuSelectionMap;
  selectedVariant?: TVariant;
  selectedText: string;
  missingGroupTitles: string[];
  missingSelectionText: string;
  stockText: string;
  submitTip: string;
  maxQuantity: number;
  isComplete: boolean;
  isPurchasable: boolean;
}

// 读取当前规格组选中值，页面和业务层不要重复拼 map。
export function getSkuSelectionMap(groups: HkpSkuGroup[]): SkuSelectionMap {
  return groups.reduce<SkuSelectionMap>((map, group) => ({
    ...map,
    [group.id]: group.selectedId,
  }), {});
}

// 判断 SKU 是否还有可购买库存。
function isSkuVariantAvailable(variant: HkpSkuVariantBase) {
  return variant.stock > 0;
}

// 快捷加购入口统一使用这个判断口径：只有多个可售组合才需要弹规格层。
export function getSalableSkuVariants<TVariant extends HkpSkuVariantBase>(variants: TVariant[]) {
  return variants.filter(isSkuVariantAvailable);
}

export function shouldOpenQuickSkuPopup<TVariant extends HkpSkuVariantBase>(variants: TVariant[]) {
  return getSalableSkuVariants(variants).length > 1;
}

// 判断一个 SKU 是否匹配当前已选条件；未选择的维度不参与匹配。
function matchesSkuSelection(variant: HkpSkuVariantBase, selectionMap: SkuSelectionMap) {
  return Object.entries(selectionMap).every(([groupId, optionId]) => (
    !optionId || variant.optionIds[groupId] === optionId
  ));
}

// 判断一个 SKU 是否完整命中所有规格维度。
function matchesCompleteSkuSelection(
  variant: HkpSkuVariantBase,
  groups: HkpSkuGroup[],
  selectionMap: SkuSelectionMap,
) {
  return groups.every((group) => selectionMap[group.id] && variant.optionIds[group.id] === selectionMap[group.id]);
}

// 统计候选 SKU 对当前选择的保留程度，用于上层规格切换后尽量保留下层已选值。
function scoreSkuVariant(variant: HkpSkuVariantBase, selectionMap: SkuSelectionMap) {
  return Object.entries(selectionMap).reduce((score, [groupId, optionId]) => (
    optionId && variant.optionIds[groupId] === optionId ? score + 1 : score
  ), 0);
}

// 把某个可售 SKU 回写到规格组选中态，保证多层级选择最终落到真实可售组合。
export function resolveSkuGroupsByVariant<TVariant extends HkpSkuVariantBase>(
  groups: HkpSkuGroup[],
  variant?: TVariant,
) {
  if (!variant) return groups;

  return groups.map((group) => ({
    ...group,
    selectedId: variant.optionIds[group.id] ?? group.selectedId,
  }));
}

// 从候选 SKU 中选择最适合当前条件的可售组合。
function pickBestAvailableSkuVariant<TVariant extends HkpSkuVariantBase>(
  variants: TVariant[],
  selectionMap: SkuSelectionMap,
) {
  const availableVariants = getSalableSkuVariants(variants);
  const exactVariant = availableVariants.find((variant) => matchesSkuSelection(variant, selectionMap));

  if (exactVariant) return exactVariant;

  return [...availableVariants]
    .sort((current, next) => (
      scoreSkuVariant(next, selectionMap) - scoreSkuVariant(current, selectionMap)
    ))[0];
}

// 初始化规格选择：优先保留已有可售选择，否则落到第一条可售 SKU。
export function resolveInitialSkuGroups<TVariant extends HkpSkuVariantBase>(
  groups: HkpSkuGroup[],
  variants: TVariant[],
) {
  const selectedVariant = pickBestAvailableSkuVariant(variants, getSkuSelectionMap(groups));

  return resolveSkuGroupsByVariant(groups, selectedVariant);
}

function getSkuSelectionMapUntilGroup(groups: HkpSkuGroup[], endIndex: number) {
  return groups.slice(0, endIndex + 1).reduce<SkuSelectionMap>((map, group) => ({
    ...map,
    [group.id]: group.selectedId,
  }), {});
}

function matchesRequiredSkuSelection(variant: HkpSkuVariantBase, requiredSelectionMap: SkuSelectionMap) {
  return Object.entries(requiredSelectionMap).every(([groupId, optionId]) => (
    !optionId || variant.optionIds[groupId] === optionId
  ));
}

// 点击规格项时只允许向下联动：高层级变更可重算下方，低层级不能反向改上方。
export function resolveNextSkuGroupsAfterSelect<TVariant extends HkpSkuVariantBase>(
  groups: HkpSkuGroup[],
  variants: TVariant[],
  groupId: string,
  optionId: string,
) {
  const changedIndex = groups.findIndex((group) => group.id === groupId);
  if (changedIndex < 0) return groups;

  const nextGroups = groups.map((group) => (
    group.id === groupId ? { ...group, selectedId: optionId } : group
  ));
  const fixedSelectionMap = getSkuSelectionMapUntilGroup(nextGroups, changedIndex);
  const availableVariants = variants
    .filter(isSkuVariantAvailable)
    .filter((variant) => matchesRequiredSkuSelection(variant, fixedSelectionMap));
  const selectedVariant = pickBestAvailableSkuVariant(availableVariants, getSkuSelectionMap(nextGroups));

  if (!selectedVariant) return groups;

  return nextGroups.map((group, index) => (
    index <= changedIndex
      ? group
      : { ...group, selectedId: selectedVariant.optionIds[group.id] ?? group.selectedId }
  ));
}

// 按规格组选中值生成面向用户的已选文案。
function resolveSelectedSkuText(groups: HkpSkuGroup[]) {
  return groups
    .map((group) => group.options.find((option) => option.id === group.selectedId)?.label)
    .filter(Boolean)
    .join('、');
}

// 给规格选项补充禁用状态：只看上方层级选择，避免下方选择反向影响上方规格。
function resolveInteractiveSkuGroups<TVariant extends HkpSkuVariantBase>(
  groups: HkpSkuGroup[],
  variants: TVariant[],
) {
  return groups.map((group, groupIndex) => ({
    ...group,
    options: group.options.map((option) => {
      const upperSelectionMap = groups.slice(0, groupIndex).reduce<SkuSelectionMap>((map, upperGroup) => ({
        ...map,
        [upperGroup.id]: upperGroup.selectedId,
      }), {});
      const optionVariants = variants.filter((variant) => (
        variant.optionIds[group.id] === option.id && matchesRequiredSkuSelection(variant, upperSelectionMap)
      ));
      const optionAvailable = optionVariants.some(isSkuVariantAvailable);

      return {
        ...option,
        disabled: !optionAvailable,
        disabledReason: optionAvailable ? undefined : optionVariants.length > 0 ? '售罄' : '暂不可选',
      };
    }),
  }));
}

// 解析完整 SKU 状态，供弹层、价格、库存、提交校验统一消费。
export function resolveSkuState<TVariant extends HkpSkuVariantBase>(
  groups: HkpSkuGroup[],
  variants: TVariant[],
): HkpSkuResolvedState<TVariant> {
  const selectionMap = getSkuSelectionMap(groups);
  const missingGroupTitles = groups
    .filter((group) => !selectionMap[group.id])
    .map((group) => group.title);
  const isComplete = missingGroupTitles.length === 0;
  const selectedVariant = isComplete
    ? variants.find((variant) => isSkuVariantAvailable(variant) && matchesCompleteSkuSelection(variant, groups, selectionMap))
    : undefined;
  const selectedText = resolveSelectedSkuText(groups);
  const missingSelectionText = missingGroupTitles.length > 0
    ? `请选择 ${missingGroupTitles.join('、')}`
    : '';
  const submitTip = missingSelectionText || (selectedVariant ? '' : '当前规格暂时无货，请更换规格');

  return {
    groups: resolveInteractiveSkuGroups(groups, variants),
    selectionMap,
    selectedVariant,
    selectedText,
    missingGroupTitles,
    missingSelectionText,
    stockText: selectedVariant ? `库存 ${selectedVariant.stock} 件` : '',
    submitTip,
    maxQuantity: Math.max(1, selectedVariant?.stock ?? 1),
    isComplete,
    isPurchasable: Boolean(selectedVariant),
  };
}

// 修正购买数量，避免切换到低库存 SKU 后数量仍超过库存。
export function clampSkuQuantity(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
