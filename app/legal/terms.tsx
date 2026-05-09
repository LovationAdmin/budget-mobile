import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { palette } from '@/constants/colors';

const TERMS_FR = `
# Conditions générales d'utilisation — BudgetFamille

_Dernière mise à jour : 9 mai 2026_

## 1. Objet

BudgetFamille est un service de gestion de budget familial collaboratif
édité par Lovation Admin. Les présentes conditions régissent votre usage
de l'application mobile et du site web budgetfamille.com.

## 2. Compte

- L'inscription est gratuite et nécessite une adresse email valide.
- Vous êtes seul responsable de la confidentialité de votre mot de passe.
- Un seul compte par personne. Le partage de compte est interdit.

## 3. Contenu utilisateur

Vous restez propriétaire des données saisies (budget, charges, projets…).
Vous nous accordez une licence non-exclusive de stocker, sauvegarder et
afficher ces données dans l'unique but de fournir le service.

## 4. Disponibilité

Nous nous efforçons de maintenir le service disponible 99% du temps mais
ne garantissons pas une disponibilité ininterrompue. Des interruptions
peuvent survenir pour maintenance.

## 5. Limitations

Vous vous engagez à ne pas :

- Utiliser le service pour des fins illégales.
- Tenter de contourner les mesures de sécurité.
- Reverse-engineer ou copier le code de l'application.
- Surcharger l'API par des requêtes automatisées non autorisées.

## 6. Connexions bancaires

Les connexions bancaires sont fournies via Enable Banking, agrégateur
agréé sous la directive PSD2. Vous pouvez révoquer à tout moment l'accès
de BudgetFamille à votre banque depuis l'onglet Réalité ou directement
auprès de votre banque.

## 7. Propriété intellectuelle

L'ensemble des éléments du service (interface, code, marque, logos)
sont la propriété de Lovation Admin. Toute reproduction non autorisée
est interdite.

## 8. Responsabilité

Nous ne saurions être tenus responsables des décisions financières
prises sur la base des informations affichées. BudgetFamille est un
outil d'aide à la gestion, pas un conseil financier.

## 9. Résiliation

Vous pouvez supprimer votre compte à tout moment depuis l'app
(Profil → Supprimer mon compte). Nous nous réservons le droit de
suspendre un compte qui violerait les présentes conditions.

## 10. Loi applicable

Les présentes conditions sont régies par le droit français. Tout litige
relèvera des tribunaux compétents en France.

## 11. Contact

Lovation Admin — contact@budgetfamille.com
`;

export default function TermsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center border-b border-border bg-card px-5 py-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ChevronLeft size={24} color={palette.light.foreground} />
        </TouchableOpacity>
        <Text className="text-lg text-foreground font-display-bold">Terms of Service</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-sm text-foreground font-sans" selectable>
          {TERMS_FR.trim()}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
