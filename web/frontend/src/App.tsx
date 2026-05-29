import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Editor from './pages/Editor';
import Records from './pages/Records';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Editor />} />
        <Route path="/records" element={<Records />} />
      </Routes>
    </Layout>
  );
}
