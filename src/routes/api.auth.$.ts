import { createServerFileRoute } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'

async function handle({ request }: { request: Request }) {
  return await auth.handler(request)
}

export const ServerRoute = createServerFileRoute('/api/auth/$').methods({
  GET: handle,
  POST: handle,
})