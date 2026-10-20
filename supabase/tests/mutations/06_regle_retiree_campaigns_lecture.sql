-- mutation: la règle de lecture de app.campaigns est retirée
DROP POLICY campaigns_lecture ON app.campaigns;
