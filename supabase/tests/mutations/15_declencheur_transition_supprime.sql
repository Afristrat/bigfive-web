-- mutation: le déclencheur de transition de statut est supprimé sur app.campaigns
DROP TRIGGER campaigns_transition ON app.campaigns;
