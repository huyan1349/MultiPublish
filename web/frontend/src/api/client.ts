const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Content
  createContent(data: { title: string; rawMarkdown: string; tags: string[]; coverImage?: string; summary?: string }) {
    return request<{ id: string; title: string; rawMarkdown: string; tags: string[]; createdAt: string }>('/contents', {
      method: 'POST', body: JSON.stringify(data),
    });
  },
  listContents() {
    return request<Array<{ id: string; title: string; tags: string[]; updatedAt: string }>>('/contents');
  },
  getContent(id: string) {
    return request<{ id: string; title: string; rawMarkdown: string; summary?: string; tags: string[]; coverImage?: string }>(`/contents/${id}`);
  },
  updateContent(id: string, data: Record<string, unknown>) {
    return request(`/contents/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteContent(id: string) {
    return request(`/contents/${id}`, { method: 'DELETE' });
  },

  // Adaptation
  adaptContent(id: string, platforms: string[]) {
    return request<Array<{ platform: string; platformName: string; status: string }>>(`/contents/${id}/adapt`, {
      method: 'POST', body: JSON.stringify({ platforms }),
    });
  },
  getOutputs(id: string) {
    return request<Array<{
      id: string; platform: string; platformName: string;
      title: string; summary?: string; body: string; tags: string[];
      coverImage?: string; extra?: Record<string, unknown>;
      validationMessages: Array<{ level: string; field: string; message: string }>;
      status: string;
    }>>(`/contents/${id}/outputs`);
  },
  updateOutput(id: string, data: { title?: string; body?: string; tags?: string[]; summary?: string }) {
    return request(`/platform-outputs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  // Publishing
  publishMock(outputId: string) {
    return request<{ platform: string; platformName: string; status: string; message: string; mockUrl?: string }>('/publish', {
      method: 'POST', body: JSON.stringify({ outputId }),
    });
  },
  batchPublishMock(outputIds: string[]) {
    return request<Array<{ platform: string; platformName: string; status: string; mockUrl?: string }>>('/publish/batch', {
      method: 'POST', body: JSON.stringify({ outputIds }),
    });
  },
  createPublishRecord(data: { contentId: string; platform: string; platformName: string; status: string; message: string; mockUrl?: string }) {
    return request<{ id: string }>('/publish-records', {
      method: 'POST', body: JSON.stringify(data),
    });
  },
  getPublishRecords(contentId?: string) {
    const qs = contentId ? `?contentId=${contentId}` : '';
    return request<Array<{
      id: string; contentId: string; platform: string; platformName: string;
      status: string; message: string; mockUrl?: string; publishedAt: string;
    }>>(`/publish-records${qs}`);
  },
  getPlatforms() {
    return request<Array<{ id: string; name: string; color: string }>>('/platforms');
  },

  // Health
  health() {
    return request<{ status: string }>('/health').catch(() => ({ status: 'error' }));
  },
};
