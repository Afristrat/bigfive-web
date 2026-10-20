-- mutation: le plancher d'effectif de la table des agrégats est retiré
ALTER TABLE app.group_aggregates DROP CONSTRAINT effectif_publie_plancher;
