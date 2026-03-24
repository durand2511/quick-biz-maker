import { useState } from "react";
import AppBuilderForm, { type AppConfig } from "@/components/AppBuilderForm";
import AppPreview from "@/components/AppPreview";
import { generateAppHTML } from "@/lib/generateApp";
import { Wand2 } from "lucide-react";

const Index = () => {
  const [generatedHTML, setGeneratedHTML] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (newConfig: AppConfig) => {
    setIsGenerating(true);
    // Simulate a brief generation delay for UX
    await new Promise((r) => setTimeout(r, 1200));
    const html = generateAppHTML(newConfig);
    setGeneratedHTML(html);
    setConfig(newConfig);
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
            <Wand2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">AppForge</h1>
            <p className="text-sm text-muted-foreground">Generate a business website in seconds</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className={`grid gap-8 ${generatedHTML ? "lg:grid-cols-[380px_1fr]" : "max-w-lg mx-auto"}`}>
          {/* Form Panel */}
          <div className="space-y-1">
            {generatedHTML && (
              <h2 className="text-lg font-semibold mb-4">Configuration</h2>
            )}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <AppBuilderForm onGenerate={handleGenerate} isGenerating={isGenerating} />
            </div>
          </div>

          {/* Preview Panel */}
          {generatedHTML && config && (
            <AppPreview html={generatedHTML} businessName={config.businessName} />
          )}
        </div>

        {!generatedHTML && (
          <div className="text-center mt-12 text-muted-foreground">
            <p className="text-sm">Fill in your business details above and click Generate to see your app.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
