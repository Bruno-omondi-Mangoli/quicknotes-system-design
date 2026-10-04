// ---------- 1. Constants and elements ----------
const API_URL = "https://jsonplaceholder.typicode.com/posts";
const MAX_TITLE = 100;

const loadBtn = document.querySelector("#load-btn");
const statusText = document.querySelector("#status");
const list = document.querySelector("#notes-list");
const form = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");

let notes = []; // the notes currently shown on the page
let newCount = 0; // counts notes created in this session (for unique keys)

// ---------- 2. Helpers ----------
function setStatus(message, type) {
  statusText.textContent = message;
  statusText.classList.remove("loading");
  statusText.classList.remove("success");
  statusText.classList.remove("error");
  statusText.classList.add(type);
}

// One reusable function for every request
async function request(url, options) {
  const response = await fetch(url, options);

  // fetch does NOT throw on 404/500, so we check response.ok ourselves
  if (!response.ok) {
    throw new Error(`Server responded with status ${response.status}`);
  }

  let data = null;
  if (response.status !== 204) {
    data = await response.json();
  }
  return { status: response.status, data: data };
}

// ---------- 3. Draw the notes (user text only via textContent) ----------
function renderNotes() {
  list.innerHTML = "";

  // Empty state
  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.classList.add("empty");
    empty.textContent = "No notes to show yet.";
    list.appendChild(empty);
    return;
  }

  notes.forEach((note) => {
    const li = document.createElement("li");
    li.classList.add("note");

    const content = document.createElement("div");

    const title = document.createElement("h3");
    title.textContent = note.title;

    const body = document.createElement("p");
    body.textContent = note.body;

    const del = document.createElement("button");
    del.textContent = "Delete";
    del.classList.add("delete-btn");
    del.addEventListener("click", () => deleteNote(note, del));

    content.appendChild(title);
    content.appendChild(body);
    li.appendChild(content);
    li.appendChild(del);
    list.appendChild(li);
  });
}

// ---------- 4. GET: load 10 notes ----------
async function loadNotes() {
  setStatus("Loading notes...", "loading");
  loadBtn.disabled = true;

  try {
    const result = await request(`${API_URL}?_limit=10`);

    notes = result.data.map((post) => {
      return {
        key: `server-${post.id}`,
        id: post.id,
        title: post.title,
        body: post.body,
        isNew: false,
      };
    });

    renderNotes();
    setStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch (error) {
    setStatus("Could not load notes. Please try again.", "error");
    console.error(error);
  } finally {
    loadBtn.disabled = false; // runs whether it worked or failed
  }
}

// ---------- 5. POST: create a note ----------
async function createNote(title, body) {
  setStatus("Creating note...", "loading");
  submitBtn.disabled = true;

  try {
    const result = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, body: body, userId: 1 }),
    });

    newCount++;
    notes.unshift({
      key: `new-${newCount}`,
      id: result.data.id,
      title: result.data.title,
      body: result.data.body,
      isNew: true,
    });

    renderNotes();
    setStatus(
      `Note created (status ${result.status}, id ${result.data.id}).`,
      "success"
    );
    titleInput.value = "";
    bodyInput.value = "";
  } catch (error) {
    setStatus("Could not create the note. Please try again.", "error");
    console.error(error);
  } finally {
    submitBtn.disabled = false;
  }
}

// ---------- 6. DELETE: remove a note ----------
// JSONPlaceholder is a fake API: it never really stores the notes we create
// (every new note comes back with id 101, which does not exist on the server).
// So our approach is:
//  - Notes loaded from the server (isNew is false): send DELETE /posts/{id}
//    and remove the note from the page only after the server says OK.
//  - Notes created in this session (isNew is true): the server never saved
//    them, and a real API would answer 404 for id 101, so we remove them from
//    the page without sending a request.
// Each note has a unique "key", so deleting one note never removes another
// note that happens to share the id 101.
async function deleteNote(note, button) {
  button.disabled = true;
  setStatus("Deleting note...", "loading");

  try {
    if (!note.isNew) {
      await request(`${API_URL}/${note.id}`, { method: "DELETE" });
    }

    notes = notes.filter((item) => item.key !== note.key);
    renderNotes();
    setStatus("Note deleted.", "success");
  } catch (error) {
    // On success the whole list is redrawn, so the button only needs
    // to be enabled again when something went wrong.
    button.disabled = false;
    setStatus("Could not delete the note. Please try again.", "error");
    console.error(error);
  }
}

// ---------- 7. Listen for events ----------
loadBtn.addEventListener("click", loadNotes);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  // Validation: title required, maximum 100 characters, body optional
  if (title === "") {
    setStatus("Please enter a title.", "error");
    return;
  }
  if (title.length > MAX_TITLE) {
    setStatus(`The title must be ${MAX_TITLE} characters or fewer.`, "error");
    return;
  }

  createNote(title, body);
});

// ---------- 8. Draw once when the page opens ----------
renderNotes();
