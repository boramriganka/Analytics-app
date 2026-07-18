import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type {
  SummaryResponse,
  TimeseriesResponse,
  BreakdownResponse,
  BreakdownDimension,
  CustomerStatsResponse,
  InsightsResponse,
  DataQualityResponse,
  SavedView,
  Report,
  ImportJob,
  MappingPreset,
} from '@signalroom/schemas';
import { api } from './api';
import { useSession } from './session';

export interface Meta {
  categories: string[];
  channels: string[];
  stores: string[];
  countries: string[];
  products: string[];
  imports: { id: number; fileName: string }[];
  minDay: string | null;
  maxDay: string | null;
}

/** Analytics queries are keyed by workspace + full filter query, so caching,
 * request cancellation and refetch-on-filter-change all come from React Query. */
function useWorkspaceQuery<T>(pathAndQuery: string, options?: Partial<UseQueryOptions<T>>) {
  const { session } = useSession();
  return useQuery<T>({
    queryKey: [session?.workspace.id, pathAndQuery],
    queryFn: ({ signal }) => api<T>(pathAndQuery, { signal }),
    enabled: Boolean(session),
    staleTime: 60_000,
    ...options,
  });
}

export const useSummary = (query: string) => useWorkspaceQuery<SummaryResponse>(`/analytics/summary?${query}`);
export const useTimeseries = (query: string) => useWorkspaceQuery<TimeseriesResponse>(`/analytics/timeseries?${query}`);
export const useBreakdown = (query: string, dimension: BreakdownDimension, limit?: number) =>
  useWorkspaceQuery<BreakdownResponse>(
    `/analytics/breakdown?${query}&dimension=${dimension}${limit ? `&limit=${limit}` : ''}`
  );
export const useCustomerStats = (query: string) => useWorkspaceQuery<CustomerStatsResponse>(`/analytics/customers?${query}`);
export const useInsights = (query: string) => useWorkspaceQuery<InsightsResponse>(`/analytics/insights?${query}`);
export const useDataQuality = () => useWorkspaceQuery<DataQualityResponse>('/analytics/data-quality');
export const useMeta = () => useWorkspaceQuery<Meta>('/analytics/meta', { staleTime: 5 * 60_000 });
export const useViews = () => useWorkspaceQuery<{ views: SavedView[] }>('/views', { staleTime: 0 });
export const useReports = () =>
  useWorkspaceQuery<{ reports: (Pick<Report, 'id' | 'title' | 'createdAt' | 'updatedAt'> & { blockCount: number })[] }>(
    '/reports',
    { staleTime: 0 }
  );
export const useReport = (id: number | null) =>
  useWorkspaceQuery<Report>(`/reports/${id}`, { enabled: id !== null, staleTime: 0 } as never);
export const useImports = () => useWorkspaceQuery<{ imports: ImportJob[] }>('/imports', { staleTime: 0 });
export const useMappings = () => useWorkspaceQuery<{ presets: MappingPreset[] }>('/mappings', { staleTime: 0 });
