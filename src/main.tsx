import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Dev-only performance overlay (?perf). The whole branch is removed from production builds.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('perf')) {
  void import('./dev/PerfHud').then(({ withPerfHud }) => root.render(withPerfHud(app)))
} else {
  root.render(app)
}
