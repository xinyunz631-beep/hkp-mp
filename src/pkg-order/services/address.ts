import { MINI_STORAGE_KEYS } from '@/core/constants/storage';
import { cloneMockData, resolveMockData } from '@/core/services/mock';
import type { HkpAddressSummary } from '@/core/types/hkp';
import { getCache, setCache } from '@/core/utils/cache';
import { orderAddresses, type OrderAddressData } from './mock-data';

export type { OrderAddressData } from './mock-data';

export const ORDER_ADDRESS_MAX_COUNT = 10;

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

function createAddressId() {
  return `addr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

function readStoredAddresses() {
  const storedAddresses = getCache<HkpAddressSummary[]>(MINI_STORAGE_KEYS.orderAddresses);
  if (!Array.isArray(storedAddresses)) return undefined;
  return normalizeAddressList(storedAddresses);
}

function writeStoredAddresses(addresses: HkpAddressSummary[]) {
  const normalizedAddresses = normalizeAddressList(addresses);
  setCache(MINI_STORAGE_KEYS.orderAddresses, normalizedAddresses);
  return normalizedAddresses;
}

export function listOrderAddresses() {
  const storedAddresses = readStoredAddresses();
  if (storedAddresses) return storedAddresses;
  return normalizeAddressList(cloneMockData(orderAddresses));
}

export function getOrderAddress(addressId?: string) {
  if (!addressId) return undefined;
  return listOrderAddresses().find((address) => address.id === addressId);
}

export function getDefaultOrderAddress() {
  const addresses = listOrderAddresses();
  return addresses.find((address) => address.isDefault) ?? addresses[0];
}

export function saveOrderAddress(payload: SaveOrderAddressPayload) {
  const currentAddresses = listOrderAddresses();
  const editingAddressIndex = payload.id
    ? currentAddresses.findIndex((address) => address.id === payload.id)
    : -1;

  if (editingAddressIndex < 0 && currentAddresses.length >= ORDER_ADDRESS_MAX_COUNT) {
    throw new Error('ADDRESS_LIMIT_EXCEEDED');
  }

  const nextAddress: HkpAddressSummary = normalizeAddress({
    id: payload.id || createAddressId(),
    name: payload.name,
    mobile: payload.mobile,
    region: payload.region,
    detail: payload.detail,
    isDefault: payload.isDefault || currentAddresses.length === 0,
    locationName: payload.locationName,
    locationAddress: payload.locationAddress,
    latitude: payload.latitude,
    longitude: payload.longitude,
    tag: payload.tag,
  });

  const nextAddresses = editingAddressIndex >= 0
    ? currentAddresses.map((address, index) => (index === editingAddressIndex ? nextAddress : address))
    : [...currentAddresses, nextAddress];

  const normalizedAddresses = writeStoredAddresses(nextAddresses.map((address) => ({
    ...address,
    isDefault: nextAddress.isDefault ? address.id === nextAddress.id : address.isDefault,
  })));

  return {
    address: normalizedAddresses.find((address) => address.id === nextAddress.id) ?? nextAddress,
    addresses: normalizedAddresses,
  };
}

export function setDefaultOrderAddress(addressId: string) {
  return writeStoredAddresses(listOrderAddresses().map((address) => ({
    ...address,
    isDefault: address.id === addressId,
  })));
}

export function deleteOrderAddress(addressId: string) {
  const currentAddresses = listOrderAddresses();
  const deletedAddress = currentAddresses.find((address) => address.id === addressId);
  const nextAddresses = currentAddresses.filter((address) => address.id !== addressId);
  const shouldResetDefault = deletedAddress?.isDefault && nextAddresses.length > 0;

  return writeStoredAddresses(nextAddresses.map((address, index) => ({
    ...address,
    isDefault: shouldResetDefault ? index === 0 : address.isDefault,
  })));
}

export function formatOrderAddress(address: HkpAddressSummary) {
  const baseAddress = address.locationAddress || address.region;
  return `${baseAddress}${address.detail}`;
}

// 获取地址管理页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchAddressData() {
  return resolveMockData<OrderAddressData>({
    addresses: listOrderAddresses(),
    maxCount: ORDER_ADDRESS_MAX_COUNT,
  });
}
