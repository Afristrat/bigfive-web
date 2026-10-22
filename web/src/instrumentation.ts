// Garde au démarrage : le serveur refuse de démarrer dans une configuration
// dangereuse (réceptacle d'e-mails actif en production, variables absentes).
export async function register(): Promise<void> {
  // Ni pendant `next build` ni sur le runtime edge. La garde est POSITIVE
  // (`=== 'nodejs'`) pour que Next retire ce bloc, et ses imports qui touchent
  // node:crypto, du paquet edge de l'instrumentation.
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    const { assertStartup } = await import('@/lib/startup-check');
    const { supabaseConfigProblems } = await import('@/lib/supabase/server');
    assertStartup(
      process.env,
      process.env.NODE_ENV === 'production' ? supabaseConfigProblems() : []
    );
  }
}
