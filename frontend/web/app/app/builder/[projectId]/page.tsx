"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function BuilderPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceUpload = searchParams.get("forceUpload") === "1";
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = React.useState(true);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    let mounted = true;
    async function checkExistingUpload() {
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as { uploads?: Array<{ id: string; createdAt?: string }> };
        const uploads = [...(data.uploads || [])];
        if (!mounted) return;
        if (uploads.length > 0 && !forceUpload) {
          uploads.sort((a, b) => (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
          router.replace(`/app/pricing/${uploads[0].id}`);
          return;
        }
      } catch {
        // If check fails, keep upload screen available.
      } finally {
        if (mounted) setCheckingExisting(false);
      }
    }
    checkExistingUpload();
    return () => {
      mounted = false;
    };
  }, [projectId, router, forceUpload]);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("project_id", projectId);
      const res = await fetch("/api/uploads/pro100", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { uploadId: string };
      router.push(`/app/pricing/${data.uploadId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестна грешка");
    } finally {
      setBusy(false);
    }
  }

  function onPickFile(next: File | null) {
    if (!next) return;
    const ok = next.type === "text/csv" || next.name.toLowerCase().endsWith(".csv");
    if (!ok) {
      setError("Моля, качи CSV файл от PRO100.");
      return;
    }
    setError(null);
    setFile(next);
  }

  return (
    <div className="max-w-3xl">
      <div className="space-y-10">
        <div className="pb-6 border-b border-gray-200">
          <div className="line-divider" />
          <span className="text-small">Конструктор</span>
          <h1 className="text-4xl font-light tracking-tight mt-4">PRO100 Импорт</h1>
        {checkingExisting ? (
          <p className="text-sm text-gray-500 mt-2">Проверка за съществуващ качен файл...</p>
        ) : null}
          <p className="text-sm text-gray-600 mt-2">
            Качи CSV от PRO100. След това системата групира елементите и изчислява цена.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-4">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={e => onPickFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={e => {
              e.preventDefault();
              setDragging(false);
            }}
            onDrop={e => {
              e.preventDefault();
              setDragging(false);
              onPickFile(e.dataTransfer.files?.[0] || null);
            }}
            className={`w-full border-2 border-dashed p-8 text-left transition-colors ${
              dragging ? "border-gray-900 bg-gray-50" : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            <div className="text-base font-light">Плъзни CSV файла тук или натисни, за да избереш</div>
            <div className="text-sm text-gray-500 mt-1">Поддържан формат: .csv (PRO100 export)</div>
            {file ? <div className="text-sm mt-3">Избран файл: <span className="font-medium">{file.name}</span></div> : null}
          </button>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <button className="btn-acherno" onClick={upload} disabled={busy || !file || checkingExisting} type="button">
            {busy ? "КАЧВАНЕ..." : "КАЧИ И ПРОДЪЛЖИ"}
          </button>
        </div>
      </div>
    </div>
  );
}
