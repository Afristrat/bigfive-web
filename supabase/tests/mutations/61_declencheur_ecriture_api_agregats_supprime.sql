-- mutation: le déclencheur contre l'écriture par l'API est supprimé sur app.group_aggregates (verrou 3)
DROP TRIGGER group_aggregates_sans_ecriture_api ON app.group_aggregates;
