# BudgetFamille Mobile 📱

Application Android (React Native + Expo) pour [BudgetFamille](https://budgetfamille.com).

## Stack

| Couche       | Technologie                        |
|--------------|------------------------------------|
| Framework    | React Native + Expo SDK 51         |
| Routing      | Expo Router v3 (file-based)        |
| Styling      | NativeWind v4 (Tailwind pour RN)   |
| Data         | TanStack React Query v5 + Axios    |
| Forms        | React Hook Form + Zod              |
| Charts       | Victory Native                     |
| Auth storage | Expo SecureStore                   |
| Push notifs  | Expo Notifications                 |
| Build/Deploy | EAS Build → Google Play            |
| Fonts        | Plus Jakarta Sans (same as web)    |

## Pré-requis

- Node.js 20+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/eas/) : `npm install -g eas-cli`

## Installation

```bash
git clone https://github.com/lovationadmin/budget-mobile
cd budget-mobile
npm install

# Copier et remplir les variables d'environnement
cp .env.example .env
# → EXPO_PUBLIC_API_URL=https://votre-api.onrender.com
```

## Développement

```bash
# Démarrer avec Expo Go (scan QR depuis l'app Expo Go sur votre téléphone)
npx expo start

# Ou ouvrir sur un émulateur Android
npx expo start --android
```

## Build Android

```bash
# APK de test (gratuit, 30 builds/mois sur EAS free tier)
npm run build:android:preview

# AAB pour le Google Play Store
npm run build:android:production
```

## Publication Google Play

```bash
# Après avoir configuré google-service-account.json
npm run submit:android
```

## Structure du projet

```
app/
├── _layout.tsx              # Root layout (polices, providers)
├── index.tsx                # Redirect auth/app
├── (auth)/                  # Écrans publics
│   ├── login.tsx
│   ├── signup.tsx
│   └── forgot-password.tsx
└── (app)/                   # Écrans protégés
    ├── _layout.tsx          # Bottom tab navigator
    ├── index.tsx            # Dashboard (liste des budgets)
    ├── profile.tsx          # Profil utilisateur
    └── budget/[id]/
        ├── _layout.tsx      # Header + onglets budget
        ├── overview.tsx     # Vue d'ensemble + graphique
        ├── members.tsx      # Membres + invitations
        ├── charges.tsx      # Charges + suggestions IA
        ├── projects.tsx     # Projets d'épargne
        ├── calendar.tsx     # Calendrier mensuel
        └── reality.tsx      # Réel vs. planifié (EnableBanking)

services/
├── api.ts                   # Axios + refresh token auto
├── auth.service.ts
├── budget.service.ts
├── user.service.ts
└── notifications.service.ts

contexts/
├── AuthContext.tsx           # Session utilisateur
└── QueryProvider.tsx         # React Query

hooks/
├── useBudgets.ts
└── useBudget.ts
```

## Notifications push

L'app demande la permission au premier lancement et enregistre le token Expo Push
auprès du backend (`POST /api/v1/user/push-token`).

## Variables d'environnement

| Variable                  | Description                        |
|---------------------------|------------------------------------|
| `EXPO_PUBLIC_API_URL`     | URL de base de budget-api          |
| `EXPO_PUBLIC_SENTRY_DSN`  | DSN Sentry (optionnel)             |
