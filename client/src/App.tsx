import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { PageEditor } from './components/PageEditor';
import { fetchPages } from './api';
import { useDarkMode } from './store';

export default function App() {
  const { data: pages = [] } = useQuery({ queryKey: ['pages'], queryFn: fetchPages });
  const darkMode = useDarkMode();

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
        <Sidebar pages={pages} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={
              pages.length > 0
                ? <Navigate to={`/page/${pages[0].id}`} replace />
                : <EmptyState />
            } />
            <Route path="/page/:id" element={<PageEditor />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <div className="text-center">
        <div className="text-4xl mb-4">📝</div>
        <p className="text-lg">No pages yet. Create one in the sidebar.</p>
      </div>
    </div>
  );
}
