import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdates } from "@/hooks/useUpdates";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Upload, X, Image, Video, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  type: z.string().default("info"),
  publish_at: z.string().min(1, "Publish date is required"),
  expire_at: z.string().optional(),
  is_enabled: z.boolean().default(true),
  media_url: z.string().optional(),
}).refine((data) => {
  if (data.expire_at && data.expire_at !== "") {
    return new Date(data.expire_at) > new Date(data.publish_at);
  }
  return true;
}, {
  message: "Expire date must be after publish date",
  path: ["expire_at"],
});

type FormValues = z.infer<typeof formSchema>;

function isVideoFile(url: string) {
  return /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url);
}

interface AddUpdateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUpdateSheet({ open, onOpenChange }: AddUpdateSheetProps) {
  const { t } = useTranslation();
  const { createUpdate } = useUpdates();
  const { show } = useAdminShow();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      body: "",
      type: "info",
      publish_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      expire_at: "",
      is_enabled: true,
      media_url: "",
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !show?.id) return;

    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    if (file.size > maxSize) {
      toast.error(t("updates.fileTooLarge", {
        max: isVideo ? "50MB" : "10MB",
      }));
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${show.id}/updates/${crypto.randomUUID()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("show-assets")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("show-assets")
        .getPublicUrl(fileName);

      form.setValue("media_url", publicUrl);
      setMediaPreview(publicUrl);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(t("updates.uploadFailed"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveMedia = () => {
    form.setValue("media_url", "");
    setMediaPreview(null);
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await createUpdate.mutateAsync({
        title: values.title,
        body: values.body,
        type: values.type,
        publish_at: new Date(values.publish_at).toISOString(),
        expire_at: values.expire_at ? new Date(values.expire_at).toISOString() : null,
        is_enabled: values.is_enabled,
        media_url: values.media_url || null,
      });
      form.reset();
      setMediaPreview(null);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("updates.addUpdate")}</SheetTitle>
          <SheetDescription>{t("updates.addUpdateDescription")}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("updates.titleField")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("updates.titlePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("updates.bodyField")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("updates.bodyPlaceholder")}
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t("updates.bodyDescription")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Media upload */}
            <div className="space-y-2">
              <FormLabel>{t("updates.media")}</FormLabel>
              {mediaPreview ? (
                <div className="relative rounded-lg border overflow-hidden">
                  {isVideoFile(mediaPreview) ? (
                    <video
                      src={mediaPreview}
                      controls
                      className="w-full max-h-48 object-contain bg-muted"
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Preview"
                      className="w-full max-h-48 object-contain bg-muted"
                    />
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={handleRemoveMedia}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 cursor-pointer hover:border-muted-foreground/50 transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Image className="h-5 w-5" />
                        <Video className="h-5 w-5" />
                      </div>
                      <p className="text-sm text-muted-foreground">{t("updates.uploadMedia")}</p>
                      <p className="text-xs text-muted-foreground/70">{t("updates.mediaFormats")}</p>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("updates.type")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="info">{t("updates.typeInfo")}</SelectItem>
                      <SelectItem value="warning">{t("updates.typeWarning")}</SelectItem>
                      <SelectItem value="hype">{t("updates.typeHype")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="publish_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("updates.publishAt")}</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expire_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("updates.expireAt")}</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>{t("updates.expireAtDescription")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t("updates.enabled")}</FormLabel>
                    <FormDescription>{t("updates.enabledDescription")}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting ? t("common.loading") : t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
