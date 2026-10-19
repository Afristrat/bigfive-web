import { Post } from 'contentlayer/generated';
import { connection } from 'next/server';
import { connectToDatabase } from '@/db';

interface ViewCounterProps {
  postId: string;
}

type ViewDocument = { _id: string; count: number };

const getViewsCollection = async () =>
  (await connectToDatabase()).collection<ViewDocument>('views');

export async function ViewCounter({ postId }: ViewCounterProps) {
  await connection();
  try {
    const views = await (
      await getViewsCollection()
    ).findOneAndUpdate(
      { _id: postId },
      { $inc: { count: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    if (!views) return null;
    return <p>{Intl.NumberFormat('en-us').format(views.count)} views</p>;
  } catch (error) {
    console.error('View counter failed', error);
    return null;
  }
}

export async function ariclesByPopularity(posts: Post[]): Promise<Post[]> {
  await connection();
  const counts = new Map<string, number>();
  try {
    const documents = await (await getViewsCollection())
      .find({ _id: { $in: posts.map((post) => post.slug) } })
      .toArray();
    documents.forEach(({ _id, count }) => counts.set(_id, count));
  } catch (error) {
    console.error('Reading article views failed', error);
  }
  const views = (post: Post) => counts.get(post.slug) ?? 0;
  return [...posts].sort((a, b) => views(b) - views(a));
}
