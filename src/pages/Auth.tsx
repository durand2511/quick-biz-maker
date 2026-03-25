import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error);
        setLoading(false);
      }
    } else {
      if (password.length < 6) {
        toast.error("Wachtwoord moet minimaal 6 tekens zijn");
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast.error(error);
        setLoading(false);
      } else {
        toast.success("Account aangemaakt! Controleer je e-mail om te bevestigen.");
        setIsLogin(true);
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, hsl(260 80% 25%) 0%, hsl(300 50% 20%) 35%, hsl(330 60% 18%) 55%, hsl(220 15% 8%) 80%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 30% 50%, hsl(260 90% 35% / 0.4) 0%, transparent 50%), radial-gradient(circle at 70% 40%, hsl(330 80% 35% / 0.3) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/60 backdrop-blur border border-border/50 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>AI-Powered App Builder</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Mellow</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Log in om verder te gaan" : "Maak een account aan"}
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 p-6 shadow-2xl space-y-4"
        >
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Naam</label>
              <Input
                type="text"
                placeholder="Je naam"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-secondary/50 border-border/50"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">E-mail</label>
            <Input
              type="email"
              placeholder="naam@voorbeeld.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Wachtwoord</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-secondary/50 border-border/50"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLogin ? "Inloggen" : "Account aanmaken"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {isLogin ? "Nog geen account? " : "Al een account? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? "Registreren" : "Inloggen"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Auth;
