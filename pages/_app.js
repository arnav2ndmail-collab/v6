import '../styles/globals.css'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  
  return (
    <>
      <Component {...pageProps} />
      <SpeedInsights route={router.pathname} />
    </>
  )
}
