import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Preview from './pages/Preview';
import PublishRecords from './pages/PublishRecords';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/contents/:id/preview" element={<Preview />} />
        <Route path="/publish-records" element={<PublishRecords />} />
      </Routes>
    </Layout>
  );
}
