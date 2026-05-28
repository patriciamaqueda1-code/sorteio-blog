// /blog redireciona para / (root) — evita URL redundante no subdomínio blog.*
import { redirect } from 'next/navigation';

export default function BlogRedirect() {
  redirect('/');
}
