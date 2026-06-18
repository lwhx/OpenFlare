'use client';

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {Loader2} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select';
import {DnsAccountService} from '@/lib/services/openflare';

import {getErrorMessage} from './website-utils';

const dnsAccountsQueryKey = ['openflare', 'dns-accounts'];

type DnsAccountFormValues = {
  name: string;
  type: string;
  authorization: string;
};

interface DnsAccountCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function DnsAccountCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: DnsAccountCreateDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const {register, handleSubmit, setValue, watch, formState, reset} =
    useForm<DnsAccountFormValues>({
      defaultValues: {name: '', type: 'cloudflare', authorization: ''},
    });

  const createMutation = useMutation({
    mutationFn: DnsAccountService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: dnsAccountsQueryKey});
      reset();
      setError('');
      onCreated?.();
      onOpenChange(false);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const onSubmit = handleSubmit((values) => {
    setError('');
    let auth = values.authorization.trim();
    if (!auth.startsWith('{')) {
      auth = JSON.stringify({api_token: values.authorization});
    }
    createMutation.mutate({...values, authorization: auth});
  });

  const handleClose = () => {
    reset();
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加 DNS 账号</DialogTitle>
          <DialogDescription>
            统一管理 DNS 服务商账号，用于 ACME 证书的 DNS 验证申请。
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="space-y-2">
            <Label>账号名称</Label>
            <Input
              placeholder="Cloudflare 邮箱账号"
              {...register('name', {required: '请输入名称'})}
            />
            {formState.errors.name ? (
              <p className="text-xs text-destructive">{formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>DNS 服务商</Label>
            <Select
              value={watch('type')}
              onValueChange={(value) => setValue('type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cloudflare">Cloudflare</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>API Token</Label>
            <Input
              {...register('authorization', {required: '请输入 Token'})}
              placeholder="请勿使用 Global API Key"
            />
            {formState.errors.authorization ? (
              <p className="text-xs text-destructive">
                {formState.errors.authorization.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                  提交中...
                </>
              ) : (
                '提交'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
