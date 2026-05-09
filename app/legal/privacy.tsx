import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

import { palette } from '@/constants/colors';

const PRIVACY_FR = `
# Politique de confidentialité — BudgetFamille

_Dernière mise à jour : 9 mai 2026_

BudgetFamille (ci-après « nous », « notre ») est édité par Lovation Admin.
Cette politique décrit les données personnelles que nous collectons quand
vous utilisez l'application mobile BudgetFamille et la web app
budgetfamille.com, et l'usage que nous en faisons.

## 1. Données collectées

- **Compte** : email, prénom, nom, mot de passe (chiffré avec bcrypt).
- **Budget** : nom, devise, localisation pays, charges, projets, calendrier,
  membres invités. Ces données sont nécessaires au fonctionnement du service.
- **Connexions bancaires (optionnel)** : identifiant de l'établissement, soldes
  et transactions des comptes que vous avez explicitement connectés via
  Enable Banking (PSD2). Aucun mot de passe bancaire ne nous est jamais
  transmis ni stocké.
- **Appareils mobiles** : token de notification push (Expo/FCM/APNs), nom
  de la plateforme (iOS / Android) et version de l'app.
- **Logs techniques** : adresse IP, user-agent, codes HTTP, temps de réponse —
  conservés 30 jours pour la sécurité et le diagnostic.
- **Erreurs** : si vous avez consenti, les rapports de plantage anonymisés
  via Sentry (sans données personnelles).

## 2. Finalités

- Fournir le service (sauvegarde et synchronisation de votre budget).
- Sécuriser votre compte (authentification, 2FA, détection d'intrusion).
- Vous envoyer les notifications choisies (invitation, modification budget).
- Vous contacter pour des raisons opérationnelles (vérification email,
  réinitialisation de mot de passe).

## 3. Bases légales (RGPD)

- **Exécution du contrat** : compte, budget, connexions bancaires.
- **Intérêt légitime** : sécurité, prévention de la fraude, logs techniques.
- **Consentement** : notifications push (révocable à tout moment dans les
  paramètres iOS/Android), analytics Sentry.

## 4. Durée de conservation

- Données du compte : tant que votre compte existe + 30 jours après suppression.
- Logs : 30 jours.
- Tokens de session : 7 jours, rotation à chaque utilisation.
- Sauvegardes chiffrées : 30 jours après suppression définitive.

## 5. Vos droits

Vous pouvez à tout moment :

- **Accéder** à vos données : Profil → Exporter mes données (export JSON).
- **Rectifier** vos informations.
- **Supprimer** votre compte : Profil → Supprimer mon compte.
- **Demander la portabilité** de vos données.
- **Vous opposer** au traitement (désinstallation de l'app).
- **Introduire une réclamation** auprès de la CNIL (cnil.fr).

Pour exercer ces droits : privacy@budgetfamille.com

## 6. Sous-traitants

- **Render** : hébergement de l'API (UE).
- **Vercel** : hébergement du site web (UE/US).
- **Supabase / Postgres** : base de données (UE).
- **Resend / Mailgun** : envoi des emails transactionnels.
- **Enable Banking** : agrégation bancaire PSD2 (UE).
- **Expo Push / FCM / APNs** : routage des notifications.
- **Sentry** : monitoring d'erreurs (option, anonymisé).

Tous nos sous-traitants sont engagés contractuellement par des DPA conformes
au RGPD.

## 7. Sécurité

- Chiffrement TLS 1.3 en transit.
- Mots de passe : bcrypt, coût ≥ 12.
- Refresh tokens : SHA-256, rotation, détection de réutilisation.
- 2FA TOTP optionnelle.
- Données stockées au repos dans des bases chiffrées AES-256.

## 8. Mineurs

Le service n'est pas destiné aux moins de 16 ans. Si vous êtes parent et
constatez qu'un mineur a créé un compte, contactez-nous pour suppression.

## 9. Modifications

Toute modification importante de cette politique vous sera notifiée par
email et lors de votre prochaine connexion.

## 10. Contact

Lovation Admin — privacy@budgetfamille.com
`;

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center border-b border-border bg-card px-5 py-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ChevronLeft size={24} color={palette.light.foreground} />
        </TouchableOpacity>
        <Text className="text-lg text-foreground font-display-bold">Privacy Policy</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-sm text-foreground font-sans" selectable>
          {PRIVACY_FR.trim()}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
