import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Preview from './pages/Preview';
import Records from './pages/Records';
import Inspiration from './pages/Inspiration';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/inspiration" element={<Inspiration />} />
        <Route path="/contents/:id/preview" element={<Preview />} />
        <Route path="/records" element={<Records />} />
      </Routes>
    </Layout>
  );
}
