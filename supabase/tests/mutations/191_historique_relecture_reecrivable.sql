-- mutation: le déclencheur qui tient l'historique de relecture en ajout seul est supprimé
DROP TRIGGER relectures_blocs_transition ON app.relectures_blocs;
