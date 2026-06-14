import { Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Preview from './pages/Preview';
import Records from './pages/Records';
import Inspiration from './pages/Inspiration';
import Settings from './pages/Settings';
import QuickStart from './pages/QuickStart';
import Contents from './pages/Contents';
import Welcome from './pages/Welcome';

const motionProfile = document.documentElement.classList.contains('windows-render-safe') ? 'always' : 'user';

export default function App() {
  return (
    <MotionConfig reducedMotion={motionProfile}>
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/inspiration" element={<Inspiration />} />
              <Route path="/quickstart" element={<QuickStart />} />
              <Route path="/contents" element={<Contents />} />
              <Route path="/contents/:id/preview" element={<Preview />} />
              <Route path="/records" element={<Records />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </MotionConfig>
  );
}
