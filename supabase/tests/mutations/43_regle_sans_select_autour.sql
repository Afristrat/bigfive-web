-- mutation: organizations_lecture rappelle app.suis_admin_tenga() sans (SELECT ...) (évaluée par ligne)
ALTER POLICY organizations_lecture ON app.organizations
  USING (app.suis_membre(id) OR app.suis_admin_tenga());
