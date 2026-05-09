// services/email_magic_link.go
// ============================================================================
// MAGIC LINK EMAIL
// ============================================================================
// Sends the passwordless sign-in email. Replicates the layout of
// utils/email.go::SendVerificationEmail — adapt the actual mail sending call
// (`utils.SendEmail` etc.) to whatever helper your project exposes.
// ============================================================================

package services

import (
	"fmt"

	"github.com/LovationAdmin/budget-api/utils"
)

// SendMagicLinkEmail emails a sign-in link to the user. The link is clickable
// from the user's mailbox on their phone — Android's intent filter (configured
// in budget-mobile/app.json) opens the app directly.
//
// `link` is the full URL: https://budgetfamille.com/m/magic-link?token=...
func SendMagicLinkEmail(toEmail, userName, link string) error {
	subject := "Votre lien de connexion BudgetFamille"
	body := fmt.Sprintf(`
Bonjour %s,

Voici votre lien de connexion à BudgetFamille — il est valable 15 minutes
et ne peut être utilisé qu'une seule fois :

  %s

Si vous n'avez pas demandé ce lien, vous pouvez ignorer cet email — votre
compte reste sécurisé.

— L'équipe BudgetFamille
`, userName, link)

	// Plug into your existing mail sender. Most projects already expose a
	// utils.SendEmail(to, subject, body) helper. Replace this with the actual
	// signature if needed.
	return utils.SendEmail(toEmail, subject, body)
}
