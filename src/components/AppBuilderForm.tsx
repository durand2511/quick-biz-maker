import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles } from "lucide-react";

const BUSINESS_TYPES = [
  "Restaurant",
  "Salon & Spa",
  "Fitness Studio",
  "Consulting Agency",
  "Photography",
  "Retail Store",
  "Freelancer",
  "Medical Practice",
  "Real Estate",
  "Other",
];

const FEATURES = [
  { id: "about", label: "About Section" },
  { id: "services", label: "Services Page" },
  { id: "contact", label: "Contact Form" },
  { id: "booking", label: "Booking System" },
  { id: "gallery", label: "Photo Gallery" },
  { id: "testimonials", label: "Testimonials" },
  { id: "pricing", label: "Pricing Table" },
  { id: "faq", label: "FAQ Section" },
];

export interface AppConfig {
  businessName: string;
  businessType: string;
  features: string[];
}

interface Props {
  onGenerate: (config: AppConfig) => void;
  isGenerating: boolean;
}

const AppBuilderForm = ({ onGenerate, isGenerating }: Props) => {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(["about", "services", "contact"]);

  const toggleFeature = (id: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !businessType) return;
    onGenerate({ businessName: businessName.trim(), businessType, features: selectedFeatures });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="businessName">Business Name</Label>
        <Input
          id="businessName"
          placeholder="e.g. Sunrise Bakery"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Business Type</Label>
        <Select value={businessType} onValueChange={setBusinessType} required>
          <SelectTrigger>
            <SelectValue placeholder="Select your business type" />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Features to Include</Label>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((feature) => (
            <label
              key={feature.id}
              className="flex items-center gap-2.5 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent transition-colors"
            >
              <Checkbox
                checked={selectedFeatures.includes(feature.id)}
                onCheckedChange={() => toggleFeature(feature.id)}
              />
              <span className="text-sm font-medium">{feature.label}</span>
            </label>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!businessName.trim() || !businessType || isGenerating}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {isGenerating ? "Generating..." : "Generate My App"}
      </Button>
    </form>
  );
};

export default AppBuilderForm;
