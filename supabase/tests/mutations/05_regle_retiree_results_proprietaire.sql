-- mutation: la règle de lecture du titulaire sur app.results est retirée
DROP POLICY results_lecture_proprietaire ON app.results;
