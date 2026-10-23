import apiClient from "@/lib/api-client";

type PageResult<T> = { data: T[]; total: number; page: number; limit: number };

/** Follows PageResult.total across pages instead of assuming everything
 * fits in one request — a lecturer with more exams than the page size
 * would otherwise silently have their dashboard metrics undercount. */
export async function fetchAllPages<T>(
  url: string,
  params: Record<string, unknown>,
): Promise<T[]> {
  const limit = 100;
  let page = 1;
  let all: T[] = [];

  while (true) {
    const response = await apiClient.get<PageResult<T>>(url, {
      params: { ...params, page, limit },
    });
    const data = response.data.data ?? [];
    all = all.concat(data);
    if (data.length < limit || all.length >= response.data.total) break;
    page += 1;
  }

  return all;
}

