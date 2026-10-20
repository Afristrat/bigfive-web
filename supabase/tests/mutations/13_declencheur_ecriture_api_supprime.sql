-- mutation: le déclencheur contre l'écriture par l'API est supprimé sur app.results (verrou 3)
DROP TRIGGER results_sans_ecriture_api ON app.results;
