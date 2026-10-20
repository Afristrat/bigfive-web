-- mutation: la purge quotidienne est replanifiée à 0 0 * * * (minuit local, non 01:00)
UPDATE cron.job SET schedule = '0 0 * * *' WHERE jobname = 'tenga-purge-quotidienne';
