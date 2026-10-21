-- mutation: la consommation de plafond est ouverte à tout utilisateur connecté (il pourrait épuiser les plafonds d'une organisation)
GRANT EXECUTE ON FUNCTION app.consommer_plafond_invitation(uuid, text, integer, integer, integer) TO authenticated;
