-- mutation: le déclencheur qui rend le journal en ajout seul est supprimé
DROP TRIGGER audit_log_sans_modification ON private.audit_log;
