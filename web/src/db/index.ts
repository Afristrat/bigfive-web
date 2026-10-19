import { MongoClient, type Db } from 'mongodb';

const dbName = process.env.DB_NAME || 'results';

// Client conservé sur globalThis : survit au rechargement à chaud en développement.
const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

function getClient(): Promise<MongoClient> {
  const url = process.env.DB_URL;
  if (!url) {
    throw new Error('The DB_URL environment variable is not defined');
  }
  globalForMongo.mongoClientPromise ??= new MongoClient(url, {
    // Échec rapide si MongoDB est injoignable (30 s par défaut).
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
  })
    .connect()
    .catch((error) => {
      // Une connexion échouée ne doit pas rester en cache.
      globalForMongo.mongoClientPromise = undefined;
      throw error;
    });
  return globalForMongo.mongoClientPromise;
}

export async function connectToDatabase(): Promise<Db> {
  const client = await getClient();
  return client.db(dbName);
}
