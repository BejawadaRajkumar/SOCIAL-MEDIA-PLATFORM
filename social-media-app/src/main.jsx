import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import './Dashboard.css'
import MailChange from './MailChange'
import Dashboard from './dashboard';
import Reels from './Reels'
createRoot(document.getElementById('root')).render(
 <BrowserRouter>
 <Routes>
  <Route path='/' element={<App/>} />
  <Route path='/dashboard' element={<Dashboard/>} />
  <Route path="/reel/:id" element={<Reels />} /> {/* Specific reel route */}
<Route path='/updateemail' element={<MailChange/>} />
  </Routes>
 </BrowserRouter>,
)
