import { Route, Routes } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import Home from '@/pages/Home';
import Report from '@/pages/Report';
import News from '@/pages/News';
import Profile from '@/pages/Profile';
import Auth from '@/pages/Auth';
import ReportDetail from '@/pages/ReportDetail';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/report" element={<Report />} />
        <Route path="/news" element={<News />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard/report/:id" element={<ReportDetail />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
