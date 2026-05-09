# BudgetFamille Mobile

Application Android native (React Native + Expo) pour [BudgetFamille](https://budgetfamille.com), parité fonctionnelle avec la web app.

## Stack

| Couche        | Technologie                                       |
|---------------|---------------------------------------------------|
| Framework     | React Native 0.74 + Expo SDK 51                   |
| Routing       | Expo Router v3 (file-based, typed routes)         |
| Styling       | NativeWind v4 (Tailwind pour RN, light + dark)    |
| Data          | TanStack Query v5 + Axios + persisted cache       |
| Forms         | React Hook Form + Zod                             |
| Charts        | Victory Native                                    |
| Icons         | lucide-react-native                               |
| i18n          | i18next + react-i18next (FR + EN)                 |
| Auth storage  | Expo SecureStore (Keychain / Keystore)            |
| Biométrie     | expo-local-authentication (FaceID / empreinte)    |
| Magic link    | Deep linking (`budgetfamille://` + `/m/*` web)    |
| Realtime      | WebSocket (`/api/v1/ws/budgets/:id`)              |
| Push notifs   | Expo Notifications + Expo Push Service            |
| Erreurs       | Sentry                                            |
| Build/Deploy  | EAS Build → Google Play (auto-submit)             |
| Fonts         | DM Sans (body) + Plus Jakarta Sans (display)      |

## Quickstart

```bash
git clone https://github.com/lovationadmin/budget-mobile
cd budget-mobile
npm install

cp .env.example .env
# → EXPO_PUBLIC_API_URL=https://votre-api.onrender.com

npx expo start            # scan QR avec Expo Go
npx expo start --android  # ou émulateur Android Studio
```

## Variables d'environnement

| Variable                       | Description                                  |
|--------------------------------|----------------------------------------------|
| `EXPO_PUBLIC_API_URL`          | Base URL de budget-api (sans `/api/v1`)      |
| `EXPO_PUBLIC_SENTRY_DSN`       | DSN Sentry (optionnel)                       |
| `EXPO_PUBLIC_EAS_PROJECT_ID`   | Pour les push tokens (renseigné par EAS)     |

## Architecture

```
app/                        # Routes Expo Router
├── _layout.tsx             # Fonts, i18n, providers, splash
├── index.tsx               # Router auth / locked / app
├── (auth)/
│   ├── login.tsx           # Mot de passe + magic link
│   ├── signup.tsx
│   ├── forgot-password.tsx
│   ├── magic-link.tsx      # Deep link verify
│   └── biometric-unlock.tsx
└── (app)/
    ├── _layout.tsx         # Bottom tabs (lucide icons)
    ├── index.tsx           # Dashboard
    ├── profile.tsx         # Biométrie + langue + sécurité
    └── budget/[id]/
        ├── _layout.tsx     # Header + onglets scrollables
        ├── overview.tsx    # Stats + pie chart catégories
        ├── members.tsx     # Liste + invitation + remove
        ├── charges.tsx     # Liste + AI savings badges
        ├── projects.tsx    # Cartes progression
        ├── calendar.tsx    # Vue mensuelle
        └── reality.tsx     # Banque (deep link → web pour OAuth PSD2)

services/
├── api.ts                  # Axios + refresh JWT (mobile + cookie fallback)
├── auth.service.ts         # Login / signup / magic link
├── biometric.service.ts    # FaceID / empreinte
├── budget.service.ts       # Budgets + envelope JSON
├── user.service.ts         # Profile / 2FA / GDPR export
├── notifications.service.ts # Expo push token register
└── websocket.service.ts    # Realtime collab

i18n/
├── index.ts                # Config react-i18next
└── locales/
    ├── fr.json
    └── en.json

contexts/
├── AuthContext.tsx         # Auth + biometric + magic link state
└── QueryProvider.tsx

backend-patch/              # Endpoints à ajouter à budget-api
├── README.md
├── handlers/{auth_mobile,auth_magic_link,devices}.go
├── services/{push_service,email_magic_link}.go
├── models/devices.go
├── routes.go.patch
└── schema.sql
```

## Authentification

**Première connexion** : email + mot de passe ou magic link → JWT 15 min stocké en mémoire, refresh token 7 jours en SecureStore.

**Réouvertures** : si la biométrie est activée → écran de déverrouillage → biométrie → fetch profil.

**Magic link** : `POST /auth/magic-link/request` → email avec lien `budgetfamille.com/m/magic-link?token=…` → Android intent filter ouvre l'app → `POST /auth/magic-link/verify` → tokens stockés.

**Refresh** : intercepteur Axios sur 401 → tente `POST /auth/mobile/refresh` (JSON) → fallback `POST /auth/refresh` (cookie) tant que le backend mobile n'est pas en prod.

## Branding (aligné web)

- Couleur primaire : `hsl(200, 75%, 50%)` (bleu)
- CTA chaud : `#F97316` (warm/coral) — gradient `--gradient-warm` du web
- Police body : DM Sans · Police display : Plus Jakarta Sans
- Radius : `1rem`
- Light + dark via `userInterfaceStyle: "automatic"`

## Build & déploiement Play Store

### 1. Prérequis (à faire une fois)

- Compte Google Play Console (25 USD lifetime)
- Compte Expo : `npx expo login`
- Lier le projet : `eas init` (renseigne `extra.eas.projectId` dans `app.json`)
- Service account Google Play : voir [docs EAS](https://docs.expo.dev/submit/android/) → fichier JSON dans `google-service-account.json` à la racine
- Mettre à jour l'URL d'updates : `app.json` → `updates.url` avec le projectId

### 2. Build

```bash
# APK de test (interne, partage par lien) — gratuit
npm run build:android:preview

# AAB de production (signé par EAS)
npm run build:android:production
```

### 3. Soumission

```bash
# Push direct vers le track "internal" (testeurs invités par email)
npm run submit:android
```

EAS upload l'AAB sur la Play Console et le pousse sur l'internal testing.

## Roadmap Play Store — checklist

### Pré-soumission
- [ ] Compte Google Play Console créé (25 USD)
- [ ] Service account JSON configuré (`google-service-account.json` ✗ ne pas committer)
- [ ] `eas init` lancé, `projectId` dans `app.json` mis à jour
- [ ] Icon 1024×1024 (`assets/icon.png`)
- [ ] Adaptive icon foreground 1024×1024 (`assets/adaptive-icon.png`)
- [ ] Notification icon transparent 96×96 (`assets/notification-icon.png`)
- [ ] Splash screen 1284×2778 (`assets/splash.png`)
- [ ] **Page Privacy Policy publique** (URL — REQUIS par Google)
- [ ] Description courte (< 80 chars) FR + EN
- [ ] Description longue (< 4000 chars) FR + EN
- [ ] 2 à 8 screenshots (1080×1920 ou 1080×2400)
- [ ] Bannière feature 1024×500 (optionnel mais recommandé)

### Backend (à appliquer depuis `backend-patch/`)
- [ ] `magic_link_tokens` + `user_devices` tables créées (`schema.sql`)
- [ ] Routes mobile, magic-link, devices câblées (`routes.go.patch`)
- [ ] `services/push_service.go` instancié dans `main.go` et utilisé pour fan-out
- [ ] `SendMagicLinkEmail` câblé sur ton helper email existant
- [ ] Tests : `go build ./... && go test ./...`
- [ ] Déployé sur Render

### Mobile (côté projet)
- [x] Auth email + mot de passe avec refresh token mobile-friendly
- [x] Magic link (request + verify deep link)
- [x] Biométrie (FaceID / empreinte) avec opt-in
- [x] Push tokens Expo registration + listener (foreground refresh + tap deep link)
- [x] WebSocket realtime (auto-invalidate on remote change)
- [x] Branding aligné web (DM Sans, Plus Jakarta, HSL tokens, light + dark)
- [x] i18n FR + EN avec persistance
- [x] Dashboard + 6 onglets budget
- [x] Profile complet (biométrie + langue + 2FA + password + privacy + terms)
- [x] Onboarding 3-écrans avec gate first-launch
- [x] CRUD complet : charges / projets / calendrier / revenus (BottomSheets RHF + Zod)
- [x] Onboarding banque WebView Enable Banking PSD2
- [x] 2FA TOTP setup screen avec QR + backup codes
- [x] Suggestions IA inline (auto-categorize sur le label) + bulk analyze
- [x] Mode offline : React Query AsyncStorage persister, 7j retention
- [x] Sentry observability (no-op si DSN absent)
- [x] Privacy Policy + Terms FR ready-for-Play-Store
- [x] Accept invitation deep link
- [x] Assets icon/splash/adaptive/notification générés depuis sources SVG

### QA
- [ ] Test sur Android 8 (min SDK Expo SDK 51 = 23)
- [ ] Test sur Android 14
- [ ] Test sur tablette (l'app est portrait-only mais doit afficher proprement)
- [ ] Vérification deep link `https://budgetfamille.com/m/magic-link?token=...`
- [ ] Vérification deep link `budgetfamille://`
- [ ] Test push notif (créer un membre depuis la web app, vérifier la notif mobile)
- [ ] Test biométrie : enable, kill app, reopen → biometric prompt
- [ ] Test refresh token : laisser l'app ouverte 16 min, vérifier qu'une requête se refresh

### Soumission Play Store
- [ ] Build AAB de production (`npm run build:android:production`)
- [ ] Soumission internal testing (`npm run submit:android`)
- [ ] Inviter 5-20 testeurs (emails Google) sur le track "Internal testing"
- [ ] Recolter feedback, itérer
- [ ] Promotion vers "Closed beta" → "Open beta" → "Production"

## Coût total estimé

| Poste                              | Coût                              |
|------------------------------------|-----------------------------------|
| Google Play Console                | 25 USD (lifetime, une seule fois) |
| Apple Developer (iOS plus tard)    | 99 USD/an                         |
| EAS Build (free tier)              | 30 builds/mois — OK pour démarrer |
| Expo Push Service                  | Gratuit, illimité                 |
| Sentry (free tier)                 | 5K erreurs/mois — OK pour démarrer|
| **Total démarrage Android seul**   | **~25 USD**                       |

## Liens utiles

- [Expo SDK 51](https://docs.expo.dev/versions/v51.0.0/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Google Play Console](https://play.google.com/console)
- [Privacy Policy generator](https://app-privacy-policy-generator.firebaseapp.com/)
