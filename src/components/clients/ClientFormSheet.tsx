"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient, updateClient, type CreateClientInput } from "@/lib/actions/clients";
import type { Client, ClientStatus } from "@/lib/types";

interface ClientFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSuccess: () => void;
}

const statusOptions: { value: ClientStatus; label: string }[] = [
  { value: "active", label: "활성" },
  { value: "potential", label: "잠재" },
  { value: "dormant", label: "휴면" },
  { value: "ended", label: "종료" },
];

interface FormErrors {
  company_name?: string;
  contact_name?: string;
  email?: string;
  status?: string;
  general?: string;
}

export function ClientFormSheet({
  open,
  onOpenChange,
  client,
  onSuccess,
}: ClientFormSheetProps) {
  const isEdit = !!client;

  const [formData, setFormData] = useState<CreateClientInput>({
    company_name: client?.company_name ?? "",
    contact_name: client?.contact_name ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    industry: client?.industry ?? "",
    status: client?.status ?? "potential",
    source: client?.source ?? "",
    notes: client?.notes ?? "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = "회사명을 입력해 주세요.";
    } else if (formData.company_name.length > 100) {
      newErrors.company_name = "100자 이내로 입력해 주세요.";
    }

    if (!formData.contact_name.trim()) {
      newErrors.contact_name = "담당자명을 입력해 주세요.";
    } else if (formData.contact_name.length > 50) {
      newErrors.contact_name = "50자 이내로 입력해 주세요.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "이메일을 입력해 주세요.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "올바른 이메일 형식을 입력해 주세요.";
    }

    if (!formData.status) {
      newErrors.status = "상태를 선택해 주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const payload: CreateClientInput = {
        company_name: formData.company_name.trim(),
        contact_name: formData.contact_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone?.trim() || undefined,
        industry: formData.industry?.trim() || undefined,
        status: formData.status,
        source: formData.source?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
      };

      if (isEdit && client) {
        await updateClient(client.id, payload);
      } else {
        await createClient(payload);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setErrors({ general: "저장 중 오류가 발생했습니다. 다시 시도해 주세요." });
    } finally {
      setSubmitting(false);
    }
  }

  function handleChange(field: keyof CreateClientInput, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-outfit text-base font-semibold text-slate-900">
            {isEdit ? "클라이언트 수정" : "신규 클라이언트 추가"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
          {errors.general && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {errors.general}
            </div>
          )}

          {/* 회사명 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company_name" className="text-sm font-medium text-slate-700">
              회사명 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => handleChange("company_name", e.target.value)}
              placeholder="(주)마그네이트코리아"
              maxLength={100}
              className="h-9 text-sm"
            />
            {errors.company_name && (
              <p className="text-xs text-red-500">{errors.company_name}</p>
            )}
          </div>

          {/* 담당자명 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact_name" className="text-sm font-medium text-slate-700">
              담당자명 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="contact_name"
              value={formData.contact_name}
              onChange={(e) => handleChange("contact_name", e.target.value)}
              placeholder="홍길동"
              maxLength={50}
              className="h-9 text-sm"
            />
            {errors.contact_name && (
              <p className="text-xs text-red-500">{errors.contact_name}</p>
            )}
          </div>

          {/* 이메일 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">
              이메일 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="contact@example.com"
              className="h-9 text-sm"
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* 전화번호 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
              전화번호
            </Label>
            <Input
              id="phone"
              value={formData.phone ?? ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="010-0000-0000"
              className="h-9 text-sm"
            />
          </div>

          {/* 업종 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="industry" className="text-sm font-medium text-slate-700">
              업종
            </Label>
            <Input
              id="industry"
              value={formData.industry ?? ""}
              onChange={(e) => handleChange("industry", e.target.value)}
              placeholder="IT / 제조 / 유통 등"
              className="h-9 text-sm"
            />
          </div>

          {/* 상태 */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-slate-700">
              상태 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.status}
              onValueChange={(val) => val && handleChange("status", val)}
            >
              <SelectTrigger className="h-9 text-sm w-full">
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-xs text-red-500">{errors.status}</p>
            )}
          </div>

          {/* 소스 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="source" className="text-sm font-medium text-slate-700">
              소스
            </Label>
            <Input
              id="source"
              value={formData.source ?? ""}
              onChange={(e) => handleChange("source", e.target.value)}
              placeholder="소개 / 광고 / 직접 방문 등"
              className="h-9 text-sm"
            />
          </div>

          {/* 메모 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-sm font-medium text-slate-700">
              메모
            </Label>
            <Textarea
              id="notes"
              value={formData.notes ?? ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="추가 정보를 입력하세요."
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        </form>

        <SheetFooter className="mt-2 px-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            disabled={submitting}
          >
            취소
          </button>
          <button
            type="submit"
            form=""
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "저장 중..." : isEdit ? "수정 완료" : "추가"}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
