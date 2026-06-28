import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardPaste, Upload, FileText, Loader2 } from "lucide-react";

interface ImportItem {
  id?: number;
  title: string;
  content: string;
}

const DEFAULT_SOURCE = "حصاد اليوم | خاص";

const JsonNewsImporter = () => {
  const [jsonOpen, setJsonOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [plainText, setPlainText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const insertItems = async (items: ImportItem[]) => {
    let success = 0;
    let failed = 0;
    for (const item of items) {
      const title = (item.title || "").trim();
      const content = (item.content || "").trim();
      if (!title || !content) {
        failed++;
        continue;
      }
      const { error } = await supabase.from("posts").insert({
        title,
        content,
        excerpt: content.slice(0, 200),
        status: "draft",
        source_type: DEFAULT_SOURCE,
      });
      if (error) failed++;
      else success++;
    }
    return { success, failed };
  };

  const handleImportJson = async () => {
    setImporting(true);
    setResult(null);
    try {
      const parsed = JSON.parse(jsonText.trim());
      const items: ImportItem[] = Array.isArray(parsed) ? parsed : [parsed];
      const res = await insertItems(items);
      setResult(res);
      if (res.success > 0) {
        toast.success(`تم استيراد ${res.success} خبر${res.failed ? ` (فشل ${res.failed})` : ""}`);
        setJsonText("");
        setJsonOpen(false);
      } else {
        toast.error("فشل استيراد جميع العناصر");
      }
    } catch (e: any) {
      toast.error("JSON غير صالح: " + (e?.message || "خطأ في الصيغة"));
    } finally {
      setImporting(false);
    }
  };

  const handleImportText = async () => {
    setImporting(true);
    try {
      const text = plainText.trim();
      if (!text) {
        toast.error("لا يوجد نص للاستيراد");
        return;
      }
      const lines = text.split("\n").filter((l) => l.trim());
      const title = lines[0]?.slice(0, 200) || "خبر بدون عنوان";
      const content = lines.length > 1 ? lines.slice(1).join("\n") : text;
      const res = await insertItems([{ title, content }]);
      setResult(res);
      if (res.success) {
        toast.success("تم استيراد الخبر");
        setPlainText("");
        setTextOpen(false);
      } else {
        toast.error("فشل استيراد الخبر");
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="h-5 w-5" />
          استيراد أخبار من JSON
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setJsonOpen(true)}>
            <ClipboardPaste className="h-4 w-4 ml-2" /> لصق JSON
          </Button>
          <Button onClick={handleImportJson} disabled={!jsonText || importing}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Upload className="h-4 w-4 ml-2" />}
            استيراد JSON
          </Button>
          <Button variant="outline" onClick={() => setTextOpen(true)}>
            <FileText className="h-4 w-4 ml-2" /> لصق نص أخبار
          </Button>
        </div>

        {result && (
          <div className="text-sm bg-muted p-3 rounded-lg">
            ✓ نجاح: <b>{result.success}</b> &nbsp; — &nbsp; ✗ فشل: <b>{result.failed}</b>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          الصيغة المطلوبة: مصفوفة JSON تحوي كائنات بحقول <code>id</code>، <code>title</code>، <code>content</code>. حقل <code>id</code> للتتبع فقط ولا يُخزَّن.
        </p>

        <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>لصق JSON</DialogTitle>
            </DialogHeader>
            <Textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='[{"id":1,"title":"...","content":"..."}]'
              rows={14}
              dir="ltr"
              className="font-mono text-xs"
            />
            <DialogFooter>
              <Button onClick={handleImportJson} disabled={!jsonText || importing}>
                {importing && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                استيراد
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={textOpen} onOpenChange={setTextOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>لصق نص أخبار</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">السطر الأول = العنوان، باقي السطور = المحتوى.</p>
            <Textarea
              value={plainText}
              onChange={(e) => setPlainText(e.target.value)}
              placeholder="عنوان الخبر&#10;محتوى الخبر..."
              rows={14}
            />
            <DialogFooter>
              <Button onClick={handleImportText} disabled={!plainText || importing}>
                {importing && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                استيراد كخبر واحد
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default JsonNewsImporter;