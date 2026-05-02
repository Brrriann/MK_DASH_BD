"use client";

import { useState, useEffect } from "react";
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
    business_registration_number: client?.business_registration_number ?? "",
    representative_name: client?.representative_name ?? "",
    business_address: client?.business_address ?? "",
    business_type: client?.business_type ?? "",
    business_item: client?.business_item ?? "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrSuccess, setOcrSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setOcrSuccess(false);
      setOcrError(null);
    }
  }, [open]);

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
        business_registration_number: formData.business_registration_number?.trim() || undefined,
        representative_name: formData.representative_name?.trim() || undefined,
        business_address: formData.business_address?.trim() || undefined,
        business_type: formData.business_type?.trim() || undefined,
        business_item: formData.business_item?.trim() || undefined,
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

  async function handleOcrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrError(null);
    setOcrSuccess(false);

    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/ocr", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        setOcrError(json.error ?? "OCR 처리 중 오류가 발생했습니다.");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        business_registration_number: json.business_registration_number ?? prev.business_registration_number,
        representative_name: json.representative_name ?? prev.representative_name,
        business_address: json.business_address ?? prev.business_address,
        business_type: json.business_type ?? prev.business_type,
        business_item: json.business_item ?? prev.business_item,
      }));
      setOcrSuccess(true);
    } catch {
      setOcrError("네트워크 오류가 발생했습니다.");
    } finally {
      setOcrLoading(false);
      e.target.value = "";
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

          {/* 사업자 정보 */}
          <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">사업자 정보</p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleOcrUpload}
                  disabled={ocrLoading}
                />
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer">
                  {ocrLoading ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-blue-300 border-t-blue-700 animate-spin" />
                      스캔 중...
                    </>
                  ) : (
                    <>사업자등록증 스캔</>
                  )}
                </span>
              </label>
            </div>
            {ocrError && (
              <p className="text-xs text-red-500">{ocrError}</p>
            )}
            {ocrSuccess && !ocrError && (
              <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                사업자 정보가 자동으로 입력되었습니다.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="brn" className="text-sm font-medium text-slate-700">사업자등록번호</Label>
                <Input
                  id="brn"
                  value={formData.business_registration_number ?? ""}
                  onChange={(e) => handleChange("business_registration_number", e.target.value)}
                  placeholder="000-00-00000"
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rep_name" className="text-sm font-medium text-slate-700">대표자명</Label>
                <Input
                  id="rep_name"
                  value={formData.representative_name ?? ""}
                  onChange={(e) => handleChange("representative_name", e.target.value)}
                  placeholder="홍길동"
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="biz_addr" className="text-sm font-medium text-slate-700">사업장소재지</Label>
              <Input
                id="biz_addr"
                value={formData.business_address ?? ""}
                onChange={(e) => handleChange("business_address", e.target.value)}
                placeholder="서울특별시 강남구 ..."
                className="h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="biz_type" className="text-sm font-medium text-slate-700">업태</Label>
                <Input
                  id="biz_type"
                  value={formData.business_type ?? ""}
                  onChange={(e) => handleChange("business_type", e.target.value)}
                  placeholder="서비스"
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="biz_item" className="text-sm font-medium text-slate-700">종목</Label>
                <Input
                  id="biz_item"
                  value={formData.business_item ?? ""}
                  onChange={(e) => handleChange("business_item", e.target.value)}
                  placeholder="소프트웨어 개발"
                  className="h-9 text-sm"
                />
              </div>
            </div>
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
            type="button"
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
