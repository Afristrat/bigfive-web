-- mutation: le contrôle et le débit des essais sont exécutables par l'API des personnes connectées
GRANT EXECUTE ON FUNCTION app.mdp_tentative(text) TO authenticated;
