import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "./socket";
import "./Editor.css";
import * as mammoth from "mammoth";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileLines,
  faLink,
  faUpload,
  faDownload,
  faFilePdf,
  faRightFromBracket,
  faBold,
  faItalic,
  faUnderline,
  faListUl,
  faListOl,
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faParagraph
} from "@fortawesome/free-solid-svg-icons";

const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

const Editor = () => {
  const [value, setValue] = useState("");
  const [saveStatus, setSaveStatus] = useState("All changes saved");
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const getTextStats = () => {
    const text = (editorRef.current?.innerText || "").trim();
    const cleanedText = text.replace(/\s+/g, "");
    const words = text.split(/\s+/).filter(Boolean);
    return {
      characters: cleanedText.length,
      words: words.length,
    };
  };
  const { documentName } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!documentName) {
      navigate("/");
      return;
    }

    socket.emit("join-document", { documentName });

    socket.on("load-document", (data) => {
      setValue(data);
      if (editorRef.current) editorRef.current.innerHTML = data;
    });
    socket.on("receive-changes", (data) => {
      if (editorRef.current && editorRef.current.innerHTML !== data) {
        editorRef.current.innerHTML = data;
        setValue(data);
      }
    });
    socket.on("document-error", (msg) => { alert(msg); navigate("/"); });

    return () => {
      socket.off("load-document");
      socket.off("receive-changes");
      socket.off("document-error");
    };
  }, [documentName, navigate]);

  const emitChanges = debounce((html) => {
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    socket.emit("send-changes", html);
    setSaveStatus("All changes saved");
    setLastSavedTime(currentTime);
  }, 1000);

  const handleInput = () => {
    const html = editorRef.current.innerHTML;
    setValue(html);
    setSaveStatus("Saving...");
    emitChanges(html);
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    handleInput();
  };

  const leaveDocument = () => {
    navigate("/");
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith(".docx")) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target.result;
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setValue(result.value);
      if (editorRef.current) editorRef.current.innerHTML = result.value;
      socket.emit("send-changes", result.value);
    };
    reader.readAsArrayBuffer(file);
  };

  const exportAsPDF = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const lineHeight = 10;
    const margin = 10;
    const lines = doc.splitTextToSize(value || "", 180);

    let y = margin;
    lines.forEach((line) => {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    doc.save("document.pdf");
  };

  const exportAsDOCX = async () => {
    const textContent = editorRef.current.innerText;
    const doc = new Document({
      sections: [
        {
          children: textContent.split("\n").map(
            (line) =>
              new Paragraph({
                children: [new TextRun(line)],
              })
          ),
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "document.docx");
  };

  return (
      <div className="editor-container">
        <div style={{position: "absolute", top: "20px", left: "20px", fontSize: "13px", color: "#ccc", textAlign: "left", lineHeight: "1.6"}}>
          <div><strong>Document:</strong> {documentName}</div>
          <div>
            <strong>Characters:</strong> {getTextStats().characters} |
            <strong> Words:</strong> {getTextStats().words}
          </div>
        </div>
        <h1><FontAwesomeIcon icon={faFileLines} style={{ marginRight: "8px" }} />DocTogether</h1>
        <div className="editor-toolbar">
          <input
            type="file"
            ref={fileInputRef}
            accept=".docx"
            style={{ display: "none" }}
            onChange={handleImport}
          />
          <button onClick={() => fileInputRef.current.click()} className="toolbar-btn"><FontAwesomeIcon icon={faDownload} /> Import DOCX</button>
          <button onClick={exportAsDOCX} className="toolbar-btn"><FontAwesomeIcon icon={faUpload} /> Export as DOCX</button>
          <button onClick={exportAsPDF} className="toolbar-btn"><FontAwesomeIcon icon={faFilePdf} /> Export as PDF</button>
          <button onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url);
              alert("Document URL copied to clipboard!");
            }}
            className="toolbar-btn"><FontAwesomeIcon icon={faLink} /> Copy URL
          </button>
          <button onClick={leaveDocument} className="toolbar-btn leave"><FontAwesomeIcon icon={faRightFromBracket} /> Leave</button>
        </div>

        <div style={{ textAlign: "right", fontSize: "13px", color: "#aaa", marginBottom: "4px" }}>
          {saveStatus}
          {lastSavedTime && saveStatus !== "Saving..." && (
            <span style={{ marginLeft: "6px" }}>• Last saved at {lastSavedTime}</span>
          )}
        </div>

        <div className="format-toolbar">
          <button onClick={() => execCommand("bold")}><FontAwesomeIcon icon={faBold} /></button>
          <button onClick={() => execCommand("italic")}><FontAwesomeIcon icon={faItalic} /></button>
          <button onClick={() => execCommand("underline")}><FontAwesomeIcon icon={faUnderline} /></button>
          <button onClick={() => execCommand("formatBlock", "<h1>")}>Heading 1</button>
          <button onClick={() => execCommand("formatBlock", "<h2>")}>Heading 2</button>
          <button onClick={() => execCommand("formatBlock", "<p>")}><FontAwesomeIcon icon={faParagraph} /></button>
          <button onClick={() => execCommand("insertUnorderedList")}><FontAwesomeIcon icon={faListUl} /></button>
          <button onClick={() => execCommand("insertOrderedList")}><FontAwesomeIcon icon={faListOl} /></button>
          <button onClick={() => execCommand("justifyLeft")}><FontAwesomeIcon icon={faAlignLeft} /></button>
          <button onClick={() => execCommand("justifyCenter")}><FontAwesomeIcon icon={faAlignCenter} /></button>
          <button onClick={() => execCommand("justifyRight")}><FontAwesomeIcon icon={faAlignRight} /></button>
        </div>

        <div
          ref={editorRef}
          className="editor-area"
          contentEditable
          onInput={handleInput}
          suppressContentEditableWarning={true}
        ></div>
      </div>
  );
};

export default Editor;