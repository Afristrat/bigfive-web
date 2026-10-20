-- mutation: la tâche de purge de cron.job_run_details est supprimée
SELECT cron.unschedule('tenga-purge-historique-cron');
