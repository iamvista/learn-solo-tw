// components/admin/settings/payment-settings-form.tsx
// 金流設定表單元件 — PAYUNi 統一金流

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  updatePaymentSettings,
  testPaymentConnection,
} from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Save,
} from "lucide-react";

interface PaymentSettingsFormProps {
  payuni: {
    merchantId: string;
    hashKeyHint: string;
    hashIVHint: string;
    testMode: boolean;
    returnUrl: string;
    notifyUrl: string;
    isConfigured: boolean;
  };
}

export function PaymentSettingsForm({
  payuni: initialPayuni,
}: PaymentSettingsFormProps) {
  const [isSaving, startSaveTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();

  // PAYUNi 欄位
  const [payuniMerchantId, setPayuniMerchantId] = useState(
    initialPayuni.merchantId,
  );
  const [payuniHashKey, setPayuniHashKey] = useState("");
  const [payuniHashIV, setPayuniHashIV] = useState("");
  const [payuniTestMode, setPayuniTestMode] = useState(initialPayuni.testMode);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleSave() {
    startSaveTransition(async () => {
      try {
        const result = await updatePaymentSettings({
          payuniMerchantId: payuniMerchantId || undefined,
          payuniHashKey: payuniHashKey || undefined,
          payuniHashIV: payuniHashIV || undefined,
          payuniTestMode,
        });

        if (result.success) {
          toast.success("金流設定已儲存");
        } else {
          toast.error(result.error || "儲存失敗");
        }
      } catch {
        toast.error("儲存設定失敗");
      }
    });
  }

  async function handleTestConnection() {
    setTestResult(null);
    startTestTransition(async () => {
      try {
        const result = await testPaymentConnection("payuni", {
          payuniMerchantId: payuniMerchantId || undefined,
          payuniHashKey: payuniHashKey || undefined,
          payuniHashIV: payuniHashIV || undefined,
          payuniTestMode,
        });
        setTestResult(result);
        if (result.success) {
          toast.success("連線測試成功");
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("測試連線失敗");
        setTestResult({ success: false, message: "測試連線時發生錯誤" });
      }
    });
  }

  async function handleCopy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success("已複製到剪貼簿");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("複製失敗");
    }
  }

  return (
    <div className="space-y-6">
      {/* PAYUNi 設定 */}
      <Card className="bg-white border border-[#E5E5E5] rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[#0A0A0A]">
                PAYUNi 統一金流設定
              </CardTitle>
              <CardDescription className="text-[#525252]">
                PAYUNi 商店代號與加密金鑰設定
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={
                initialPayuni.isConfigured
                  ? "border-green-500 text-green-600 bg-green-50"
                  : "border-[#F5A524] text-[#F5A524] bg-[#F5A524]/10"
              }
            >
              {initialPayuni.isConfigured ? "已設定" : "未設定"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[#0A0A0A]">商店代號 (MerID)</Label>
            <Input
              value={payuniMerchantId}
              onChange={(e) => setPayuniMerchantId(e.target.value)}
              placeholder="U00000000"
              className="border-[#E5E5E5] font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#0A0A0A]">Hash Key（32 字元）</Label>
            <Input
              type="password"
              value={payuniHashKey}
              onChange={(e) => setPayuniHashKey(e.target.value)}
              placeholder={initialPayuni.hashKeyHint || "32 字元加密金鑰"}
              className="border-[#E5E5E5] font-mono"
              maxLength={32}
            />
            <p className="text-xs text-[#A3A3A3]">
              {initialPayuni.hashKeyHint
                ? `目前已設定（${initialPayuni.hashKeyHint}），留空則不變更`
                : `目前長度：${payuniHashKey.length}/32 字元`}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-[#0A0A0A]">Hash IV（16 字元）</Label>
            <Input
              type="password"
              value={payuniHashIV}
              onChange={(e) => setPayuniHashIV(e.target.value)}
              placeholder={initialPayuni.hashIVHint || "16 字元加密向量"}
              className="border-[#E5E5E5] font-mono"
              maxLength={16}
            />
            <p className="text-xs text-[#A3A3A3]">
              {initialPayuni.hashIVHint
                ? `目前已設定（${initialPayuni.hashIVHint}），留空則不變更`
                : `目前長度：${payuniHashIV.length}/16 字元`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={payuniTestMode}
                onChange={(e) => setPayuniTestMode(e.target.checked)}
                className="h-4 w-4 rounded border-[#D4D4D4]"
              />
              <span className="text-sm text-[#0A0A0A]">
                測試模式（Sandbox）
              </span>
            </label>
          </div>

          {/* 回調 URL */}
          <div className="space-y-2">
            <Label className="text-[#0A0A0A]">Notify URL</Label>
            <div className="flex items-center gap-2">
              <Input
                value={initialPayuni.notifyUrl}
                disabled
                className="bg-[#FAFAFA] border-[#E5E5E5] text-[#525252] font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  handleCopy(initialPayuni.notifyUrl, "payuni-notify")
                }
                className="border-[#E5E5E5] shrink-0"
              >
                {copied === "payuni-notify" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#0A0A0A]">Return URL</Label>
            <div className="flex items-center gap-2">
              <Input
                value={initialPayuni.returnUrl}
                disabled
                className="bg-[#FAFAFA] border-[#E5E5E5] text-[#525252] font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  handleCopy(initialPayuni.returnUrl, "payuni-return")
                }
                className="border-[#E5E5E5] shrink-0"
              >
                {copied === "payuni-return" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-[#A3A3A3]">
              請在 PAYUNi 商家後台設定以上 Return URL 和 Notify URL
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 測試連線 + 儲存設定 */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          onClick={handleTestConnection}
          disabled={isTesting}
          variant="outline"
          className="border-[#F5A524] text-[#F5A524] hover:bg-[#F5A524]/10 rounded-full"
        >
          {isTesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              測試中...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              測試連線
            </>
          )}
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#F5A524] hover:bg-[#E09000] text-white rounded-full px-8"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              儲存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              儲存設定
            </>
          )}
        </Button>
      </div>

      {/* 連線測試結果 */}
      {testResult && (
        <div
          className={`rounded-xl p-4 ${
            testResult.success
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {testResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p
                className={`text-sm font-medium ${
                  testResult.success ? "text-green-600" : "text-red-600"
                }`}
              >
                {testResult.success ? "連線成功" : "連線失敗"}
              </p>
              <p className="text-sm text-[#525252] mt-1">
                {testResult.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 相關資源 */}
      <Card className="bg-white border border-[#E5E5E5] rounded-xl">
        <CardHeader>
          <CardTitle className="text-[#0A0A0A]">相關資源</CardTitle>
          <CardDescription className="text-[#525252]">
            PAYUNi 開發文件和後台連結
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href="https://www.payuni.com.tw/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[#F5A524] hover:text-[#E09000] transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            PAYUNi 官網
          </a>
          <a
            href="https://docs.payuni.com.tw/web/#/7/24"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[#F5A524] hover:text-[#E09000] transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            統一金流 API 文件
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
