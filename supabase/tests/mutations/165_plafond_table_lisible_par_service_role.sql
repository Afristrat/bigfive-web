-- mutation: le serveur peut lire les compteurs de plafonds directement
GRANT SELECT ON private.plafonds_invitations TO service_role;
