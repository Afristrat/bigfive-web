-- mutation: la règle de suppression sur auth.users est retirée à tenga_owner (l'effacement de compte échoue)
DROP POLICY tenga_owner_suppression ON auth.users;
