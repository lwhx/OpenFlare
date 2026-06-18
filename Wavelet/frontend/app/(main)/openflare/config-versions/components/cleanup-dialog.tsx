"use client"

import {useState} from "react"
import {Loader2} from "lucide-react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"

interface CleanupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (keepCount: number) => void
  loading: boolean
}

export function CleanupDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: CleanupDialogProps) {
  const [keepCount, setKeepCount] = useState(10)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    if (keepCount < 3) {
      setError("最少保留 3 个历史快照")
      return
    }
    setError(null)
    onConfirm(keepCount)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>清理历史快照</AlertDialogTitle>
          <AlertDialogDescription>
            删除旧的历史快照配置，系统将始终保护当前已激活的版本不被删除。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="keepCount">保留最近快照个数</Label>
          <Input
            id="keepCount"
            type="number"
            min={3}
            value={keepCount}
            onChange={(e) => setKeepCount(Number.parseInt(e.target.value, 10) || 3)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">默认为 10 个，最少需保留 3 个。</p>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1" />
                清理中...
              </>
            ) : (
              "确认清理"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
