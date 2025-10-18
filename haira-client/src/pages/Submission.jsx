import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

function Submission() {
  const { id } = useParams();  // project id
  const [reportContent, setReportContent] = useState(""); // textarea content
  const [grade, setGrade] = useState(null); // AI grade
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("...");

  // Optional: fetch project info or message
  useEffect(() => {
    axios.get(`http://localhost:3002/api/project/${id}/submission`)
      .then(response => setMessage(response.data.message || "..."))
      .catch(err => console.error("Error fetching project info:", err));
  }, [id]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // prevent page reload
    if (!reportContent.trim()) return alert("Report content cannot be empty");

    setLoading(true);

    try {
      const response = await axios.post(
        `http://localhost:3002/api/project/${id}/submission`,
        {
          content: reportContent,
          userId: "user_1", // replace with logged-in user ID
        }
      );

      setGrade(response.data.grade); // show AI grade
      setReportContent("");          // clear textarea
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Failed to submit report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      <h1>Submit Final Report for Project {id}</h1>
      <p>Message from server: {message}</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <textarea
            value={reportContent}
            onChange={(e) => setReportContent(e.target.value)}
            placeholder="Write your final report here..."
            rows={8}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
        >
          {loading ? "Submitting..." : "Submit Report"}
        </button>
      </form>

      {grade && (
        <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #ccc" }}>
          <h3>AI Grade</h3>
          {grade.error ? (
            <p style={{ color: "red" }}>Error: {grade.error}</p>
          ) : (
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              <li><strong>Overall:</strong> {grade.overall}</li>
              <li><strong>Work Percentage:</strong> {grade.workPercentage}</li>
              <li><strong>Responsiveness:</strong> {grade.responsiveness}</li>
              <li><strong>Report Quality:</strong> {grade.reportQuality}</li>
              {grade.feedback && <li><strong>Feedback:</strong> {grade.feedback}</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default Submission;
