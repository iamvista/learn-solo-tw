// components/admin/settings/email-settings-form.tsx
// Email 設定表單元件
// 包含發送者名稱設定和測試發送功能

"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  emailSettingsSchema,
  testEmailSchema,
  type EmailSettingsFormData,
  type TestEmailFormData,
} from "@/lib/validations/settings";
import { updateEmailSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Save,
  Send,
  Mail,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface EmailSettingsFormProps {
  senderName: string;
  fromEmail: string;
  isConfigured: boolean;
}

export function EmailSettingsForm({
  senderName,
  fromEmail,
  isConfigured,
}: EmailSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 設定表單
  const settingsForm = useForm<EmailSettingsFormData>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      emailSenderName: senderName,
      emailFrom: fromEmail,
    },
  });

  // 測試表單
  const testForm = useForm<TestEmailFormData>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      email: "",
    },
  });

  // 提交設定
  async function onSubmitSettings(data: EmailSettingsFormData) {
    startTransition(async () => {
      try {
        const result = await updateEmailSettings(data);

        if (result.success) {
          toast.success("設定已儲存");
        } else {
          toast.error(result.error ?? "儲存設定失敗");
        }
      } catch {
        toast.error("操作失敗，請稍後再試");
      }
    });
  }

  // 發送測試郵件
  async function onSendTestEmail(data: TestEmailFormData) {
    setIsSendingTest(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (result.success) {
        setTestResult({
          success: true,
          message: `測試郵件已發送至 ${data.email}`,
        });
        toast.success("測試郵件已發送");
        testForm.reset();
      } else {
        setTestResult({
          success: false,
          message: result.error || "發送失敗",
        });
        toast.error(result.error || "發送測試郵件失敗");
      }
    } catch {
      setTestResult({
        success: false,
        message: "發送失敗，請檢查網路連線",
      });
      toast.error("發送測試郵件失敗");
    } finally {
      setIsSendingTest(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 設定狀態 */}
      <Card className="bg-white border border-[#E5E5E5] rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[#0A0A0A]">Email 服務設定</CardTitle>
              <CardDescription className="text-[#525252]">
                使用 Resend 發送系統郵件
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={
                isConfigured
                  ? "border-green-500 text-green-600 bg-green-50"
                  : "border-[#C41E3A] text-[#C41E3A] bg-[#C41E3A]/10"
              }
            >
              {isConfigured ? "已設定" : "未設定"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 未設定警告 */}
          {!isConfigured && (
            <div className="rounded-xl bg-[#C41E3A]/10 border border-[#C41E3A]/20 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-[#C41E3A] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[#C41E3A]">
                    Email 服務未設定
                  </p>
                  <p className="text-sm text-[#525252]">
                    請在環境變數中設定 RESEND_API_KEY
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger
            value="settings"
            className="data-[state=active]:bg-[#C41E3A] data-[state=active]:text-white"
          >
            <Mail className="h-4 w-4 mr-2" />
            發送者設定
          </TabsTrigger>
          <TabsTrigger
            value="test"
            className="data-[state=active]:bg-[#C41E3A] data-[state=active]:text-white"
          >
            <Send className="h-4 w-4 mr-2" />
            測試發送
          </TabsTrigger>
        </TabsList>

        {/* 發送者設定 */}
        <TabsContent value="settings">
          <Card className="bg-white border border-[#E5E5E5] rounded-xl">
            <CardHeader>
              <CardTitle className="text-[#0A0A0A]">發送者設定</CardTitle>
              <CardDescription className="text-[#525252]">
                設定 Email 發送者名稱、發送者 Email 與 API Key
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...settingsForm}>
                <form
                  onSubmit={settingsForm.handleSubmit(onSubmitSettings)}
                  className="space-y-4"
                >
                  <FormField
                    control={settingsForm.control}
                    name="emailSenderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#0A0A0A]">
                          發送者名稱 <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="我的課程平台"
                            className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#C41E3A] focus-visible:ring-[#C41E3A]/20"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-[#A3A3A3]">
                          Email 顯示的發送者名稱，例如：我的課程平台
                          &lt;hello@example.com&gt;
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={settingsForm.control}
                    name="emailFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#0A0A0A]">
                          發送者 Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="noreply@learn.solo.tw"
                            className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#C41E3A] focus-visible:ring-[#C41E3A]/20"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-[#A3A3A3]">
                          用於寄送系統郵件的發送者地址，若未填寫則使用環境變數
                          EMAIL_FROM
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#0A0A0A]">
                      Resend API Key
                    </p>
                    <div
                      className={`rounded-lg border p-3 text-sm ${
                        isConfigured
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {isConfigured
                        ? "已透過環境變數 RESEND_API_KEY 設定"
                        : "未設定，請在環境變數中加入 RESEND_API_KEY"}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="bg-[#C41E3A] hover:bg-[#A01830] text-white rounded-full"
                    >
                      {isPending ? (
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
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 測試發送 */}
        <TabsContent value="test">
          <Card className="bg-white border border-[#E5E5E5] rounded-xl">
            <CardHeader>
              <CardTitle className="text-[#0A0A0A]">測試發送</CardTitle>
              <CardDescription className="text-[#525252]">
                發送測試郵件以確認設定正確
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...testForm}>
                <form
                  onSubmit={testForm.handleSubmit(onSendTestEmail)}
                  className="space-y-4"
                >
                  <FormField
                    control={testForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#0A0A0A]">
                          收件者 Email <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#C41E3A] focus-visible:ring-[#C41E3A]/20"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-[#A3A3A3]">
                          輸入您的 Email 地址以接收測試郵件
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-4">
                    <Button
                      type="submit"
                      disabled={isSendingTest || !isConfigured}
                      className="bg-[#C41E3A] hover:bg-[#A01830] text-white rounded-full"
                    >
                      {isSendingTest ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          發送中...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          發送測試郵件
                        </>
                      )}
                    </Button>
                    {!isConfigured && (
                      <span className="text-sm text-[#A3A3A3]">
                        請先在環境變數中設定 RESEND_API_KEY
                      </span>
                    )}
                  </div>

                  {/* 測試結果 */}
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
                              testResult.success
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {testResult.success ? "發送成功" : "發送失敗"}
                          </p>
                          <p className="text-sm text-[#525252] mt-1">
                            {testResult.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
