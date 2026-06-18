import {LegacyOpenFlareBaseService} from './legacy-base.service';
import type {
  AcmeAccountItem,
  TlsCertificateApplyPayload,
  TlsCertificateContentItem,
  TlsCertificateDetailItem,
  TlsCertificateFileImportPayload,
  TlsCertificateItem,
  TlsCertificateMutationPayload,
} from './types';

class AcmeAccountApi extends LegacyOpenFlareBaseService {
  protected static readonly basePath = '/api/acme-accounts';

  static getDefault(): Promise<AcmeAccountItem> {
    return this.legacyGet<AcmeAccountItem>('/default');
  }
}

export class TlsCertificateService extends LegacyOpenFlareBaseService {
  protected static readonly basePath = '/api/tls-certificates';

  static async list(): Promise<TlsCertificateItem[]> {
    return this.legacyGet<TlsCertificateItem[]>('/');
  }

  static async getById(id: number): Promise<TlsCertificateDetailItem> {
    return this.legacyGet<TlsCertificateDetailItem>(`/${id}`);
  }

  static async getContent(id: number): Promise<TlsCertificateContentItem> {
    return this.legacyGet<TlsCertificateContentItem>(`/${id}/content`);
  }

  static async create(
    payload: TlsCertificateMutationPayload,
  ): Promise<TlsCertificateItem> {
    return this.legacyPost<TlsCertificateItem>('/', payload);
  }

  static async update(
    id: number,
    payload: TlsCertificateMutationPayload,
  ): Promise<TlsCertificateItem> {
    return this.legacyPost<TlsCertificateItem>(`/${id}/update`, payload);
  }

  static async delete(id: number): Promise<void> {
    return this.legacyPost<void>(`/${id}/delete`);
  }

  static async apply(
    payload: TlsCertificateApplyPayload,
  ): Promise<TlsCertificateItem> {
    return this.legacyPost<TlsCertificateItem>('/apply', payload);
  }

  static async renew(id: number): Promise<TlsCertificateItem> {
    return this.legacyPost<TlsCertificateItem>(`/${id}/renew`);
  }

  static async updateAcme(
    id: number,
    payload: TlsCertificateApplyPayload,
  ): Promise<TlsCertificateItem> {
    return this.legacyPost<TlsCertificateItem>(`/${id}/update-acme`, payload);
  }

  static async convertToAcme(
    id: number,
    payload: TlsCertificateApplyPayload,
  ): Promise<TlsCertificateItem> {
    return this.legacyPost<TlsCertificateItem>(`/${id}/convert-acme`, payload);
  }

  static async importFile(
    payload: TlsCertificateFileImportPayload,
  ): Promise<TlsCertificateItem> {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('remark', payload.remark);
    formData.append('cert_file', payload.certFile);
    formData.append('key_file', payload.keyFile);

    return this.legacyPost<TlsCertificateItem>('/import-file', formData);
  }

  static getDefaultAcmeAccount(): Promise<AcmeAccountItem> {
    return AcmeAccountApi.getDefault();
  }
}