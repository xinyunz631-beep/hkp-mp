const DEFAULT_MOCK_DELAY_MS = 120;

export function cloneMockData<TData>(data: TData): TData {
  return JSON.parse(JSON.stringify(data)) as TData;
}

export function resolveMockData<TData>(data: TData, delayMs = DEFAULT_MOCK_DELAY_MS) {
  return new Promise<TData>((resolve) => {
    setTimeout(() => {
      resolve(cloneMockData(data));
    }, delayMs);
  });
}

export async function withServiceFallback<TData>(
  task: () => Promise<TData>,
  fallback: TData,
) {
  try {
    return await task();
  } catch {
    return cloneMockData(fallback);
  }
}
