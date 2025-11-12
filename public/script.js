const btn = document.getElementById("generateBtn");
const topicInput = document.getElementById("topicInput");
const resultDiv = document.getElementById("result");
const loadingDiv = document.getElementById("loading");

btn.addEventListener("click", async () => {
  const topic = topicInput.value.trim();
  if (!topic) {
    alert("Please enter a topic!");
    return;
  }

  resultDiv.innerHTML = "";
  loadingDiv.classList.remove("hidden");

  try {
    const response = await fetch("http://localhost:5000/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    loadingDiv.classList.add("hidden");

    if (data.tasks) {
      resultDiv.innerHTML = `<pre>${data.tasks}</pre>`;
    } else {
      resultDiv.innerHTML = `<p class="error">Error: ${data.error}</p>`;
    }
  } catch (error) {
    console.error("Error:", error);
    loadingDiv.classList.add("hidden");
    resultDiv.innerHTML = `<p class="error">⚠️ ${error.message}</p>`;
  }
});
