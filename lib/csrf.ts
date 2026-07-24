export function checkOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  const appOrigin = process.env.APP_ORIGIN
  if (!appOrigin) return false
  return origin === appOrigin
}
