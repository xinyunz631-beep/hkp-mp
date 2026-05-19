import { createContext, ReactNode, useContext } from 'react';

export interface PageRuntimeRefreshContextValue {
  hasInitPage: boolean;
  refreshing: boolean;
  reload: () => Promise<boolean>;
}

const PageRuntimeRefreshContext = createContext<PageRuntimeRefreshContextValue | undefined>(undefined);

export function PageRuntimeRefreshProvider({
  value,
  children,
}: {
  value: PageRuntimeRefreshContextValue;
  children: ReactNode;
}) {
  return (
    <PageRuntimeRefreshContext.Provider value={value}>
      {children}
    </PageRuntimeRefreshContext.Provider>
  );
}

export function usePageRuntimeRefresh() {
  return useContext(PageRuntimeRefreshContext);
}
