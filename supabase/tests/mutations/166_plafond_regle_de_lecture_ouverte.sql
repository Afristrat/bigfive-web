-- mutation: une règle de lecture des compteurs est ouverte aux utilisateurs connectés
CREATE POLICY plafonds_lecture_authenticated ON private.plafonds_invitations FOR SELECT TO authenticated USING (true);
