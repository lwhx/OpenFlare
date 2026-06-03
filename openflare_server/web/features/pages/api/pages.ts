import { apiRequest } from '@/lib/api/client';

import type {
  PagesDeployment,
  PagesProject,
  PagesProjectPayload,
} from '@/features/pages/types';

export function getPagesProjects() {
  return apiRequest<PagesProject[]>('/pages/');
}

export function createPagesProject(payload: PagesProjectPayload) {
  return apiRequest<PagesProject>('/pages/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePagesProject(id: number, payload: PagesProjectPayload) {
  return apiRequest<PagesProject>(`/pages/${id}/update`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deletePagesProject(id: number) {
  return apiRequest<void>(`/pages/${id}/delete`, {
    method: 'POST',
  });
}

export function getPagesDeployments(projectId: number) {
  return apiRequest<PagesDeployment[]>(`/pages/${projectId}/deployments`);
}

export function uploadPagesDeployment(
  projectId: number,
  file: File,
  entryFile = 'index.html',
) {
  const formData = new FormData();
  formData.append('package', file);
  formData.append('entry_file', entryFile);
  return apiRequest<PagesDeployment>(`/pages/${projectId}/deployments/upload`, {
    method: 'POST',
    body: formData,
  });
}

export function activatePagesDeployment(
  projectId: number,
  deploymentId: number,
) {
  return apiRequest<PagesProject>(
    `/pages/${projectId}/deployments/${deploymentId}/activate`,
    { method: 'POST' },
  );
}

export function deletePagesDeployment(projectId: number, deploymentId: number) {
  return apiRequest<void>(
    `/pages/${projectId}/deployments/${deploymentId}/delete`,
    { method: 'POST' },
  );
}
