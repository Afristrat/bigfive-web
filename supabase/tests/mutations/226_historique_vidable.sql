-- mutation: le déclencheur qui refuse le vidage de l'historique de relecture est supprimé
DROP TRIGGER relectures_blocs_vidage_interdit ON app.relectures_blocs;
