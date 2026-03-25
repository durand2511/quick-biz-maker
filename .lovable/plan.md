

## Plan: Textarea op welkomstscherm laten meegroeien

**Probleem**: De textarea op het welkomstscherm (preview-kant) kapt tekst af bij lange invoer. De maximale hoogte is nu 140px, wat niet genoeg is voor langere beschrijvingen.

**Oplossing**: Verhoog de max hoogte van 140px naar 400px en voeg `overflow-y: auto` toe zodat bij zeer lange teksten er een scrollbar verschijnt in plaats van dat tekst verborgen wordt.

### Technische wijzigingen

**Bestand: `src/components/WelcomeScreen.tsx`**
- Verhoog max hoogte in de `useEffect` van `140` naar `400`
- Voeg `overflow-y-auto` toe aan de textarea class zodat bij extreem lange teksten alsnog gescrolld kan worden

