-- mutation: la recherche de compte par adresse est ouverte à tout utilisateur connecté (énumération des comptes)
GRANT EXECUTE ON FUNCTION app.compte_par_adresse(text) TO authenticated;
