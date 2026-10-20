-- mutation: le déclencheur de photographie est supprimé (les agrégats se modifient et s'écrivent à tout moment)
DROP TRIGGER group_aggregates_verrou_photographie ON app.group_aggregates;
