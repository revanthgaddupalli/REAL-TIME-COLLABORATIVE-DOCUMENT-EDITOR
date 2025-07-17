import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Editor from "./Editor";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor/:documentName" element={<Editor />} />
      </Routes>
    </Router>
  );
}

export default App;