// components/admin/courses/course-welcome-email-form.tsx
// 課程歡迎信編輯表單（整合版：Milkdown 編輯器 + 關鍵字面板一體式設計）

"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Save, Send, Copy, AlertCircle } from "lucide-react";
import {
  courseWelcomeEmailSchema,
  type CourseWelcomeEmailFormData,
} from "@/lib/validations/course-welcome-email";
import type { CourseWelcomeEmailSettings } from "@/lib/actions/course-welcome-email";
import {
  updateCourseWelcomeEmailSettings,
  sendCourseWelcomeEmailTest,
} from "@/lib/actions/course-welcome-email";
import {
  buildWelcomeEmailContext,
  getUnknownWelcomeEmailTokens,
  renderWelcomeEmailHtmlFromMarkdown,
  renderWelcomeEmailTemplate,
} from "@/lib/welcome-email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { MilkdownSimpleEditor } from "@/components/admin/comments/milkdown-simple-editor";

interface CourseWelcomeEmailFormProps {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  initialSettings: CourseWelcomeEmailSettings;
}

export function CourseWelcomeEmailForm({
  courseId,
  courseTitle,
  courseSlug,
  initialSettings,
}: CourseWelcomeEmailFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const form = useForm<CourseWelcomeEmailFormData>({
    resolver: zodResolver(courseWelcomeEmailSchema),
    defaultValues: {
      enabled: initialSettings.enabled,
      subjectTemplate: initialSettings.subjectTemplate,
      markdownTemplate: initialSettings.markdownTemplate,
    },
  });

  const subjectTemplate = form.watch("subjectTemplate");
  const markdownTemplate = form.watch("markdownTemplate");
  const enabled = form.watch("enabled");

  const unknownTokens = useMemo(() => {
    return Array.from(
      new Set([
        ...getUnknownWelcomeEmailTokens(subjectTemplate || ""),
        ...getUnknownWelcomeEmailTokens(markdownTemplate || ""),
      ]),
    );
  }, [subjectTemplate, markdownTemplate]);

  const previewContext = useMemo(
    () =>
      buildWelcomeEmailContext({
        userName: "測試學員",
        courseTitle,
        courseSlug,
        supportEmail: "hello@solo.tw",
        purchaseDate: new Date(),
      }),
    [courseTitle, courseSlug],
  );

  const previewSubject = renderWelcomeEmailTemplate(
    subjectTemplate || "",
    previewContext,
  );
  const previewMarkdown = renderWelcomeEmailTemplate(
    markdownTemplate || "",
    previewContext,
  );
  const previewHtml = renderWelcomeEmailHtmlFromMarkdown(previewMarkdown);

  async function onSubmit(data: CourseWelcomeEmailFormData) {
    startTransition(async () => {
      const result = await updateCourseWelcomeEmailSettings(courseId, data);

      if (result.success) {
        toast.success("課程歡迎信設定已儲存");
      } else {
        toast.error(result.error || "儲存失敗");
      }
    });
  }

  async function handleSendTest() {
    if (!testEmail.trim()) {
      toast.error("請先輸入測試 Email");
      return;
    }

    setIsSendingTest(true);
    try {
      const result = await sendCourseWelcomeEmailTest(courseId, {
        toEmail: testEmail.trim(),
        subjectTemplate: subjectTemplate || "",
        markdownTemplate: markdownTemplate || "",
      });

      if (result.success) {
        toast.success("測試信已發送");
        setTestEmail("");
      } else {
        toast.error(result.error || "發送失敗");
      }
    } finally {
      setIsSendingTest(false);
    }
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      toast.success(`已複製 ${token}`);
    } catch {
      toast.error("複製失敗，請手動複製");
    }
  }

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 啟用開關 */}
          <Card className="bg-white border-[#E5E5E5] rounded-xl">
            <CardHeader>
              <CardTitle className="text-[#0A0A0A]">自動歡迎信設定</CardTitle>
              <CardDescription className="text-[#525252]">
                當用戶購買此課程並付款成功後，系統會依照下方模板自動寄送歡迎信。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="rounded-xl border border-[#E5E5E5] p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <FormLabel className="text-[#0A0A0A] text-base">
                          啟用自動寄送
                        </FormLabel>
                        <FormDescription className="text-[#737373]">
                          {enabled
                            ? "目前為啟用狀態，付款成功後會自動寄出歡迎信。"
                            : "目前為關閉狀態，付款成功後不會寄出歡迎信。"}
                        </FormDescription>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] px-3 py-2 sm:justify-end sm:gap-3">
                        <Badge
                          variant={enabled ? "default" : "outline"}
                          className={
                            enabled
                              ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                              : "border-[#D4D4D4] text-[#525252]"
                          }
                        >
                          {enabled ? "已啟用" : "已關閉"}
                        </Badge>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </div>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 一體式編輯區：標題 + Milkdown + 關鍵字 */}
          <Card className="bg-white border-[#E5E5E5] rounded-xl">
            <CardHeader>
              <CardTitle className="text-[#0A0A0A]">
                模板內容與可用關鍵字
              </CardTitle>
              <CardDescription className="text-[#525252]">
                後台只需填 Markdown
                文案，寄送時系統會自動套用固定版型（灰底＋白色圓角容器）。
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 信件標題（上方） */}
              <div className="mb-4">
                <FormField
                  control={form.control}
                  name="subjectTemplate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#0A0A0A]">信件標題</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-white border-[#E5E5E5] text-[#0A0A0A]"
                          placeholder="歡迎加入《{{課程名稱}}》"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Milkdown 編輯器 + 關鍵字（並排） */}
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                {/* 左側：Milkdown 編輯器 */}
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="markdownTemplate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#0A0A0A]">
                          Markdown 內容
                        </FormLabel>
                        <FormControl>
                          <MilkdownSimpleEditor
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="輸入 Markdown 文案"
                            minHeight="360px"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {unknownTokens.length > 0 && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <p>發現未支援關鍵字：{unknownTokens.join(", ")}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 右側：可用關鍵字 */}
                <div className="space-y-3">
                  <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-3">
                    <p className="text-sm font-medium text-[#0A0A0A]">
                      可用關鍵字
                    </p>
                    <p className="mt-1 text-xs text-[#737373]">
                      點擊即可複製，並貼到標題或 Markdown 模板中。
                    </p>
                  </div>

                  {initialSettings.availableVariables.map((variable) => (
                    <div
                      key={variable.token}
                      className="flex flex-col gap-2 rounded-lg border border-[#E5E5E5] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <Badge
                            variant="outline"
                            className="text-[#0A0A0A] border-[#E5E5E5] max-w-full break-all whitespace-normal"
                          >
                            {variable.token}
                          </Badge>
                          <p className="text-xs text-[#525252]">
                            {variable.label}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-[#E5E5E5] shrink-0"
                          onClick={() => copyToken(variable.token)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          複製
                        </Button>
                      </div>
                      <p className="text-xs text-[#737373]">
                        {variable.description}
                      </p>
                      <p className="text-xs text-[#A3A3A3]">
                        範例：{variable.example}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 測試寄送區 */}
          <Card className="bg-white border-[#E5E5E5] rounded-xl">
            <CardHeader>
              <CardTitle className="text-[#0A0A0A]">預覽與測試</CardTitle>
              <CardDescription className="text-[#525252]">
                使用測試資料即時預覽，並可發送測試信。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-[#525252]">預覽標題</p>
                <p className="text-[#0A0A0A] font-medium">{previewSubject}</p>
              </div>

              <iframe
                title="welcome-email-preview"
                srcDoc={previewHtml}
                className="w-full h-[360px] border border-[#E5E5E5] rounded-lg bg-white"
              />

              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="輸入測試 Email"
                  className="bg-white border-[#E5E5E5]"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSendingTest}
                  className="border-[#E5E5E5]"
                  onClick={handleSendTest}
                >
                  {isSendingTest ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      發送中...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      發送測試信
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#F5A524] hover:bg-[#E09000] text-white rounded-full"
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
    </div>
  );
}
