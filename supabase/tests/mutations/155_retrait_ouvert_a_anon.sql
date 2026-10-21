-- mutation: le retrait de compte est ouvert à anon
GRANT EXECUTE ON FUNCTION app.retirer_compte_sans_appartenance(uuid) TO anon;
