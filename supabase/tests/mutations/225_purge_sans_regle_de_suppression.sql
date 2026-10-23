-- mutation: la règle de suppression réservée à tenga_owner est retirée (la purge, soumise à la RLS forcée, n'efface plus rien)
DROP POLICY relectures_blocs_suppression_owner ON app.relectures_blocs;
