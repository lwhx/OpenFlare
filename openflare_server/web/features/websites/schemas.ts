import { z } from 'zod';

export const managedDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(1, '请输入域名')
    .max(255, '域名不能超过 255 个字符')
    .refine(
      (value) => !value.includes('://') && !value.includes('/'),
      '域名格式不合法',
    )
    .refine(
      (value) =>
        /^(?:\*\.)?(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(
          value,
        ),
      '域名格式不合法',
    )
    .refine(
      (value) =>
        !value.includes('*') ||
        (value.startsWith('*.') && value.indexOf('*', 1) === -1),
      '通配符域名仅支持 *.example.com 格式',
    ),
  cert_id: z.string(),
  enabled: z.boolean(),
  remark: z.string().max(255, '备注不能超过 255 个字符'),
});

export const manualImportSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '请输入证书名称')
    .max(255, '证书名称不能超过 255 个字符'),
  cert_pem: z.string().trim().min(1, '请输入证书 PEM 内容'),
  key_pem: z.string().trim().min(1, '请输入私钥 PEM 内容'),
  remark: z.string().max(255, '备注不能超过 255 个字符'),
});

export type ManagedDomainFormValues = z.infer<typeof managedDomainSchema>;
export type ManualImportFormValues = z.infer<typeof manualImportSchema>;

export type FileImportFormValues = {
  name: string;
  remark: string;
};

export const defaultManagedDomainValues: ManagedDomainFormValues = {
  domain: '',
  cert_id: '',
  enabled: true,
  remark: '',
};

export const defaultManualImportValues: ManualImportFormValues = {
  name: '',
  cert_pem: '',
  key_pem: '',
  remark: '',
};

export const defaultFileImportValues: FileImportFormValues = {
  name: '',
  remark: '',
};
