import { MINI_STORAGE_KEYS } from '@/core/constants/storage';
import {
  deleteBffCrmAddress,
  fetchBffCrmAddresses,
  saveBffCrmAddress,
  setDefaultBffCrmAddress,
  type BffCrmAddress,
  type BffCrmAddressSaveRequest,
} from '@/core/services/bff-crm-api';
import type { HkpAddressSummary } from '@/core/types/hkp';
import { getCache, removeCache, setCache } from '@/core/utils/cache';
import type { OrderAddressData } from './model';

export type { OrderAddressData } from './model';

export const ORDER_ADDRESS_MAX_COUNT = 10;

export const ORDER_ADDRESS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface OrderAddressCacheEnvelope {
  savedAt: string;
  addresses: HkpAddressSummary[];
}

export interface SaveOrderAddressPayload {
  id?: string;
  name: string;
  mobile: string;
  region: string;
  detail: string;
  isDefault?: boolean;
  locationName?: string;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  tag?: string;
}

function normalizeAddress(address: HkpAddressSummary): HkpAddressSummary {
  return {
    ...address,
    name: address.name.trim(),
    mobile: address.mobile.trim(),
    region: address.region.trim(),
    detail: address.detail.trim(),
    locationName: address.locationName?.trim(),
    locationAddress: address.locationAddress?.trim(),
    tag: address.tag?.trim(),
  };
}

function normalizeAddressList(addresses: HkpAddressSummary[]) {
  const normalizedAddresses = addresses
    .filter((address) => address.id && address.name && address.mobile)
    .slice(0, ORDER_ADDRESS_MAX_COUNT)
    .map(normalizeAddress);

  if (normalizedAddresses.length === 0) return [];

  const defaultAddressIndex = normalizedAddresses.findIndex((address) => address.isDefault);
  return normalizedAddresses.map((address, index) => ({
    ...address,
    isDefault: defaultAddressIndex >= 0 ? index === defaultAddressIndex : index === 0,
  }));
}

function createAddressCacheEnvelope(addresses: HkpAddressSummary[]): OrderAddressCacheEnvelope {
  return {
    savedAt: new Date().toISOString(),
    addresses,
  };
}

function isAddressCacheEnvelope(data: unknown): data is OrderAddressCacheEnvelope {
  return Boolean(
    data
    && typeof data === 'object'
    && 'savedAt' in data
    && 'addresses' in data
    && Array.isArray((data as OrderAddressCacheEnvelope).addresses),
  );
}

function isAddressCacheExpired(savedAt?: string) {
  if (!savedAt) return true;
  const timestamp = Date.parse(savedAt);
  return !Number.isFinite(timestamp) || Date.now() - timestamp > ORDER_ADDRESS_CACHE_TTL_MS;
}

function joinRegion(address: BffCrmAddress) {
  return [address.provinceName, address.cityName, address.districtName]
    .filter(Boolean)
    .join('');
}

function toAddressSummary(address: BffCrmAddress): HkpAddressSummary {
  return normalizeAddress({
    id: address.addressNo,
    name: address.contactName,
    mobile: address.phone,
    region: joinRegion(address),
    detail: address.detailAddress,
    isDefault: Boolean(address.defaultAddress),
    locationAddress: joinRegion(address),
  });
}

function toBffAddressPayload(payload: SaveOrderAddressPayload): BffCrmAddressSaveRequest {
  return {
    addressNo: payload.id,
    contactName: payload.name,
    phone: payload.mobile,
    provinceName: payload.region,
    detailAddress: payload.detail,
    defaultAddress: Boolean(payload.isDefault),
  };
}

function readStoredAddresses() {
  const storedAddresses = getCache<unknown>(MINI_STORAGE_KEYS.orderAddresses);
  if (Array.isArray(storedAddresses)) {
    const normalizedAddresses = normalizeAddressList(storedAddresses);
    setCache(MINI_STORAGE_KEYS.orderAddresses, createAddressCacheEnvelope(normalizedAddresses));
    return normalizedAddresses;
  }
  if (!isAddressCacheEnvelope(storedAddresses)) return undefined;
  if (isAddressCacheExpired(storedAddresses.savedAt)) {
    removeCache(MINI_STORAGE_KEYS.orderAddresses);
    return undefined;
  }
  return normalizeAddressList(storedAddresses.addresses);
}

function writeStoredAddresses(addresses: HkpAddressSummary[]) {
  const normalizedAddresses = normalizeAddressList(addresses);
  setCache(MINI_STORAGE_KEYS.orderAddresses, createAddressCacheEnvelope(normalizedAddresses));
  return normalizedAddresses;
}

export function listOrderAddresses() {
  return readStoredAddresses() ?? [];
}

export function getOrderAddress(addressId?: string) {
  if (!addressId) return undefined;
  return listOrderAddresses().find((address) => address.id === addressId);
}

export function getDefaultOrderAddress() {
  const addresses = listOrderAddresses();
  return addresses.find((address) => address.isDefault) ?? addresses[0];
}

async function refreshOrderAddresses() {
  const records = await fetchBffCrmAddresses();
  return writeStoredAddresses(records.map(toAddressSummary));
}

export async function saveOrderAddress(payload: SaveOrderAddressPayload) {
  const currentAddresses = await refreshOrderAddresses();
  const editingAddressIndex = payload.id
    ? currentAddresses.findIndex((address) => address.id === payload.id)
    : -1;

  if (editingAddressIndex < 0 && currentAddresses.length >= ORDER_ADDRESS_MAX_COUNT) {
    throw new Error('ADDRESS_LIMIT_EXCEEDED');
  }

  const savedAddress = toAddressSummary(await saveBffCrmAddress(toBffAddressPayload({
    ...payload,
    isDefault: payload.isDefault || currentAddresses.length === 0,
  })));
  const normalizedAddresses = await refreshOrderAddresses();

  return {
    address: normalizedAddresses.find((address) => address.id === savedAddress.id) ?? savedAddress,
    addresses: normalizedAddresses,
  };
}

export async function setDefaultOrderAddress(addressId: string) {
  await setDefaultBffCrmAddress(addressId);
  return refreshOrderAddresses();
}

export async function deleteOrderAddress(addressId: string) {
  await deleteBffCrmAddress(addressId);
  return refreshOrderAddresses();
}

export function formatOrderAddress(address: HkpAddressSummary) {
  const baseAddress = address.locationAddress || address.region;
  return `${baseAddress}${address.detail}`;
}

// 获取地址管理真实数据，接口失败时由页面异常态承接，不回退本地静态地址。
export async function fetchAddressData(): Promise<OrderAddressData> {
  const addresses = await refreshOrderAddresses();
  return {
    addresses,
    maxCount: ORDER_ADDRESS_MAX_COUNT,
  };
}
