'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { AppCard } from '@/components/ui/app-card';
import {
  activatePagesDeployment,
  createPagesProject,
  deletePagesDeployment,
  deletePagesProject,
  getPagesDeployments,
  getPagesProjects,
  uploadPagesDeployment,
} from '@/features/pages/api/pages';
import type { PagesProject } from '@/features/pages/types';
import {
  DangerButton,
  PrimaryButton,
  ResourceField,
  ResourceInput,
  SecondaryButton,
  ToggleField,
} from '@/features/shared/components/resource-primitives';

const projectsQueryKey = ['pages-projects'];

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KiB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MiB`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return '未激活';
  }
  return new Date(value).toLocaleString();
}

export function PagesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [spaFallbackEnabled, setSpaFallbackEnabled] = useState(false);

  const projectsQuery = useQuery({
    queryKey: projectsQueryKey,
    queryFn: getPagesProjects,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createPagesProject({
        name,
        slug,
        description,
        enabled: true,
        spa_fallback_enabled: spaFallbackEnabled,
      }),
    onSuccess: () => {
      setName('');
      setSlug('');
      setDescription('');
      setSpaFallbackEnabled(false);
      queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
  });

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--foreground-secondary)]">
          OpenFlare Pages
        </p>
        <h1 className="text-2xl font-semibold text-[var(--foreground-primary)]">
          边缘静态站点托管
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-[var(--foreground-secondary)]">
          创建 Pages 项目，上传已构建的 zip 静态资源包，然后在规则中选择 Pages
          项目作为上游。发布后 Agent 会拉取部署包并在边缘节点本地服务静态文件。
        </p>
      </div>

      <AppCard
        title="新建 Pages 项目"
        description="V1 仅支持 Direct Upload，不执行 Git 构建或边缘函数运行时。"
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
          <ResourceField label="项目名称">
            <ResourceInput
              value={name}
              placeholder="Marketing Site"
              onChange={(event) => setName(event.target.value)}
              required
            />
          </ResourceField>
          <ResourceField label="项目标识" hint="留空时会按名称自动生成。">
            <ResourceInput
              value={slug}
              placeholder="marketing-site"
              onChange={(event) => setSlug(event.target.value)}
            />
          </ResourceField>
          <ResourceField label="描述" className="md:col-span-2">
            <ResourceInput
              value={description}
              placeholder="这个项目托管的静态站点用途"
              onChange={(event) => setDescription(event.target.value)}
            />
          </ResourceField>
          <ToggleField
            label="启用 SPA fallback"
            description="开启后未命中的路径会回退到 /index.html，适合 React/Vue history 路由。"
            checked={spaFallbackEnabled}
            onChange={setSpaFallbackEnabled}
          />
          <div className="flex items-end justify-end">
            <PrimaryButton
              type="submit"
              disabled={createMutation.isPending || name.trim() === ''}
            >
              {createMutation.isPending ? '创建中...' : '创建项目'}
            </PrimaryButton>
          </div>
          {createMutation.error ? (
            <p className="text-sm text-[var(--status-danger-foreground)] md:col-span-2">
              {createMutation.error.message}
            </p>
          ) : null}
        </form>
      </AppCard>

      <div className="space-y-4">
        {projectsQuery.isLoading ? (
          <AppCard>正在加载 Pages 项目...</AppCard>
        ) : projectsQuery.error ? (
          <AppCard>
            <p className="text-sm text-[var(--status-danger-foreground)]">
              {projectsQuery.error.message}
            </p>
          </AppCard>
        ) : (projectsQuery.data ?? []).length === 0 ? (
          <AppCard>
            <p className="text-sm text-[var(--foreground-secondary)]">
              还没有 Pages 项目。先创建一个项目，再上传静态资源包。
            </p>
          </AppCard>
        ) : (
          (projectsQuery.data ?? []).map((project) => (
            <PagesProjectCard key={project.id} project={project} />
          ))
        )}
      </div>
    </div>
  );
}

function PagesProjectCard({ project }: { project: PagesProject }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [entryFile, setEntryFile] = useState('index.html');
  const deploymentsQuery = useQuery({
    queryKey: ['pages-deployments', project.id],
    queryFn: () => getPagesDeployments(project.id),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) {
        throw new Error('请选择 zip 文件');
      }
      return uploadPagesDeployment(project.id, file, entryFile);
    },
    onSuccess: () => {
      setFile(null);
      queryClient.invalidateQueries({
        queryKey: ['pages-deployments', project.id],
      });
      queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
  });
  const activateMutation = useMutation({
    mutationFn: (deploymentId: number) =>
      activatePagesDeployment(project.id, deploymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['pages-deployments', project.id],
      });
      queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
  });
  const deleteDeploymentMutation = useMutation({
    mutationFn: (deploymentId: number) =>
      deletePagesDeployment(project.id, deploymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['pages-deployments', project.id],
      });
      queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
  });
  const deleteProjectMutation = useMutation({
    mutationFn: () => deletePagesProject(project.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
  });

  return (
    <AppCard
      title={project.name}
      description={`${project.slug} · ${
        project.spa_fallback_enabled ? 'SPA fallback 已启用' : '严格 404'
      }`}
      action={
        <DangerButton
          type="button"
          disabled={deleteProjectMutation.isPending}
          onClick={() => {
            if (window.confirm(`确认删除 Pages 项目 ${project.name} 吗？`)) {
              deleteProjectMutation.mutate();
            }
          }}
        >
          删除项目
        </DangerButton>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-4">
            <p className="text-xs text-[var(--foreground-secondary)]">
              当前激活部署
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--foreground-primary)]">
              {project.active_deployment
                ? `#${project.active_deployment.deployment_number} · ${project.active_deployment.checksum.slice(0, 12)}`
                : '暂无激活部署'}
            </p>
            <p className="mt-1 text-xs text-[var(--foreground-secondary)]">
              激活时间：{formatDate(project.active_deployment?.activated_at)}
            </p>
          </div>

          <div className="space-y-3">
            <ResourceField
              label="上传部署包"
              hint="仅支持 zip，默认入口 index.html。"
            >
              <ResourceInput
                type="file"
                accept=".zip,application/zip"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </ResourceField>
            <ResourceField label="入口文件">
              <ResourceInput
                value={entryFile}
                onChange={(event) => setEntryFile(event.target.value)}
              />
            </ResourceField>
            <PrimaryButton
              type="button"
              disabled={!file || uploadMutation.isPending}
              onClick={() => uploadMutation.mutate()}
            >
              {uploadMutation.isPending ? '上传中...' : '上传部署'}
            </PrimaryButton>
            {uploadMutation.error ? (
              <p className="text-sm text-[var(--status-danger-foreground)]">
                {uploadMutation.error.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[var(--foreground-primary)]">
            部署历史
          </h3>
          {deploymentsQuery.isLoading ? (
            <p className="text-sm text-[var(--foreground-secondary)]">
              加载中...
            </p>
          ) : (deploymentsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--foreground-secondary)]">
              暂无部署。上传 zip 后再激活部署。
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--border-default)]">
              {(deploymentsQuery.data ?? []).map((deployment) => (
                <div
                  key={deployment.id}
                  className="flex flex-col gap-3 border-b border-[var(--border-default)] p-4 last:border-b-0 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground-primary)]">
                      #{deployment.deployment_number}{' '}
                      {deployment.status === 'active' ? '· 已激活' : ''}
                    </p>
                    <p className="mt-1 text-xs text-[var(--foreground-secondary)]">
                      {deployment.checksum.slice(0, 16)} ·{' '}
                      {deployment.file_count} files ·{' '}
                      {formatBytes(deployment.total_size)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <SecondaryButton
                      type="button"
                      disabled={
                        deployment.status === 'active' ||
                        activateMutation.isPending
                      }
                      onClick={() => {
                        if (
                          window.confirm(
                            `确认激活部署 #${deployment.deployment_number} 吗？`,
                          )
                        ) {
                          activateMutation.mutate(deployment.id);
                        }
                      }}
                    >
                      激活
                    </SecondaryButton>
                    <DangerButton
                      type="button"
                      disabled={
                        deployment.status === 'active' ||
                        deleteDeploymentMutation.isPending
                      }
                      onClick={() => {
                        if (
                          window.confirm(
                            `确认删除部署 #${deployment.deployment_number} 吗？`,
                          )
                        ) {
                          deleteDeploymentMutation.mutate(deployment.id);
                        }
                      }}
                    >
                      删除
                    </DangerButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppCard>
  );
}
