import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import NeuralSpacePage from "./pages/NeuralSpacePage";

/**
 * ルートは 1 枚のみ。未知のパスはトップへ戻す（GitHub Pages の
 * 404.html フォールバックから来たディープリンクもここで拾われる）。
 */
function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<NeuralSpacePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
