import type {AxiosProgressEvent, InternalAxiosRequestConfig} from 'axios';

import apiClient from '@/lib/services/core/api-client';
import {ApiErrorBase} from '@/lib/services/core/errors';

import {LegacyOpenFlareBaseService} from './legacy-base.service';
import type {
  LegacyApiResponse,
  PagesDeployment,
  PagesDeploymentFile,
  PagesDeploymentUploadPayload,
  PagesProject,
  PagesProjectPayload,
} from './types';

export class PagesService extends LegacyOpenFlareBaseService {
  protected static override readonly basePath = '/api/pages';

  static listProjects(): Promise<PagesProject[]> {
    return this.legacyGet<PagesProject[]>('/');
  }

  static getProject(id: number): Promise<PagesProject> {
    return this.legacyGet<PagesProject>(`/${id}`);
  }

  static createProject(payload: PagesProjectPayload): Promise<PagesProject> {
    return this.legacyPost<PagesProject>('/', payload);
  }

  static updateProject(
    id: number,
    payload: PagesProjectPayload,
  ): Promise<PagesProject> {
    return this.legacyPost<PagesProject>(`/${id}/update`, payload);
  }

  static deleteProject(id: number): Promise<void> {
    return this.legacyPost<void>(`/${id}/delete`);
  }

  static listDeployments(projectId: number): Promise<PagesDeployment[]> {
    return this.legacyGet<PagesDeployment[]>(`/${projectId}/deployments`);
  }

  static listDeploymentFiles(
    projectId: number,
    deploymentId: number,
  ): Promise<PagesDeploymentFile[]> {
    return this.legacyGet<PagesDeploymentFile[]>(
      `/${projectId}/deployments/${deploymentId}/files`,
    );
  }

  static uploadDeployment(
    projectId: number,
    payload: PagesDeploymentUploadPayload,
  ): Promise<PagesDeployment> {
    const formData = new FormData();
    formData.append('package', payload.file);
    formData.append('root_dir', payload.rootDir ?? '');
    formData.append('entry_file', payload.entryFile ?? 'index.html');

    return this.postFormData<PagesDeployment>(
      `/${projectId}/deployments/upload`,
      formData,
      payload.onProgress,
    );
  }

  static activateDeployment(
    projectId: number,
    deploymentId: number,
  ): Promise<PagesProject> {
    return this.legacyPost<PagesProject>(
      `/${projectId}/deployments/${deploymentId}/activate`,
    );
  }

  static deleteDeployment(
    projectId: number,
    deploymentId: number,
  ): Promise<void> {
    return this.legacyPost<void>(
      `/${projectId}/deployments/${deploymentId}/delete`,
    );
  }

  private static async postFormData<T>(
    path: string,
    formData: FormData,
    onProgress?: (percent: number) => void,
  ): Promise<T> {
    const response = await apiClient.post<LegacyApiResponse<T>>(
      this.getFullPath(path),
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event: AxiosProgressEvent) => {
          if (!onProgress || !event.total) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        },
      } as InternalAxiosRequestConfig,
    );

    if (!response.data.success) {
      throw new ApiErrorBase(response.data.message || '请求失败');
    }

    return response.data.data;
  }
}
