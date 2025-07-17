import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileLines } from "@fortawesome/free-solid-svg-icons";

const Home = () => {
  const [documentName, setDocumentName] = useState("");
  const navigate = useNavigate();

  const enterDocument = () => {
    if (!documentName.trim()) return;
    navigate(`/editor/${documentName.trim()}`);
  };

  return (
    <div className="home-container">
      <h1><FontAwesomeIcon icon={faFileLines} style={{ marginRight: "8px" }} />DocTogether</h1>

      <input
        type="text"
        placeholder="Enter Document Name"
        value={documentName}
        onChange={(e) => setDocumentName(e.target.value)}
        className="input-field"
      />

      <button
        onClick={enterDocument}
        disabled={!documentName.trim()}
        className="home-button">Open Document
      </button>
    </div>
  );
};

export default Home;