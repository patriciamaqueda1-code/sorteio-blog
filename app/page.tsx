import { redirect } from 'next/navigation';

// Root → redirect to blog
export default function Home() {
  redirect('/blog');
}
