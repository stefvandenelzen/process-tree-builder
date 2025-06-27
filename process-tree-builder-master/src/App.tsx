// import { Routes, Route } from 'react-router-dom';
// import { Navbar } from './components/Navbar';
// import { HomePage } from './pages/HomePage';
import { LayoutPage } from './pages/LayoutPage';
// import { DFGPage } from './pages/DFGPage';
// import ImportingPage from './pages/ImportingPage';
// import TutorialPage1 from './pages/tutorials/TutorialPage1';
// import ProcessTreePage from './pages/ProcessTreePage';
// import TutorialPage2 from './pages/tutorials/TutorialPage2';
import { QueryClient, QueryClientProvider } from 'react-query';

// FIX FOR PROBLEMS WITH ALLOWEDHOSTS[0]
// https://stackoverflow.com/questions/70374005/invalid-options-object-dev-server-has-been-initialized-using-an-options-object

/* Replace: allowedHosts: disableFirewall ? 'all' : [allowedHost],
    with: allowedHosts: 'all',
    in: node_modules/react_scripts/config/webpack/webpackDevServer.config.js
*/

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* <Navbar />
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='layout' element={<LayoutPage />} />
        <Route path='dfg' element={<DFGPage />} />
        <Route path='tree' element={<ProcessTreePage />} />
        <Route path='files' element={<ImportingPage />} />
        <Route path='tut1' element={<TutorialPage1 />} />
        <Route path='tut2' element={<TutorialPage2 />} />
      </Routes> */}
      <LayoutPage />
    </QueryClientProvider>
  );
}

export default App;
